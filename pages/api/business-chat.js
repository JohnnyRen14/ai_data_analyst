import { getOpenAIClient } from '../../lib/openaiClient';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, messages } = req.body;

    if (!sessionId || !messages) {
      return res.status(400).json({ error: 'Session ID and messages required' });
    }

    // Get session context
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    // Get data profile for context
    const { data: profile } = await supabase
      .from('data_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    const openai = getOpenAIClient();

    const systemPrompt = `You are an AI data analyst assistant helping to understand the user's business objectives.

Context:
- Dataset: ${session.file_name}
- Rows: ${profile?.row_count || 'Unknown'}
- Columns: ${profile?.columns?.map((c) => `${c.name} (${c.type})`).join(', ') || 'Unknown'}

Your goal is to ask insightful questions to understand:
1. What business problem they're trying to solve
2. What specific insights they're looking for
3. What decisions this analysis will inform
4. Any specific metrics or KPIs they care about

Ask 2-3 follow-up questions maximum. Once you have enough information, summarize the business objectives and say "I have all the information I need to proceed with the analysis."

Be conversational, professional, and concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantMessage = completion.choices[0].message.content;

    // Check if conversation is complete
    const isComplete = assistantMessage
      .toLowerCase()
      .includes('i have all the information i need');

    if (isComplete) {
      // Generate business plan
      const planCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          { role: 'assistant', content: assistantMessage },
          {
            role: 'user',
            content:
              'Based on our conversation, create a structured analysis plan in JSON format with: objectives (array), keyMetrics (array), expectedInsights (array), and recommendedVisualizations (array).',
          },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });

      const businessPlan = JSON.parse(planCompletion.choices[0].message.content);

      // Store in database
      await supabase
        .from('sessions')
        .update({
          business_objectives: businessPlan,
          status: 'business_understanding_complete',
        })
        .eq('id', sessionId);

      return res.status(200).json({
        message: assistantMessage,
        complete: true,
        businessPlan,
      });
    }

    res.status(200).json({
      message: assistantMessage,
      complete: false,
    });
  } catch (error) {
    console.error('Business chat error:', error);
    res.status(500).json({ error: 'Failed to process conversation' });
  }
}
