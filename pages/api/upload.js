import formidable from 'formidable';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../../lib/supabaseClient';
import { query, initializeTables } from '../../backend/db.js';
import { analyzeTable } from '../../backend/table-analyzer.js';
import { normalizeColumnName, guessSqlType } from '../../backend/utils.js';

// ── ETL helpers (previously in /api/etl.js) ──────────────────────────────────

function inferType(records, columnName) {
  const samples = records.slice(0, 100).map((r) => r[columnName]);
  let numericCount = 0;
  let dateCount = 0;
  samples.forEach((value) => {
    if (value === '' || value === null || value === undefined) return;
    if (!isNaN(parseFloat(value)) && isFinite(value)) numericCount++;
    if (!isNaN(Date.parse(value))) dateCount++;
  });
  const threshold = samples.length * 0.7;
  if (numericCount > threshold) return 'number';
  if (dateCount > threshold) return 'date';
  return 'string';
}

function buildProfile(records) {
  if (records.length === 0) return { columns: [], rowCount: 0, dataTypes: {}, statistics: {} };

  const columns = Object.keys(records[0]).map((name) => ({
    name,
    type: inferType(records, name),
  }));

  // Deduplicate rows
  const unique = Array.from(
    new Map(records.map((item) => [JSON.stringify(item), item])).values()
  );

  const statistics = {};
  const dataTypes = {};

  columns.forEach((col) => {
    dataTypes[col.name] = col.type;
    if (col.type === 'number') {
      const values = unique.map((r) => parseFloat(r[col.name])).filter((v) => !isNaN(v));
      statistics[col.name] = values.length > 0
        ? { min: Math.min(...values), max: Math.max(...values), mean: values.reduce((a, b) => a + b, 0) / values.length, count: values.length, nullCount: unique.length - values.length }
        : { count: 0, nullCount: unique.length };
    } else {
      const values = unique.map((r) => r[col.name]).filter((v) => v !== null && v !== '' && v !== undefined);
      statistics[col.name] = { unique: new Set(values).size, count: values.length, nullCount: unique.length - values.length };
    }
  });

  return { columns, rowCount: unique.length, dataTypes, statistics, previewRows: unique.slice(0, 100) };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Parse form data
    const form = formidable({
      uploadDir: tmpDir,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read and parse CSV
    const fileContent = fs.readFileSync(file.filepath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // --- STEP 1: Supabase Session & Storage ---
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        file_name: file.originalFilename || 'unknown.csv',
        status: 'uploaded',
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;

    const fileName = `${session.id}/${file.originalFilename}`;
    await supabase.storage
      .from('csv-files')
      .upload(fileName, fileContent, { contentType: 'text/csv' });

    // --- STEP 2: PostgreSQL Table Creation (for AI) ---
    await initializeTables();
    
    // Generate tableName if not provided in fields
    const tableName = fields.tableName?.[0] || 
      file.originalFilename.replace('.csv', '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Determine column types
    const columns = Object.keys(records[0]).map(normalizeColumnName);
    const columnTypes = new Map();
    columns.forEach((column, index) => {
      const originalColumn = Object.keys(records[0])[index];
      const values = records.map(row => row[originalColumn]).filter(v => v !== null && v !== '');
      columnTypes.set(column, guessSqlType(values[0]));
    });

    // Create table
    await query(`DROP TABLE IF EXISTS "${tableName}"`);
    const createTableSQL = `
      CREATE TABLE "${tableName}" (
        ${columns.map(column => `"${column}" ${columnTypes.get(column)}`).join(',\n')}
      )
    `;
    await query(createTableSQL);

    // Insert all records
    for (const record of records) {
      const originalColumns = Object.keys(record);
      const insertSQL = `
        INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
        VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
      `;
      await query(insertSQL, originalColumns.map(c => record[c]));
    }

    // Analyze table and store in schema
    const analysis = await analyzeTable(tableName);
    await query(
      `INSERT INTO TABLE_SCHEMA (table_name, analysis)
       VALUES ($1, $2)
       ON CONFLICT (table_name) 
       DO UPDATE SET analysis = $2, updated_at = CURRENT_TIMESTAMP`,
      [tableName, analysis]
    );

    // --- STEP 3: Store Data Profile in Supabase (for context) ---
    // Build rich ETL profile from the original records (original column names + stats)
    const etlProfile = buildProfile(records);

    const columnsProfile = columns.map(c => ({
      name: c,
      type: columnTypes.get(c)
    }));

    await supabase
      .from('data_profiles')
      .insert([{
        session_id: session.id,
        columns: columnsProfile,
        row_count: etlProfile.rowCount,
        data_types: etlProfile.dataTypes,
        statistics: etlProfile.statistics,
        preprocessing_applied: [],
      }]);

    // Clean up local file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      sessionId: session.id,
      tableName,
      rowCount: etlProfile.rowCount,
      analysis,
      // ETL data so the analysis page can skip a round-trip if needed
      etl: {
        data: etlProfile.previewRows,
        columns: etlProfile.columns,
        rowCount: etlProfile.rowCount,
        statistics: etlProfile.statistics,
        dataTypes: etlProfile.dataTypes,
      },
    });

  } catch (error) {
    console.error('Unified upload error:', error);
    res.status(500).json({ error: 'Upload and processing failed' });
  }
}
