import Anthropic from '@anthropic-ai/sdk';
import {
  retryWithBackoff,
  createFallbackLookupResult,
  logError,
  safeJsonParse,
} from './retry-helper';
import { callAIWithFallback } from './document-generator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000, // 60 seconds timeout for beneficiary lookup
  maxRetries: 2, // SDK-level retries
});

export interface BeneficiarySource {
  url: string;
  title: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  category?: string;
}

export interface BeneficiaryLookupResult {
  sources: BeneficiarySource[];
  searchStrategy: string;
  totalFound: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  // Verification data to confirm correct person
  verificationData?: {
    likelyCorrectPerson: boolean;
    confidence: 'high' | 'medium' | 'low';
    keyIdentifiers: string[]; // e.g., "NFL kicker", "Green Bay Packers", "Australian"
    summary: string; // Brief summary of who this person appears to be
    potentialMatches?: Array<{
      name: string;
      description: string;
      likelihood: 'high' | 'medium' | 'low';
    }>;
  };
}

/**
 * AI-powered beneficiary lookup with LIBERAL search strategy
 * Fixes the "no results found" issue from previous versions
 *
 * Based on Claude's recommendations for comprehensive URL discovery
 */
export async function lookupBeneficiary(
  name: string,
  profession: string
): Promise<BeneficiaryLookupResult> {
  const prompt = `Find 8-12 verifiable URLs about ${name} (${profession}) for visa petition evidence.

SEARCH STRATEGY:
1. Primary sources: Wikipedia, LinkedIn, official pages, team/company sites
2. Major platforms: ESPN/sports DBs, IMDb, Google Scholar, industry databases
3. News: Major publications (NYT, WSJ, ESPN, SI, etc.)
4. Social: Verified Twitter/Instagram, YouTube features

OUTPUT JSON:
{
  "sources": [
    {
      "url": "full URL",
      "title": "page title",
      "source": "site name",
      "confidence": "high/medium/low",
      "description": "1 sentence relevance",
      "category": "profile/news/achievement/publication/media"
    }
  ],
  "searchStrategy": "brief approach description",
  "totalFound": number,
  "verificationData": {
    "likelyCorrectPerson": true/false,
    "confidence": "high/medium/low",
    "keyIdentifiers": ["key details"],
    "summary": "2-3 sentence summary"
  }
}

CONFIDENCE:
- high: 90%+ (official, verified)
- medium: 70-90% (news, likely match)
- low: 50-70% (needs verification)

Include sources even if 60-70% confident. Be liberal in search.`;

  try {
    console.log(`[BeneficiaryLookup] Starting lookup for: ${name} (${profession})`);

    const textResponse = await callAIWithFallback(
      prompt,
      '', // no system prompt
      2048, // max_tokens
      0.2 // temperature
    );

    // Parse the JSON response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[BeneficiaryLookup] Could not find JSON in response');
      return createFallbackLookupResult();
    }

    const result = safeJsonParse(jsonMatch[0], {}) as {
      sources?: BeneficiarySource[];
      searchStrategy?: string;
      verificationData?: BeneficiaryLookupResult['verificationData'];
    };

    // Validate and structure the result
    const sources: BeneficiarySource[] = Array.isArray(result.sources) ? result.sources : [];

    // Calculate confidence distribution
    const confidenceDistribution = {
      high: sources.filter(s => s.confidence === 'high').length,
      medium: sources.filter(s => s.confidence === 'medium').length,
      low: sources.filter(s => s.confidence === 'low').length,
    };

    console.log(`[BeneficiaryLookup] Found ${sources.length} sources`);

    return {
      sources,
      searchStrategy: result.searchStrategy || 'Comprehensive multi-source search',
      totalFound: sources.length,
      confidenceDistribution,
      verificationData: result.verificationData,
    };
  } catch (error) {
    logError('AI beneficiary lookup', error, { name, profession });

    // Return fallback result instead of empty
    return createFallbackLookupResult();
  }
}

/**
 * Deduplicate URLs from multiple sources
 */
export function deduplicateUrls(sources: BeneficiarySource[]): BeneficiarySource[] {
  const seen = new Set<string>();
  const deduplicated: BeneficiarySource[] = [];

  for (const source of sources) {
    // Normalize URL (remove trailing slash, lowercase domain)
    const normalizedUrl = source.url.toLowerCase().replace(/\/$/, '');

    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      deduplicated.push(source);
    }
  }

  return deduplicated;
}

/**
 * Filter sources by minimum confidence level
 */
export function filterByConfidence(
  sources: BeneficiarySource[],
  minConfidence: 'low' | 'medium' | 'high' = 'low'
): BeneficiarySource[] {
  const confidenceLevels = { low: 1, medium: 2, high: 3 };
  const threshold = confidenceLevels[minConfidence];

  return sources.filter(
    source => confidenceLevels[source.confidence] >= threshold
  );
}
