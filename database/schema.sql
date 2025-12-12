-- Mega Internal V1 - Visa Generation Tool
-- Supabase Database Schema
-- Created: November 28, 2025

-- ============================================
-- CORE TABLES
-- ============================================

-- Petition Cases Table
-- Stores all petition case metadata and status
CREATE TABLE IF NOT EXISTS petition_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT UNIQUE NOT NULL,

    -- Beneficiary Information
    beneficiary_name TEXT NOT NULL,
    profession TEXT NOT NULL,
    visa_type TEXT NOT NULL CHECK (visa_type IN ('O-1A', 'O-1B', 'P-1A', 'EB-1A', 'EB-2 NIW')),
    nationality TEXT,
    current_status TEXT,
    field_of_expertise TEXT,
    background_info TEXT,

    -- Petitioner Information
    petitioner_name TEXT,
    petitioner_organization TEXT,
    additional_info TEXT,

    -- Case Status
    status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'researching', 'generating', 'generating_exhibits', 'completed', 'failed', 'exhibit_generation_failed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_stage TEXT,
    current_message TEXT,
    error_message TEXT,

    -- Exhibit Generation Tracking
    exhibit_generation_progress INTEGER DEFAULT 0 CHECK (exhibit_generation_progress >= 0 AND exhibit_generation_progress <= 100),
    exhibit_package_url TEXT,
    exhibit_toc_url TEXT,
    total_exhibits INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Metadata
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,

    -- Indexes
    CONSTRAINT case_id_format CHECK (case_id ~ '^[A-Z0-9]{8,12}$')
);

-- Case URLs Table
-- Stores all URLs associated with a petition case
CREATE TABLE IF NOT EXISTS case_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT NOT NULL REFERENCES petition_cases(case_id) ON DELETE CASCADE,

    -- URL Information
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,

    -- Source Information
    source_type TEXT NOT NULL CHECK (source_type IN ('initial', 'perplexity', 'manual', 'ai_lookup')),
    source_name TEXT,
    quality_tier INTEGER CHECK (quality_tier IN (1, 2, 3)),

    -- Evidence Information
    criteria TEXT[], -- Array of criteria this URL supports
    evidence_type TEXT,
    key_content TEXT,
    date_published TEXT,

    -- Archive Information
    archived BOOLEAN DEFAULT FALSE,
    archive_url TEXT,
    archive_date TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(case_id, url)
);

-- Case Files Table
-- Stores uploaded files metadata
CREATE TABLE IF NOT EXISTS case_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT NOT NULL REFERENCES petition_cases(case_id) ON DELETE CASCADE,

    -- File Information
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'image', 'txt')),
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT,

    -- Categorization
    category TEXT CHECK (category IN ('resume', 'award', 'publication', 'media', 'letter', 'other')),

    -- Processing Information
    extracted_text TEXT,
    word_count INTEGER,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,

    -- Storage
    storage_path TEXT NOT NULL,
    storage_url TEXT,

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Generated Documents Table
-- Stores all generated petition documents
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT NOT NULL REFERENCES petition_cases(case_id) ON DELETE CASCADE,

    -- Document Information
    document_number INTEGER NOT NULL CHECK (document_number BETWEEN 1 AND 8),
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,

    -- Content
    content TEXT, -- Full markdown/text content
    word_count INTEGER,
    page_estimate INTEGER,

    -- Storage
    storage_path TEXT,
    storage_url TEXT NOT NULL,
    file_size_bytes BIGINT,

    -- Generation Metadata
    tokens_used INTEGER,
    generation_time_seconds INTEGER,
    model_used TEXT DEFAULT 'claude-sonnet-4-5',

    -- Timestamps
    generated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(case_id, document_number)
);

-- Exhibit PDFs Table
-- Stores exhibit PDFs with numbering
CREATE TABLE IF NOT EXISTS exhibit_pdfs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT NOT NULL REFERENCES petition_cases(case_id) ON DELETE CASCADE,

    -- Exhibit Information
    exhibit_number TEXT NOT NULL, -- e.g., "A", "B", "C"
    exhibit_title TEXT NOT NULL,
    source_url TEXT NOT NULL,

    -- Archive Information
    archive_url TEXT,

    -- PDF Information
    pdf_storage_path TEXT,
    pdf_storage_url TEXT,
    pdf_size_bytes BIGINT,

    -- Status
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    generation_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ,

    -- Constraints
    UNIQUE(case_id, exhibit_number)
);

