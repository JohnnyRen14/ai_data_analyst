import { generateJSON, AIError } from '../../backend/query-ai';
import { supabase } from '../../lib/supabaseClient';
import { query } from '../../backend/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Get all session data
    const { data: session } = await supabase
      .from('sessions')
      .select('*, data_profiles(*)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const profile = Array.isArray(session.data_profiles)
      ? session.data_profiles[0]
      : session.data_profiles;

    // Derive table name (same logic as upload.js)
    const tableName = session.file_name.replace('.csv', '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Generate data insights
    const dataContext = {
      tableName,
      rowCount: profile.row_count,
      columns: profile.columns,
      statistics: profile.statistics,
      dataTypes: profile.data_types,
    };

    // Extract business objectives/questions
    const businessObjectives = session.business_objectives || {};
    const objectives = businessObjectives.objectives || [];
    const keyMetrics = businessObjectives.keyMetrics || [];
    const expectedInsights = businessObjectives.expectedInsights || [];

    // Combine all business context into questions
    const allBusinessQuestions = [
      ...objectives,
      ...keyMetrics.map(m => `What are the ${m}?`),
      ...expectedInsights.map(i => `What insights can we get about ${i}?`)
    ].filter(Boolean);

    // Generate SQL queries to answer specific business questions
    let businessAnswers = [];
    if (allBusinessQuestions.length > 0) {
      const businessQuestionsPrompt = `System: You are an expert data analyst. Based on the business objectives and questions, generate SQL queries to answer them.

Dataset Information:
- Table Name: "${tableName}"
- Columns: ${JSON.stringify(profile.columns.map(c => ({ name: c.name, type: c.type })))}
- Row Count: ${profile.row_count}
- Statistics: ${JSON.stringify(profile.statistics, null, 2)}

Business Questions/Objectives:
${allBusinessQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

For each business question/objective, generate a SQL query that will answer it directly. Examples:
- "What stock is in low stock?" or "low stock" → SELECT products WHERE stock < threshold (identify stock column, use reasonable threshold like < 10 or < 20)
- "What are the top selling products?" → SELECT products ORDER BY sales DESC LIMIT 10
- "Which products need restocking?" → SELECT products WHERE stock < reorder_level OR stock < 10
- "What are the best performing products?" → SELECT products ORDER BY sales/revenue DESC
- Questions about specific metrics → Query those columns with appropriate filters/ordering

IMPORTANT RULES:
1. Use proper PostgreSQL syntax with double quotes around table and column names: SELECT * FROM "${tableName}" WHERE "column_name" = value
2. Column names must match exactly - check the columns list above (they may be normalized with underscores)
3. Only use SELECT queries (no INSERT, UPDATE, DELETE)
4. Include LIMIT 100 for safety
5. For "low stock" questions:
   - Look for columns named: stock, quantity, inventory, qty, stock_level, available_stock
   - Use WHERE clause: WHERE "stock" < 10 OR WHERE "stock" < 20 (choose reasonable threshold)
   - If there's an availability column, also filter: WHERE "availability" ILIKE '%low%' OR "availability" ILIKE '%out%'
6. For ranking/top questions: Use ORDER BY ... DESC LIMIT 10
7. For filtering questions: Use appropriate WHERE clauses
8. If you're unsure about column names, use the most likely match from the columns list

Format your response as a JSON object with this structure:
{
  "businessAnswers": [
    {
      "question": "The specific question being answered (from the list above)",
      "sqlQuery": "SELECT ... FROM \"${tableName}\" WHERE ... ORDER BY ... LIMIT 100",
      "answer": "A brief explanation of what this query answers and what the results mean"
    }
  ]
}

Generate queries for ALL questions that can be answered with SQL. If a question cannot be answered with SQL, skip it.

User: Generate SQL queries to answer the business questions.`;

      try {
        const businessQueries = await generateJSON(businessQuestionsPrompt);
        businessAnswers = businessQueries.businessAnswers || [];

        // Execute each query and attach results
        for (const answer of businessAnswers) {
          if (answer.sqlQuery) {
            try {
              // Safety check: ensure query starts with SELECT
              if (!answer.sqlQuery.trim().toLowerCase().startsWith('select')) {
                console.warn('Skipping non-SELECT query:', answer.sqlQuery);
                answer.error = 'Invalid query type (only SELECT allowed)';
                answer.data = [];
                continue;
              }

              // Execute query
              const result = await query(answer.sqlQuery);
              answer.data = result.rows;
              answer.rowCount = result.rows.length;
            } catch (err) {
              console.error(`Failed to execute business query: ${answer.sqlQuery}`, err);
              answer.error = err.message || 'Failed to execute query';
              answer.data = [];
            }
          }
        }
      } catch (err) {
        console.error('Failed to generate business answers:', err);
        businessAnswers = [];
      }
    }

    const prompt = `System: You are an expert data analyst. Analyze the following dataset and provide deep insights.
    
    Dataset Information:
    ${JSON.stringify(dataContext, null, 2)}
    
    ${businessObjectives.objectives ? `Business Context: The user wants to understand: ${JSON.stringify(businessObjectives.objectives)}` : ''}
    
    Provide insights about:
    1. Data quality and completeness
    2. Interesting patterns or correlations
    3. Potential issues or anomalies
    4. Recommended analyses based on the data structure
    5. Suggested visualizations with SQL queries to fetch the data
    
    Format your response as a JSON object with these keys:
    - summary: Brief overview
    - dataQuality: Array of quality observations
    - patterns: Array of identified patterns
    - recommendations: Array of analysis recommendations
    - visualizations: Array of {
        type: "line" | "bar" | "scatter" | "pie",
        title: string,
        description: string,
        sqlQuery: string (valid PostgreSQL query to get data for this chart, LIMIT 100),
        xKey: string (column name for x-axis),
        yKey: string (column name for y-axis)
      }
    
    User: Analyze this dataset and provide comprehensive insights.`;

    const insights = await generateJSON(prompt);
    
    // Add business answers to insights
    insights.businessAnswers = businessAnswers;

    // Execute queries for visualizations
    if (insights.visualizations && Array.isArray(insights.visualizations)) {
      for (const viz of insights.visualizations) {
        if (viz.sqlQuery) {
          try {
            // Safety check: ensure query starts with SELECT
            if (!viz.sqlQuery.trim().toLowerCase().startsWith('select')) {
              console.warn('Skipping non-SELECT query:', viz.sqlQuery);
              continue;
            }
            
            // Execute query
            const result = await query(viz.sqlQuery);
            viz.data = result.rows;
          } catch (err) {
            console.error(`Failed to execute visualization query: ${viz.sqlQuery}`, err);
            viz.error = 'Failed to load data';
            viz.data = [];
          }
        }
      }
    }

    // Update session status
    await supabase
      .from('sessions')
      .update({ status: 'data_understanding_complete' })
      .eq('id', sessionId);

    res.status(200).json({
      success: true,
      insights,
      businessAnswers: businessAnswers, // Also return separately for easier access
    });
  } catch (error) {
    console.error('Data insights error:', error);

    if (error instanceof AIError) {
      const statusCode = error.retryable ? 503 : 500;
      return res.status(statusCode).json({
        error: 'Failed to generate insights',
        message: error.message,
        retryable: error.retryable,
      });
    }

    res.status(500).json({ error: 'Failed to generate insights' });
  }
}
