import { analyzeResults } from './analytical-reasoning.js';
import { decideVisualizations } from './visualization-decision.js';
import { packageOutput } from './output-packaging.js';

/**
 * Orchestrates the 3-agent reasoning pipeline.
 *
 * Flow: Analytical Reasoning → Visualization Decision → Output Packaging
 *
 * All 3 agents share the same SQL result data — no re-querying.
 * Each agent step is timed via the logger for performance monitoring.
 *
 * @param {{
 *   queryResult: object[],
 *   columnDefinitions: object,
 *   businessContext?: string,
 *   kpis?: object,
 *   originalQuestion: string,
 *   logger: import('../logger.js').ReturnType<typeof createQueryLogger>
 * }} params
 * @returns {Promise<{
 *   summary: string,
 *   insights: string[],
 *   kpis: object,
 *   visualization: object,
 *   recommendations: string[]
 * }>}
 */
export async function runReasoningPipeline({
  queryResult,
  columnDefinitions,
  businessContext,
  kpis,
  originalQuestion,
  logger,
}) {
  // ── Agent 1: Analytical Reasoning ──────────────────────────────
  const t1 = logger.startStep('analytical_agent');
  const analysisResult = await analyzeResults({
    queryResult,
    columnDefinitions,
    businessContext,
    kpis,
  });
  logger.logAgentResult('analytical_agent', {
    inputSize: queryResult.length,
    outputSize: analysisResult.keyFindings?.length ?? 0,
  });
  await logger.endStep(t1, {
    inputRows: queryResult.length,
    findingsCount: analysisResult.keyFindings?.length ?? 0,
  });

  // ── Derive data shape + column types for visualization agent ──
  const dataShape = {
    rowCount: queryResult.length,
    columnCount: Object.keys(queryResult[0] || {}).length,
    columns: Object.keys(queryResult[0] || {}),
  };

  const columnTypes = {};
  if (queryResult.length > 0) {
    for (const [key, value] of Object.entries(queryResult[0])) {
      if (value === null || value === undefined) {
        columnTypes[key] = 'unknown';
      } else if (typeof value === 'number') {
        columnTypes[key] = 'numeric';
      } else if (!isNaN(Date.parse(value)) && typeof value === 'string' && value.includes('-')) {
        columnTypes[key] = 'date';
      } else {
        columnTypes[key] = 'text';
      }
    }
  }

  // ── Agent 2: Visualization Decision ────────────────────────────
  const t2 = logger.startStep('visualization_agent');
  const vizResult = await decideVisualizations({
    analysisResult,
    dataShape,
    columnTypes,
  });
  logger.logAgentResult('visualization_agent', {
    inputSize: analysisResult.keyFindings?.length ?? 0,
    outputSize: vizResult.visualizations?.length ?? 0,
  });
  await logger.endStep(t2, {
    chartCount: vizResult.visualizations?.length ?? 0,
  });

  // ── Attach query data to each visualization spec ───────────────
  const visualizationsWithData = (vizResult.visualizations || []).map((viz) => ({
    ...viz,
    data: queryResult,
  }));

  // ── Agent 3: Output Packaging ──────────────────────────────────
  const t3 = logger.startStep('output_packaging_agent');
  const packagedOutput = await packageOutput({
    analysisResult,
    visualizations: vizResult.visualizations || [],
    originalQuestion,
    queryResult,
  });
  logger.logAgentResult('output_packaging_agent', {
    inputSize: queryResult.length,
    outputSize: packagedOutput.insights?.length ?? 0,
  });
  await logger.endStep(t3, {
    insightCount: packagedOutput.insights?.length ?? 0,
    kpiCount: Object.keys(packagedOutput.kpis || {}).length,
  });

  // ── Combine all agent outputs ──────────────────────────────────
  return {
    summary: packagedOutput.summary,
    insights: packagedOutput.insights || [],
    kpis: packagedOutput.kpis || {},
    visualization: visualizationsWithData,
    recommendations: packagedOutput.recommendations || [],
    _analysis: analysisResult, // internal: full analysis for debugging
  };
}
