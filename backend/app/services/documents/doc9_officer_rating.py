"""
Document 9: USCIS Officer Rating Report
Predicts approval likelihood and provides strategic recommendations
"""

from typing import Dict, Any, List


def get_doc9_prompt(case_data: Dict[str, Any], doc1_content: str, knowledge_base: str) -> str:
    """Generate the prompt for Document 9 - USCIS Officer Rating Report"""

    beneficiary_name = case_data.get('beneficiary_name', 'the beneficiary')
    visa_type = case_data.get('visa_type', 'O-1A')
    field = case_data.get('field', 'their field')

    return f"""You are an experienced USCIS adjudication officer with 15+ years of experience evaluating extraordinary ability visa petitions. Based on the comprehensive case analysis provided, generate a detailed USCIS Officer Rating Report.

## CASE INFORMATION
- Beneficiary: {beneficiary_name}
- Visa Type: {visa_type}
- Field: {field}

## COMPREHENSIVE ANALYSIS (Document 1)
{doc1_content[:50000]}

## VISA KNOWLEDGE BASE
{knowledge_base[:20000]}

---

# USCIS OFFICER RATING REPORT

Generate a comprehensive rating report with the following sections:

## 1. EXECUTIVE SUMMARY
- Overall approval probability (percentage)
- Confidence level (High/Medium/Low)
- Key strengths (top 3)
- Critical concerns (if any)
- Recommended filing strategy

## 2. CRITERION-BY-CRITERION ANALYSIS

For each applicable criterion, provide:

### Criterion [Number]: [Name]
**Rating:** [Strong/Moderate/Weak/Not Claimed]
**Evidence Quality:** [Excellent/Good/Fair/Poor]
**Approval Likelihood:** [XX%]

**What Works:**
- Specific evidence that meets USCIS standards
- Why this evidence is compelling

**Potential Concerns:**
- Areas where adjudicator might push back
- Missing elements or weak documentation

**Adjudicator Notes:**
- How a USCIS officer would likely view this evidence
- Comparison to approved cases

---

## 3. OVERALL RATING MATRIX

| Criterion | Claimed | Evidence | Rating | Likelihood |
|-----------|---------|----------|--------|------------|
[Fill in for each criterion]

## 4. EVIDENCE STRENGTH ANALYSIS

### Strongest Evidence
- List the 5 most compelling pieces of evidence
- Explain why they're particularly strong

### Evidence Gaps
- Identify missing documentation
- Suggest what could strengthen the case

### Red Flags
- Any inconsistencies or concerns
- Potential RFE triggers

## 5. COMPARATIVE ANALYSIS

Compare this petition to:
- Approved cases in the same field
- Cases with similar evidence profiles
- Industry standards for this visa type

## 6. RFE PREDICTION

### Likely RFE Topics
1. [Topic]: [Probability %]
   - What USCIS might ask
   - Recommended preemptive response

2. [Continue for top 5 likely RFE topics]

### RFE Prevention Strategy
- How to address concerns proactively in the petition
- Additional evidence to include

## 7. ADJUDICATOR'S PERSPECTIVE

### First Impression
- What an officer sees when opening this file
- Initial strengths and concerns

### Review Flow
- How the petition guides the officer through the case
- Areas where the officer might get stuck

### Decision Factors
- What will ultimately drive the approval/denial
- Tipping points in the analysis

## 8. STRATEGIC RECOMMENDATIONS

### Pre-Filing
- Evidence to gather before filing
- Documentation improvements needed
- Expert letters to request

### Filing Strategy
- Best time to file
- Premium processing recommendation (yes/no)
- Consular vs. change of status considerations

### Post-Filing
- RFE response preparation
- Interview preparation (if applicable)

## 9. FINAL ASSESSMENT

### Approval Probability: [XX%]

### Confidence Breakdown:
- Documentation Quality: [X/10]
- Evidence Relevance: [X/10]
- Narrative Strength: [X/10]
- Legal Compliance: [X/10]
- Overall Presentation: [X/10]

### Recommendation: [APPROVE / APPROVE WITH CONDITIONS / REQUEST ADDITIONAL EVIDENCE / CONCERNS NOTED]

### Summary Statement:
[2-3 paragraph summary of the case from an adjudicator's perspective, including the key factors that will determine the outcome]

---

## DISCLAIMER
This rating report is generated based on AI analysis of the petition materials and historical USCIS adjudication patterns. Actual USCIS decisions are made by authorized officers and may differ. This report is intended for internal strategic planning purposes only.

---

Generate the complete report following this structure. Be specific, cite actual evidence from the case, and provide actionable insights.
"""


