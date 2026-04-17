# FINAL README: AI Data Analyst Repository

## 1. What This Repository Is Building

This project is a full-stack AI analytics application where a user can:

1. Upload a CSV file.
2. Automatically ingest it into PostgreSQL.
3. Let AI infer and describe schema semantics.
4. Ask business questions in chat.
5. Generate descriptive, predictive, and prescriptive insights.
6. Run ad-hoc natural-language queries that are converted to SQL.
7. View chart recommendations and rendered visualizations.

In short: it is an AI-powered business intelligence workflow on top of uploaded tabular data.

## 2. Tech Stack and Runtime

- Frontend: Next.js 16 + React 19
- API layer: Next.js API routes in pages/api
- Database:
  - PostgreSQL (direct connection via pg) for uploaded table data and TABLE_SCHEMA
  - Supabase (PostgreSQL + Storage + RPC + pgvector) for sessions, profiles, embeddings, and pipeline logs
- AI: Google Gemini via @google/genai
- Charting: @mui/x-charts
- CSV parsing/upload: formidable + csv-parse
- Concurrency control: p-limit for AI request queueing

## 3. End-to-End Product Flow

### 3.1 Landing and Upload

- User starts on pages/index.js.
- components/FileUploader.js posts multipart form data to pages/api/upload.js.
- Upload API:
  - Parses CSV.
  - Creates a session row in Supabase sessions.
  - Uploads original CSV into Supabase storage bucket csv-files.
  - Creates/recreates a PostgreSQL table named from file/tableName.
  - Inserts all CSV rows into that table.
  - Profiles data and writes data_profiles.
  - Runs table-analyzer and stores schema text + schema embeddings.

### 3.2 ETL Preview

- pages/analysis/[sessionId].js calls pages/api/etl.js.
- ETL route now only reads existing profile and fetches first 100 table rows.
- Session status moves to etl_complete.

### 3.3 Business Understanding Chat

- components/ChatInterface.js calls pages/api/business-chat.js.
- Route uses backend/query-ai createChat with context from sessions + data_profiles.
- On completion, route generates a structured business plan and stores it in sessions.business_objectives.
- Status moves to business_understanding_complete.

### 3.4 Data Insights Generation

- pages/api/data-insights.js is called.
- It:
  - Loads session/profile.
  - Pulls true table columns from information_schema.
  - Builds SQL for business questions (AI-generated), validates, executes.
  - Generates 3-tier analytics (descriptive, predictive, prescriptive).
  - Generates visualization SQL + metadata, validates and executes.
  - Stores status data_understanding_complete.

### 3.5 Final Analysis Summary

- pages/api/generate-analysis.js produces a final 3-section summary object.
- Stores it in sessions.analysis_plan.
- Status moves to analysis_complete.

### 3.6 Ad-hoc Ask-Your-Data Queries

- User asks a free-form question in analysis page.
- pages/api/query.js delegates to backend/process-query.js.
- process-query pipeline:
  1. Triage question type (general/data/out-of-scope).
  2. For data questions, retrieve top schema chunks via vector search.
  3. Generate SQL from relevant schema only.
  4. Execute query; retry regeneration on failure.
  5. Auto-aggregate if result is too large.
  6. Run 3-agent reasoning pipeline.
  7. Validate final answer.
  8. Return summary, insights, KPIs, recommendations, and visualization specs.

## 4. Architecture by Layer

## 4.1 Data and Persistence Layer

- backend/db.js
  - PostgreSQL pool using DB_* env vars.
  - query utility.
  - initializeTables creates TABLE_SCHEMA if needed.

- lib/supabaseClient.js
  - supabase: public anon client.
  - supabaseAdmin: service-role capable client (falls back to anon if service key missing).

- Supabase tables expected (from SUPABASE_SETUP.md + runtime code):
  - sessions
  - data_profiles
  - schema_embeddings (vector(768))
  - pipeline_logs

- Supabase storage bucket expected:
  - csv-files

- Supabase RPC expected:
  - match_schema_embeddings(query_embedding, match_count)

## 4.2 Schema Intelligence Layer

- backend/table-analyzer.js
  - Samples table rows.
  - Builds per-column data dictionary.
  - Calls AI to generate JSON descriptions.
  - Writes embeddings via backend/embedding.js.

- backend/embedding.js
  - Uses model gemini-embedding-001.
  - Generates 768-dim embeddings.
  - Stores one table-level + per-column embedding rows.
  - retrieveRelevantSchema uses Supabase RPC vector similarity search.

## 4.3 AI Gateway and Prompt Layer

- backend/query-ai.js
  - Unified Gemini gateway.
  - Queue limit: 3 concurrent calls.
  - Retry with exponential backoff.
  - Detects non-retryable permanent free-tier quota situations for certain models.
  - Exposes generateContent, generateJSON, createChat, queryAI.

