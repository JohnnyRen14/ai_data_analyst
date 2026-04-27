import { GoogleGenAI } from "@google/generative-ai";

// Server-side only - never expose API key to client
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Please check your .env file.');
  }
  
  return new GoogleGenAI({ apiKey });
}

// text-embedding-004 is only available on the v1 API, not v1beta
export function getGeminiEmbeddingClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Please check your .env file.');
  }

  // gemini-embedding-001 lives on v1beta (default), no override needed
  return new GoogleGenAI({ apiKey });
}
