import { GoogleGenerativeAI } from "@google/generative-ai";

// Server-side only - never expose API key to client
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Please check your .env file.');
  }
  
  return new GoogleGenerativeAI(apiKey);
}
