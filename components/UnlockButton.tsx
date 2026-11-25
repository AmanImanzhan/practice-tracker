import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, fontSize } from '../theme/tokens';

interface UnlockButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

// The green→blue gradient is a fixed brand treatment for the paywall CTA (sampled
// from the mock), not a themed color — it stays the same across Classical/Dark/Rosé
// the way App Store "unlock" buttons usually don't reskin with the rest of the UI.
const GRADIENT_COLORS = ['#55B787', '#4D81EB'] as const;

export function UnlockButton({ label, onPress, disabled }: UnlockButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        {disabled ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
