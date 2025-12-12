"""
Perplexity API Service - Beneficiary lookup and research
"""
import httpx
from typing import List, Optional
from app.config import settings
from app.models import URLSource
import logging
import json
import re

logger = logging.getLogger(__name__)

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"


async def lookup_beneficiary(
    name: str,
    profession: str,
    visa_type: Optional[str] = None,
    additional_info: Optional[str] = None,
) -> List[URLSource]:
    """
    Use Perplexity to find URLs and information about a beneficiary.

    Args:
        name: Full name of the beneficiary
        profession: Their profession/field
        visa_type: Optional visa type for context
        additional_info: Any additional search context

    Returns:
        List of URLSource objects found
    """
    if not settings.PERPLEXITY_API_KEY:
        logger.warning("Perplexity API key not configured")
        return []

    prompt = f"""Find 10-15 verifiable URLs with evidence about {name}, a {profession}.

Focus on finding:
1. Official websites (personal site, company profile, team roster)
2. News articles from major publications (ESPN, BBC, CNN, etc.)
3. Industry publications and trade journals
4. Professional databases and rankings
5. Social media profiles (LinkedIn, verified Twitter/X)
6. Award announcements and recognition
7. Published interviews or features
8. Competition results or performance records

{f'For {visa_type} visa petition purposes, prioritize:' if visa_type else 'Prioritize:'}
- Official records and statistics
- Media coverage from reputable sources
- Professional achievements and awards
- Published work or performances
- Industry recognition

{f'Additional context: {additional_info}' if additional_info else ''}

Return ONLY a JSON array of objects with this exact format:
[
  {{
    "url": "full URL",
    "title": "article/page title",
    "source": "publication/website name",
    "description": "brief description of content",
    "category": "awards|media|profile|statistics|publication"
  }}
]

Be specific with real, verifiable URLs. Include the domain clearly."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                PERPLEXITY_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a research assistant helping find verifiable evidence for visa petitions. Return ONLY valid JSON arrays with real URLs."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.2,
                    "max_tokens": 2048,
                }
            )
            response.raise_for_status()

            data = response.json()
            response_text = data["choices"][0]["message"]["content"]

            logger.info(f"Perplexity response: {response_text[:500]}...")

            # Parse JSON from response
            sources = parse_perplexity_response(response_text, name)

            logger.info(f"Found {len(sources)} sources for {name}")
            return sources

    except Exception as e:
        logger.error(f"Perplexity lookup failed: {e}")
        return []


def parse_perplexity_response(response_text: str, name: str) -> List[URLSource]:
    """Parse Perplexity response into URLSource objects"""
    sources = []

    try:
        # Try to extract JSON array from response
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if json_match:
            parsed = json.loads(json_match.group(0))

            for item in parsed:
                if isinstance(item, dict) and "url" in item:
                    # Classify confidence based on domain
                    url = item.get("url", "")
                    confidence = classify_source_confidence(url)

                    sources.append(URLSource(
                        url=url,
                        title=item.get("title", ""),
                        description=item.get("description", ""),
                        source_name=item.get("source", ""),
                        tier=1 if confidence == "high" else 2 if confidence == "medium" else 3,
                        confidence=confidence,
                    ))

    except json.JSONDecodeError:
        # Fallback: extract URLs manually
        logger.warning("JSON parse failed, extracting URLs manually")
        url_pattern = r'https?://[^\s<>"\']+[^\s<>"\',.)}\]]'
        urls = re.findall(url_pattern, response_text)

        for idx, url in enumerate(urls[:15]):  # Limit to 15
            confidence = classify_source_confidence(url)
            sources.append(URLSource(
                url=url,
                title=f"Source {idx + 1}",
                description="Found via Perplexity search",
                source_name=extract_domain(url),
                tier=1 if confidence == "high" else 2 if confidence == "medium" else 3,
                confidence=confidence,
            ))

    return sources


def classify_source_confidence(url: str) -> str:
    """Classify source confidence based on domain"""
    url_lower = url.lower()

    high_confidence = [
        "espn.com", "bbc.com", "cnn.com", "nytimes.com", "wsj.com",
        "wikipedia.org", "linkedin.com", "reuters.com", "forbes.com",
    ]

    medium_confidence = [
        "ufc.com", "sherdog.com", "tapology.com", "mmajunkie.com",
        "imdb.com", "twitter.com", "instagram.com",
    ]

    for domain in high_confidence:
        if domain in url_lower:
            return "high"

    for domain in medium_confidence:
        if domain in url_lower:
            return "medium"

    return "low"


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc.replace("www.", "")
    except Exception:
        return "unknown"


async def conduct_deep_research(
    name: str,
    profession: str,
    initial_urls: List[str],
) -> List[URLSource]:
    """
    Conduct deeper research to find additional sources.
    This is called after initial lookup to find more evidence.
    """
    if not settings.PERPLEXITY_API_KEY or not initial_urls:
        return []

    prompt = f"""Given these initial sources about {name} ({profession}):
{chr(10).join(initial_urls[:5])}

Find 5-10 ADDITIONAL sources that provide different evidence. Focus on:
1. Awards and recognitions not mentioned
2. Media coverage from different publications
3. Professional achievements and milestones
4. Expert opinions or testimonials
5. Statistical records or rankings

Return ONLY a JSON array with format:
[{{"url": "...", "title": "...", "source": "...", "description": "..."}}]"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                PERPLEXITY_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sonar",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 1500,
                }
            )
            response.raise_for_status()

            data = response.json()
            response_text = data["choices"][0]["message"]["content"]

            return parse_perplexity_response(response_text, name)

    except Exception as e:
        logger.error(f"Deep research failed: {e}")
        return []