async def generate_doc9(
    ai_client,
    case_data: Dict[str, Any],
    doc1_content: str,
    knowledge_base: str,
    progress_callback=None
) -> str:
    """Generate Document 9 - USCIS Officer Rating Report"""

    if progress_callback:
        progress_callback("Generating USCIS Officer Rating Report...")

    prompt = get_doc9_prompt(case_data, doc1_content, knowledge_base)

    try:
        response = await ai_client.generate(
            prompt=prompt,
            max_tokens=16000,
            temperature=0.3
        )

        if progress_callback:
            progress_callback("USCIS Officer Rating Report complete")

        return response

    except Exception as e:
        error_msg = f"Error generating Document 9: {str(e)}"
        if progress_callback:
            progress_callback(error_msg)
        raise Exception(error_msg)


def get_rating_criteria(visa_type: str) -> List[Dict[str, str]]:
    """Get the applicable criteria for rating based on visa type"""

    criteria_map = {
        'O-1A': [
            {'number': '1', 'name': 'Nationally or internationally recognized prizes or awards'},
            {'number': '2', 'name': 'Membership in associations requiring outstanding achievements'},
            {'number': '3', 'name': 'Published material about the beneficiary'},
            {'number': '4', 'name': 'Participation as a judge of others\' work'},
            {'number': '5', 'name': 'Original contributions of major significance'},
            {'number': '6', 'name': 'Authorship of scholarly articles'},
            {'number': '7', 'name': 'Employment in a critical or essential capacity'},
            {'number': '8', 'name': 'High salary or remuneration'},
        ],
        'O-1B': [
            {'number': '1', 'name': 'Performed as a lead or starring participant'},
            {'number': '2', 'name': 'Critical reviews or other published material'},
            {'number': '3', 'name': 'Performed for organizations with distinguished reputation'},
            {'number': '4', 'name': 'Record of major commercial or critically acclaimed successes'},
            {'number': '5', 'name': 'Received significant recognition from organizations, critics, or experts'},
            {'number': '6', 'name': 'High salary or substantial remuneration'},
        ],
        'P-1A': [
            {'number': '1', 'name': 'International recognition in the sport'},
            {'number': '2', 'name': 'Significant participation with a major team'},
            {'number': '3', 'name': 'Participation in international competition'},
            {'number': '4', 'name': 'Significant participation in a prior season with a major league'},
            {'number': '5', 'name': 'International recognition through ranking'},
            {'number': '6', 'name': 'International recognition through awards or honors'},
        ],
        'EB-1A': [
            {'number': '1', 'name': 'Nationally or internationally recognized prizes or awards'},
            {'number': '2', 'name': 'Membership in associations requiring outstanding achievements'},
            {'number': '3', 'name': 'Published material about the beneficiary'},
            {'number': '4', 'name': 'Participation as a judge of others\' work'},
            {'number': '5', 'name': 'Original contributions of major significance'},
            {'number': '6', 'name': 'Authorship of scholarly articles'},
            {'number': '7', 'name': 'Display of work at artistic exhibitions'},
            {'number': '8', 'name': 'Leading or critical role in distinguished organizations'},
            {'number': '9', 'name': 'High salary or remuneration'},
            {'number': '10', 'name': 'Commercial successes in the performing arts'},
        ],
        'EB-2 NIW': [
            {'number': '1', 'name': 'Advanced degree or exceptional ability'},
            {'number': '2', 'name': 'National importance of the proposed endeavor'},
            {'number': '3', 'name': 'Well-positioned to advance the endeavor'},
            {'number': '4', 'name': 'Benefit to the United States outweighs labor certification'},
        ]
    }

    return criteria_map.get(visa_type, criteria_map['O-1A'])
