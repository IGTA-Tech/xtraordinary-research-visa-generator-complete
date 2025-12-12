"""
Document 5: Evidence Gap Analysis
Target: 25-35 pages, 15,000+ words
Time: 3-4 minutes
"""
from app.services.ai_client import generate_text
import logging

logger = logging.getLogger(__name__)


async def generate(context: dict, doc1: str) -> str:
    """
    Generate Document 5: Evidence Gap Analysis

    Args:
        context: Generation context
        doc1: Comprehensive analysis

    Returns:
        Generated document content
    """
    logger.info("Generating Document 5: Evidence Gap Analysis")

    beneficiary = context["beneficiary"]
    urls = context.get("urls", [])
    files = context.get("files", [])

    criteria_count = {
        "O-1A": 8, "EB-1A": 10, "O-1B": 6, "P-1A": 5, "EB-2 NIW": 3
    }.get(beneficiary.visa_type, 8)

    prompt = f"""You are an expert immigration analyst providing USCIS adjudicator perspective for {beneficiary.visa_type} visa petitions.

# YOUR TASK

Generate a comprehensive **Evidence Gap Analysis & Strength Assessment** document.

# BENEFICIARY INFORMATION

Name: {beneficiary.full_name}
Visa Type: {beneficiary.visa_type}
Field: {beneficiary.profession}

Evidence provided:
- URLs: {len(urls)}
- Files: {len(files)}

# PREVIOUS ANALYSIS
{doc1[:8000]}

# DOCUMENT STRUCTURE

## EXECUTIVE SUMMARY
- Overall case strength (Strong/Moderate/Weak)
- Primary strengths (top 3)
- Critical gaps (top 3)
- Overall RFE risk (Low/Medium/High)
- Recommended filing timeline

## EVIDENCE STRENGTH SCORING

For EACH piece of evidence:

### Evidence #[N]: [Title/Source]
**Type:** [Award/Media Article/Letter/Publication/etc.]
**Criterion Supported:** [Which criterion]
**Strength Score:** [1-10]
**USCIS Adjudicator Perspective:**
- What adjudicator will see as strengths
- What adjudicator will question
- Likelihood of acceptance (High/Medium/Low)

**Gaps in This Evidence:**
- Missing elements
- Additional documentation needed

**Recommendations:**
- Specific actions to improve

## CRITERION-BY-CRITERION GAP ANALYSIS

For each of the {criteria_count} applicable criteria:

### Criterion #[X]: [Full Name]
**Current Evidence Provided:** [List]
**Evidence Strength:** [Strong/Moderate/Weak]
**USCIS Adequacy:** [Meets/Partially Meets/Does Not Meet]

**Gaps Identified:**
1. [Specific gap]
2. [Specific gap]

**RFE Risk:** [Low/Medium/High]

**Common RFE Triggers:**
- [Trigger 1]
- [Trigger 2]

**Recommended Evidence to Add:**
1. [Specific evidence type]
2. [Specific evidence type]

**Priority Level:** [Critical/High/Medium/Low]

## RFE PREVENTION ANALYSIS

### Overall RFE Risk Assessment
**Overall Risk Level:** [Low/Medium/High]
**Criteria Most Likely to Trigger RFE:** [List]

### Criterion-Specific RFE Scenarios
[For each Medium/High risk criterion]

## PRIORITIZED ACTION PLAN

### CRITICAL (Must Address Before Filing)
1. [Action with specifics]

### HIGH PRIORITY
[Actions]

### MEDIUM PRIORITY
[Actions]

## TIMELINE RECOMMENDATION

**Filing Readiness:** [File Now / 2-4 Weeks / 1-2 Months / 3+ Months]
**Reasoning:** [Explanation]

## CONCLUSION

[2-3 paragraph summary]

---

## APPENDIX: EVIDENCE QUALITY SCORECARD

Create a comprehensive table scoring each piece of evidence on multiple dimensions.

## APPENDIX: RFE RESPONSE TEMPLATES

For each potential RFE trigger, provide a brief response template.

---

CRITICAL REQUIREMENTS:
- **LENGTH**: 25-35 pages minimum - DO NOT ABBREVIATE
- Be brutally honest about weaknesses
- Provide specific, actionable recommendations with detailed implementation steps
- Score each piece of evidence objectively with detailed rationale
- Identify ALL gaps, not just major ones
- Each criterion section should be 2-3 pages of detailed analysis
- Include specific examples of what successful evidence looks like
- Provide USCIS officer perspective for each assessment

Generate the COMPLETE evidence gap analysis now with MAXIMUM detail:"""

    result = await generate_text(
        prompt=prompt,
        max_tokens=24000,
        temperature=0.3,
    )

    logger.info(f"Document 5 generated: {len(result)} chars")
    return result
