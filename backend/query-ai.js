import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Queries the AI model (GPT-4o-mini).
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @param {boolean} jsonMode 
 * @returns {Promise<string>}
 */
export async function queryAI(systemPrompt, userPrompt, jsonMode = false) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    response_format: jsonMode ? { type: "json_object" } : undefined,
  });

  return completion.choices[0].message.content || "";
}
