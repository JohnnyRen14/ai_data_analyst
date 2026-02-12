import multer from 'multer';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { query, initializeTables } from '../../backend/db.js';
import { analyzeTable } from '../../backend/table-analyzer.js';
import { normalizeColumnName, guessSqlType } from '../../backend/utils.js';
import path from 'path';

// Multer configuration
const upload = multer({ dest: 'uploads/' });

// Disable Next.js body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Helper to run middleware in Next.js
 */
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * API route for uploading CSV files.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize tables if needed
    await initializeTables();

    // Run multer middleware
    await runMiddleware(req, res, upload.single('file'));

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tableName = req.body.tableName;
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    const csvStream = createReadStream(req.file.path);
    const parser = parse({
      columns: true,
      skip_empty_lines: true
    });

    // Collect first 10 rows to analyze column types
    const sampleRows = [];
    const columnTypes = new Map();
    
    for await (const record of csvStream.pipe(parser)) {
      sampleRows.push(record);
      if (sampleRows.length === 10) break;
    }

    if (sampleRows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Determine column types from sample data
    const columns = Object.keys(sampleRows[0]).map(normalizeColumnName);
    columns.forEach((column, index) => {
      const originalColumn = Object.keys(sampleRows[0])[index];
      const values = sampleRows.map(row => row[originalColumn]).filter(v => v !== null && v !== '');
      columnTypes.set(column, guessSqlType(values[0]));
    });

    // Drop existing table if it exists
    await query(`DROP TABLE IF EXISTS ${tableName}`);

    // Create new table
    const createTableSQL = `
      CREATE TABLE ${tableName} (
        ${columns.map(column => `${column} ${columnTypes.get(column)}`).join(',\n')}
      )
    `;
    await query(createTableSQL);

    // Reset stream for full import
    const insertStream = createReadStream(req.file.path);
    const insertParser = insertStream.pipe(parse({
      columns: true,
      skip_empty_lines: true
    }));

    // Insert all records
    for await (const record of insertParser) {
      const originalColumns = Object.keys(record);
      const insertSQL = `
        INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')})
        VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
      `;
      await query(insertSQL, originalColumns.map(c => record[c]));
    }

    // Analyze the table and store the results
    const analysis = await analyzeTable(tableName);
    
    // Store the analysis in TABLE_SCHEMA
    await query(
      `INSERT INTO TABLE_SCHEMA (table_name, analysis)
       VALUES ($1, $2)
       ON CONFLICT (table_name) 
       DO UPDATE SET 
         analysis = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [tableName, analysis]
    );

    res.status(200).json({ 
      message: 'CSV data successfully imported to database',
      tableName,
      columnCount: columns.length,
      columnTypes: Object.fromEntries(columnTypes),
      analysis
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
}
