import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  retryWithBackoff,
  createFallbackBackground,
  logError,
} from '@/app/lib/retry-helper';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000, // 60 seconds
  maxRetries: 2,
});

interface UrlSource {
  url: string;
  title?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  let fullName = '';
  let profession = '';
  let visaType = '';

  try {
    const body = await request.json();
    fullName = body.fullName || '';
    profession = body.profession || '';
    visaType = body.visaType || '';
    const { urls } = body;

    // Validate required fields
    if (!fullName || !profession || !visaType) {
      return NextResponse.json(
        { error: 'Full name, profession, and visa type are required' },
        { status: 400 }
      );
    }

    // Use Perplexity to gather real information if we have URLs
    let researchedInfo = '';
    if (urls && urls.length > 0 && process.env.PERPLEXITY_API_KEY) {
      try {
        const axios = require('axios');
        const perplexityResponse = await axios.post(
          'https://api.perplexity.ai/chat/completions',
          {
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: 'You are a research assistant. Extract factual information from provided sources.'
              },
              {
                role: 'user',
                content: `Based on these sources about ${fullName}, provide specific facts about their achievements, credentials, and significance as a ${profession}:\n\n${urls.slice(0, 5).map((url: UrlSource) => `${url.title || url.url}\n${url.description || ''}`).join('\n\n')}\n\nProvide ONLY verified facts, achievements, awards, and credentials.`
              }
            ],
            temperature: 0.2,
            max_tokens: 500,
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        researchedInfo = perplexityResponse.data.choices[0].message.content;
        console.log('[GenerateBackground] Got research from Perplexity');
      } catch (error) {
        console.error('[GenerateBackground] Perplexity research failed:', error);
      }
    }

    const urlContext = urls && urls.length > 0
      ? `\n\nSOURCE URLs PROVIDED:\n${urls.slice(0, 5).map((url: UrlSource) => `- ${url.title || url.url}`).join('\n')}`
      : '';

    const researchContext = researchedInfo
      ? `\n\nVERIFIED FACTS FROM RESEARCH:\n${researchedInfo}`
      : '';

    const prompt = `Generate a professional 2-3 paragraph background summary for a visa petition (${visaType}) for ${fullName}, a ${profession}.

${researchContext}${urlContext}

CRITICAL INSTRUCTIONS:
1. Use ONLY the verified facts provided above - do not make up or assume anything
2. If you have specific achievements/awards from research, include them
3. Introduce who they are and their field
4. Highlight their most notable verified achievements
5. Explain their significance based on the research
6. Be professional, factual, and suitable for USCIS immigration petition
7. If no research was provided, create a professional framework that can be filled in later

Keep it concise (150-250 words) and authoritative. Write in third person.`;

    console.log(`[GenerateBackground] Generating for ${fullName}`);

    const response = await retryWithBackoff(
      () =>
        anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      {
        maxRetries: 3,
        initialDelay: 1000,
      }
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    console.log(`[GenerateBackground] Successfully generated background`);

    return NextResponse.json({
      success: true,
      background: content.text.trim(),
    });
  } catch (error) {
    logError('generate-background', error, { fullName, profession, visaType });

    // Return fallback background instead of error
    const fallbackBackground = createFallbackBackground(fullName, profession, visaType);

    console.log('[GenerateBackground] Using fallback background');

    return NextResponse.json({
      success: true,
      background: fallbackBackground,
      warning: 'Generated using fallback mode due to service interruption',
    });
  }
}
