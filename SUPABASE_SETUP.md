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

### 2. Create Storage Bucket

```sql
-- Insert a new storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-files', 'csv-files', false);
```

### 3. Set Up Storage Policies

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
OPENAI_API_KEY=sk-your-openai-key-here
```

## Verification

To verify your setup:

1. Check that the tables were created:
   - Go to Supabase Dashboard > Table Editor
   - You should see `sessions` and `data_profiles` tables

2. Check that the storage bucket was created:
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


