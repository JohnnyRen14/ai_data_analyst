import { processQuery } from '../../backend/process-query.js';

/**
 * API route for processing natural language queries.
 * Returns structured response with insights, KPIs, visualization specs, and recommendations.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await processQuery(message);

    // Strip _metrics in production
    if (process.env.NODE_ENV === 'production') {
      delete result._metrics;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
}
