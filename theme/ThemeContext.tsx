import React, { createContext, useContext, useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { palettes } from './palettes';
import type { Theme, ThemeName } from '../types/theme';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeName = useThemeStore((state) => state.themeName);
  const setThemeName = useThemeStore((state) => state.setThemeName);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: palettes[themeName], themeName, setThemeName }),
    [themeName, setThemeName]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme/useThemeControls must be used within a ThemeProvider');
  }
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemeControls(): { themeName: ThemeName; setThemeName: (name: ThemeName) => void } {
  const { themeName, setThemeName } = useThemeContext();
  return { themeName, setThemeName };
}
