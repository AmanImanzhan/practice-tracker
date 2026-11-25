import type { Theme, ThemeName } from '../types/theme';

// Colors sampled directly from the Figma design screenshots (design/).
const classical: Theme = {
  name: 'classical',
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    textPrimary: '#20293A',
    textSecondary: '#677389',
    placeholder: '#9AA5B4',
    border: '#B7BFCB',
    primary: '#2A4DD0',
    onPrimary: '#FFFFFF',
    link: '#3662E3',
    danger: '#DD524C',
    tabActive: '#2A4DD0',
    tabInactive: '#8A93A6',
    tabBarBackground: '#FFFFFF',
  },
};

const dark: Theme = {
  name: 'dark',
  colors: {
    background: '#101218',
    surface: '#1F2532',
    textPrimary: '#F5F7FA',
    textSecondary: '#8A93A6',
    placeholder: '#5B6472',
    border: '#2A3142',
    primary: '#4E80EE',
    onPrimary: '#FFFFFF',
    link: '#7C96FF',
    danger: '#DD524C',
    tabActive: '#4E80EE',
    tabInactive: '#6B7280',
    tabBarBackground: '#151923',
  },
};

const rose: Theme = {
  name: 'rose',
  colors: {
    background: '#F7E9F0',
    surface: '#FFFFFF',
    textPrimary: '#20293A',
    textSecondary: '#677389',
    placeholder: '#B79AAE',
    border: '#F0D2E1',
    primary: '#ED72B2',
    onPrimary: '#FFFFFF',
    link: '#ED72B2',
    danger: '#DD524C',
    tabActive: '#ED72B2',
    tabInactive: '#9A8890',
    tabBarBackground: '#FFFFFF',
  },
};

export const palettes: Record<ThemeName, Theme> = { classical, dark, rose };
