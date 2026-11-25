import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { TextField } from '../components/TextField';
import { spacing, fontSize, radius } from '../theme/tokens';
import { repositories } from '../repositories';

type Props = NativeStackScreenProps<SettingsStackParamList, 'EditProfile'>;

const MIN_GOAL_HOURS = 0;
const MAX_GOAL_HOURS = 12;

export function EditProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile?.name ?? '');
  const [practiceGoal, setPracticeGoal] = useState(profile?.practiceGoal ?? 1);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await repositories.users.updateSettings(user.id, {
        name: name.trim(),
        practiceGoal,
      });
      setProfile(updated);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save changes', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Edit Profile</Text>

          <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />

          {/* Email is tied to Supabase Auth login — changing it needs a dedicated
              confirm-by-email flow that doesn't exist yet, so it's read-only here. */}
          <TextField label="Email" value={profile?.email ?? ''} editable={false} />

          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>PRACTICE GOAL</Text>
          <View style={[styles.stepperRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Pressable
              onPress={() => setPracticeGoal((g) => Math.max(MIN_GOAL_HOURS, g - 1))}
              style={[styles.stepperButton, { backgroundColor: theme.colors.background }]}
            >
              <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
            </Pressable>
            <Text style={[styles.stepperValue, { color: theme.colors.textPrimary }]}>
              {practiceGoal} {practiceGoal === 1 ? 'hour' : 'hours'} / day
            </Text>
            <Pressable
              onPress={() => setPracticeGoal((g) => Math.min(MAX_GOAL_HOURS, g + 1))}
              style={[styles.stepperButton, { backgroundColor: theme.colors.background }]}
            >
              <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: isSaving ? 0.6 : 1 }]}
          >
            <Text style={[styles.saveButtonText, { color: theme.colors.onPrimary }]}>Save Changes</Text>
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  saveButton: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
