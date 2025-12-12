"""
Document 2: Publication Analysis
Target: 40+ pages, 20,000+ words
Time: 2-3 minutes
"""
from app.services.ai_client import generate_text
from app.prompts.system import PUBLICATION_ANALYSIS_SYSTEM
import logging

logger = logging.getLogger(__name__)


def get_domain_tier(domain: str) -> int:
    """Get tier number for a domain"""
    domain_lower = domain.lower()

    tier_1 = ["espn.com", "bbc.com", "cnn.com", "nytimes.com", "wsj.com", "reuters.com", "foxsports.com"]
    tier_2 = ["ufc.com", "sherdog.com", "tapology.com", "mmajunkie.com", "linkedin.com", "wikipedia.org"]

    for d in tier_1:
        if d in domain_lower:
            return 1
    for d in tier_2:
        if d in domain_lower:
            return 2
    return 3


async def generate(context: dict, doc1: str) -> str:
    """
    Generate Document 2: Publication Analysis

    Args:
        context: Generation context
        doc1: Comprehensive analysis (for reference)

    Returns:
        Generated document content
    """
    logger.info("Generating Document 2: Publication Analysis")

    beneficiary = context["beneficiary"]
    urls = context.get("urls", [])

    # Sort and limit URLs
    relevant_urls = urls[:60]

    # Categorize by tier
    tier_1 = [u for u in relevant_urls if get_domain_tier(u.get("domain", "")) == 1]
    tier_2 = [u for u in relevant_urls if get_domain_tier(u.get("domain", "")) == 2]
    tier_3 = [u for u in relevant_urls if get_domain_tier(u.get("domain", "")) == 3]

    # Build URL details
    url_details = "\n\n".join([
        f"""URL {i+1}:
- Link: {url.get('url', '')}
- Domain: {url.get('domain', '')}
- Title: {url.get('title', '')}
- Tier: {get_domain_tier(url.get('domain', ''))}
- Content Preview: {url.get('content', '')[:1500]}..."""
        for i, url in enumerate(relevant_urls)
    ])

    prompt = f"""You are an expert at evaluating publication significance for {beneficiary.visa_type} visa petitions.

BENEFICIARY: {beneficiary.full_name}
FIELD: {beneficiary.profession}

## PUBLICATION TIER BREAKDOWN (Total: {len(relevant_urls)} sources):
- **Tier 1 (Gold Standard)**: {len(tier_1)} sources - ESPN, BBC, CNN, NYT, major sports networks
- **Tier 2 (Strong/Industry)**: {len(tier_2)} sources - Trade publications, official league sites, industry databases
- **Tier 3 (Supplementary)**: {len(tier_3)} sources - Regional media, niche publications, established blogs

## TIER QUALITY STANDARDS:

**TIER 1 - GOLD STANDARD** (Weight: Premium)
- Major international/national media: ESPN, BBC, CNN, NYT, WSJ, Reuters, USA Today
- Major sports networks: Fox Sports, NBC Sports, CBS Sports
- Reach: Millions (national/international audiences)
- Use: Primary evidence, strongest weight

**TIER 2 - STRONG/INDUSTRY** (Weight: High)
- Official league/federation sources: UFC.com, NBA.com, FIFA.com
- Industry publications: MMA Junkie (USA Today Sports), Sherdog, Tapology
- Regional major outlets: LA Times, Chicago Tribune
- Reach: Hundreds of thousands (industry-specific)
- Use: Strong supporting evidence

**TIER 3 - SUPPLEMENTARY** (Weight: Moderate)
- Niche publications with editorial standards
- Established blogs and specialist sites
- Local newspapers
- Reach: Thousands to tens of thousands
- Use: Supporting context, not primary evidence

PUBLICATIONS/MEDIA TO ANALYZE:
{url_details}

CONTEXT FROM COMPREHENSIVE ANALYSIS:
{doc1[:5000]}

YOUR TASK:
Generate a 40+ page PUBLICATION SIGNIFICANCE ANALYSIS following this EXACT structure:

# PUBLICATION SIGNIFICANCE ANALYSIS
## MEDIA COVERAGE ASSESSMENT - {beneficiary.full_name}

### EXECUTIVE SUMMARY
[Overview of media coverage quality and reach]

### PART 1: METHODOLOGY
[Explain how publications were evaluated - circulation data, editorial standards, etc.]

### PART 2: PUBLICATION-BY-PUBLICATION ANALYSIS

For EACH URL provided:

#### Publication #[N]: [Publication Name]
**URL**: [Full URL]
**Publication Type**: [Major media / Trade publication / Online media]

**Reach Metrics**:
- Circulation/Monthly Visitors: [Specific numbers]
- Geographic Reach: [Local / Regional / National / International]
- Audience Demographics: [Description]

**Editorial Standards**:
- Editorial Process: [Description]
- Publication Prestige: [Assessment]

**Content Analysis**:
- Article Title: [Full title]
- Focus on Beneficiary: [Primary subject / Secondary mention / Brief mention]
- Key Points Mentioned: [Paraphrase major points]

**Significance Score**: [1-10]

### PART 3: AGGREGATE ANALYSIS
**Total Combined Reach**: [Sum with overlap consideration]
**Coverage Quality Distribution**: [How many high/medium/low quality]

### PART 4: TIER-BASED CUMULATIVE ANALYSIS

**Publication Count by Tier:**
| Tier | Count | Quality Level |
|------|-------|---------------|
| Tier 1 | {len(tier_1)} | Gold Standard |
| Tier 2 | {len(tier_2)} | Strong/Industry |
| Tier 3 | {len(tier_3)} | Supplementary |

[Detailed analysis of each tier]

### PART 5: USCIS STANDARDS ANALYSIS
[How this coverage meets USCIS requirements for {beneficiary.visa_type}]

### PART 6: CONCLUSIONS
[Overall assessment]

CRITICAL REQUIREMENTS:
- **LENGTH**: 40+ PAGE document (~20,000+ words)
- **TIER-BASED APPROACH**: Tier 1 sources get most attention
- **REALISTIC REACH ESTIMATES**: Use reasonable numbers
- **FOCUS ON QUALITY**: Emphasize Tier 1-2 sources

Generate the COMPLETE publication analysis now:"""

    result = await generate_text(
        prompt=prompt,
        system_prompt=PUBLICATION_ANALYSIS_SYSTEM,
        max_tokens=24000,
        temperature=0.3,
    )

    logger.info(f"Document 2 generated: {len(result)} chars")
    return result
