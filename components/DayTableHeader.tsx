import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/tokens';
import { dayTableColumns } from './dayTableLayout';

export function DayTableHeader() {
  const theme = useTheme();
  const textStyle = { color: theme.colors.textSecondary };

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.cell, dayTableColumns.date, textStyle]} numberOfLines={1}>DATE</Text>
      <Text style={[styles.cell, dayTableColumns.number, textStyle]} numberOfLines={1}>#</Text>
      <Text style={[styles.cell, dayTableColumns.day, textStyle]} numberOfLines={1}>DAY</Text>
      <Text style={[styles.cell, dayTableColumns.time, textStyle]} numberOfLines={1}>TIME</Text>
      <Text style={[styles.cell, dayTableColumns.repertoire, textStyle]} numberOfLines={1}>REPERTOIRE</Text>
      <Text style={[styles.cell, dayTableColumns.note, textStyle]} numberOfLines={1}>NOTE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
