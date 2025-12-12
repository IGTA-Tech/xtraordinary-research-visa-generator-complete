"""
Document 1: Comprehensive Analysis
Target: 100+ pages, 50,000+ words
Time: 5-8 minutes (multi-part generation)
"""
from app.services.ai_client import generate_text
from app.prompts.system import COMPREHENSIVE_ANALYSIS_SYSTEM
import logging
import asyncio

logger = logging.getLogger(__name__)


async def generate(context: dict) -> str:
    """
    Generate Document 1: Comprehensive Analysis using multi-part generation.

    Args:
        context: Generation context with beneficiary info, KB, URLs, files

    Returns:
        Generated document content (100+ pages)
    """
    logger.info("Generating Document 1: Comprehensive Analysis (Multi-Part)")

    beneficiary = context["beneficiary"]
    knowledge_base = context.get("knowledge_base", "")[:50000]
    urls = context.get("urls", [])
    files = context.get("files", [])

    # Build URL context
    url_context = "\n\n".join([
        f"URL {i+1}: {url.get('url', '')}\nTitle: {url.get('title', '')}\nContent: {url.get('content', '')[:2000]}..."
        for i, url in enumerate(urls[:50])
    ]) or "No URLs provided"

    # Build file context
    file_context = "\n\n".join([
        f"File: {f.get('filename', '')}\n{f.get('extracted_text', '')[:3000]}..."
        for f in files
    ]) or "No files uploaded"

    # Base context for all parts
    base_context = f"""BENEFICIARY INFORMATION:
- Name: {beneficiary.full_name}
- Visa Type: {beneficiary.visa_type}
- Field/Profession: {beneficiary.profession}
- Background: {beneficiary.background_info or 'Not provided'}
- Additional Info: {beneficiary.additional_info or 'None provided'}

UPLOADED DOCUMENT EVIDENCE:
{file_context}

EVIDENCE URLS ANALYZED:
{url_context}

KNOWLEDGE BASE:
{knowledge_base}"""

    # Generate document in multiple parts
    parts = []

    # Part 1: Executive Summary, Visa Determination, Regulatory Framework
    logger.info("Generating Part 1: Executive Summary & Framework")
    part1 = await generate_part1(beneficiary, base_context)
    parts.append(part1)

    # Part 2: Criteria 1-4 detailed analysis
    logger.info("Generating Part 2: Criteria 1-4 Analysis")
    part2 = await generate_part2(beneficiary, base_context, part1)
    parts.append(part2)

    # Part 3: Criteria 5-8 detailed analysis
    logger.info("Generating Part 3: Criteria 5-8 Analysis")
    part3 = await generate_part3(beneficiary, base_context, part1)
    parts.append(part3)

    # Part 4: Evidence Mapping, Scoring, Strengths
    logger.info("Generating Part 4: Evidence Mapping & Scoring")
    part4 = await generate_part4(beneficiary, base_context, parts)
    parts.append(part4)

    # Part 5: Weaknesses, Recommendations, Conclusion
    logger.info("Generating Part 5: Recommendations & Conclusion")
    part5 = await generate_part5(beneficiary, base_context, parts)
    parts.append(part5)

    # Combine all parts
    result = "\n\n".join(parts)

    word_count = len(result.split())
    page_estimate = word_count // 500
    logger.info(f"Document 1 generated: {len(result)} chars, ~{word_count} words, ~{page_estimate} pages")

    return result


