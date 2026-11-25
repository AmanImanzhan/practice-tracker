import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize, spacing } from '../theme/tokens';

interface SocialButtonProps {
  provider: 'google' | 'apple';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SocialButton({ provider, label, onPress, disabled }: SocialButtonProps) {
  const theme = useTheme();
  const iconName = provider === 'google' ? 'logo-google' : 'logo-apple';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={iconName} size={20} color={theme.colors.textPrimary} style={styles.icon} />
      <Text style={[styles.text, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
