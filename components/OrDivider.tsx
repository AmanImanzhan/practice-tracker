import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/tokens';

export function OrDivider() {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>or</Text>
      <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  text: {
    marginHorizontal: spacing.md,
    fontSize: 14,
  },
});
