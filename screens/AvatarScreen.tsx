import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { spacing, fontSize, radius } from '../theme/tokens';
import { repositories } from '../repositories';

interface Instrument {
  key: string;
  label: string;
  emoji: string;
}

const INSTRUMENTS: Instrument[] = [
  { key: 'string', label: 'String', emoji: '🎻' },
  { key: 'keyboard', label: 'Keyboard', emoji: '🎹' },
  { key: 'guitar', label: 'Guitar', emoji: '🎸' },
  { key: 'woodwind', label: 'Woodwind', emoji: '🪈' },
  { key: 'brass', label: 'Brass', emoji: '🎺' },
  { key: 'hybrid', label: 'Hybrid', emoji: '🎷' },
  { key: 'percussion', label: 'Percussion', emoji: '🥁' },
  { key: 'theory', label: 'Theory', emoji: '🎼' },
  { key: 'other', label: 'Other', emoji: '🎶' },
];

const DEFAULT_INSTRUMENT = INSTRUMENTS[0].key;

export function AvatarScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [selected, setSelected] = useState(profile?.instrument ?? DEFAULT_INSTRUMENT);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.instrument) setSelected(profile.instrument);
  }, [profile?.instrument]);

  const selectedInstrument = INSTRUMENTS.find((i) => i.key === selected) ?? INSTRUMENTS[0];

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await repositories.users.updateSettings(user.id, { instrument: selected });
      setProfile(updated);
    } catch (error) {
      Alert.alert('Could not save instrument', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.avatarCircle, { backgroundColor: `${theme.colors.primary}14`, borderColor: theme.colors.primary }]}>
          <Text style={styles.avatarEmoji}>{selectedInstrument.emoji}</Text>
        </View>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Choose Your Instrument</Text>

        <View style={styles.grid}>
          {INSTRUMENTS.map((instrument) => {
            const isSelected = instrument.key === selected;
            return (
              <Pressable
                key={instrument.key}
                onPress={() => setSelected(instrument.key)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <Text style={styles.cardEmoji}>{instrument.emoji}</Text>
                <Text style={[styles.cardLabel, { color: theme.colors.textPrimary }]}>{instrument.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: isSaving ? 0.5 : 1 }]}
        >
          <Text style={[styles.saveButtonText, { color: theme.colors.onPrimary }]}>Save Customization</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const CIRCLE_SIZE = 120;
const CARD_WIDTH = '31%';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatarCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  avatarEmoji: {
    fontSize: 56,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  cardLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  saveButton: {
    width: '100%',
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
