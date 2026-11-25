import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorageAdapter } from './secureStorageAdapter';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — check your .env file.'
  );
}

// Guard against pasting the REST endpoint (".../rest/v1/") instead of the project's
// base URL — the SDK appends /rest/v1, /auth/v1, etc. itself.
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
