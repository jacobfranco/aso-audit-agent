# ASO Audit Agent

An AI-powered App Store Optimization audit tool built with [Mastra](https://mastra.ai), Next.js, and GPT-4o.

## Setup

```bash
cp .env.example .env.local
# Fill in OPENAI_API_KEY and FIRECRAWL_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste any Apple App Store URL, and the agent will:
1. Fetch and confirm the app metadata
2. Find top 3 competitors in the same category
3. Generate a full ASO audit with scores and actionable recommendations