Upload flow:
  upload.js → db.js, utils.js, table-analyzer.js, embedding.js

Ad-hoc query flow:
  process-query.js
    → embedding.js (retrieve schema)
    → db.js (execute SQL)
    → agents/index.js
        → analytical-reasoning.js → prompt-template.js → query-ai.js
        → visualization-decision.js → prompt-template.js → query-ai.js
        → output-packaging.js → prompt-template.js → query-ai.js

Shared infrastructure:
  query-ai.js  (all AI calls)
  logger.js    (timing, used only by process-query.js)
  db.js        (all Postgres queries)

# 📦 Core Infrastructure Layer

## `db.js`

**Purpose:** PostgreSQL connection and base database utilities.

**Responsibilities:**

* Creates and manages PostgreSQL connection pool
* Exports:

  * `query()` → Execute any SQL statement
  * `initializeTables()` → Creates the `TABLE_SCHEMA` table on first run

**Used by:**

* Upload pipeline
* ETL
* `data-insights`
* `process-query`

---

## `utils.js`

**Purpose:** CSV upload helper utilities (pure functions).

**Responsibilities:**

* `normalizeColumnName()`
  Cleans column names into safe SQL identifiers.

* `guessSqlType()`
  Maps a sample value to SQL types such as `TEXT`, `NUMERIC`, `DATE`, etc.

**Used only during:**

* CSV upload table creation

---

# 🧠 Schema Intelligence Layer

## `table-analyzer.js`

**Purpose:** AI-based schema description generator (runs once after upload).

**Responsibilities:**

* Calls AI to:

  * Describe each column
  * Produce a structured JSON schema summary
* Stores schema description in:

  * `TABLE_SCHEMA`
* Triggers embedding creation into:

  * `schema_embeddings`

**Triggered after:**

* PostgreSQL table is successfully created

---

## `embedding.js`

**Purpose:** Handles all vector embedding operations (pgvector integration).

**Responsibilities:**

* `generateEmbedding()`
  Converts text into a 768-dimensional vector via Gemini.

* `storeSchemaEmbeddings()`
  Embeds table and column descriptions and stores them in `schema_embeddings`.

* `retrieveRelevantSchema()`
  Given a user question, retrieves the most relevant schema rows using cosine similarity.

**Used by:**

* Upload process (store embeddings)
* `process-query.js` (retrieve relevant schema)

---

# 🤖 AI Gateway Layer

## `query-ai.js`

**Purpose:** Centralized gateway for all Gemini AI calls.

**Features:**

* Retry logic (up to 4 attempts)
* Exponential backoff
* Concurrency queue (max 3 simultaneous calls)

**Exports:**

* `queryAI()` → Plain text response
* `generateJSON()` → Enforces structured JSON output
* `createChat()` → Multi-turn chat session (used by business-chat)

**Used by:**

* Schema analyzer
* Business chat
* SQL generation
* All three reasoning agents

---

# 📊 Monitoring Layer

## `logger.js`

**Purpose:** Performance benchmarking and pipeline logging.

**Responsibilities:**

* `startStep()` / `endStep()` timers
* Logs duration into Supabase `pipeline_logs`
* Produces execution timing summaries

**Used only by:**

* `process-query.js`

---

# 📝 Prompt Layer

## `prompt-template.js`

**Purpose:** Centralized registry of all AI prompt strings.

Contains no logic — only prompt text.

**Includes prompts for:**

* `triage`
* `generateSQL`
* `regenerateSQL`
* `aggregateLargeResult`
* `formatAnswer`
* `validateAnswer`
* `analyticalReasoning`
* `visualizationDecision`
* `outputPackaging`

**Consumed by:**

* `process-query.js`
* Agent wrappers

---

# 🔄 Query Orchestration Layer

## `process-query.js`

**Purpose:** Full ad-hoc query execution pipeline (triggered by “Ask Your Data”).

**Pipeline Flow:**

1. Triage user question
2. Retrieve relevant schema via vector search
3. Generate SQL (SELECT-only with enforced limits)
4. Execute SQL
5. Retry on failure
6. Auto-aggregate if result > 100 rows
7. Pass results to reasoning pipeline (`index.js`)
8. Validate final answer
9. Return structured output

This is the core runtime engine of the system.

---

# 🧩 Reasoning Orchestration Layer

## `index.js`

**Purpose:** Coordinates the 3-agent reasoning pipeline.

**Responsibilities:**

1. Calls Agent 1 → Receives analysis
2. Derives `dataShape` and `columnTypes`
3. Calls Agent 2 → Receives visualization specs
4. Attaches raw data to visualization specs
5. Calls Agent 3 → Produces structured report
6. Returns combined result to `process-query.js`

Operates strictly on SQL result rows.

---

# 🧠 AI Agents (Reasoning Layer)

## `analytical-reasoning.js`

**Agent 1 — Insight Engine**

**Responsibilities:**

* Uses `prompts.analyticalReasoning`
* Calls `generateJSON()`
* Extracts:

  * Trends
  * Distributions
  * Comparisons
  * Outliers
  * KPI deviations
  * Growth rates
  * Percentage contribution

**Important:**

* Does NOT run SQL
* Does NOT retrieve embeddings
* Operates only on SQL result rows

---

## `visualization-decision.js`

**Agent 2 — Visualization Intelligence**

**Responsibilities:**

* Uses `prompts.visualizationDecision`
* Calls `generateJSON()`
* Determines:

  * Chart type
  * X-axis
  * Y-axis
  * Grouping logic

**Chart Mapping Examples:**

* Category comparison → Bar chart
* Time series → Line chart
* Distribution → Histogram
* Contribution % → Pie or stacked bar
* Correlation → Scatter plot

Outputs JSON chart specifications only.

---

## `output-packaging.js`

**Agent 3 — Business Report Formatter**

**Responsibilities:**

* Uses `prompts.outputPackaging`
* Calls `generateJSON()`
* Produces:

  * Executive summary
  * Bullet-point insights
  * KPI highlights
  * Strategic implications
  * Recommendations
  * Dashboard-ready visualization JSON

**Important:**

* Never renders charts
* Only returns structured JSON for frontend rendering




