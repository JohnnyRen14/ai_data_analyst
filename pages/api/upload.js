import formidable from 'formidable';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { supabase } from '../../lib/supabaseClient';

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
    // Parse form data
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'tmp'),
      keepExtensions: true,
    });

    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

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

    // Create session in Supabase
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert([
        {
          file_name: file.originalFilename || 'unknown.csv',
          status: 'uploaded',
        },
      ])
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Upload file to Supabase Storage
    const fileName = `${session.id}/${file.originalFilename}`;
    const { error: uploadError } = await supabase.storage
      .from('csv-files')
      .upload(fileName, fileContent, {
        contentType: 'text/csv',
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
    }

    // Clean up local file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      sessionId: session.id,
      fileName: file.originalFilename,
      rowCount: records.length,
      preview: records.slice(0, 5),
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}
