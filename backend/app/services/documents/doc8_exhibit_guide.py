"""
Document 8: Exhibit Assembly Guide
Target: 10+ pages
Time: 1-2 minutes
"""
from app.services.ai_client import generate_text
import logging

logger = logging.getLogger(__name__)


async def generate(context: dict, doc4: str, urls: list) -> str:
    """
    Generate Document 8: Exhibit Assembly Guide

    Args:
        context: Generation context
        doc4: Legal brief
        urls: Fetched URLs

    Returns:
        Generated document content
    """
    logger.info("Generating Document 8: Exhibit Assembly Guide")

    beneficiary = context["beneficiary"]
    files = context.get("files", [])

    # Build URL list
    url_list = "\n".join([
        f"{i+1}. {url.get('url', '')} - {url.get('title', 'Untitled')}"
        for i, url in enumerate(urls)
    ])

    # Build file list
    file_list = "\n".join([
        f"{i+1}. {f.get('filename', '')}"
        for i, f in enumerate(files)
    ])

    prompt = f"""Create an exhibit assembly guide for a {beneficiary.visa_type} petition.

# BENEFICIARY
Name: {beneficiary.full_name}
Visa Type: {beneficiary.visa_type}

# EVIDENCE AVAILABLE

## URLs ({len(urls)} total)
{url_list}

## Files ({len(files)} total)
{file_list or 'No files uploaded'}

# LEGAL BRIEF CONTEXT
{doc4[:8000]}

# EXHIBIT GUIDE FORMAT

# EXHIBIT ASSEMBLY GUIDE
## {beneficiary.visa_type} Petition for {beneficiary.full_name}

---

## TABLE OF CONTENTS
1. Organization Overview
2. Detailed Exhibit List by Criterion
3. Assembly Instructions
4. Highlighting Guide
5. Quality Control Checklist

---

## 1. ORGANIZATION OVERVIEW

**Total Exhibits:** [Count]
**Organization:** By Criterion

**Binder Structure:**
- Volume I: Legal Documents
- Volume II: Evidence by Criterion

**Labeling:**
- Criterion 1: A-1, A-2, A-3...
- Criterion 2: B-1, B-2, B-3...
[Continue pattern]

---

## 2. DETAILED EXHIBIT LIST BY CRITERION

### CRITERION 1: [Name]

**Exhibit A-1:** [Title]
- **Source:** [URL/filename]
- **Type:** [Award/Article/etc.]
- **Pages:** [X]
- **Key Points:**
  * [What this proves]
- **Highlighting:**
  * Page [X]: Highlight "[text]"
- **Tab Color:** Yellow
- **Legal Brief Reference:** p. [X]

[Continue for all exhibits]

---

## 3. ASSEMBLY INSTRUCTIONS

### Step 1: Print All Documents
- [ ] Cover Letter
- [ ] Legal Brief
- [ ] All analyses
- [ ] All URL evidence as PDFs
- [ ] All uploaded documents

**Specs:** Single-sided, 8.5x11, 20lb paper

### Step 2: Organize by Criterion
1. Gather exhibits per criterion
2. Arrange by strength (strongest first)
3. Insert tab dividers
4. Number pages

### Step 3: Create Exhibit Labels
[Template for cover pages]

### Step 4: Apply Highlighting
[Instructions]

### Step 5: Assemble Binders
**Volume I:** Legal docs
**Volume II:** Evidence

---

## 4. HIGHLIGHTING GUIDE

### Principles
✅ DO: Highlight facts, achievements, data
❌ DON'T: Over-highlight (max 30% per page)

### Colors
- Yellow: Key achievements
- Blue: Statistics/Numbers
- Green: Quotes about beneficiary
- Pink: Awards/Recognition

---

## 5. QUALITY CONTROL CHECKLIST

- [ ] All exhibits referenced in brief are included
- [ ] Exhibit numbers match brief citations
- [ ] All pages present and in order
- [ ] Highlighting is strategic
- [ ] Professional presentation
- [ ] Table of contents accurate

---

## 6. FILING INSTRUCTIONS

**Service Center:** [Appropriate for {beneficiary.visa_type}]
**Shipping:** Use tracked method (FedEx/UPS)

---

## 7. TIMELINE ESTIMATES

**Assembly Time:**
- Printing: 1-2 hours
- Organizing: 2-3 hours
- Highlighting: 3-4 hours
- QC: 1-2 hours
- **Total: 7-11 hours**

---

Generate the complete exhibit guide now:"""

    result = await generate_text(
        prompt=prompt,
        max_tokens=8000,
        temperature=0.2,
    )

    logger.info(f"Document 8 generated: {len(result)} chars")
    return result
