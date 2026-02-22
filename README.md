# AI Data Analytics Platform

A comprehensive AI-powered data analytics platform that transforms CSV data into actionable insights through automated ETL, intelligent preprocessing, and multi-dimensional analysis.

![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black)
![Supabase](https://img.shields.io/badge/Supabase-Integrated-green)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-blue)

## ✨ Features

### 🔄 Smart ETL Pipeline

- Automatic CSV parsing and data type inference
- Intelligent data cleaning (duplicates, missing values)
- Statistical profiling and data quality assessment

### ⚙️ Advanced Preprocessing

- Z-Score normalization
- Min-Max scaling
- AI-recommended preprocessing strategies

### 💡 Business Understanding

- Conversational AI interface to capture objectives
- Dynamic questionnaire system
- Automated analysis plan generation

### 📊 Data Understanding

- Automated data profiling
- Pattern and correlation detection
- AI-powered insight generation

### 📈 Interactive Visualizations

- Line, Bar, Scatter, and Pie charts
- Dynamic visualization recommendations
- Responsive design with Recharts

### 🎯 Triple Analysis Framework

1. **Descriptive**: What happened in the data
2. **Predictive**: What's likely to happen
3. **Prescriptive**: What actions to take

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up here](https://supabase.com))
- Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))
- PostgreSQL database (can use Supabase PostgreSQL)

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd ai_data_analyst
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Create the required tables and storage bucket

4. **Configure environment variables**

   Update `.env` with your credentials:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-3-flash-preview
   DB_USER=your-db-user
   DB_HOST=your-db-host
   DB_NAME=your-db-name
   DB_PASSWORD=your-db-password
   DB_PORT=5432
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### 1. Upload CSV File

- Drag and drop your CSV file or click to browse
- Supports standard CSV format with headers

### 2. ETL & Preview

- Automatic data cleaning and type inference
- View data preview with pagination
- See statistics for each column

### 3. Preprocessing (Optional)

- Choose normalization method (Z-Score or Min-Max)
- Apply to numeric columns automatically

### 4. Business Understanding

- Chat with AI about your objectives
- AI asks targeted questions
- Generates analysis plan based on your goals

### 5. Data Insights

- View automated data quality assessment
- Discover patterns and correlations
- Get AI recommendations

### 6. Visualizations

- View AI-generated charts and graphs
- Interactive visualizations with Recharts

### 7. Comprehensive Analysis

- **Descriptive**: Current state insights
- **Predictive**: Future trend forecasts
- **Prescriptive**: Actionable recommendations

## 🏗️ Architecture

```
ai_data_analyst/
├── components/          # React components
│   ├── Layout.js       # Main layout with sidebar
│   ├── FileUploader.js # CSV upload component
│   ├── DataPreview.js  # Data table with pagination
│   ├── ChatInterface.js# AI chat for business understanding
│   ├── VisualizationPanel.js # Charts display
│   └── InsightsCard.js # Analysis cards
├── pages/
│   ├── index.js        # Landing page
│   ├── analysis/[sessionId].js # Main dashboard
│   └── api/            # API routes
│       ├── upload.js   # File upload handler
│       ├── etl.js      # ETL processing
│       ├── preprocess.js # Normalization
│       ├── business-chat.js # AI conversation
│       ├── data-insights.js # Data analysis
│       └── generate-analysis.js # Final insights
├── lib/
│   ├── supabaseClient.js # Supabase config
│   └── openaiClient.js   # OpenAI config
└── styles/
    └── globals.css     # Global styles & design system
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) + Direct PostgreSQL connection
- **Storage**: Supabase Storage
- **AI**: Google Gemini (configurable model via `GEMINI_MODEL` env var)
- **Charts**: MUI X Charts
- **Data Processing**: CSV-Parse, Simple-Statistics

## 🔐 Security Notes

- Gemini API key is server-side only (never exposed to client)
- Supabase Row Level Security can be enabled for multi-user auth
- File uploads are validated for CSV format
- All API routes include error handling
- SQL queries are validated (SELECT-only) before execution

## 🎨 Design System

The platform features a premium dark theme with:

- Glassmorphism effects
- Gradient accents
- Smooth animations
- Responsive layout
- Custom scrollbars

## 📝 Environment Variables

| Variable                        | Description                  | Required | Default                    |
| ------------------------------- | ---------------------------- | -------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL    | Yes      | -                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key       | Yes      | -                          |
| `GEMINI_API_KEY`                | Google Gemini API key        | Yes      | -                          |
| `GEMINI_MODEL`                  | Gemini model name            | No       | `gemini-3-flash-preview`   |
| `DB_USER`                       | PostgreSQL database user     | Yes      | -                          |
| `DB_HOST`                       | PostgreSQL database host     | Yes      | -                          |
| `DB_NAME`                       | PostgreSQL database name     | Yes      | -                          |
| `DB_PASSWORD`                   | PostgreSQL database password | Yes      | -                          |
| `DB_PORT`                       | PostgreSQL database port     | No       | `5432`                     |

## 🐛 Troubleshooting

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)

### Supabase Connection Issues

- Verify your Supabase URL and anon key
- Check that database tables are created (see SUPABASE_SETUP.md)
- Ensure storage bucket `csv-files` exists

### Gemini API Errors

- Verify your API key is valid
- Check you have available credits
- Ensure API key is in `.env` without quotes
- Verify the model name in `GEMINI_MODEL` is correct (default: `gemini-3-flash-preview`)
- **Free Tier Models**: If you're on the free tier, use `gemini-1.5-flash` or `gemini-3-flash-preview`. Models like `gemini-2.5-pro` require a paid plan and have no free tier quota.
- **Quota Errors**: If you see "Quota exceeded" errors, check:
  - Your model supports free tier (use flash models, not pro models)
  - You haven't exceeded daily/minute rate limits
  - Your API key has proper permissions

## 📄 License

This project is created for educational and demonstration purposes.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

Built with ❤️ using Next.js, Supabase, and OpenAI
