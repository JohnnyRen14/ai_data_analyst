import { getGeminiClient } from '../lib/geminiClient';

/**
 * Queries the AI model (Gemini 3 Flash Preview).
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @param {boolean} jsonMode 
 * @returns {Promise<string>}
 */
export async function queryAI(systemPrompt, userPrompt, jsonMode = false) {
  const ai = getGeminiClient();

  // Combine system and user prompts for Gemini
  const prompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
  
  const config = {};
  if (jsonMode) {
    config.responseMimeType = "application/json";
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config,
  });
  return response.text;
}
