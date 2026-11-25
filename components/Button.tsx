import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize } from '../theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? { backgroundColor: theme.colors.primary }
          : { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.onPrimary : theme.colors.textPrimary} />
      ) : (
        <Text
          style={[styles.text, { color: isPrimary ? theme.colors.onPrimary : theme.colors.textPrimary }]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
