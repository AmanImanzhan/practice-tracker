import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize } from '../theme/tokens';

interface NumberStepperProps {
  label: string;
  value: number;
  max: number;
  min?: number;
  /** First character of `label`, lowercased, shown after the value (e.g. "5m"). Pass
   *  `false` to show the bare number instead — used where the label already appears
   *  separately, like a time picker's "Hour" / "Minute" steppers. */
  suffix?: string | false;
  onChange: (value: number) => void;
}

export function NumberStepper({ label, value, max, min = 0, suffix, onChange }: NumberStepperProps) {
  const theme = useTheme();
  const displaySuffix = suffix === false ? '' : suffix ?? label[0].toLowerCase();
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8}>
        <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
      </Pressable>
      <Text style={[styles.stepperValue, { color: theme.colors.textPrimary }]}>
        {value}
        {displaySuffix}
      </Text>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8}>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
      </Pressable>
      <Text style={[styles.stepperLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: spacing.xs,
  },
});
