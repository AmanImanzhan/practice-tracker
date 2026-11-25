import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/tokens';
import { dayTableColumns } from './dayTableLayout';
import type { PracticeSession } from '../types/domain';
import { formatDuration, formatShortDate, weekdayAbbrev } from '../lib/date';

interface DayRowProps {
  year: number;
  month: number;
  day: number;
  session: PracticeSession | null;
  isSelected: boolean;
  onPress: () => void;
}

export function DayRow({ year, month, day, session, isSelected, onPress }: DayRowProps) {
  const theme = useTheme();
  const totalMinutes = session
    ? session.timings.reduce((sum, timing) => sum + timing.durationMinutes, 0)
    : 0;
  const repertoireLabel =
    session && session.repertoire.length > 0 ? session.repertoire.map((r) => r.title).join(', ') : '';
  const hasNote = !!session?.notes;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor: theme.colors.border },
        isSelected && {
          backgroundColor: `${theme.colors.primary}14`,
          borderTopWidth: 2,
          borderTopColor: theme.colors.primary,
        },
      ]}
    >
      <Text style={[styles.cell, dayTableColumns.date, { color: theme.colors.textPrimary }]}>
        {formatShortDate(year, month, day)}
      </Text>
      <Text
        style={[
          styles.cell,
          dayTableColumns.number,
          { color: session ? theme.colors.primary : theme.colors.placeholder, fontWeight: session ? '700' : '400' },
        ]}
      >
        {session ? session.dayNumber : '–'}
      </Text>
      <Text style={[styles.cell, dayTableColumns.day, { color: theme.colors.textPrimary }]}>
        {weekdayAbbrev(year, month, day)}
      </Text>
      <Text style={[styles.cell, dayTableColumns.time, { color: theme.colors.textPrimary }]}>
        {session ? formatDuration(totalMinutes) : ''}
      </Text>
      <Text
        style={[styles.cell, dayTableColumns.repertoire, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {repertoireLabel}
      </Text>
      <View style={dayTableColumns.note}>
        <Ionicons
          name={hasNote ? 'document-text' : 'add'}
          size={16}
          color={hasNote ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    fontSize: 13,
  },
});
