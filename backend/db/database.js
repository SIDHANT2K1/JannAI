const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(__dirname, '..', process.env.DATABASE_PATH)
  : path.resolve(__dirname, '..', 'db', 'jannai.db');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Clean up database if it was partially created with schema errors
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
  } catch (err) {
    console.warn("Could not remove old DB file, attempting to recreate tables", err);
  }
}

const db = new Database(dbPath, { verbose: null });

// Initialize SQLite Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS villages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    population INTEGER NOT NULL,
    school_count INTEGER NOT NULL,
    hospital_distance_km REAL NOT NULL,
    flood_zone INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
    lat REAL NOT NULL,
    lng REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT NOT NULL,
    language TEXT NOT NULL,
    audio_url TEXT,
    photo_url TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS issue_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    representative_record_id INTEGER,
    summary TEXT,
    priority_score REAL NOT NULL DEFAULT 0.0,
    component_scores TEXT NOT NULL DEFAULT '{}', -- Store JSON string of scores
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER,
    thread_id INTEGER,
    category TEXT,
    subcategory TEXT,
    severity TEXT,
    summary TEXT,
    people_affected INTEGER NOT NULL DEFAULT 1,
    urgency REAL NOT NULL DEFAULT 5.0,
    recommended_project TEXT,
    keywords TEXT,
    embedding TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (thread_id) REFERENCES issue_threads(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    budget REAL NOT NULL,
    status TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
  );
`);

// Mathematical / Geometric Utilities in JS (substitute for pgvector and PostGIS)
// Cosine Similarity: A . B / (||A|| * ||B||)
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Haversine formula to compute distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = {
  db,
  cosineSimilarity,
  haversineDistance
};
