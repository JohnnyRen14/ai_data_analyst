import { supabaseAdmin as supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Get file from storage
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Download file from storage
    const fileName = `${sessionId}/${session.file_name}`;
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('csv-files')
      .download(fileName);

    if (downloadError) {
      throw downloadError;
    }

    const fileContent = await fileData.text();
    const { parse } = await import('csv-parse/sync');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Perform ETL operations
    const cleaned = performETL(records);

    // Store data profile
    const { error: profileError } = await supabase
      .from('data_profiles')
      .insert([
        {
          session_id: sessionId,
          columns: cleaned.columns,
          row_count: cleaned.rowCount,
          data_types: cleaned.dataTypes,
          statistics: cleaned.statistics,
          preprocessing_applied: [],
        },
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Update session status
    await supabase
      .from('sessions')
      .update({ status: 'etl_complete' })
      .eq('id', sessionId);

    res.status(200).json({
      success: true,
      data: cleaned.data.slice(0, 100), // Return first 100 rows
      columns: cleaned.columns,
      rowCount: cleaned.rowCount,
      statistics: cleaned.statistics,
      dataTypes: cleaned.dataTypes,
    });
  } catch (error) {
    console.error('ETL error:', error);
    res.status(500).json({ error: 'ETL processing failed' });
  }
}

function performETL(records) {
  if (records.length === 0) {
    return {
      data: [],
      columns: [],
      rowCount: 0,
      dataTypes: {},
      statistics: {},
    };
  }

  const columns = Object.keys(records[0]).map((name) => ({
    name,
    type: inferType(records, name),
  }));

  // Remove duplicates
  const uniqueRecords = Array.from(
    new Map(records.map((item) => [JSON.stringify(item), item])).values()
  );

  // Handle missing values and type conversion
  const cleanedRecords = uniqueRecords.map((record) => {
    const cleanedRecord = {};
    columns.forEach((col) => {
      let value = record[col.name];

      if (value === '' || value === null || value === undefined) {
        cleanedRecord[col.name] = null;
      } else if (col.type === 'number') {
        cleanedRecord[col.name] = parseFloat(value) || null;
      } else {
        cleanedRecord[col.name] = value;
      }
    });
    return cleanedRecord;
  });

  // Calculate statistics
  const statistics = {};
  const dataTypes = {};

  columns.forEach((col) => {
    dataTypes[col.name] = col.type;
    
    if (col.type === 'number') {
      const values = cleanedRecords
        .map((r) => r[col.name])
        .filter((v) => v !== null);

      if (values.length > 0) {
        statistics[col.name] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length,
          nullCount: cleanedRecords.length - values.length,
        };
      }
    } else {
      const values = cleanedRecords
        .map((r) => r[col.name])
        .filter((v) => v !== null);
      
      statistics[col.name] = {
        unique: new Set(values).size,
        count: values.length,
        nullCount: cleanedRecords.length - values.length,
      };
    }
  });

  return {
    data: cleanedRecords,
    columns,
    rowCount: cleanedRecords.length,
    dataTypes,
    statistics,
  };
}

function inferType(records, columnName) {
  const samples = records.slice(0, 100).map((r) => r[columnName]);
  let numericCount = 0;
  let dateCount = 0;

  samples.forEach((value) => {
    if (value === '' || value === null || value === undefined) return;
    
    if (!isNaN(parseFloat(value)) && isFinite(value)) {
      numericCount++;
    }
    
    if (!isNaN(Date.parse(value))) {
      dateCount++;
    }
  });

  const threshold = samples.length * 0.7;

  if (numericCount > threshold) return 'number';
  if (dateCount > threshold) return 'date';
  return 'string';
}
