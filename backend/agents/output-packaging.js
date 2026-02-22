import { generateJSON } from '../query-ai.js';
import { prompts } from '../prompt-template.js';

/**
 * Output Packaging Agent
 *
 * Produces the final structured output with:
 *   - Executive summary
 *   - Bullet-point insights
 *   - KPI highlights
 *   - Actionable recommendations
 *
 * This agent does NOT run SQL, retrieve embeddings, or generate charts.
 * It packages analysis + vizualization decisions into a dashboard-ready structure.
 *
 * @param {{ analysisResult: object, visualizations: object, originalQuestion: string, queryResult: object[] }} params
 * @returns {Promise<{ summary: string, insights: string[], kpis: object, recommendations: string[] }>}
 */
export async function packageOutput({ analysisResult, visualizations, originalQuestion, queryResult }) {
  const prompt = prompts.outputPackaging(analysisResult, visualizations, originalQuestion, queryResult);

  const result = await generateJSON(prompt.user, {
    systemInstruction: prompt.system,
  });

  return result;
}
