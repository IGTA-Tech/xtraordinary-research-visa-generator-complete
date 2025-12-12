import { serve } from 'inngest/next';
import { inngest } from '@/app/lib/inngest/client';
import { inngestFunctions } from '@/app/lib/inngest/functions';

// Extend Vercel timeout to maximum (requires Pro plan for 300s+)
export const maxDuration = 300; // 5 minutes max on Pro, 60s on Hobby

/**
 * Inngest API route handler
 *
 * This serves the Inngest functions and handles webhooks from Inngest.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
