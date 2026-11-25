import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';
import { to12Hour, to24Hour, type Period } from '../lib/date';
import { NumberStepper } from './NumberStepper';

interface TimePickerModalProps {
  visible: boolean;
  time24: string;
  onClose: () => void;
  onSelect: (time24: string) => void;
}

const PERIODS: Period[] = ['AM', 'PM'];

export function TimePickerModal({ visible, time24, onClose, onSelect }: TimePickerModalProps) {
  const theme = useTheme();
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<Period>('AM');

  useEffect(() => {
    if (visible) {
      const parsed = to12Hour(time24);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [visible, time24]);

  function handleDone() {
    onSelect(to24Hour(hour12, minute, period));
    onClose();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Reminder Time</Text>

          <View style={styles.row}>
            <NumberStepper label="HOUR" value={hour12} min={1} max={12} suffix={false} onChange={setHour12} />
            <NumberStepper label="MINUTE" value={minute} max={59} suffix={false} onChange={setMinute} />
            <View style={[styles.periodToggle, { borderColor: theme.colors.border }]}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.periodOption, period === p && { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={[styles.periodText, { color: period === p ? theme.colors.onPrimary : theme.colors.textPrimary }]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable onPress={handleDone} style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.doneButtonText, { color: theme.colors.onPrimary }]}>Done</Text>
          </Pressable>
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  periodToggle: {
    flexDirection: 'column',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  periodOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  periodText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  doneButton: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
