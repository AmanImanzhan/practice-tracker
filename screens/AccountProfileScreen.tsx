import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { spacing, fontSize, radius } from '../theme/tokens';
import { formatMonthYear } from '../lib/date';
import { repositories } from '../repositories';
import { USER_CANCELLED_CODE } from '../repositories/supabase/SupabaseAuthRepository';
import { useProfileStore } from '../store/profileStore';
import { useSessionsStore } from '../store/sessionsStore';
import { useThemeStore } from '../store/themeStore';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AccountProfile'>;

export function AccountProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [isDeleting, setIsDeleting] = useState(false);

  function handleDeleteAccount() {
    if (!user || isDeleting) return;
    Alert.alert(
      'Delete your account?',
      'This action is irreversible. All your practice sessions, repertoire and profile data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDelete() {
    setIsDeleting(true);
    try {
      const provider = await repositories.auth.getSignInProvider();

      // Apple requires the app to revoke its grant when the user deletes their account —
      // doing that needs a fresh authorization code, which only a re-presented native
      // Apple sheet can produce (there's no silent way to get one).
      let appleAuthorizationCode: string | undefined;
      if (provider === 'apple') {
        try {
          appleAuthorizationCode = await repositories.auth.requestAppleAuthorizationCode();
        } catch (error) {
          // Dismissing Apple's sheet is exactly like tapping "Cancel" above — nothing
          // has been touched yet, so just stop, silently.
          if ((error as { code?: string })?.code === USER_CANCELLED_CODE) return;
          throw error;
        }
      }

      // The Edge Function revokes Apple access (if a code was passed) and only deletes
      // the account once that succeeds — see delete-account/index.ts. If it rejects,
      // nothing was touched, so it's always safe to let the user try again.
      await repositories.auth.deleteAccount(appleAuthorizationCode);

      if (provider === 'google') {
        await repositories.auth.revokeGoogleAccess();
      }

      // The account is already gone server-side at this point — clear local state so a
      // fresh sign-up on this device never briefly shows the deleted account's data.
      useProfileStore.getState().clear();
      useSessionsStore.getState().clear();
      useThemeStore.getState().reset();
      await signOut();
    } catch (error) {
      // Whatever actually failed here (a raw network error, an Apple OAuth error code,
      // a Supabase FunctionsHttpError message) is technical and not something a user
      // should have to parse — log it for debugging, show a fixed, friendly message.
      console.error('Account deletion failed', error);
      Alert.alert('Could not delete account', 'Please check your internet connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Account Profile</Text>

        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={[styles.editButton, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Edit Profile</Text>
        </Pressable>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Row label="Name" value={profile?.name ?? ''} theme={theme} />
          <Row label="Email" value={profile?.email ?? ''} theme={theme} />
          <Row
            label="Practice goal"
            value={profile?.practiceGoal ? `${profile.practiceGoal} hours / day` : 'Not set'}
            theme={theme}
          />
          <Row
            label="Member since"
            value={profile ? formatMonthYear(profile.createdAt) : ''}
            theme={theme}
            last
          />
        </View>

        <Pressable onPress={() => signOut()} style={styles.linkRow}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.link} />
          <Text style={[styles.linkText, { color: theme.colors.link }]}>Log Out</Text>
        </Pressable>

        <Pressable onPress={handleDeleteAccount} disabled={isDeleting} style={styles.linkRow}>
          {isDeleting ? (
            <ActivityIndicator size="small" color={theme.colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          )}
          <Text style={[styles.linkText, { color: theme.colors.danger }]}>Delete Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  theme,
  last,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  editButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.md,
  },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
