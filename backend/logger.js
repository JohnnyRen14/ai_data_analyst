import { supabase } from '../lib/supabaseClient.js';

/**
 * Creates a scoped logger for a single query pipeline execution.
 * Tracks step durations, vector retrieval scores, and agent metrics.
 * Persists logs to the pipeline_logs table in Supabase for monitoring and debugging.
 *
 * @param {string} queryId - UUID identifying this query execution
 * @returns {object} Logger instance with step tracking methods
 */
export function createQueryLogger(queryId) {
  const steps = [];
  const pipelineStart = Date.now();

  return {
    /**
     * Start timing a pipeline step.
     * @param {string} stepName - e.g. 'triage', 'vector_retrieval', 'analytical_agent'
     * @returns {{ stepName: string, startTime: number }}
     */
    startStep(stepName) {
      const timer = { stepName, startTime: Date.now() };
      console.log(`[Pipeline:${queryId.slice(0, 8)}] ▶ ${stepName}`);
      return timer;
    },

    /**
     * End timing a step and persist the log entry.
     * @param {{ stepName: string, startTime: number }} timer - From startStep()
     * @param {object} [metadata={}] - Arbitrary data (scores, row counts, etc.)
     */
    async endStep(timer, metadata = {}) {
      const durationMs = Date.now() - timer.startTime;
      const entry = {
        step: timer.stepName,
        durationMs,
        metadata,
      };
      steps.push(entry);

      console.log(
        `[Pipeline:${queryId.slice(0, 8)}] ✓ ${timer.stepName} completed in ${durationMs}ms`
      );

      // Persist to Supabase (fire-and-forget, don't block pipeline)
      try {
        const { error } = await supabase.from('pipeline_logs').insert({
          query_id: queryId,
          step_name: timer.stepName,
          duration_ms: durationMs,
          metadata,
        });
        if (error) throw error;
      } catch (err) {
        console.error(`[Pipeline:${queryId.slice(0, 8)}] Failed to persist log for ${timer.stepName}:`, err.message);
      }
    },

    /**
     * Log vector retrieval results with similarity scores.
     * @param {{ query: string, topK: number, results: Array<{ table_name: string, column_name: string, description: string, similarity: number }> }} params
     */
    logRetrieval({ query: userQuery, topK, results }) {
      const logData = {
        user_question: userQuery,
        top_k: topK,
        results: results.map((r) => ({
          table: r.table_name,
          column: r.column_name || '(table-level)',
          score: parseFloat(r.similarity?.toFixed(4) ?? 0),
          description: r.description?.slice(0, 100),
        })),
      };

      console.log(
        `[Pipeline:${queryId.slice(0, 8)}] 🔍 Vector retrieval: ${results.length} results (top score: ${logData.results[0]?.score ?? 'N/A'})`
      );

      return logData;
    },

    /**
     * Log agent execution metadata.
     * @param {string} agentName - e.g. 'analytical_agent', 'visualization_agent'
     * @param {{ inputSize?: number, outputSize?: number, tokenEstimate?: number }} meta
     */
    logAgentResult(agentName, meta = {}) {
      console.log(
        `[Pipeline:${queryId.slice(0, 8)}] 🤖 ${agentName}: input=${meta.inputSize ?? '?'} rows, output=${meta.outputSize ?? '?'} items`
      );
    },

    /**
     * Get a summary of all tracked steps for this query.
     * Useful for including in API responses during development.
     * @returns {{ queryId: string, totalDurationMs: number, steps: Array }}
     */
    getSummary() {
      return {
        queryId,
        totalDurationMs: Date.now() - pipelineStart,
        steps: steps.map((s) => ({
          step: s.step,
          durationMs: s.durationMs,
          ...(Object.keys(s.metadata).length > 0 ? { metadata: s.metadata } : {}),
        })),
      };
    },
  };
}
