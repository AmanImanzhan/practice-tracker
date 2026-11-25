import { create } from 'zustand';
import { repositories, type AuthUser } from '../repositories';
import { cancelAllScheduled } from '../lib/notifications';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  /** Restores the persisted Supabase session and subscribes to future auth changes.
   *  Returns an unsubscribe function for the caller's effect cleanup. */
  initialize: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  initialize: () => {
    repositories.auth
      .getCurrentUser()
      .then((user) => set({ user, isAuthenticated: !!user, isHydrating: false }))
      .catch((error) => {
        console.warn('Failed to restore Supabase session', error);
        set({ user: null, isAuthenticated: false, isHydrating: false });
      });

    return repositories.auth.onAuthStateChange((user) => {
      set({ user, isAuthenticated: !!user });
    });
  },
  signOut: async () => {
    // Single choke point for both the plain "Log Out" button and account deletion
    // (which also calls this) — covers "cancel everything scheduled" for both.
    await cancelAllScheduled();
    await repositories.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