- backend/prompt-template.js
  - Prompt registry for:
    - triage/general answer
    - SQL generation/regeneration
    - auto-aggregation
    - answer validation
    - 3 reasoning agents

## 4.4 Orchestration and Reasoning Layer

- backend/process-query.js
  - Main orchestration for ad-hoc Q&A.
  - Integrates retrieval, SQL execution, retries, and reasoning.

- backend/logger.js
  - Step timers and per-step telemetry.
  - Writes pipeline logs to Supabase.

- backend/agents/index.js
  - Runs 3-agent sequence:
    1. analytical-reasoning
    2. visualization-decision
    3. output-packaging

- backend/agents/analytical-reasoning.js
  - Extracts trends, distributions, outliers, comparisons, KPI movement.

- backend/agents/visualization-decision.js
  - Chooses chart specs based on shape/type signals.

- backend/agents/output-packaging.js
  - Produces executive summary, insights, KPIs, recommendations.

## 4.5 Frontend/UI Layer

### Core pages

- pages/index.js
  - Hero + uploader + workflow explanation.

- pages/analysis/[sessionId].js
  - Main multi-stage orchestration UI.
  - Loads ETL preview, business chat, insights, visualizations, final analysis.
  - Includes ad-hoc Ask Your Data interface.

- pages/_app.js
  - Applies global styling + Aurora animated background.

- pages/_document.js
  - Standard document wrapper.

### Components

- components/Layout.js
  - Global shell + workflow progress step header.

- components/FileUploader.js
  - Drag/drop upload + API call.

- components/DataPreview.js
  - Table preview with pagination.

- components/ChatInterface.js
  - Business-context capture chat.

- components/VisualizationPanel.js
  - Renders line/bar/scatter/pie charts from normalized viz specs.

- components/InsightsCard.js
  - Displays summaries, KPI blocks, insights, and recommendations.

- components/Aurora.js
  - WebGL/OGL animated aurora shader background.

- components/Stepper.js and components/Stepper.css
  - Reusable animated stepper component (currently not the primary step UI in Layout).

### Styling

- styles/globals.css
  - Defines visual system: dark glassmorphism theme, gradients, badges, buttons, chat styles, animations.

### Static assets

- public/*.svg and public/favicon.ico
  - Basic static icon assets used by Next.js defaults and browser tab metadata.

## 5. API Route Inventory

- POST /api/upload
  - Unified ingestion + table build + profiling + schema analysis + embeddings.

- POST /api/etl
  - Lightweight read endpoint for preview and profile retrieval.

- POST /api/business-chat
  - Business objective elicitation and plan persistence.

- POST /api/data-insights
  - Business-question SQL answering + 3-tier insight generation + visualization queries.

- POST /api/generate-analysis
  - Final high-level analysis package.

- POST /api/query
  - Ad-hoc natural language question pipeline through backend/process-query.

## 6. Environment Variables Used by Code

Required/used:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (optional fallback exists, but strongly recommended for admin operations)
- GEMINI_API_KEY
- GEMINI_MODEL (optional; defaults to gemini-3-flash-preview)
- DB_USER
- DB_PASSWORD
- DB_HOST
- DB_PORT
- DB_NAME

Also present in env templates/docs:

- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (not actively used in current source logic)

## 7. Practical Behavior and Constraints

- SQL safety:
  - Multiple paths enforce SELECT-only behavior before execution.
  - data-insights also validates quoted identifiers against true DB column names.

- Performance safety:
  - AI call concurrency is capped.
  - Retries on transient AI failures.
  - Auto-aggregation attempts to reduce very large result sets.

- Observability:
  - Query pipeline timings and metadata can be logged to pipeline_logs.
  - In non-production, ad-hoc query responses include _metrics for debugging.

## 8. Status Machine Across Workflow

Typical session statuses:

1. uploaded
2. etl_complete
3. business_understanding_complete
4. data_understanding_complete
5. analysis_complete

## 9. Notable Repository Details

- README.md and docs describe the intended architecture well, but some references are outdated (for example, OpenAI wording while code uses Gemini, and mention of endpoints that are no longer primary).
- The true runtime architecture is best represented by upload.js + process-query.js + the 3-agent backend pipeline.
- The UI has a polished dark glassmorphism aesthetic with an animated aurora shader and MUI chart rendering.

## 10. Setup Summary

1. Install dependencies.
2. Configure .env with Supabase, Gemini, and Postgres credentials.
3. Run SQL setup from SUPABASE_SETUP.md (tables, vector extension, RPC, storage policies).
4. Start dev server.
5. Upload CSV and use the analysis workflow.

## 11. Security Reminder

The local .env currently contains real credentials and API keys. Treat them as sensitive secrets:

- Do not commit .env to source control.
- Rotate any keys that were shared or exposed.
- Prefer scoped keys and least privilege in production.

---

This FINAL_README.md reflects the actual implemented code paths and module responsibilities in the current repository state.