import { supabase } from '../../lib/supabaseClient';
import { mean, standardDeviation, min, max } from 'simple-statistics';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, method = 'z-score' } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Get data profile
    const { data: profile } = await supabase
      .from('data_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Data profile not found' });
    }

    // Get the data
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    const fileName = `${sessionId}/${session.file_name}`;
    const { data: fileData } = await supabase.storage
      .from('csv-files')
      .download(fileName);

    const fileContent = await fileData.text();
    const { parse } = await import('csv-parse/sync');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Apply preprocessing
    const preprocessed = applyNormalization(records, profile.columns, method);

    // Update session
    await supabase
      .from('sessions')
      .update({ status: 'preprocessing_complete' })
      .eq('id', sessionId);

    // Update preprocessing history
    const preprocessingApplied = profile.preprocessing_applied || [];
    preprocessingApplied.push({
      method,
      timestamp: new Date().toISOString(),
    });

    await supabase
      .from('data_profiles')
      .update({ preprocessing_applied: preprocessingApplied })
      .eq('session_id', sessionId);

    res.status(200).json({
      success: true,
      method,
      preview: preprocessed.slice(0, 10),
      appliedTo: profile.columns
        .filter((c) => c.type === 'number')
        .map((c) => c.name),
    });
  } catch (error) {
    console.error('Preprocessing error:', error);
    res.status(500).json({ error: 'Preprocessing failed' });
  }
}

function applyNormalization(records, columns, method) {
  const numericColumns = columns.filter((c) => c.type === 'number');

  const normalized = records.map((record) => {
    const newRecord = { ...record };

    numericColumns.forEach((col) => {
      const values = records
        .map((r) => parseFloat(r[col.name]))
        .filter((v) => !isNaN(v) && v !== null);

      if (values.length === 0) return;

      const value = parseFloat(record[col.name]);
      if (isNaN(value)) return;

      if (method === 'z-score') {
        const meanVal = mean(values);
        const stdDev = standardDeviation(values);
        newRecord[col.name] = stdDev !== 0 ? (value - meanVal) / stdDev : 0;
      } else if (method === 'min-max') {
        const minVal = min(values);
        const maxVal = max(values);
        newRecord[col.name] =
          maxVal !== minVal ? (value - minVal) / (maxVal - minVal) : 0;
      }
    });

    return newRecord;
  });

  return normalized;
}
