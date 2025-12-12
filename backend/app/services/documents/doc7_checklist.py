"""
Document 7: Visa Checklist
Target: 1-2 pages
Time: 1 minute
"""
from app.services.ai_client import generate_text
import logging

logger = logging.getLogger(__name__)


async def generate(context: dict, doc5: str) -> str:
    """
    Generate Document 7: Visa Checklist

    Args:
        context: Generation context
        doc5: Gap analysis (for action items)

    Returns:
        Generated document content
    """
    logger.info("Generating Document 7: Visa Checklist")

    beneficiary = context["beneficiary"]
    urls = context.get("urls", [])
    files = context.get("files", [])

    prompt = f"""Create a **1-2 page Visa Checklist** - a quick-scan scorecard for case assessment.

IMPORTANT GUIDELINES:
- Do NOT use "attorney" language - this is for public/petitioner use
- Be CONSERVATIVE in filing recommendations - when in doubt, recommend strengthening first
- Your recommendations MUST be consistent with the Gap Analysis provided
- If the Gap Analysis identifies critical gaps, do NOT recommend filing immediately
- Only recommend "File Now" if ALL required criteria have documented evidence

# BENEFICIARY
Name: {beneficiary.full_name}
Visa Type: {beneficiary.visa_type}
Field: {beneficiary.profession}

Evidence: {len(urls)} URLs, {len(files)} files

# GAP ANALYSIS CONTEXT
{doc5[:8000]}

# CHECKLIST FORMAT

# VISA PETITION CHECKLIST
## {beneficiary.visa_type} Classification for {beneficiary.full_name}

---

## CASE STRENGTH OVERVIEW

**Overall Assessment:** [Strong/Moderate/Weak] ⭐⭐⭐⭐⭐

**Filing Recommendation:** [✅ File Now / ⚠️ Strengthen First / ❌ Significant Work Needed]

**Approval Probability:** [High (>75%) / Medium (50-75%) / Low (<50%)]

**RFE Risk:** [🟢 Low / 🟡 Medium / 🔴 High]

---

## CRITERIA SCORECARD

| Criterion | Status | Strength | Evidence | Notes |
|-----------|--------|----------|----------|-------|
| #1: [Name] | ✅/⚠️/❌ | 🟢/🟡/🔴 | [#] | [Brief] |
[Continue for all criteria]

**Criteria Met:** [X] of [Y] required

---

## TOP 5 STRENGTHS 💪
1. [Strength]
2. [Strength]
...

---

## TOP 5 WEAKNESSES ⚠️
1. [Weakness] - RFE Risk: [Low/Med/High]
2. [Weakness] - RFE Risk: [Low/Med/High]
...

---

## CRITICAL ACTION ITEMS

- [ ] **[Action]** - Timeframe: [X] - Impact: [High/Med/Low]
...

---

## EVIDENCE INVENTORY

**Total Evidence:** {len(urls) + len(files)}
- URLs: {len(urls)}
- Documents: {len(files)}

---

## RFE RISK BREAKDOWN

**Overall RFE Probability:** [XX%]

**High-Risk Criteria:**
1. [Criterion] - Risk: 🔴 - Reason: [Brief]

---

## TIMELINE ESTIMATE

**If Filing Today:**
- RFE Likelihood: [XX%]
- Approval Likelihood: [XX%]

**Recommended Filing Date:** [Date or condition]

---

## DOCUMENT READINESS

- [ ] Cover letter complete
- [ ] Legal brief complete
- [ ] Evidence organized
- [ ] Exhibit list prepared
- [ ] Forms completed
- [ ] Filing fee confirmed

---

REQUIREMENTS:
- Use color coding: 🟢 Strong, 🟡 Moderate, 🔴 Weak
- Be specific and actionable
- 1-2 pages maximum
- Include realistic timeframes

Generate the complete checklist now:"""

    result = await generate_text(
        prompt=prompt,
        max_tokens=4000,
        temperature=0.3,
    )

    logger.info(f"Document 7 generated: {len(result)} chars")
    return result
