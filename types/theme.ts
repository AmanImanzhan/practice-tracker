export type ThemeName = 'classical' | 'dark' | 'rose';

export interface ThemeColors {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  placeholder: string;
  border: string;
  primary: string;
  onPrimary: string;
  link: string;
  danger: string;
  tabActive: string;
  tabInactive: string;
  tabBarBackground: string;
}

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
}
