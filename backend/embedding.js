import { getGeminiEmbeddingClient } from '../lib/geminiClient.js';
import { supabase } from '../lib/supabaseClient.js';

const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Generate a 768-dim embedding vector for a text string
 * using Gemini text-embedding-004.
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} 768-dimensional float array
 */
export async function generateEmbedding(text) {
  const ai = getGeminiEmbeddingClient();

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  return response.embedding.values;
}

/**
 * Generate and store embeddings for a table's schema description.
 * Creates one embedding per column description + one for the table-level summary.
 * Idempotent: deletes existing embeddings for the table before inserting.
 * Stored in Supabase (pgvector built-in).
 *
 * @param {string} tableName - The database table name
 * @param {object} analysisJson - AI-generated analysis from table-analyzer
 *   Keys are column names, values are description strings
 */
export async function storeSchemaEmbeddings(tableName, analysisJson) {
  // Delete old embeddings for this table (idempotent re-upload)
  const { error: delError } = await supabase
    .from('schema_embeddings')
    .delete()
    .eq('table_name', tableName);

  if (delError) {
    console.error('[Embedding] Failed to delete old embeddings:', delError.message);
  }

  const entries = Object.entries(analysisJson);

  // Build a table-level summary from all column descriptions
  const tableSummary = `Table "${tableName}" contains columns: ${entries
    .map(([col, desc]) => `${col} (${desc})`)
    .join('; ')}`;

  // Embed and store table-level description
  const tableEmbedding = await generateEmbedding(tableSummary);
  const { error: tableErr } = await supabase.from('schema_embeddings').insert({
    table_name: tableName,
    column_name: null,
    description: tableSummary,
    embedding: tableEmbedding,
  });

  if (tableErr) {
    console.error('[Embedding] Failed to insert table embedding:', tableErr.message);
  }

  // Embed and store each column description
  for (const [columnName, description] of entries) {
    const columnText = `Table "${tableName}", column "${columnName}": ${description}`;
    const embedding = await generateEmbedding(columnText);

    const { error: colErr } = await supabase.from('schema_embeddings').insert({
      table_name: tableName,
      column_name: columnName,
      description,
      embedding,
    });

    if (colErr) {
      console.error(`[Embedding] Failed to insert embedding for ${columnName}:`, colErr.message);
    }
  }

  console.log(
    `[Embedding] Stored ${entries.length + 1} embeddings for table "${tableName}"`
  );
}

/**
 * Retrieve the top-K most relevant schema rows for a user question
 * using vector cosine similarity search via Supabase RPC.
 *
 * @param {string} questionText - The user's natural language question
 * @param {number} [topK=10] - Number of results to return
 * @param {object} [logger=null] - Optional pipeline logger for metrics
 * @returns {Promise<Array<{ table_name: string, column_name: string|null, description: string, similarity: number }>>}
 */
export async function retrieveRelevantSchema(questionText, topK = 10, logger = null) {
  const questionEmbedding = await generateEmbedding(questionText);

  const { data, error } = await supabase.rpc('match_schema_embeddings', {
    query_embedding: questionEmbedding,
    match_count: topK,
  });

  if (error) {
    console.error('[Embedding] Vector search failed:', error.message);
    return [];
  }

  const results = data || [];

  // Log retrieval results if logger is provided
  if (logger) {
    logger.logRetrieval({
      query: questionText,
      topK,
      results,
    });
  }

  return results;
}
