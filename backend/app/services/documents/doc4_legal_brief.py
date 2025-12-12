"""
Document 4: Legal Brief
Target: 50-80 pages (comprehensive) or 25-35 pages (standard)
Time: 4-6 minutes (multi-part for comprehensive)
"""
from app.services.ai_client import generate_text
from app.prompts.system import TEMPLATE_ENFORCEMENT_PROMPT, LEGAL_BRIEF_SYSTEM
from app.services.knowledge_base import get_criteria_for_visa_type
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def generate(context: dict, doc1: str, doc2: str) -> str:
    """
    Generate Document 4: Legal Brief

    Args:
        context: Generation context
        doc1: Comprehensive analysis
        doc2: Publication analysis

    Returns:
        Generated document content
    """
    logger.info("Generating Document 4: Legal Brief")

    beneficiary = context["beneficiary"]
    knowledge_base = context.get("knowledge_base", "")[:20000]
    is_standard = beneficiary.brief_type == "standard"

    # Get criteria for this visa type
    criteria = get_criteria_for_visa_type(beneficiary.visa_type)

    # Check if comparable evidence applies
    has_comparable = beneficiary.visa_type in ["O-1A", "O-1B", "EB-1A"]

    # Build criteria templates
    criteria_templates = ""
    for c in criteria:
        criteria_templates += f"""
### **Criterion Number {c['number']}: {c['name']}**

☐ **Yes**, the Beneficiary is pursuing qualification under this criterion.
☐ **No**, the Beneficiary is not pursuing qualification under this criterion.

#### **Regulatory Standard**

Under **{c['cfr']}**, [Include exact regulatory language]. This evidence must establish:

1. [First regulatory element]
2. [Second regulatory element]
[etc.]

---

**Establishment of Elements in Evidence**

The Beneficiary satisfies this criterion, as the evidence provided establishes the following:

1. **[Element]**: [Specific evidence with exhibit references]
2. **[Element]**: [Specific evidence with exhibit references]

---
"""
        if has_comparable:
            criteria_templates += """
**Comparable Evidence Theory**

☐ **Yes**, this criterion is being considered under the comparable evidence theory.
☐ **No**, this criterion is not being considered under the comparable evidence theory.

---
"""
        criteria_templates += """
**Consideration of Evidence**

Evidence for this criterion has been included in this petition. All relevant evidence establishes that the Beneficiary has met the regulatory requirements.

---

"""

    prompt = f"""{TEMPLATE_ENFORCEMENT_PROMPT}

# LEGAL BRIEF GENERATION - {beneficiary.visa_type} PETITION

## CRITICAL ANTI-FABRICATION RULES
1. ONLY include criteria where actual evidence is provided in the analysis/documents
2. Mark checkbox as "☐ No" for ANY criterion without documented evidence
3. NEVER invent achievements like "judging experience", "scholarly articles", or "training innovations"
4. If evidence is sparse, be honest - a shorter, accurate brief is better than a fabricated one
5. Only reference exhibits that correspond to actual evidence provided

## BENEFICIARY INFORMATION
- **Full Name**: {beneficiary.full_name}
- **Field of Endeavor**: {beneficiary.profession}
- **Visa Type**: {beneficiary.visa_type}
- **Comparable Evidence Available**: {'YES' if has_comparable else 'NO'}

## KNOWLEDGE BASE (Regulations):
{knowledge_base}

## ANALYSIS SUMMARY (from Document 1):
{doc1[:8000]}

## PUBLICATION DATA (from Document 2):
{doc2[:5000]}

## STRICT STRUCTURE REQUIREMENTS

Generate a professional {'15-20' if is_standard else '30-50'} page PETITION BRIEF in proper legal format:

# PETITION BRIEF IN SUPPORT OF {beneficiary.visa_type} PETITION
## {beneficiary.full_name}

**Petitioner**: {beneficiary.petitioner_name or '[U.S. Employer/Agent - REQUIRED for O-1/P-1]'}
**Beneficiary**: {beneficiary.full_name}
**Visa Classification**: {beneficiary.visa_type}
**Field of Endeavor**: {beneficiary.profession}
**Date**: {datetime.now().strftime('%B %d, %Y')}

---

## TABLE OF CONTENTS

I. Executive Summary
II. Introduction and Background
III. Legal Standards
IV. Statement of Facts
V. Argument - Criteria Analysis
{'VI. Final Merits Determination' if beneficiary.visa_type == 'EB-1A' else ''}
VII. Conclusion
VIII. Exhibit List

---

## I. EXECUTIVE SUMMARY

[2-3 compelling paragraphs summarizing the case]

---

## II. INTRODUCTION AND BACKGROUND

### A. Beneficiary's Professional Background
[4-6 paragraphs]

### B. Current Standing in Field

### C. Purpose of Petition

---

## III. LEGAL STANDARDS

### A. Statutory Requirements
[Exact INA section and CFR for {beneficiary.visa_type}]

### B. Regulatory Criteria

### C. Standard of Proof

---

## IV. STATEMENT OF FACTS

[Chronological narrative - 3-5 pages]

---

## V. ARGUMENT - CRITERIA ANALYSIS

{criteria_templates}

---

{'## VI. FINAL MERITS DETERMINATION' if beneficiary.visa_type == 'EB-1A' else ''}
{'[Kazarian Step 2 analysis]' if beneficiary.visa_type == 'EB-1A' else ''}

---

## VII. CONCLUSION

[3-4 paragraphs]

Respectfully submitted,

[Attorney/Representative Name]
[Date]

---

## VIII. EXHIBIT LIST

[Organize all exhibits by criterion]

---

CRITICAL REQUIREMENTS:
- **LENGTH**: {'25-35' if is_standard else '50-80'} pages - DO NOT ABBREVIATE
- **TEMPLATE ADHERENCE**: Follow DIY template EXACTLY
- **CHECKBOX FORMAT**: Never skip checkboxes
- **CFR CITATIONS**: Bold and exact
- **SPECIFIC EVIDENCE**: Reference actual exhibits
- **DETAILED ANALYSIS**: Each criterion section should be 3-5 pages minimum
- **LEGAL DEPTH**: Include case law references and AAO decision analysis

Generate the COMPLETE legal brief now with MAXIMUM detail and length:"""

    max_tokens = 24000 if is_standard else 32000

    result = await generate_text(
        prompt=prompt,
        system_prompt=LEGAL_BRIEF_SYSTEM,
        max_tokens=max_tokens,
        temperature=0.2,
    )

    logger.info(f"Document 4 generated: {len(result)} chars")
    return result
