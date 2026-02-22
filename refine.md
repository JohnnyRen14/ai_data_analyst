The AI pipeline reorganized into three main layers:

Data Layer – stores CSV data in PostgreSQL and session/metadata in Supabase. No AI is needed here.

Schema Intelligence Layer – replaces the inefficient SELECT * FROM TABLE_SCHEMA. On upload, each table and column receives a text description and a 768-dim embedding stored in pgvector (table_name, column_name, description, embedding). On query, the user question is embedded and used to retrieve the top 10 relevant schema rows, which are then sent to the LLM. This improves relevancy and reduces API load.

Reasoning Layer – begins with triage, followed by generating SQL using only the relevant schema, enforcing SELECT-only and result limits. Large query results (>100 rows) are aggregated or summarized before reaching the LLM. 
A three-agent pipeline processes the SQL results:

    Analytical Reasoning Agent: identifies trends, distributions, comparisons, outliers, KPI deviations, % contributions, and strategic insights.

    Visualization Decision Agent: determines the best chart type based on dataset shape (bar, line, histogram, pie/stacked, scatter) and outputs chart specs in JSON.

    Output Packaging Agent: compiles a final structured output with summary text, bullet-point insights, KPI highlights, and visualization JSON ready for frontend rendering.


When a user uploads a CSV, the file is stored in Supabase Storage, and a session is created in the sessions table. The CSV is parsed, and a corresponding PostgreSQL table is created for the data. An AI analyzes the table to generate column and table descriptions, which are stored in TABLE_SCHEMA (text) and schema_embeddings (vector embeddings for semantic retrieval). The system optionally profiles the data, storing statistics in data_profiles.

When the user asks a question, the AI converts the query into a vector and retrieves relevant schema columns from schema_embeddings, then generates and executes a SQL query against the PostgreSQL table. If the result is large, it can be aggregated. The query results are passed through a 3-agent reasoning pipeline: the Analytical Reasoning Agent finds trends and outliers, the Visualization Decision Agent selects chart types, and the Output Packaging Agent structures the response into a summary, insights, KPIs, visualizations, and recommendations.

Finally, the frontend renders the results via VisualizationPanel and InsightsCard, while pipeline_logs in Supabase track metrics and debugging information. This setup ensures efficient storage, semantic schema retrieval, automated SQL querying, and business intelligence-ready output.