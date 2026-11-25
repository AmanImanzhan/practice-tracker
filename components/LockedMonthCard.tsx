import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, radius } from '../theme/tokens';
import { UnlockButton } from './UnlockButton';

interface LockedMonthCardProps {
  monthLabel: string;
  onUnlock: () => void;
  disabled?: boolean;
  priceLabel: string | null;
}

export function LockedMonthCard({ monthLabel, onUnlock, disabled, priceLabel }: LockedMonthCardProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}14` }]}>
        <Ionicons name="lock-closed" size={28} color={theme.colors.primary} />
      </View>

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Unlock your full practice history</Text>

      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        Your {monthLabel} sessions are safely saved. Purchase Full Access to view and edit your entire practice
        history — past and future.
      </Text>

      <View style={styles.buttonWrapper}>
        <UnlockButton
          label={priceLabel ? `Unlock Full Access — ${priceLabel}` : 'Unlock Full Access'}
          onPress={onUnlock}
          disabled={disabled}
        />
      </View>

      <Text style={[styles.reassurance, { color: theme.colors.textSecondary }]}>Nothing is ever deleted.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  buttonWrapper: {
    alignSelf: 'stretch',
  },
  reassurance: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
