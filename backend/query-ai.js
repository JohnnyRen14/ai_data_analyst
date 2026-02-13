import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

/**
 * Queries the AI model (Gemini 1.5 Flash).
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @param {boolean} jsonMode 
 * @returns {Promise<string>}
 */
export async function queryAI(systemPrompt, userPrompt, jsonMode = false) {
  // Combine system and user prompts for Gemini
  const prompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
