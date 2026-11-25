import { create } from 'zustand';
import type { ThemeName } from '../types/theme';

interface ThemeState {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  /** Resets to the default theme — used after account deletion, so the next signed-up
   *  account on this device starts from Classical rather than inheriting the deleted
   *  account's preference. */
  reset: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: 'classical',
  setThemeName: (name) => set({ themeName: name }),
  reset: () => set({ themeName: 'classical' }),
}));
