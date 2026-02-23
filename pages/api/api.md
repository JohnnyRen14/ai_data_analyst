# 📡 API Routes — `/pages/api`

All routes are Next.js API handlers (HTTP POST unless noted). They sit between the frontend and the backend modules in `/backend`.

---

## Request Flow Overview

```
Frontend (pages/analysis/[sessionId].js)
  │
  ├── POST /api/upload          ← File upload entry point
  ├── POST /api/etl             ← Load stored profile + preview rows
  ├── POST /api/business-chat   ← Conversational business objective gathering
  ├── POST /api/data-insights   ← Three-tier analytics report + visualizations
  ├── POST /api/generate-analysis  ← Final descriptive/predictive/prescriptive summary
  └── POST /api/query           ← Ad-hoc natural language → SQL → insights
```

---

## `upload.js`

**Triggered by:** File upload on the homepage (`/`).

**Responsibilities:**

* Parses the uploaded CSV using `formidable` + `csv-parse`
* Infers column types (`number`, `date`, `string`) by sampling up to 100 rows
* Builds a data profile: column list, row count, data types, per-column statistics (min/max/mean for numbers; unique count for strings)
* Deduplicates rows before inserting
* Creates a PostgreSQL table via `db.js` with normalized column names (`utils.normalizeColumnName`, `utils.guessSqlType`)
* Inserts all CSV rows into that table
* Stores the data profile in Supabase `data_profiles`
* Creates a session record in Supabase `sessions`
* Triggers `table-analyzer.js` → AI schema description → vector embeddings via `embedding.js`

**Backend modules used:**
`db.js`, `utils.js`, `table-analyzer.js`, `embedding.js`

**Returns:**
```json
{ "success": true, "sessionId": "uuid", "profile": { ... } }
```

---

## `etl.js`

**Triggered by:** Analysis page on load (`useEffect` when `sessionId` is set).

**Responsibilities:**

* Reads the already-stored `data_profiles` record from Supabase (no re-parsing)
* Fetches the first 100 preview rows directly from the PostgreSQL table
* Updates session status to `etl_complete`

> Note: All heavy ETL work (type inference, statistics, row insertion) now happens in `upload.js`. This endpoint is lightweight read-only.

**Backend modules used:**
`db.js`, `supabaseClient.js`

**Returns:**
```json
{ "success": true, "data": [...rows], "columns": [...], "rowCount": 0, "statistics": {}, "dataTypes": {} }
```

---

## `business-chat.js`

**Triggered by:** `ChatInterface` component during Step 3 (Business Understanding).

**Responsibilities:**

* Accepts the full conversation `messages` array and `sessionId`
* Loads session context (file name, row count, columns) from Supabase for the AI system prompt
* Opens a multi-turn Gemini chat session via `query-ai.createChat()`
* On each turn, sends the latest user message and returns the AI reply
* Detects conversation completion when the AI signals it has enough information and the user confirms ("yes")
* On completion: generates a structured `businessPlan` JSON (`objectives`, `keyMetrics`, `expectedInsights`, `recommendedVisualizations`) and stores it on the session record

**Backend modules used:**
`query-ai.js` (`createChat`, `generateJSON`), `supabaseClient.js`

**Returns (mid-conversation):**
```json
{ "message": "AI reply text", "complete": false }
```

**Returns (on completion):**
```json
{ "message": "AI reply text", "complete": true, "businessPlan": { ... } }
```

---

## `data-insights.js`

**Triggered by:** `handleBusinessComplete` → auto-called after Business Understanding finishes (Step 4).

**Responsibilities:**

1. Loads session, data profile, and actual column names from PostgreSQL (`information_schema`)
2. Extracts business objectives/questions from the stored `businessPlan`
3. Generates SQL queries to answer each business question via `generateJSON()`
4. Validates all generated SQL (SELECT-only, column names must exist in table)
5. Executes each business query and attaches result rows
6. Calls AI for a **three-tier analytics report**:
   - **Descriptive** (2 items) — What Happened? Historical findings with `title`, `finding`, `details`
   - **Predictive** (2 items) — What Might Happen? Forecasts with `title`, `forecast`, `confidence`, `details`
   - **Prescriptive** (2 items) — What Should We Do? Actions with `title`, `action`, `expectedOutcome`, `details`
7. Generates visualization specs (chart type, SQL query, axis keys)
8. Validates and executes visualization SQL queries; attaches row data
9. Updates session status to `data_understanding_complete`

**Backend modules used:**
`query-ai.js` (`generateJSON`), `db.js`, `supabaseClient.js`

**Returns:**
```json
{
  "success": true,
  "insights": {
    "summary": "...",
    "descriptive": [...],
    "predictive": [...],
    "prescriptive": [...],
    "visualizations": [...],
    "businessAnswers": [...]
  },
  "businessAnswers": [...]
}
```

---

## `generate-analysis.js`

**Triggered by:** "Generate AI Analysis" button (Step 6 → Step 7).

**Responsibilities:**

* Loads session, data profile, and stored business objectives
* Calls `generateJSON()` with a prompt for a final three-section analysis report:
  - `descriptive` — Summary + key findings from current data
  - `predictive` — Summary + trend predictions and forecasts
  - `prescriptive` — Summary + actionable recommendations
* Stores the result in `sessions.analysis_plan`
* Updates session status to `analysis_complete`

**Backend modules used:**
`query-ai.js` (`generateJSON`), `supabaseClient.js`

**Returns:**
```json
{ "success": true, "analysis": { "descriptive": {...}, "predictive": {...}, "prescriptive": {...} } }
```

---

## `query.js`

**Triggered by:** "Ask Your Data" input (available from Step 4 onward).

**Responsibilities:**

* Accepts a natural language `message`
* Delegates entirely to `process-query.js` which runs the full ad-hoc pipeline:
  1. Triage question type
  2. Retrieve relevant schema via vector embedding search
  3. Generate + execute SQL
  4. Retry on failure; auto-aggregate if > 100 rows
  5. Run 3-agent reasoning pipeline (analytical reasoning → visualization decision → output packaging)
  6. Validate final answer
* Strips internal `_metrics` timing data in production

**Backend modules used:**
`process-query.js` (orchestrates all backend agents)

**Returns:**
```json
{
  "response": "Natural language answer",
  "insights": [...],
  "kpis": {},
  "recommendations": [...],
  "visualization": [...],
  "_metrics": { "totalDurationMs": 0, "steps": [...] }
}
```

---

## Session Status Progression

```
(upload)   → uploaded
(etl)      → etl_complete
(business) → business_understanding_complete
(insights) → data_understanding_complete
(analysis) → analysis_complete
```
