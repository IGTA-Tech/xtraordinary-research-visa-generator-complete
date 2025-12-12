import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FetchedUrlData {
  url: string;
  title: string;
  content: string;
  domain: string;
  fetchedAt: Date;
  success: boolean;
  error?: string;
}

export async function fetchUrl(url: string): Promise<FetchedUrlData> {
  try {
    const response = await axios.get(url, {
      timeout: 30000, // 30 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, iframe, noscript').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';

    // Extract main content
    let content = '';

    // Try to find main content areas
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.article',
      '.post',
      '#content',
      '#main',
      'body',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = element.text();
        break;
      }
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();

    // Limit content length to avoid token overflow
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '... [Content truncated]';
    }

    const domain = new URL(url).hostname;

    return {
      url,
      title,
      content,
      domain,
      fetchedAt: new Date(),
      success: true,
    };
  } catch (error: any) {
    return {
      url,
      title: 'Failed to fetch',
      content: '',
      domain: '',
      fetchedAt: new Date(),
      success: false,
      error: error.message,
    };
  }
}

export async function fetchMultipleUrls(urls: string[]): Promise<FetchedUrlData[]> {
  const fetchPromises = urls
    .filter((url) => url.trim().length > 0)
    .map((url) => fetchUrl(url.trim()));

  return Promise.all(fetchPromises);
}

export function analyzePublicationQuality(domain: string): {
  tier: 'Major Media' | 'Trade Publication' | 'Online Media' | 'Unknown';
  estimatedReach: string;
} {
  const majorMedia = [
    'nytimes.com',
    'wsj.com',
    'washingtonpost.com',
    'bbc.com',
    'cnn.com',
    'forbes.com',
    'bloomberg.com',
    'reuters.com',
    'espn.com',
    'ufc.com',
    'wikipedia.org',
    'theguardian.com',
    'ft.com',
  ];

  const tradePublications = [
    'sherdog.com',
    'mmafighting.com',
    'mmajunkie.com',
    'tapology.com',
    'fightmatrix.com',
  ];

  const domainLower = domain.toLowerCase();

  if (majorMedia.some((m) => domainLower.includes(m))) {
    return {
      tier: 'Major Media',
      estimatedReach: 'Millions (National/International)',
    };
  }

  if (tradePublications.some((t) => domainLower.includes(t))) {
    return {
      tier: 'Trade Publication',
      estimatedReach: 'Hundreds of thousands (Industry-specific)',
    };
  }

  if (domainLower.includes('news') || domainLower.includes('press')) {
    return {
      tier: 'Online Media',
      estimatedReach: 'Thousands to hundreds of thousands',
    };
  }

  return {
    tier: 'Unknown',
    estimatedReach: 'Unable to determine',
  };
}
