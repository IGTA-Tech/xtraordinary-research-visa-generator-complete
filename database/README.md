# Database Setup Guide

## Supabase Database Schema for Mega Internal V1

This directory contains the complete database schema for the visa petition generation tool.

## 📋 Tables Overview

### Core Tables

1. **petition_cases** - Main table storing all case metadata
   - Case ID, beneficiary info, visa type, status, progress tracking
   - Timestamps for creation, updates, completion

2. **case_urls** - All URLs associated with cases
   - URL, title, description
   - Source type (initial, perplexity, manual, ai_lookup)
   - Quality tier (1, 2, 3)
   - Archive.org integration
   - Criteria support tracking

3. **case_files** - Uploaded file metadata
   - Filename, file type, size
   - Category (resume, award, publication, etc.)
   - Extracted text and word count
   - Storage URLs

4. **generated_documents** - All 8 petition documents
   - Document number (1-8)
   - Content, word count, page estimate
   - Storage URLs
   - Generation metadata (tokens, time, model)

5. **exhibit_pdfs** - Individual exhibit PDFs
   - Exhibit numbering (A, B, C...)
   - Source URLs and archive URLs
   - PDF storage information

6. **research_sessions** - Perplexity research tracking
   - Research strategy and results
   - Source counts by tier
   - API usage and costs

## 🚀 Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project: https://oguwvltqkmtzthehdgvi.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Schema

1. Copy the entire contents of `schema.sql`
2. Paste into the SQL Editor
3. Click "Run" or press Ctrl+Enter
4. Wait for confirmation message

### Step 3: Create Storage Buckets

Go to "Storage" in Supabase dashboard and create these buckets:

1. **petition-documents** (Public)
   - For generated petition documents
   - Public read access

2. **uploaded-files** (Private)
   - For user-uploaded files
   - Private access only

3. **exhibit-pdfs** (Public)
   - For exhibit PDF packages
   - Public read access

### Step 4: Configure Storage Policies

For each bucket, add these policies:

**petition-documents & exhibit-pdfs:**
```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'petition-documents' );

-- Allow service role to insert/update/delete
CREATE POLICY "Service Role Access"
ON storage.objects FOR ALL
USING ( auth.role() = 'service_role' );
```

**uploaded-files:**
```sql
-- Only service role can access
CREATE POLICY "Service Role Only"
ON storage.objects FOR ALL
USING ( bucket_id = 'uploaded-files' AND auth.role() = 'service_role' );
```

## 📊 Database Relationships

```
petition_cases (1) ─── (many) case_urls
                  │
                  ├─── (many) case_files
                  │
                  ├─── (many) generated_documents
                  │
                  ├─── (many) exhibit_pdfs
                  │
                  └─── (many) research_sessions
```

## 🔍 Useful Queries

### Check all cases
```sql
SELECT * FROM case_overview ORDER BY created_at DESC;
```

### Get case details with all related data
```sql
SELECT
    pc.*,
    COUNT(DISTINCT cu.id) as url_count,
    COUNT(DISTINCT cf.id) as file_count,
    COUNT(DISTINCT gd.id) as document_count
FROM petition_cases pc
LEFT JOIN case_urls cu ON pc.case_id = cu.case_id
LEFT JOIN case_files cf ON pc.case_id = cf.case_id
LEFT JOIN generated_documents gd ON pc.case_id = gd.case_id
WHERE pc.case_id = 'YOUR_CASE_ID'
GROUP BY pc.id;
```

### Get all URLs for a case
```sql
SELECT * FROM case_urls
WHERE case_id = 'YOUR_CASE_ID'
ORDER BY quality_tier ASC, source_type;
```

### Get generation progress
```sql
SELECT case_id, beneficiary_name, status, progress_percentage, current_stage
FROM petition_cases
WHERE status IN ('researching', 'generating')
ORDER BY created_at DESC;
```

## 🧪 Testing

### Insert Test Case
```sql
INSERT INTO petition_cases (
    case_id,
    beneficiary_name,
    profession,
    visa_type
) VALUES (
    'TEST001',
    'Alex Hale',
    'NFL Kicker',
    'O-1A'
);
```

### Insert Test URLs
```sql
INSERT INTO case_urls (
    case_id,
    url,
    source_type,
    quality_tier
) VALUES
    ('TEST001', 'https://example.com/article1', 'initial', 1),
    ('TEST001', 'https://example.com/article2', 'perplexity', 2);
```

### Clean Up Test Data
```sql
DELETE FROM petition_cases WHERE case_id LIKE 'TEST%';
```

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Service Role Access**: Full access for API calls
- **Public Access**: None (internal tool only)
- **Storage Policies**: Public for documents, private for uploads

## 📈 Indexes

All major query paths are indexed:
- case_id lookups (all tables)
- Status filtering
- Date sorting
- Foreign key relationships

## 🔄 Automatic Updates

- `updated_at` field automatically updates on petition_cases table
- Triggers handle timestamp management

## ✅ Verification Checklist

After running the schema, verify:

- [ ] All 6 tables created
- [ ] All indexes created
- [ ] Triggers working (updated_at)
- [ ] RLS enabled
- [ ] case_overview view accessible
- [ ] 3 storage buckets created
- [ ] Storage policies configured
- [ ] Test insert works
- [ ] Test query works

## 🆘 Troubleshooting

### Error: "relation already exists"
Already created - safe to ignore or drop tables first:
```sql
DROP TABLE IF EXISTS exhibit_pdfs CASCADE;
DROP TABLE IF EXISTS generated_documents CASCADE;
DROP TABLE IF EXISTS research_sessions CASCADE;
DROP TABLE IF EXISTS case_files CASCADE;
DROP TABLE IF EXISTS case_urls CASCADE;
DROP TABLE IF EXISTS petition_cases CASCADE;
```

### Error: "uuid_generate_v4() does not exist"
Enable UUID extension:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Storage bucket creation fails
Create manually via Supabase UI:
1. Go to Storage
2. Click "New bucket"
3. Enter name and set public/private
4. Add policies manually

---

**Ready to proceed!** Once the schema is set up, you can start generating petitions.
