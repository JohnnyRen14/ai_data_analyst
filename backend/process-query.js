import { queryAI } from './query-ai.js';
import { query } from './db.js';
import { prompts } from './prompt-template.js';

/**
 * Processes a natural language query using AI and the database.
 */
export async function processQuery(message) {
  console.log('🚀 Processing query:', message);

  // Step 1: Triage the request
  const triagePrompts = prompts.triage(message);
  const triageResponse = await queryAI(triagePrompts.system, triagePrompts.user + message, true);
  const triageResult = JSON.parse(triageResponse);
  const queryType = triageResult.queryType;
  
  let response = '';
  
  switch (queryType) {
    case 'GENERAL_QUESTION':
      const generalPrompt = prompts.generalAnswer(message);
      const generalResponse = await queryAI(generalPrompt.system, generalPrompt.user, true);
      const generalResult = JSON.parse(generalResponse);
      response = generalResult.answer;
      break;
      
    case 'DATA_QUESTION':
      // Step 3: Get schema information
      const schemaResult = await query('SELECT table_name, analysis FROM TABLE_SCHEMA');
      const tables = schemaResult.rows.map(row => ({
        tableName: row.table_name,
        analysis: row.analysis
      }));
      
      // Step 4: Analyze schema and get context for SQL generation
      const schemaPrompt = prompts.schemaAnalysis({ tables }, message);
      const schemaAnalysis = await queryAI(schemaPrompt.system, schemaPrompt.user, true);
      const schemaAnalysisResult = JSON.parse(schemaAnalysis);

      if (!schemaAnalysisResult.inScope) {
        response = `I apologize, but I cannot answer this question using the available database schema. ${schemaAnalysisResult.outOfScopeReason}`;
        break;
      }

      let attempts = 0;
      const MAX_ATTEMPTS = 3;
      let sqlQuery = '';
      let queryResults;
      let validAnswer = false;
      let lastError = '';

      while (attempts < MAX_ATTEMPTS && !validAnswer) {
        attempts++;
        try {
          // Generate SQL query
          const sqlPrompt = lastError 
            ? prompts.regenerateSQL(schemaAnalysisResult, message, sqlQuery, lastError)
            : prompts.generateSQL(schemaAnalysisResult, message);
          
          const sqlResponse = await queryAI(sqlPrompt.system, sqlPrompt.user, true);
          sqlQuery = JSON.parse(sqlResponse).query;
          
          // Execute the SQL query
          queryResults = await query(sqlQuery);
          
          // Format the response
          const formatPrompt = prompts.formatAnswer(message, sqlQuery, queryResults.rows);
          const formattedResponse = await queryAI(formatPrompt.system, formatPrompt.user, true);
          const formattedResult = JSON.parse(formattedResponse);
          
          // Validate the answer
          const validatePrompt = prompts.validateAnswer(message, formattedResult.answer);
          const validationResponse = await queryAI(validatePrompt.system, validatePrompt.user, true);
          const validationResult = JSON.parse(validationResponse);
          
          if (validationResult.isAnswered) {
            validAnswer = true;
            response = formattedResult.answer;
          } else {
            lastError = validationResult.reason || 'Answer does not address the question';
          }
        } catch (error) {
          lastError = error.message;
        }
      }

      if (!validAnswer) {
        response = "I apologize, but I was unable to generate a satisfactory answer to your question after multiple attempts. " +
                   "The last error encountered was: " + lastError;
      }
      break;
      
    case 'OUT_OF_SCOPE':
      response = "I apologize, but this question appears to be outside the scope of database-related queries I can help with.";
      break;
  }

  return {
    response,
    timestamp: new Date().toISOString(),
    queryType
  };
}
