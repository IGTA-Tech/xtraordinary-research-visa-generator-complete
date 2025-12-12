# Xtraordinary Research Visa Generator - Complete

**The Ultimate Unified AI-Powered Visa Petition Platform**

Combines the best features from 9 specialized visa tools into one complete system.

## What This Combines

| Source Repo | Best Features Integrated |
|-------------|-------------------------|
| **mega-visa-petition-generator-v4** | 5-Tab Portal, 9-document pipeline, Inngest background jobs, USCIS Officer Rating Report |
| **Mega-Internal-V2-Visa-Generation-Tool** | LlamaParse PDF extraction, Supabase persistence, archive.org preservation |
| **visa-petition-v2** | Mistral Vision OCR, parallel generation (6-7 min), FastAPI backend |
| **mega-visa-ai** | Clean architecture patterns |
| **form-filler-tool** | USCIS form auto-fill (I-129, G-28, I-907, O/P Supplement) |
| **exhibit-maker-version-2** | Streamlit + Google Apps Script exhibit packaging |
| **visa-exhibit-maker** | Multi-source input (PDF, ZIP, Drive, URLs) |
| **anice-pony/streamlit-exhibit-generator** | True PDF merge, auto-numbering, TOC generation |

---

## Complete Feature Set

### 1. Multi-Tab Portal System
- **Dashboard** - Analytics, case tracking, success metrics, AI insights
- **Petition Generator** - Full 9-document generation pipeline
- **Agreements** - Deal Memo Generator (5 agreement types)
- **Support Letters** - Expert letter wizard with DocuSign integration
- **Itineraries** - P-1A, O-1A, O-1B, O-2 event management
- **Exhibit Maker** - Professional numbered exhibit packages
- **Form Filler** - USCIS form auto-population
- **Documents** - Central document hub with search

### 2. Document Generation (9-Document Package)
1. **Comprehensive Analysis** (75+ pages) - Complete case analysis
2. **Publication Analysis** - Media coverage and citations
3. **URL Reference Guide** - All evidence URLs with archive.org links
4. **Legal Brief** - Attorney-ready legal arguments
5. **Evidence Gap Analysis** - Missing evidence identification
6. **USCIS Cover Letter** - Professional submission letter
7. **Visa Checklist** - Complete filing checklist
8. **Exhibit Assembly Guide** - How to organize exhibits
9. **USCIS Officer Rating Report** - Predicted approval analysis

### 3. USCIS Form Auto-Fill
- **I-129** - Petition for Nonimmigrant Worker
- **I-129 O/P Supplement** - Classification Supplement
- **I-907** - Premium Processing Request
- **G-28** - Notice of Attorney Appearance
- Pre-loaded petitioner configs (IGTA, Accelerator, custom)

### 4. Exhibit Package Generator
- **Multiple Input Sources**: Direct PDF, ZIP folders, Google Drive, URLs
- **Auto Numbering**: Letters (A, B, C), Numbers (1, 2, 3), Roman (I, II, III)
- **Professional Output**: Table of Contents, merged PDF, individual exhibits
- **URL Preservation**: Automatic archive.org snapshots
- **Dual Modes**: Streamlit web app + Google Apps Script

### 5. AI Infrastructure
| AI Service | Purpose |
|------------|---------|
| **Claude (Sonnet/Opus)** | Primary document generation |
| **Perplexity** | 4-phase deep research (30+ sources) |
| **OpenAI GPT-4o** | Fallback AI for reliability |
| **Gemini** | File Search / Managed RAG |
| **Mistral Pixtral-12B** | Vision OCR for scanned documents |
| **LlamaParse** | Robust PDF text extraction |

### 6. File Processing
| File Type | Processing Method |
|-----------|-------------------|
| PDF (text-based) | PyMuPDF / LlamaParse |
| PDF (scanned) | Mistral Vision OCR (auto-detected) |
| Images (JPG, PNG, etc.) | Mistral Vision OCR |
| DOCX | python-docx extraction |
| TXT | Direct text read |
| URLs | Fetch + archive.org preservation |

### 7. Backend Infrastructure
- **Inngest** - 14-step background job pipeline
- **Supabase** - PostgreSQL + real-time subscriptions
- **SendGrid** - Email delivery
- **DocuSign** - E-signature integration
- **API2PDF** - URL to PDF conversion

---

## Supported Visa Types

- **O-1A** - Extraordinary Ability (Sciences, Business, Education, Athletics)
- **O-1B** - Extraordinary Ability (Arts, Motion Picture, Television)
- **O-2** - Support Personnel for O-1
- **P-1A** - Internationally Recognized Athlete
- **P-1B** - Internationally Recognized Entertainment Groups
- **P-1S** - Support Personnel for P-1
- **EB-1A** - Extraordinary Ability Green Card
- **EB-2 NIW** - National Interest Waiver

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14, React 18, TypeScript |
| **Backend API** | FastAPI (Python) for form-filler |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Background Jobs** | Inngest |
| **AI** | Claude, Perplexity, OpenAI, Gemini, Mistral |
| **PDF Processing** | PyMuPDF, LlamaParse, pypdf |
| **Email** | SendGrid |
| **Signatures** | DocuSign |
| **Deployment** | Vercel (frontend), Railway (backend), Netlify (Streamlit) |

