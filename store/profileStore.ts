import { create } from 'zustand';
import { repositories } from '../repositories';
import { useThemeStore } from './themeStore';
import { syncScheduleWithProfile } from '../lib/notifications';
import type { Profile } from '../types/domain';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  loadProfile: (userId: string) => Promise<void>;
  setProfile: (profile: Profile) => void;
  /** Clears cached profile state — used after account deletion, so a subsequent sign-up
   *  on the same device never briefly shows the previous account's profile. */
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,
  loadProfile: async (userId) => {
    if (get().profile?.id === userId) return;
    set({ isLoading: true, error: null });
    try {
      const profile = await repositories.users.getProfile(userId);
      set({ profile, isLoading: false });
      // Restores the theme the user picked last time — without this, every cold start
      // would render Classical (themeStore's default) until this fetch resolves.
      if (profile) {
        useThemeStore.getState().setThemeName(profile.theme);
        // Brings this device's scheduled notifications in line with the saved
        // settings — covers both app relaunch and a fresh sign-in, since both go
        // through this same loadProfile call. Never prompts for permission, and
        // never rejects (see lib/notifications.ts), but awaited inside this
        // try/catch regardless rather than left as a dangling promise.
        await syncScheduleWithProfile(profile);
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not load profile.',
      });
    }
  },
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null, isLoading: false, error: null }),
}));
