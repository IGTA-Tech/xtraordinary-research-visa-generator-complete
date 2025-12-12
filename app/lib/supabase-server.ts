import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Supabase] Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlPrefix: supabaseUrl?.substring(0, 20),
    keyPrefix: supabaseKey?.substring(0, 20),
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] Missing credentials!', {
      url: supabaseUrl,
      key: supabaseKey ? '[REDACTED]' : undefined,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
    });
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}
