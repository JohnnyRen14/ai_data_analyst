import { generateJSON, AIError } from '../../backend/query-ai';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Get session with all context
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

    const analysisPrompt = `You are an expert data analyst. Provide comprehensive analysis for the following dataset:

Dataset: ${session.file_name}
Rows: ${profile.row_count}
Columns: ${JSON.stringify(profile.columns)}
Statistics: ${JSON.stringify(profile.statistics)}
Business Objectives: ${JSON.stringify(session.business_objectives)}

Provide analysis in JSON format with these sections:
1. descriptive: {
   summary: string,
   insights: array of key findings from the current data
}
2. predictive: {
   summary: string,
   insights: array of trend predictions and forecasts
}
3. prescriptive: {
   summary: string,
   insights: array of actionable recommendations
}

Make insights specific, actionable, and relevant to the business objectives.`;

    const analysis = await generateJSON(analysisPrompt);

    // Update session status
    await supabase
      .from('sessions')
      .update({
        status: 'analysis_complete',
        analysis_plan: analysis,
      })
      .eq('id', sessionId);

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Analysis generation error:', error);

    if (error instanceof AIError) {
      const statusCode = error.retryable ? 503 : 500;
      return res.status(statusCode).json({
        error: 'Failed to generate analysis',
        message: error.message,
        retryable: error.retryable,
      });
    }

    res.status(500).json({ error: 'Failed to generate analysis' });
  }
}
