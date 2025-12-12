# Xtraordinary Research Visa Generator - Implementation Plan

## Overview

This project unifies the best features from 9 specialized visa petition tools into one complete platform. We are building the most comprehensive AI-powered visa petition generation system for O-1A, O-1B, P-1A, EB-1A, and EB-2 NIW visas.

---

## Currently Deployed & Working Tools

### Production Applications

| Tool | URL | Status | Purpose |
|------|-----|--------|---------|
| **Extraordinary Petitions Portal** | https://extraordinarypetitions.team | LIVE | Main visa petition generation platform |
| **Streamlit Exhibit Maker** | https://exhibit-maker.streamlit.app | LIVE | Professional exhibit package generator |

### Source Repositories Being Unified

| Repository | Key Features to Integrate |
|------------|---------------------------|
| [mega-visa-petition-generator-v4](https://github.com/IGTA-Tech/mega-visa-petition-generator-v4) | 5-Tab Portal, 9-document pipeline, Inngest, USCIS Officer Rating |
| [Mega-Internal-V2-Visa-Generation-Tool](https://github.com/IGTA-Tech/Mega-Internal-V2-Visa-Generation-Tool) | LlamaParse, Supabase, archive.org, bulk URL input |
| [visa-petition-v2](https://github.com/IGTA-Tech/visa-petition-v2) | Mistral Vision OCR, parallel generation, FastAPI |
| [mega-visa-ai](https://github.com/IGTA-Tech/mega-visa-ai) | Clean architecture patterns |
| [form-filler-tool](https://github.com/IGTA-Tech/form-filler-tool) | USCIS form auto-fill (I-129, G-28, I-907) |
| [exhibit-maker-version-2](https://github.com/IGTA-Tech/exhibit-maker-version-2) | Streamlit + Google Apps Script |
| [visa-exhibit-maker](https://github.com/IGTA-Tech/visa-exhibit-maker) | Multi-source input |
| [Mega-Internal-V1-Visa-Generation-Tool](https://github.com/IGTA-Tech/Mega-Internal-V1-Visa-Generation-Tool) | Foundation architecture |
| [anice-pony/streamlit-exhibit-generator](https://github.com/anice-pony/streamlit-exhibit-generator) | True PDF merge, auto-numbering |

---

## What We Are Building

### The Complete System

A unified platform that handles the **entire visa petition workflow**:

```
Client Intake → AI Research → Document Generation → Form Filling → Exhibit Packaging → Submission Ready
```

### Core Modules

#### 1. Petition Generator (9 Documents)
- Comprehensive Analysis (75+ pages)
- Publication Analysis
- URL Reference Guide with archive.org links
- Legal Brief
- Evidence Gap Analysis
- USCIS Cover Letter
- Visa Checklist
- Exhibit Assembly Guide
- USCIS Officer Rating Report

#### 2. USCIS Form Filler
- I-129 (Petition for Nonimmigrant Worker)
- I-129 O/P Supplement
- I-907 (Premium Processing)
- G-28 (Attorney Appearance)

#### 3. Exhibit Package Generator
- Auto-numbering (A, B, C or 1, 2, 3)
- Table of Contents
- PDF merging
- Google Drive integration
- URL archiving

#### 4. AI Research Engine
- Perplexity deep research (30+ sources per case)
- Claude document generation
- Mistral Vision OCR for scanned documents
- LlamaParse for PDF extraction

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up Next.js 14 project structure
- [ ] Configure Supabase database
- [ ] Implement authentication
- [ ] Create base UI components

### Phase 2: Document Generation
- [ ] Port document generator from Mega-Internal-V2
- [ ] Integrate Perplexity research pipeline
- [ ] Add Claude document generation
- [ ] Implement 9-document pipeline

### Phase 3: Form Filler
- [ ] Port form-filler-tool to web interface
- [ ] Add I-129, G-28, I-907 mappers
- [ ] Create form preview UI
- [ ] PDF generation endpoint

### Phase 4: Exhibit Maker
- [ ] Integrate Streamlit exhibit logic
- [ ] Add Google Drive connector
- [ ] Implement archive.org preservation
- [ ] PDF merge and numbering

### Phase 5: Portal Integration
- [ ] Build 8-tab portal UI
- [ ] Connect all modules
- [ ] Add Inngest background jobs
- [ ] Email delivery via SendGrid

### Phase 6: Production
- [ ] Deploy to Vercel/Railway
- [ ] Configure custom domain
- [ ] Set up monitoring
- [ ] Documentation

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│  ┌─────────┬──────────┬─────────┬──────────┬─────────────┐  │
│  │Dashboard│Petitions │ Forms   │ Exhibits │  Documents  │  │
│  └─────────┴──────────┴─────────┴──────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Next.js API  │  │ FastAPI      │  │ Inngest          │   │
│  │ Routes       │  │ (Form Fill)  │  │ (Background)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI SERVICES                              │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │
│  │ Claude │ │Perplexity│ │ OpenAI │ │ Gemini │ │ Mistral │ │
│  └────────┘ └──────────┘ └────────┘ └────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Supabase     │  │ Knowledge    │  │ File Storage     │   │
│  │ (PostgreSQL) │  │ Base (RAG)   │  │ (Supabase)       │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Strategy

| Component | Platform | Domain |
|-----------|----------|--------|
| Main Portal | Vercel | extraordinarypetitions.team |
| Backend API | Railway | api.extraordinarypetitions.team |
| Streamlit | Streamlit Cloud | exhibit-maker.streamlit.app |
| Database | Supabase | (managed) |

---

## Success Metrics

- **Document Quality**: Attorney-grade petition packages
- **Generation Time**: < 10 minutes for full 9-document package
- **Form Accuracy**: 100% field mapping for USCIS forms
- **User Experience**: Single platform for entire workflow

---

## Team & Resources

- **Repository**: https://github.com/IGTA-Tech/xtraordinary-research-visa-generator-complete
- **Live Portal**: https://extraordinarypetitions.team
- **Exhibit Maker**: https://exhibit-maker.streamlit.app

---

**Last Updated**: December 2025
**Status**: Planning & Integration Phase
