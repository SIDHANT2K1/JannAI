# JannAI — Civic Complaint & Constituency Development Hub

JannAI is a modern, full-stack civic complaint and constituency development planning web application. Citizens report local development issues (roads, water, health, education, sanitation) via text, voice, or photo. An AI pipeline classifies, clusters, and prioritizes these complaints into a ranked list of development projects. Members of Parliament (MPs) can access an explainable dashboard to review hotspots, project details, and AI-justified priority scores.

## Key Features
- **Citizen Submission Flow**: Supports text, photo, and voice message recording with automatic translation/transcription via Gemini. Interactive Leaflet pin fallback for exact coordinate targeting.
- **AI Classification & Extraction**: Uses Google Gemini (Flash model family) to convert unstructured complaints into structured JSON schemas (category, subcategory, severity, urgency, action items).
- **Intelligent Spatial Clustering**: Clusters similar reports into "Issue Threads" using geographic distance bounds (within 5km) and cosine similarity of text embeddings generated via Gemini's embedding endpoint.
- **Explainable Priority Engine**: Combines normalized 0-10 variables including complaint log volume, local population exposure, composite infrastructure gaps (distance to health facilities, school shortages, flood zone status), and urgency. Showcases detailed weighted formulas for policy makers.
- **Interactive MP Dashboard**: Real-time stats, Leaflet marker clustering map, category density filters, expandable project table detailing score components, and AI narrative report downloads.

---

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Leaflet (with OpenStreetMap tiles)
- **Backend**: Node.js + Express
- **Database**: SQLite (powered by `better-sqlite3` as a portable local database engine)
- **AI Integration**: Google Gemini API (Flash and Embedding model families)

---

## Project Structure
```
jannai/
├── package.json              # Monorepo workspaces setup
├── .env                      # App environment settings (API keys)
├── README.md                 # Project user manual
├── backend/
│   ├── server.js             # Express API entrypoint
│   ├── db/
│   │   ├── database.js       # SQLite connection & mathematical helper functions
│   │   ├── schema.sql        # PostgreSQL reference schema (PostGIS/pgvector)
│   │   └── seed.js           # Village demographics, active plans & complaints seeder
│   ├── routes/               # API endpoints
│   └── services/             # Gemini calls, clustering & prioritization logic
└── frontend/
    ├── vite.config.js        # Vite config with backend API proxy
    ├── src/
    │   ├── App.jsx           # Client router
    │   ├── pages/            # Citizen flow, Processing progress & MP dashboard
    │   └── index.css         # Styling, glassmorphic panels, map overrides
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: v18 or higher (tested on v22.15.1)
- **npm**: v9 or higher

### 2. Install dependencies
From the project root directory, run the install script:
```bash
# Installs backend and frontend dependencies in one go
npm run install:all
```
*Alternatively, you can run `npm install` inside `/backend` and `/frontend` sub-folders separately.*

### 3. Environment Setup
Create a `.env` file in the root folder or copy the example template:
```bash
cp .env.example .env
```
Inside `.env`, configure your Gemini API Key:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3001
DATABASE_PATH=./db/jannai.db
```
> **Note**: If `GEMINI_API_KEY` is left blank, JannAI will automatically fall back to clearly-labeled mock stubs. This allows you to test the entire application workflow, pipeline checklist, clustering algorithm, and dashboard calculation models without requiring a live Gemini API token!

### 4. Seed the Database
Initialize the SQLite database with 15 villages, 5 active government plans, and 100 synthetic constituency complaints:
```bash
npm run seed
```

### 5. Run the Application
Start both the Express API server and Vite Dev server concurrently:
```bash
npm run dev
```
- **Citizen Portal**: [http://localhost:5173](http://localhost:5173)
- **MP Dashboard**: [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
- **Express API Health**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
