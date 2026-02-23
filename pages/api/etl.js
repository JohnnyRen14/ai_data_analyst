/**
 * ETL endpoint  lightweight read-only.
 *
 * The actual ETL (parsing, type inference, statistics) now happens in /api/upload
 * and is persisted to Supabase data_profiles. This endpoint simply reads that
 * stored profile and fetches the first 100 rows from the Postgres table directly.
 * No re-downloading from Storage, no re-parsing.
 */
import { supabaseAdmin as supabase } from '../../lib/supabaseClient';
import { query } from '../../backend/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Load session + stored profile in one query
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, data_profiles(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const profile = Array.isArray(session.data_profiles)
      ? session.data_profiles[0]
      : session.data_profiles;

    if (!profile) {
      return res.status(404).json({ error: 'Data profile not found. Upload may still be processing.' });
    }

    // Fetch preview rows directly from Postgres (already inserted by upload)
    const tableName = session.file_name
      .replace('.csv', '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();

    let previewRows = [];
    try {
      const result = await query(`SELECT * FROM "${tableName}" LIMIT 100`);
      previewRows = result.rows;
    } catch (e) {
      console.warn(`[ETL] Could not fetch preview rows for table "${tableName}":`, e.message);
    }

    // Update session status
    await supabase
      .from('sessions')
      .update({ status: 'etl_complete' })
      .eq('id', sessionId);

    res.status(200).json({
      success: true,
      data: previewRows,
      columns: profile.columns,
      rowCount: profile.row_count,
      statistics: profile.statistics,
      dataTypes: profile.data_types,
    });
  } catch (error) {
    console.error('ETL error:', error);
    res.status(500).json({ error: 'ETL processing failed' });
  }
}