---

## Project Structure

```
xtraordinary-research-visa-generator-complete/
├── app/                           # Next.js app directory
│   ├── (portal)/                  # 8-Tab Portal pages
│   │   ├── dashboard/
│   │   ├── petition-generator/
│   │   ├── agreements/
│   │   ├── support-letters/
│   │   ├── itineraries/
│   │   ├── exhibit-maker/
│   │   ├── form-filler/
│   │   └── documents/
│   ├── api/                       # API routes
│   │   ├── generate/
│   │   ├── research/
│   │   ├── forms/
│   │   └── exhibits/
│   ├── components/                # React components
│   └── lib/                       # Core libraries
│       ├── ai/                    # AI client wrappers
│       │   ├── claude.ts
│       │   ├── perplexity.ts
│       │   ├── openai.ts
│       │   ├── gemini.ts
│       │   └── mistral.ts
│       ├── document-generator.ts
│       ├── form-filler.ts
│       ├── exhibit-generator.ts
│       ├── file-processor.ts
│       ├── archive-org.ts
│       └── supabase.ts
├── backend/                       # FastAPI Python backend
│   ├── app/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.py
│   ├── form-filler/               # USCIS form filling
│   │   ├── mappers/
│   │   ├── fillers/
│   │   └── validators/
│   └── forms/                     # PDF form templates
├── streamlit/                     # Streamlit exhibit maker
│   ├── app.py
│   ├── pdf_handler.py
│   ├── google_drive.py
│   └── archive_handler.py
├── google-apps-script/            # GAS exhibit maker
│   ├── Code.gs
│   ├── Index.html
│   └── appsscript.json
├── knowledge-base/                # RAG files (20+ documents)
│   ├── O-1A-knowledge-base.md
│   ├── O-1B-knowledge-base.md
│   ├── P-1A-knowledge-base.md
│   ├── EB-1A-knowledge-base.md
│   ├── EB-2-NIW-knowledge-base.md
│   └── legal-templates/
├── database/                      # SQL migrations
├── inngest/                       # Background job definitions
└── docs/                          # Documentation
```

---

## Quick Start

### 1. Install Dependencies

```bash
# Frontend (Next.js)
npm install

# Backend (FastAPI)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Streamlit
cd streamlit
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Required API keys:
- `ANTHROPIC_API_KEY` - Claude
- `PERPLEXITY_API_KEY` - Research
- `OPENAI_API_KEY` - Fallback AI
- `MISTRAL_API_KEY` - Vision OCR
- `LLAMA_CLOUD_API_KEY` - PDF extraction
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Database
- `SENDGRID_API_KEY` - Email
- `INNGEST_EVENT_KEY` - Background jobs

### 3. Run Development

```bash
# Main app
npm run dev

# Backend API
cd backend && uvicorn app.main:app --reload --port 8080

# Streamlit (optional)
cd streamlit && streamlit run app.py
```

Open [http://localhost:3000](http://localhost:3000)

---

## Document Generation Flow

```
Phase 1: Preparation (~60 sec)
├── Load knowledge base (parallel)
├── Fetch URL content (parallel)
├── Process uploaded files with OCR (parallel)
└── Perplexity deep research (4 phases)

Phase 2: Foundation (~3-4 min)
└── Generate Document 1 (Comprehensive Analysis)

Phase 3: Parallel Generation (~2-3 min)
├── Document 2 (Publication Analysis)
├── Document 3 (URL Reference Guide)
├── Document 5 (Evidence Gap Analysis)
├── Document 6 (Cover Letter)
└── Document 7 (Visa Checklist)

Phase 4: Dependent Documents (~2 min)
├── Document 4 (Legal Brief - depends on Doc 1)
├── Document 8 (Exhibit Assembly Guide)
└── Document 9 (USCIS Officer Rating Report)

Phase 5: Delivery
├── Email documents via SendGrid
├── Generate exhibit package
└── Auto-fill USCIS forms

Total: ~8-10 minutes for complete package
```

---

## Deployment

| Component | Platform | Guide |
|-----------|----------|-------|
| Main App | Vercel | `vercel deploy` |
| Backend API | Railway | `railway up` |
| Streamlit | Netlify | `netlify deploy` |
| Database | Supabase | Dashboard setup |
| Background Jobs | Inngest | Dashboard setup |

---

## License

Internal use only - IGTA (Innovative Global Talent Agency)

---

**Built**: December 2025
**Version**: 1.0 Complete
**Status**: Unified from 9 specialized tools

*The most comprehensive visa petition generation system ever built.*
