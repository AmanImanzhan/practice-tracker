import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';

interface AuthHeaderProps {
  subtitle: string;
}

export function AuthHeader({ subtitle }: AuthHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.icon} />
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Practice Tracker</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