async def generate_part1(beneficiary, base_context: str) -> str:
    """Generate Executive Summary, Visa Determination, and Regulatory Framework."""
    prompt = f"""You are an expert immigration law analyst generating PART 1 of a comprehensive {beneficiary.visa_type} visa petition analysis.

{base_context}

CRITICAL RULES:
1. ONLY reference evidence actually provided - never fabricate
2. If evidence is missing, clearly state it
3. Be objective about both strengths and weaknesses
4. Write in extensive, detailed paragraphs

YOUR TASK - Generate these sections with MAXIMUM DETAIL:

# COMPREHENSIVE VISA PETITION ANALYSIS
## {beneficiary.visa_type} CLASSIFICATION - {beneficiary.full_name}

---

### EXECUTIVE SUMMARY (4-6 detailed paragraphs)

Write a comprehensive executive summary that:
- Introduces the beneficiary and their field of expertise
- Summarizes the key evidence categories available
- Provides preliminary assessment of visa eligibility
- Outlines the structure of this analysis
- States the overall recommendation with confidence level
- Highlights both strongest points and areas of concern

---

### PART 1: VISA TYPE DETERMINATION (8-10 paragraphs)

Provide an exhaustive analysis of why {beneficiary.visa_type} is the appropriate classification:

1. **Overview of {beneficiary.visa_type} Category** - Explain what this visa category is designed for, who qualifies, and the statutory basis

2. **Applicability to This Beneficiary** - Detailed analysis of why this specific visa type is appropriate for {beneficiary.full_name}'s circumstances

3. **Alternative Visa Categories Considered** - Discuss why other visa categories (O-1B, EB-1A, EB-1B, etc.) may or may not be appropriate

4. **Field of Extraordinary Ability** - Define and analyze the specific field in which the beneficiary claims extraordinary ability

5. **Standard of Review** - Explain the legal standard that will be applied to this petition

---

### PART 2: REGULATORY FRAMEWORK (10-12 paragraphs)

Provide comprehensive coverage of the legal standards:

1. **Statutory Authority** - Cite the exact INA provisions governing {beneficiary.visa_type}

2. **Regulatory Requirements** - Quote and explain the full regulatory text from 8 CFR

3. **USCIS Policy Guidance** - Reference current USCIS policy manual provisions

4. **AAO Precedent Decisions** - Discuss key Administrative Appeals Office decisions that interpret these standards

5. **Two-Part Kazarian Analysis** - Explain the two-step analysis framework in detail

6. **Evidentiary Requirements** - Detail what evidence is required and how it will be evaluated

7. **"Extraordinary Ability" Definition** - Extensive analysis of what constitutes extraordinary ability in {beneficiary.profession}

8. **Sustained National/International Acclaim** - Explain what this standard means and how it applies

TARGET LENGTH: This section should be approximately 15-20 pages (~8,000-10,000 words). Write extensively and thoroughly."""

    return await generate_text(
        prompt=prompt,
        system_prompt=COMPREHENSIVE_ANALYSIS_SYSTEM,
        max_tokens=32000,
        temperature=0.3,
    )


