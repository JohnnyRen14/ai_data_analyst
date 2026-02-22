import { generateJSON } from '../query-ai.js';
import { prompts } from '../prompt-template.js';

/**
 * Analytical Reasoning Agent
 *
 * Analyzes SQL query results to extract business intelligence insights:
 * trends, distributions, comparisons, outliers, KPI deviations,
 * growth rates, and concentration analysis.
 *
 * This agent does NOT run SQL or retrieve embeddings.
 * It operates purely on the data passed to it.
 *
 * @param {{ queryResult: object[], columnDefinitions: object, businessContext?: string, kpis?: object }} params
 * @returns {Promise<{ trends: string[], distributions: string[], comparisons: string[], outliers: string[], kpiDeviations: string[], growthRates: string[], concentrationAnalysis: string[], keyFindings: string[] }>}
 */
export async function analyzeResults({ queryResult, columnDefinitions, businessContext, kpis }) {
  const prompt = prompts.analyticalReasoning(queryResult, columnDefinitions, businessContext, kpis);

  const result = await generateJSON(prompt.user, {
    systemInstruction: prompt.system,
  });

  return result;
}
