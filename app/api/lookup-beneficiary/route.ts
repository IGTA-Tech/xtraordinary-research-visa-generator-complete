import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, profession, visaType } = body;

    // Validate required fields
    if (!name || !profession) {
      return NextResponse.json(
        { error: 'Name and profession are required' },
        { status: 400 }
      );
    }

    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (!perplexityApiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    console.log(`[Lookup] Searching for: ${name} - ${profession}`);

    // Use Perplexity to find URLs about the person
    const perplexityPrompt = `Find 10-15 verifiable URLs with evidence about ${name}, a ${profession}.

Focus on finding:
1. Official websites (personal site, company profile, team roster)
2. News articles from major publications (ESPN, BBC, CNN, etc.)
3. Industry publications and trade journals
4. Professional databases and rankings
5. Social media profiles (LinkedIn, verified Twitter/X)
6. Award announcements and recognition
7. Published interviews or features
8. Competition results or performance records

For ${visaType || 'visa petition'} purposes, prioritize:
- Official records and statistics
- Media coverage from reputable sources
- Professional achievements and awards
- Published work or performances
- Industry recognition

Return ONLY a JSON array of objects with this exact format:
[
  {
    "url": "full URL",
    "title": "article/page title",
    "source": "publication/website name",
    "description": "brief description of content",
    "category": "awards|media|profile|statistics|publication"
  }
]

Be specific with real, verifiable URLs. Include the domain clearly.`;

    const perplexityResponse = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant helping find verifiable evidence for visa petitions. Return ONLY valid JSON arrays with real URLs.'
          },
          {
            role: 'user',
            content: perplexityPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2048,
      },
      {
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const responseText = perplexityResponse.data.choices[0].message.content;
    console.log('[Lookup] Perplexity response:', responseText);

    // Extract JSON from response
    let sources: any[] = [];
    try {
      // Try to parse as JSON directly
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        sources = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[Lookup] Failed to parse JSON:', parseError);
      // Fallback: extract URLs manually
      const urlRegex = /https?:\/\/[^\s<>"]+/g;
      const urls = responseText.match(urlRegex) || [];
      sources = urls.slice(0, 15).map((url: string, index: number) => ({
        url,
        title: `Source ${index + 1}`,
        source: new URL(url).hostname,
        description: 'Found via Perplexity search',
        category: 'other',
        confidence: 'medium'
      }));
    }

    console.log(`[Lookup] Found ${sources.length} sources`);

    // Classify confidence based on source
    const enrichedSources = sources.map((source: any) => {
      const domain = source.url ? new URL(source.url).hostname.toLowerCase() : '';

      let confidence: 'high' | 'medium' | 'low' = 'medium';

      // High confidence sources
      if (domain.includes('espn.com') ||
          domain.includes('bbc.com') ||
          domain.includes('cnn.com') ||
          domain.includes('nytimes.com') ||
          domain.includes('wikipedia.org') ||
          domain.includes('linkedin.com')) {
        confidence = 'high';
      }

      return {
        ...source,
        confidence,
        sourceTier: confidence === 'high' ? 1 : confidence === 'medium' ? 2 : 3
      };
    });

    const confidenceDistribution = {
      high: enrichedSources.filter(s => s.confidence === 'high').length,
      medium: enrichedSources.filter(s => s.confidence === 'medium').length,
      low: enrichedSources.filter(s => s.confidence === 'low').length,
    };

    return NextResponse.json({
      success: true,
      sources: enrichedSources,
      searchStrategy: 'Perplexity AI search with focus on verifiable evidence',
      totalFound: enrichedSources.length,
      confidenceDistribution,
      verificationData: {
        likelyCorrectPerson: enrichedSources.length > 0,
        confidence: enrichedSources.length >= 5 ? 'high' : enrichedSources.length >= 2 ? 'medium' : 'low',
        keyIdentifiers: enrichedSources.slice(0, 3).map(s => s.source),
        summary: enrichedSources.length > 0
          ? `Found ${enrichedSources.length} sources about ${name}, including ${confidenceDistribution.high} high-quality sources.`
          : `No sources found for ${name}. The name may be spelled differently or the person may not have significant public presence.`
      }
    });
  } catch (error: any) {
    console.error('Error in lookup-beneficiary:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to lookup beneficiary',
        details: error.response?.data || null
      },
      { status: 500 }
    );
  }
}
