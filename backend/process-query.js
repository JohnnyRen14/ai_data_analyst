import { queryAI } from './query-ai.js';
import { query } from './db.js';
import { prompts } from './prompt-template.js';
import { retrieveRelevantSchema } from './embedding.js';
import { runReasoningPipeline } from './agents/index.js';
import { createQueryLogger } from './logger.js';

/**
 * Processes a natural language query using:
 * 1. Triage (classify query type)
 * 2. Vector similarity retrieval (replace SELECT * FROM TABLE_SCHEMA)
 * 3. SQL generation with LIMIT enforcement + auto-aggregation
 * 4. 3-agent reasoning pipeline (Analytical → Visualization → Output Packaging)
 * 5. Validation loop (up to 3 retries)
 */
export async function processQuery(message) {
  // Generate unique query ID and create scoped logger
  const queryId = crypto.randomUUID();
  const logger = createQueryLogger(queryId);

  console.log(`🚀 Processing query [${queryId.slice(0, 8)}]:`, message);

  // ── Step 1: Triage ──────────────────────────────────────────────
  const t0 = logger.startStep('triage');
  const triagePrompts = prompts.triage(message);
  const triageResponse = await queryAI(triagePrompts.system, triagePrompts.user, true);
  const triageResult = JSON.parse(triageResponse);
  const queryType = triageResult.queryType;
  await logger.endStep(t0, { queryType });

  let response = '';
  let insights = [];
  let kpis = {};
  let visualization = [];
  let recommendations = [];

  switch (queryType) {
    case 'GENERAL_QUESTION': {
      const tGen = logger.startStep('general_answer');
      const generalPrompt = prompts.generalAnswer(message);
      const generalResponse = await queryAI(generalPrompt.system, generalPrompt.user, true);
      const generalResult = JSON.parse(generalResponse);
      response = generalResult.answer;
      await logger.endStep(tGen);
      break;
    }

    case 'DATA_QUESTION': {
      // ── Step 2: Vector similarity retrieval ───────────────────
      const tRetrieval = logger.startStep('vector_retrieval');
      const relevantSchema = await retrieveRelevantSchema(message, 10, logger);

      if (!relevantSchema || relevantSchema.length === 0) {
        response = 'I could not find any relevant schema information to answer your question. Please make sure data has been uploaded.';
        await logger.endStep(tRetrieval, { resultCount: 0 });
        break;
      }

      // Build schema context from top-K vector results
      const schemaContext = buildSchemaContext(relevantSchema);
      await logger.endStep(tRetrieval, {
        resultCount: relevantSchema.length,
        topScore: relevantSchema[0]?.similarity,
        tables: [...new Set(relevantSchema.map((r) => r.table_name))],
      });

      // ── Step 3: SQL generation + execution (retry loop) ───────
      let attempts = 0;
      const MAX_ATTEMPTS = 3;
      let sqlQuery = '';
      let queryResults;
      let validAnswer = false;
      let lastError = '';

      while (attempts < MAX_ATTEMPTS && !validAnswer) {
        attempts++;
        try {
          // Generate SQL
          const tSql = logger.startStep('sql_generation');
          const sqlPrompt = lastError
            ? prompts.regenerateSQL(schemaContext, message, sqlQuery, lastError)
            : prompts.generateSQL(schemaContext, message);

          const sqlResponse = await queryAI(sqlPrompt.system, sqlPrompt.user, true);
          const sqlResult = JSON.parse(sqlResponse);
          sqlQuery = sqlResult.query;
          await logger.endStep(tSql, { attempt: attempts, query: sqlQuery });

          // Execute SQL
          const tExec = logger.startStep('sql_execution');
          queryResults = await query(sqlQuery);
          await logger.endStep(tExec, { rowCount: queryResults.rows.length });

          // ── Auto-aggregation if result > 100 rows ─────────────
          if (queryResults.rows.length > 100) {
            const tAgg = logger.startStep('auto_aggregation');
            const aggPrompt = prompts.aggregateLargeResult(
              schemaContext, message, sqlQuery, queryResults.rows.length
            );
            const aggResponse = await queryAI(aggPrompt.system, aggPrompt.user, true);
            const aggResult = JSON.parse(aggResponse);
            sqlQuery = aggResult.query;
            queryResults = await query(sqlQuery);
            await logger.endStep(tAgg, {
              originalRows: queryResults.rows.length,
              aggregatedRows: queryResults.rows.length,
            });
          }

          // ── Step 4: 3-agent reasoning pipeline ────────────────
          // Build column definitions from schema context
          const columnDefinitions = {};
          for (const row of relevantSchema) {
            if (row.column_name) {
              columnDefinitions[row.column_name] = row.description;
            }
          }

          const tReasoning = logger.startStep('reasoning_pipeline');
          const reasoningOutput = await runReasoningPipeline({
            queryResult: queryResults.rows,
            columnDefinitions,
            businessContext: null, // ad-hoc queries don't have business context
            kpis: null,
            originalQuestion: message,
            logger,
          });
          await logger.endStep(tReasoning);

          // ── Step 5: Validate ──────────────────────────────────
          const tValidation = logger.startStep('validation');
          const validatePrompt = prompts.validateAnswer(message, reasoningOutput.summary);
          const validationResponse = await queryAI(validatePrompt.system, validatePrompt.user, true);
          const validationResult = JSON.parse(validationResponse);
          await logger.endStep(tValidation, { isAnswered: validationResult.isAnswered });

          if (validationResult.isAnswered) {
            validAnswer = true;
            response = reasoningOutput.summary;
            insights = reasoningOutput.insights;
            kpis = reasoningOutput.kpis;
            visualization = reasoningOutput.visualization;
            recommendations = reasoningOutput.recommendations;
          } else {
            lastError = validationResult.reason || 'Answer does not address the question';
          }
        } catch (error) {
          lastError = error.message;
          console.error(`[Pipeline:${queryId.slice(0, 8)}] Attempt ${attempts} failed:`, lastError);
        }
      }

      if (!validAnswer) {
        response =
          'I apologize, but I was unable to generate a satisfactory answer to your question after multiple attempts. ' +
          'The last error encountered was: ' +
          lastError;
      }
      break;
    }

    case 'OUT_OF_SCOPE':
      response = 'I apologize, but this question appears to be outside the scope of database-related queries I can help with.';
      break;
  }

  const result = {
    response,
    insights,
    kpis,
    visualization,
    recommendations,
    timestamp: new Date().toISOString(),
    queryType,
  };

  // Attach metrics in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    result._metrics = logger.getSummary();
  }

  return result;
}

/**
 * Build a structured schema context object from vector retrieval results.
 * Groups columns by table for cleaner prompt injection.
 */
function buildSchemaContext(relevantSchema) {
  const tableMap = {};

  for (const row of relevantSchema) {
    const tableName = row.table_name;
    if (!tableMap[tableName]) {
      tableMap[tableName] = {
        tableName,
        columns: [],
      };
    }
    if (row.column_name) {
      tableMap[tableName].columns.push({
        name: row.column_name,
        description: row.description,
        similarity: row.similarity,
      });
    }
  }

  return {
    relevantTables: Object.values(tableMap),
    retrievalMethod: 'vector_similarity',
    topScore: relevantSchema[0]?.similarity,
  };
}
