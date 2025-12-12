// app/lib/openai-client.ts
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call OpenAI GPT-4o API
 * Used as fallback when Claude API fails
 */
export async function callOpenAI(
  prompt: string,
  systemPrompt: string = '',
  maxTokens: number = 16384,
  temperature: number = 0.3
): Promise<string> {
  console.log('[OpenAI Fallback] Calling GPT-4o...');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    console.log('[OpenAI Fallback] Success! Tokens used:', response.usage?.total_tokens);
    return content;
  } catch (error: any) {
    console.error('[OpenAI Fallback] Error:', error.message);
    throw error;
  }
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  const hasKey = !!process.env.OPENAI_API_KEY;
  console.log('[OpenAI] Configuration check:', {
    hasKey,
    keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 15) || 'undefined'
  });
  return hasKey;
}