async def generate_part2(beneficiary, base_context: str, part1: str) -> str:
    """Generate detailed analysis of Criteria 1-4."""

    # Define criteria based on visa type
    if beneficiary.visa_type in ["O-1A", "EB-1A"]:
        criteria_set = """
CRITERIA TO ANALYZE IN THIS SECTION:

1. **Awards Criterion** - Documentation of receipt of lesser nationally or internationally recognized prizes or awards for excellence in the field

2. **Membership Criterion** - Documentation of membership in associations that require outstanding achievements as judged by recognized experts

3. **Published Material Criterion** - Published material about the beneficiary in professional or major trade publications or other major media

4. **Judging Criterion** - Evidence of participation as a judge of the work of others in the same or allied field"""
    else:
        criteria_set = """
CRITERIA TO ANALYZE IN THIS SECTION:

1. **Awards Criterion** - Documentation of receipt of prizes or awards for excellence

2. **Membership Criterion** - Documentation of membership in associations requiring outstanding achievements

3. **Published Material Criterion** - Published material about the beneficiary in professional publications

4. **Critical Role Criterion** - Evidence of performing in a critical or essential capacity for distinguished organizations"""

    prompt = f"""You are continuing the comprehensive {beneficiary.visa_type} visa petition analysis.

{base_context}

PREVIOUS SECTIONS GENERATED (for context continuity):
{part1[:5000]}...

CRITICAL RULES:
1. ONLY reference evidence actually provided - never fabricate
2. If evidence is missing for a criterion, explicitly state "EVIDENCE GAP: No documentation provided for this criterion"
3. Be thorough and objective
4. Each criterion analysis should be 4-6 pages

YOUR TASK - Generate PART 3: CRITERION-BY-CRITERION ANALYSIS (First Half)

{criteria_set}

For EACH criterion, provide this detailed structure:

---

#### Criterion [Number]: [Full Criterion Name]

**A. Regulatory Language**
Quote the exact regulatory text from 8 CFR that defines this criterion.

**B. USCIS Interpretation**
Explain how USCIS interprets this criterion based on policy guidance and AAO decisions.

**C. Evidence Analysis** (3-4 paragraphs)
Systematically review ALL evidence provided that relates to this criterion:
- What specific documents/URLs support this criterion?
- What is the quality and credibility of each piece of evidence?
- How does the evidence demonstrate the required level of achievement?

**D. Comparative Analysis** (2-3 paragraphs)
Compare the beneficiary's achievements to:
- The regulatory standard
- Typical successful petitions in this field
- The level expected for "extraordinary ability"

**E. Scoring Assessment**
- Points Awarded: [X] / 10
- Scoring Rationale: [Detailed explanation]

**F. Strengths** (1-2 paragraphs)
What aspects of the evidence are particularly compelling?

**G. Weaknesses & Gaps** (1-2 paragraphs)
What is missing or could be stronger? Be specific.

**H. Recommendations for This Criterion** (bullet points)
What additional evidence could strengthen this criterion?

---

TARGET LENGTH: This section should be approximately 20-25 pages (~10,000-12,000 words). Each criterion should receive 4-6 pages of detailed analysis. Do NOT abbreviate or summarize."""

    return await generate_text(
        prompt=prompt,
        system_prompt=COMPREHENSIVE_ANALYSIS_SYSTEM,
        max_tokens=32000,
        temperature=0.3,
    )


async def generate_part3(beneficiary, base_context: str, part1: str) -> str:
    """Generate detailed analysis of Criteria 5-8."""

    if beneficiary.visa_type in ["O-1A", "EB-1A"]:
        criteria_set = """
CRITERIA TO ANALYZE IN THIS SECTION:

5. **Original Contributions Criterion** - Evidence of original scientific, scholarly, artistic, athletic, or business-related contributions of major significance

6. **Scholarly Articles Criterion** - Evidence of authorship of scholarly articles in professional or major trade publications or other major media

7. **Employment in Critical Capacity Criterion** - Evidence of employment in a critical or essential capacity for organizations with a distinguished reputation

8. **High Salary Criterion** - Evidence of commanding a high salary or other significantly high remuneration for services"""
    else:
        criteria_set = """
CRITERIA TO ANALYZE IN THIS SECTION:

5. **Original Contributions Criterion** - Evidence of original contributions of major significance

6. **High Salary Criterion** - Evidence of high salary or remuneration

7. **Commercial Success Criterion** - Evidence of commercial successes in the performing arts

8. **Other Comparable Evidence** - Any other comparable evidence of extraordinary ability"""

    prompt = f"""You are continuing the comprehensive {beneficiary.visa_type} visa petition analysis.

{base_context}

CONTEXT FROM EARLIER SECTIONS:
{part1[:3000]}...

CRITICAL RULES:
1. ONLY reference evidence actually provided - never fabricate achievements
2. If evidence is missing, state "EVIDENCE GAP: No documentation provided"
3. Each criterion should receive 4-6 pages of analysis
4. Be thorough and objective

YOUR TASK - Continue PART 3: CRITERION-BY-CRITERION ANALYSIS (Second Half)

{criteria_set}

For EACH criterion, provide this detailed structure:

---

#### Criterion [Number]: [Full Criterion Name]

**A. Regulatory Language**
Quote the exact regulatory text from 8 CFR.

**B. USCIS Interpretation**
How USCIS interprets this criterion based on policy guidance.

**C. Evidence Analysis** (3-4 paragraphs)
- What documents/URLs support this criterion?
- Quality and credibility assessment
- How does evidence meet the standard?

**D. Comparative Analysis** (2-3 paragraphs)
Compare achievements to regulatory standard and field norms.

**E. Scoring Assessment**
- Points Awarded: [X] / 10
- Scoring Rationale: [Detailed]

**F. Strengths** (1-2 paragraphs)
Compelling aspects of evidence.

**G. Weaknesses & Gaps** (1-2 paragraphs)
What is missing or could improve?

**H. Recommendations for This Criterion**
Additional evidence suggestions.

---

TARGET LENGTH: Approximately 20-25 pages (~10,000-12,000 words). Do NOT abbreviate."""

    return await generate_text(
        prompt=prompt,
        system_prompt=COMPREHENSIVE_ANALYSIS_SYSTEM,
        max_tokens=32000,
        temperature=0.3,
    )


