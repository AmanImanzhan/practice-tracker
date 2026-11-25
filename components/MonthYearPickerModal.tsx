import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthYearPickerModalProps {
  visible: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
}

export function MonthYearPickerModal({ visible, year, month, onClose, onSelect }: MonthYearPickerModalProps) {
  const theme = useTheme();
  // Year being browsed in the grid — independent of the year currently applied to
  // Home, so paging with the arrows doesn't change anything until a month is tapped.
  const [browseYear, setBrowseYear] = useState(year);

  useEffect(() => {
    if (visible) setBrowseYear(year);
  }, [visible, year]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable onPress={() => setBrowseYear((y) => y - 1)} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </Pressable>
            <Text style={[styles.yearText, { color: theme.colors.textPrimary }]}>{browseYear}</Text>
            <Pressable onPress={() => setBrowseYear((y) => y + 1)} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {MONTH_ABBREVIATIONS.map((label, index) => {
              const monthNumber = index + 1;
              const isSelected = browseYear === year && monthNumber === month;
              return (
                <Pressable
                  key={label}
                  onPress={() => onSelect(browseYear, monthNumber)}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.cellText, { color: isSelected ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  yearText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: '30%',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cellText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
