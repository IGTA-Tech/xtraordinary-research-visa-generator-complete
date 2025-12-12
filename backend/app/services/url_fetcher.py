"""
Async URL Fetcher - Fetches and extracts content from URLs
"""
import httpx
import asyncio
from typing import List, Optional
from dataclasses import dataclass
from urllib.parse import urlparse
import re
import logging

logger = logging.getLogger(__name__)

# Timeout for URL fetches
FETCH_TIMEOUT = 15.0

# Max content length to extract (characters)
MAX_CONTENT_LENGTH = 15000

# User agent for requests
USER_AGENT = "Mozilla/5.0 (compatible; VisaPetitionBot/1.0)"


@dataclass
class FetchedURL:
    url: str
    title: str
    content: str
    domain: str
    tier: int
    success: bool
    error: Optional[str] = None


# Tier 1 domains (major media)
TIER_1_DOMAINS = {
    "espn.com", "bbc.com", "cnn.com", "nytimes.com", "wsj.com",
    "reuters.com", "usatoday.com", "foxsports.com", "nbcsports.com",
    "cbssports.com", "theguardian.com", "forbes.com", "bloomberg.com",
}

# Tier 2 domains (industry/official)
TIER_2_DOMAINS = {
    "ufc.com", "nba.com", "nfl.com", "mlb.com", "fifa.com",
    "sherdog.com", "tapology.com", "mmajunkie.com", "linkedin.com",
    "wikipedia.org", "imdb.com", "scholar.google.com",
}


def get_domain_tier(domain: str) -> int:
    """Determine the tier of a domain"""
    domain_lower = domain.lower()
    for tier1 in TIER_1_DOMAINS:
        if tier1 in domain_lower:
            return 1
    for tier2 in TIER_2_DOMAINS:
        if tier2 in domain_lower:
            return 2
    return 3


def extract_text_from_html(html: str) -> str:
    """Extract readable text from HTML"""
    # Remove script and style elements
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<nav[^>]*>.*?</nav>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<footer[^>]*>.*?</footer>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html)

    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()

    return text[:MAX_CONTENT_LENGTH]


def extract_title(html: str) -> str:
    """Extract title from HTML"""
    match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Try og:title
    match = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    return "Untitled"


async def fetch_single_url(client: httpx.AsyncClient, url: str) -> FetchedURL:
    """Fetch a single URL and extract content"""
    domain = urlparse(url).netloc
    tier = get_domain_tier(domain)

    try:
        response = await client.get(
            url,
            follow_redirects=True,
            timeout=FETCH_TIMEOUT,
        )
        response.raise_for_status()

        html = response.text
        title = extract_title(html)
        content = extract_text_from_html(html)

        logger.info(f"Fetched {url}: {len(content)} chars")

        return FetchedURL(
            url=url,
            title=title,
            content=content,
            domain=domain,
            tier=tier,
            success=True,
        )

    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return FetchedURL(
            url=url,
            title="",
            content="",
            domain=domain,
            tier=tier,
            success=False,
            error=str(e),
        )


async def fetch_urls(urls: List[str], max_concurrent: int = 10) -> List[FetchedURL]:
    """
    Fetch multiple URLs concurrently.

    Args:
        urls: List of URLs to fetch
        max_concurrent: Maximum concurrent requests

    Returns:
        List of FetchedURL objects
    """
    if not urls:
        return []

    # Deduplicate URLs
    unique_urls = list(dict.fromkeys(urls))
    logger.info(f"Fetching {len(unique_urls)} unique URLs...")

    results = []
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_with_semaphore(client: httpx.AsyncClient, url: str):
        async with semaphore:
            return await fetch_single_url(client, url)

    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        tasks = [fetch_with_semaphore(client, url) for url in unique_urls]
        results = await asyncio.gather(*tasks)

    # Sort by tier (lower is better)
    results.sort(key=lambda x: (x.tier, not x.success))

    success_count = sum(1 for r in results if r.success)
    logger.info(f"Successfully fetched {success_count}/{len(results)} URLs")

    return results


def analyze_publication_quality(domain: str) -> dict:
    """Analyze the quality/tier of a publication domain"""
    tier = get_domain_tier(domain)

    tier_names = {
        1: "Major Media",
        2: "Trade Publication",
        3: "Online Media",
    }

    reach_estimates = {
        1: "Millions (national/international)",
        2: "Hundreds of thousands (industry-specific)",
        3: "Thousands to tens of thousands",
    }

    return {
        "tier": tier_names.get(tier, "Unknown"),
        "tier_number": tier,
        "estimated_reach": reach_estimates.get(tier, "Unknown"),
        "domain": domain,
    }
