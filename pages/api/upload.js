import formidable from 'formidable';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../../lib/supabaseClient';
import { query, initializeTables } from '../../backend/db.js';
import { analyzeTable } from '../../backend/table-analyzer.js';
import { normalizeColumnName, guessSqlType } from '../../backend/utils.js';

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
    const columnsProfile = columns.map(c => ({
      name: c,
      type: columnTypes.get(c)
    }));

    await supabase
      .from('data_profiles')
      .insert([{
        session_id: session.id,
        columns: columnsProfile,
        row_count: records.length,
        data_types: Object.fromEntries(columnTypes)
      }]);

    // Clean up local file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      sessionId: session.id,
      tableName,
      rowCount: records.length,
      analysis
    });

  } catch (error) {
    console.error('Unified upload error:', error);
    res.status(500).json({ error: 'Upload and processing failed' });
  }
}
