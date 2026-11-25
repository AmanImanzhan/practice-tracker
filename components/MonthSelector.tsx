import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';
import { formatMonthLabel } from '../lib/date';
import { MonthYearPickerModal } from './MonthYearPickerModal';

interface MonthSelectorProps {
  year: number;
  month: number;
  onSelectMonth: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onSelectMonth }: MonthSelectorProps) {
  const theme = useTheme();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setIsPickerOpen(true)}
        style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{formatMonthLabel(year, month)}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </Pressable>

      <MonthYearPickerModal
        visible={isPickerOpen}
        year={year}
        month={month}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(selectedYear, selectedMonth) => {
          setIsPickerOpen(false);
          onSelectMonth(selectedYear, selectedMonth);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
