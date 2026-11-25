import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize } from '../theme/tokens';
import { UnlockButton } from './UnlockButton';

interface PaywallBannerProps {
  onUnlock: () => void;
  disabled?: boolean;
  priceLabel: string | null;
}

export function PaywallBanner({ onUnlock, disabled, priceLabel }: PaywallBannerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.eyebrow, { color: theme.colors.link }]}>FREE PLAN · CURRENT MONTH ONLY</Text>
      <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>
        Unlock your full practice history — one-time payment, no subscription.
      </Text>

      <UnlockButton
        label={priceLabel ? `Unlock Full Access — ${priceLabel}` : 'Unlock Full Access'}
        onPress={onUnlock}
        disabled={disabled}
      />

      <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>
        All your past sessions are saved and unlock instantly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  headline: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  caption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