async def generate_part4(beneficiary, base_context: str, previous_parts: list) -> str:
    """Generate Evidence Mapping, Scoring Summary, and Strengths Analysis."""

    criteria_summary = previous_parts[1][:3000] if len(previous_parts) > 1 else ""

    prompt = f"""You are continuing the comprehensive {beneficiary.visa_type} visa petition analysis.

{base_context}

CRITERIA ANALYSIS SUMMARY (for reference):
{criteria_summary}...

CRITICAL RULES:
1. Be consistent with previous analysis
2. Only reference evidence actually provided
3. Provide detailed, actionable analysis

YOUR TASK - Generate the following sections:

---

### PART 4: COMPREHENSIVE EVIDENCE MAPPING (6-8 pages)

Create detailed evidence mapping:

**4.1 Evidence Inventory**
List ALL evidence provided with:
- Document/URL name
- Type of evidence
- Applicable criteria
- Quality rating (Strong/Moderate/Weak)
- Notes on significance

**4.2 Criteria Coverage Matrix**
| Criterion | Evidence Items | Coverage Level | Assessment |
|-----------|---------------|----------------|------------|
[Create comprehensive table]

**4.3 Evidence Quality Analysis** (3-4 paragraphs)
- Overall quality of evidence package
- Strongest evidence items
- Weakest or missing evidence
- Credibility assessment

**4.4 Gap Analysis Table**
| Criterion | Evidence Provided | Evidence Missing | Priority |
|-----------|------------------|------------------|----------|
[Identify all gaps]

---

### PART 5: SCORING SUMMARY (4-6 pages)

**5.1 Criterion-by-Criterion Scores**
| Criterion | Score | Weight | Weighted Score | Notes |
|-----------|-------|--------|----------------|-------|
[Comprehensive scoring table]

**5.2 Total Score Calculation**
- Raw Total: [X] / 80
- Weighted Total: [X] / 100
- Threshold for Strong Approval: 70+
- Threshold for Likely Approval: 55-69
- Threshold for Borderline: 45-54
- Threshold for Likely Denial: Below 45

**5.3 Classification**: [Strong Approval / Likely Approval / Borderline / Likely Denial]
**5.4 Confidence Level**: [X]% - [Explanation of confidence]
**5.5 Approval Probability**: [X]% - [Statistical reasoning]

**5.6 Scoring Methodology Explanation** (2-3 paragraphs)
Explain how scores were derived and weighted.

---

### PART 6: STRENGTHS ANALYSIS (8-10 pages)

**6.1 Primary Strengths** (4-5 paragraphs)
Detailed analysis of the strongest aspects of this petition.

**6.2 Secondary Strengths** (3-4 paragraphs)
Supporting strengths that enhance the case.

**6.3 Unique Differentiators** (2-3 paragraphs)
What makes this beneficiary's case distinctive?

**6.4 Strengths in Context** (2-3 paragraphs)
How do these strengths compare to successful petitions?

**6.5 Strategic Value of Strengths**
How to leverage these strengths in the petition.

---

TARGET LENGTH: Approximately 20-25 pages (~10,000-12,000 words). Provide maximum detail."""

    return await generate_text(
        prompt=prompt,
        system_prompt=COMPREHENSIVE_ANALYSIS_SYSTEM,
        max_tokens=32000,
        temperature=0.3,
    )


