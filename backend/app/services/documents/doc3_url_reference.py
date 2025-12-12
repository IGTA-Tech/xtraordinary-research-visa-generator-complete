"""
Document 3: URL Reference
Target: 10+ pages, 5,000+ words
Time: 1-2 minutes
"""
from app.services.ai_client import generate_text
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def generate(context: dict) -> str:
    """
    Generate Document 3: URL Reference

    Args:
        context: Generation context

    Returns:
        Generated document content
    """
    logger.info("Generating Document 3: URL Reference")

    beneficiary = context["beneficiary"]
    urls = context.get("urls", [])

    # Build URL list
    url_list = "\n".join([
        f"{i+1}. {url.get('url', '')} - {url.get('title', 'Untitled')}"
        for i, url in enumerate(urls)
    ])

    prompt = f"""Create a URL REFERENCE DOCUMENT organizing all evidence URLs by criterion for {beneficiary.full_name}'s {beneficiary.visa_type} petition.

URLS TO ORGANIZE:
{url_list}

Generate a URL Reference Document with this EXACT structure:

# URL REFERENCE DOCUMENT
## EVIDENCE SOURCES BY CRITERION - {beneficiary.full_name}

---

## CRITERION 1: [Name from {beneficiary.visa_type} regulations]

### Primary Evidence
- [URL 1]: [Description of what this proves]
  - Source Type: [Media / Official / Social / Competition / Academic]
  - Quality: [High / Medium / Low]
  - Status: [Active]

### Supporting Evidence
[Additional URLs]

---

[Repeat for ALL applicable criteria]

---

## GENERAL BACKGROUND SOURCES
[URLs providing general biographical info]

---

## COMPETITIVE LANDSCAPE SOURCES
[URLs showing beneficiary vs competitors/comparisons]

---

## INDUSTRY CONTEXT SOURCES
[URLs providing field context]

---

## TOTAL URL COUNT: {len(urls)}
## LAST VERIFIED: {datetime.now().strftime('%B %d, %Y')}

REQUIREMENTS:
- Organize ALL URLs by the criterion they support
- Include quality assessment for each
- Mark source type clearly
- Group related evidence together
- Be thorough and complete

Generate the COMPLETE URL reference document now:"""

    result = await generate_text(
        prompt=prompt,
        max_tokens=10000,
        temperature=0.2,
    )

    logger.info(f"Document 3 generated: {len(result)} chars")
    return result
