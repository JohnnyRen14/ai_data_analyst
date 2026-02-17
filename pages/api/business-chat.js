import { createChat, generateJSON, AIError } from '../../backend/query-ai';
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

    const systemPrompt = `You are an AI data analyst assistant helping to understand the user's business objectives.

Context:
- Dataset: ${session.file_name}
- Rows: ${profile?.row_count || 'Unknown'}
- Columns: ${profile?.columns?.map((c) => `${c.name} (${c.type})`).join(', ') || 'Unknown'}

Your goal is to ask insightful questions to understand:
1. What business problem they're trying to solve
2. Any specific insights they're looking for
3. Any specific metrics or KPIs they care about

Ask 1-2 follow-up questions maximum. Once you have enough information, summarise user answers and response together with "I have all the information, do you want me to proceed with the analysis? If user response is yes, then proceed with the analysis. If no, then ask again the questions and try to understand better."

Be conversational, professional, and concise. Use clear Markdown formatting (e.g., bullet points for questions, bold text for emphasis, line breaks between questions) to make your response easy to read.`;

    // Convert messages to Gemini format (role: user/model)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const userMsg = messages[messages.length - 1].content;

    const chat = createChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I'm ready to help understand your business objectives." }] },
        ...history
      ]
    });

    const assistantMessage = await chat.sendMessage(userMsg);
    
    // Log raw response for tracking
    console.log('AI Response:', JSON.stringify(assistantMessage));

    // Check if conversation is complete
    // The prompt now asks "do you want me to proceed with the analysis?"
    // and expects a "yes" from the user. However, for the AI to trigger the plan generation,
    // we still need a string to look for.
    const isComplete = assistantMessage
      .toLowerCase()
      .includes('i have all the information') && 
      (userMsg.toLowerCase().includes('yes') || assistantMessage.toLowerCase().includes('proceed with the analysis'));

    if (isComplete) {
      // Extract actual questions from user messages
      const userQuestions = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .filter(msg => msg.trim().length > 0 && !msg.toLowerCase().includes('yes') && !msg.toLowerCase().includes('no'));

      // Generate business plan using JSON mode
      const planPrompt = `${systemPrompt}\n\nConversation History:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nAssistant: ${assistantMessage}\n\nUser: Based on our conversation, create a structured analysis plan in JSON format with:
- objectives: Array of specific questions/objectives the user wants answered (extract actual questions like "What stock is in low stock?", "Which products need restocking?", etc.)
- keyMetrics: Array of key metrics they care about
- expectedInsights: Array of insights they expect to find
- recommendedVisualizations: Array of visualization recommendations

IMPORTANT: The objectives array should contain the ACTUAL QUESTIONS the user asked, such as:
- "What stock is in low stock?"
- "Which products need restocking?"
- "What are the top selling products?"
- etc.

Extract these from the conversation history above.`;

      const businessPlan = await generateJSON(planPrompt);
      
      // Ensure objectives include the actual user questions
      if (!businessPlan.objectives || businessPlan.objectives.length === 0) {
        businessPlan.objectives = userQuestions.length > 0 ? userQuestions : ['Analyze the dataset'];
      } else {
        // Merge user questions with extracted objectives
        businessPlan.objectives = [...new Set([...userQuestions, ...businessPlan.objectives])];
      }

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

    if (error instanceof AIError) {
      const statusCode = error.retryable ? 503 : 500;
      return res.status(statusCode).json({
        error: 'Failed to process conversation',
        message: error.message,
        retryable: error.retryable,
      });
    }

    res.status(500).json({ error: 'Failed to process conversation' });
  }
}