async def generate_part5(beneficiary, base_context: str, previous_parts: list) -> str:
    """Generate Weaknesses, Recommendations, and Conclusion."""

    # Get summary of previous analysis
    scoring_summary = previous_parts[-1][:2000] if previous_parts else ""

    prompt = f"""You are completing the comprehensive {beneficiary.visa_type} visa petition analysis.

{base_context}

PREVIOUS ANALYSIS SUMMARY:
{scoring_summary}...

CRITICAL RULES:
1. Be consistent with previous sections
2. Provide actionable, specific recommendations
3. Be realistic about weaknesses while constructive

YOUR TASK - Generate the final sections:

---

### PART 7: WEAKNESSES & GAPS ANALYSIS (10-12 pages)

**7.1 Critical Weaknesses** (4-5 paragraphs)
Identify and analyze the most significant weaknesses that could lead to denial.

**7.2 Moderate Concerns** (3-4 paragraphs)
Issues that need attention but are not fatal to the case.

**7.3 Minor Gaps** (2-3 paragraphs)
Small issues that could be easily addressed.

**7.4 Evidence Gaps by Criterion**
Detailed breakdown of what evidence is missing for each criterion.

**7.5 Comparative Weakness Analysis** (2-3 paragraphs)
How do these weaknesses compare to typical petition issues?

**7.6 Risk Assessment**
| Weakness | Risk Level | Impact on Approval | Mitigation Possible? |
|----------|------------|-------------------|---------------------|
[Comprehensive table]

---

### PART 8: APPROVAL PROBABILITY ASSESSMENT (6-8 pages)

**8.1 Statistical Analysis** (3-4 paragraphs)
- Historical approval rates for {beneficiary.visa_type}
- Field-specific approval patterns
- Current USCIS adjudication trends

**8.2 Case-Specific Probability** (3-4 paragraphs)
- Probability assessment with reasoning
- Confidence interval explanation
- Factors affecting probability

**8.3 Scenario Analysis**
- Best Case: If all recommendations implemented
- Current State: As submitted
- Worst Case: If weaknesses exploited by adjudicator

**8.4 Comparative Case Analysis** (2-3 paragraphs)
How this case compares to similar approved/denied cases.

---

### PART 9: COMPREHENSIVE RECOMMENDATIONS (12-15 pages)

Provide at least 15 detailed, actionable recommendations:

**Recommendation 1: [Title]**
- Priority: [High/Medium/Low]
- Criterion Affected: [List]
- Current Gap: [What's missing]
- Recommended Action: (2-3 paragraphs of detailed guidance)
- Expected Impact: [How much this improves approval chances]
- Implementation Guidance: [Specific steps to take]

[Repeat for 15+ recommendations, each with full detail]

**Recommendations Summary Table**
| # | Recommendation | Priority | Impact | Difficulty |
|---|---------------|----------|--------|------------|
[Summary of all recommendations]

---

### PART 10: CONCLUSION (4-6 pages)

**10.1 Case Summary** (2-3 paragraphs)
Comprehensive summary of the entire analysis.

**10.2 Final Assessment** (2-3 paragraphs)
Overall evaluation and classification.

**10.3 Path Forward** (2-3 paragraphs)
Recommended next steps for the petitioner.

**10.4 Final Recommendation**
Clear, definitive recommendation on whether to proceed with filing.

**10.5 Closing Statement**
Professional conclusion of the analysis.

---

### APPENDIX: QUICK REFERENCE

**A. Key Statistics**
- Total Score: [X]/100
- Approval Probability: [X]%
- Classification: [X]
- Criteria Met: [X]/8

**B. Top 5 Priorities**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]
4. [Priority 4]
5. [Priority 5]

**C. Document Checklist**
[Checklist of recommended documents to gather]

---

TARGET LENGTH: Approximately 30-35 pages (~15,000-17,000 words). This is the final section - make it comprehensive and actionable."""

    return await generate_text(
        prompt=prompt,
        system_prompt=COMPREHENSIVE_ANALYSIS_SYSTEM,
        max_tokens=32000,
        temperature=0.3,
    )
