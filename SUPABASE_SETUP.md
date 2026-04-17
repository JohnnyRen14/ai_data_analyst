# Supabase Database Setup Guide

This guide will help you set up the required database schema in Supabase for the AI Data Analytics Platform.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Project Settings > API

## Database Schema

Run the following SQL in the Supabase SQL Editor to create the required tables and storage:

### 1. Create Tables

```sql
-- Sessions table to track analysis sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_path TEXT,
  status TEXT DEFAULT 'uploaded',
  business_objectives JSONB,
  analysis_plan JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data profiles table to store metadata about processed data
CREATE TABLE data_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  columns JSONB NOT NULL,
  row_count INTEGER,
  data_types JSONB,
  statistics JSONB,
  preprocessing_applied JSONB DEFAULT '[]'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_data_profiles_session_id ON data_profiles(session_id);
```

### 2. Enable pgvector & Create Embedding Tables

```sql
-- Enable the pgvector extension (built-in on Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Schema embeddings table for vector similarity search
CREATE TABLE schema_embeddings (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  column_name TEXT,
  description TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX schema_embeddings_embedding_idx
ON schema_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by table_name (used during idempotent re-upload)
CREATE INDEX schema_embeddings_table_name_idx
ON schema_embeddings (table_name);

-- Pipeline logs table for metrics and debugging
CREATE TABLE pipeline_logs (
  id BIGSERIAL PRIMARY KEY,
  query_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying logs by query_id
CREATE INDEX pipeline_logs_query_id_idx ON pipeline_logs (query_id);
```

### 3. Create Vector Search Function

```sql
-- RPC function for cosine similarity search on schema embeddings.
-- Called from the app via supabase.rpc('match_schema_embeddings', { query_embedding, match_count })
CREATE OR REPLACE FUNCTION match_schema_embeddings(
  query_embedding vector(768),
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  table_name text,
  column_name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.table_name,
    se.column_name,
    se.description,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM schema_embeddings se
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 4. Create Storage Bucket

```sql
-- Insert a new storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-files', 'csv-files', false);
```

### 5. Set Up Storage Policies

```sql
-- Policy to allow uploads
CREATE POLICY "Allow uploads to csv-files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'csv-files');

-- Policy to allow downloads
CREATE POLICY "Allow downloads from csv-files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'csv-files');

-- Policy to allow deletes
CREATE POLICY "Allow deletes from csv-files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'csv-files');
```

## Update Environment Variables

After setting up the database, update your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Verification

To verify your setup:

1. Check that the tables were created:
   - Go to Supabase Dashboard > Table Editor
   - You should see `sessions`, `data_profiles`, `schema_embeddings`, and `pipeline_logs` tables

2. Check that pgvector is enabled:
   - Run `SELECT * FROM pg_extension WHERE extname = 'vector'` in SQL Editor
   - Should return one row

3. Check that the RPC function exists:
   - Run `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'match_schema_embeddings'`
   - Should return one row

4. Check that the storage bucket was created:
   - Go to Supabase Dashboard > Storage
   - You should see `csv-files` bucket

3. Test a file upload:
   - Run your Next.js app
   - Upload a CSV file
   - Check the storage bucket and sessions table

## Troubleshooting

### Storage Bucket Not Found

If you get "Bucket not found" errors:

1. Verify the bucket exists in Storage dashboard
2. Check that the bucket name is exactly `csv-files`
3. Ensure storage policies are set up correctly

### Permission Denied

If you get permission errors:

1. Check RLS policies are correctly set up
2. Verify your anon key is correct in `.env`
3. Try disabling RLS temporarily for testing

### Connection Errors

If you can't connect to Supabase:

1. Verify your project URL is correct
2. Check your anon key is the "anon/public" key, not the service key
3. Ensure the project is not paused (free tier project sleep after inactivity)


