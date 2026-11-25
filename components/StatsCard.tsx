import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';

interface StatsCardProps {
  daysPracticed: number;
  totalTimeLabel: string;
}

export function StatsCard({ daysPracticed, totalTimeLabel }: StatsCardProps) {
  const theme = useTheme();
  // Same soft tint as the selected table row: primary at ~8% opacity over the
  // background, not a separate hand-picked color per theme.
  const cardBackground = `${theme.colors.primary}14`;

  return (
    <View style={[styles.card, { backgroundColor: cardBackground }]}>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: theme.colors.link }]}>MONTHLY STREAK</Text>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{daysPracticed} Days Practiced</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: theme.colors.link }]}>TOTAL TIME</Text>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{totalTimeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
});
