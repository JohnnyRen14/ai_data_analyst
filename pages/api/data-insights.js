import { getOpenAIClient } from '../../lib/openaiClient';
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

    const openai = getOpenAIClient();

    // Generate data insights
    const dataContext = {
      fileName: session.file_name,
      rowCount: profile.row_count,
      columns: profile.columns,
      statistics: profile.statistics,
      dataTypes: profile.data_types,
    };

    const systemPrompt = `You are an expert data analyst. Analyze the following dataset and provide deep insights.

Dataset Information:
${JSON.stringify(dataContext, null, 2)}

Provide insights about:
1. Data quality and completeness
2. Interesting patterns or correlations
3. Potential issues or anomalies
4. Recommended analyses based on the data structure
5. Suggested visualizations

Format your response as a JSON object with these keys:
- summary: Brief overview
- dataQuality: Array of quality observations
- patterns: Array of identified patterns
- recommendations: Array of analysis recommendations
- visualizations: Array of {type, xKey, yKey, title, description}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Analyze this dataset and provide comprehensive insights.',
        },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const insights = JSON.parse(completion.choices[0].message.content);

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
    res.status(500).json({ error: 'Failed to generate insights' });
  }
}
