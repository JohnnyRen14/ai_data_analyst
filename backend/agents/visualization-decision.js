import { generateJSON } from '../query-ai.js';
import { prompts } from '../prompt-template.js';

/**
 * Visualization Decision Agent
 *
 * Determines the best chart type(s) for presenting the analysis findings.
 * Classifies dataset shape into appropriate visualization types:
 *   - Category comparison → bar_chart
 *   - Time series → line_chart
 *   - Distribution → histogram
 *   - Contribution % → pie_chart or stacked_bar
 *   - Correlation → scatter_plot
 *
 * This agent does NOT run SQL or retrieve embeddings.
 * It describes chart specifications in JSON — never draws charts.
 * The frontend uses the JSON spec to render the chart.
 *
 * @param {{ analysisResult: object, dataShape: object, columnTypes: object }} params
 * @returns {Promise<{ visualizations: Array<{ type: string, title: string, description: string, x_axis: string, y_axis: string, series?: string[] }> }>}
 */
export async function decideVisualizations({ analysisResult, dataShape, columnTypes }) {
  const prompt = prompts.visualizationDecision(analysisResult, dataShape, columnTypes);

  const result = await generateJSON(prompt.user, {
    systemInstruction: prompt.system,
  });

  return result;
}