-- Research Sessions Table
-- Tracks Perplexity research sessions
CREATE TABLE IF NOT EXISTS research_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT NOT NULL REFERENCES petition_cases(case_id) ON DELETE CASCADE,

    -- Research Information
    beneficiary_title TEXT,
    beneficiary_level TEXT,
    research_strategy TEXT,

    -- Results
    total_sources_found INTEGER DEFAULT 0,
    tier1_count INTEGER DEFAULT 0,
    tier2_count INTEGER DEFAULT 0,
    tier3_count INTEGER DEFAULT 0,
    criteria_coverage TEXT[],
    research_summary TEXT,

    -- API Usage
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost DECIMAL(10, 4),

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_petition_cases_case_id ON petition_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_petition_cases_status ON petition_cases(status);
CREATE INDEX IF NOT EXISTS idx_petition_cases_created_at ON petition_cases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_urls_case_id ON case_urls(case_id);
CREATE INDEX IF NOT EXISTS idx_case_urls_source_type ON case_urls(source_type);
CREATE INDEX IF NOT EXISTS idx_case_urls_quality_tier ON case_urls(quality_tier);

CREATE INDEX IF NOT EXISTS idx_case_files_case_id ON case_files(case_id);
CREATE INDEX IF NOT EXISTS idx_case_files_category ON case_files(category);

CREATE INDEX IF NOT EXISTS idx_generated_documents_case_id ON generated_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_number ON generated_documents(document_number);

CREATE INDEX IF NOT EXISTS idx_exhibit_pdfs_case_id ON exhibit_pdfs(case_id);

CREATE INDEX IF NOT EXISTS idx_research_sessions_case_id ON research_sessions(case_id);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_petition_cases_updated_at
    BEFORE UPDATE ON petition_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Note: For internal tool, we'll keep it simple
-- In production, you'd add more granular policies

ALTER TABLE petition_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibit_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (used by API)
CREATE POLICY "Allow all for service role" ON petition_cases
    FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON case_urls
    FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON case_files
    FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON generated_documents
    FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON exhibit_pdfs
    FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON research_sessions
    FOR ALL USING (true);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Storage UI or via API

-- Bucket for petition documents (PDFs, Word docs)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('petition-documents', 'petition-documents', true);

-- Bucket for uploaded files
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('uploaded-files', 'uploaded-files', false);

-- Bucket for exhibit PDFs
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('exhibit-pdfs', 'exhibit-pdfs', true);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Case Overview
-- Quick overview of all cases with counts
CREATE OR REPLACE VIEW case_overview AS
SELECT
    pc.case_id,
    pc.beneficiary_name,
    pc.visa_type,
    pc.status,
    pc.progress_percentage,
    pc.created_at,
    pc.completed_at,
    COUNT(DISTINCT cu.id) as url_count,
    COUNT(DISTINCT cf.id) as file_count,
    COUNT(DISTINCT gd.id) as document_count,
    COUNT(DISTINCT ep.id) as exhibit_count
FROM petition_cases pc
LEFT JOIN case_urls cu ON pc.case_id = cu.case_id
LEFT JOIN case_files cf ON pc.case_id = cf.case_id
LEFT JOIN generated_documents gd ON pc.case_id = gd.case_id
LEFT JOIN exhibit_pdfs ep ON pc.case_id = ep.case_id
GROUP BY pc.case_id, pc.beneficiary_name, pc.visa_type, pc.status,
         pc.progress_percentage, pc.created_at, pc.completed_at;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert test data
-- INSERT INTO petition_cases (case_id, beneficiary_name, profession, visa_type)
-- VALUES ('TEST001', 'John Doe', 'Software Engineer', 'O-1A');

-- ============================================
-- SCHEMA VERSION
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES (1, 'Initial schema - Mega Internal V1')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Schema created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create storage buckets in Supabase UI';
    RAISE NOTICE '2. Configure storage policies';
    RAISE NOTICE '3. Test with sample data';
END $$;
