-- JannAI PostgreSQL Reference Schema
-- This schema represents the target PostgreSQL setup with PostGIS and pgvector

-- Enable PostGIS and pgvector extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Villages demographic and infrastructure data
CREATE TABLE villages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    population INTEGER NOT NULL,
    school_count INTEGER NOT NULL,
    hospital_distance_km DOUBLE PRECISION NOT NULL,
    flood_zone BOOLEAN NOT NULL DEFAULT FALSE,
    location GEOMETRY(Point, 4326) NOT NULL
);

-- Index for spatial queries on villages
CREATE INDEX idx_villages_location ON villages USING GIST(location);

-- Raw submissions from citizens (voice, text, photo)
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    audio_url VARCHAR(500),
    photo_url VARCHAR(500),
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_location ON submissions USING GIST(location);

-- Issue threads (clusters of similar problem records)
CREATE TABLE issue_threads (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    representative_record_id INTEGER, -- Updated post-link
    summary TEXT NOT NULL,
    priority_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    -- Store components: { complaintCount, populationExposure, infraGapIndex, citizenUrgency, imageSeverity }
    component_scores JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post-NLP structured data from submissions
CREATE TABLE problem_records (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    thread_id INTEGER REFERENCES issue_threads(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    severity VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    people_affected INTEGER NOT NULL DEFAULT 1,
    urgency DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    recommended_project TEXT,
    keywords TEXT[],
    embedding vector(768), -- Gemini text embeddings are typically 768 dimensions
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_problem_records_location ON problem_records USING GIST(location);
CREATE INDEX idx_problem_records_thread_id ON problem_records(thread_id);

-- Add foreign key constraint to issue_threads for representative record
ALTER TABLE issue_threads ADD CONSTRAINT fk_representative_record 
FOREIGN KEY (representative_record_id) REFERENCES problem_records(id) ON DELETE SET NULL;

-- Seed government plans for match checking
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    budget DOUBLE PRECISION NOT NULL,
    status VARCHAR(100) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX idx_plans_location ON plans USING GIST(location);
