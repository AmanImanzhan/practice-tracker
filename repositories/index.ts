import { SupabaseAuthRepository } from './supabase/SupabaseAuthRepository';
import { SupabaseUserRepository } from './supabase/SupabaseUserRepository';
import { SupabaseSessionsRepository } from './supabase/SupabaseSessionsRepository';
import { SupabaseRepertoireRepository } from './supabase/SupabaseRepertoireRepository';
import { SupabaseSessionTimingsRepository } from './supabase/SupabaseSessionTimingsRepository';
import { ExpoIapPurchaseRepository } from './ExpoIapPurchaseRepository';

// Single place the rest of the app imports repositories from. Screens, components and
// stores must go through `repositories`, never import a `supabase/*` class or the
// Supabase SDK directly — swapping providers later means changing only this file.
export const repositories = {
  auth: new SupabaseAuthRepository(),
  users: new SupabaseUserRepository(),
  sessions: new SupabaseSessionsRepository(),
  repertoire: new SupabaseRepertoireRepository(),
  timings: new SupabaseSessionTimingsRepository(),
  purchases: new ExpoIapPurchaseRepository(),
};

export type { AuthUser, AuthCredentials } from './interfaces/AuthRepository';
