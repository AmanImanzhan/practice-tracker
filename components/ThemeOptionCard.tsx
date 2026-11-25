import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';
import type { ThemeName } from '../types/theme';

// Each card always previews its OWN theme's real colors, regardless of which theme is
// currently active — confirmed against the design/ screenshots for all three themes.
// These aren't derived from theme/palettes.ts because the two preview circles per card
// don't correspond to any single existing token (e.g. Dark's second circle is a card-only
// #262626 that isn't the app's real surface color) — same treatment as the paywall gradient.
const THEME_PREVIEWS: Record<ThemeName, { label: string; cardBg: string; accent: string; circles: [string, string] }> = {
  classical: { label: 'Classical', cardBg: '#FFFFFF', accent: '#2A4DD0', circles: ['#2A4DD0', '#F0F6FE'] },
  dark: { label: 'Dark', cardBg: '#101218', accent: '#FFFFFF', circles: ['#FFFFFF', '#262626'] },
  rose: { label: 'Rosé', cardBg: '#F7E9F0', accent: '#ED72B2', circles: ['#ED72B2', '#FAE2E9'] },
};

interface ThemeOptionCardProps {
  name: ThemeName;
  selected: boolean;
  onPress: () => void;
}

export function ThemeOptionCard({ name, selected, onPress }: ThemeOptionCardProps) {
  const theme = useTheme();
  const preview = THEME_PREVIEWS[name];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: preview.cardBg, borderColor: selected ? preview.accent : theme.colors.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: preview.accent }]}>{preview.label}</Text>
        {selected && <Ionicons name="checkmark" size={16} color={preview.accent} />}
      </View>
      <View style={styles.circles}>
        <View style={[styles.circle, { backgroundColor: preview.circles[0] }]} />
        <View style={[styles.circle, { backgroundColor: preview.circles[1] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  circles: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
