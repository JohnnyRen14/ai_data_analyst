import OpenAI from 'openai';

// Server-side only - never expose API key to client
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Please check your .env file.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}
