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

    const prompt = `System: You are an expert data analyst. Analyze the following dataset and provide deep insights.
    
    Dataset Information:
    ${JSON.stringify(dataContext, null, 2)}
    
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
