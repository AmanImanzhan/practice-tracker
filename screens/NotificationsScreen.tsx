import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { spacing, fontSize, radius } from '../theme/tokens';
import { formatTime12h } from '../lib/date';
import { getPermissionStatusAsync, requestPermissionAsync, syncScheduleWithProfile, type PermissionStatus } from '../lib/notifications';
import { TimePickerModal } from '../components/TimePickerModal';
import { repositories } from '../repositories';
import type { Profile } from '../types/domain';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Notifications'>;

type SettingsPatch = Partial<
  Pick<Profile, 'pushNotificationsEnabled' | 'dailyReminderEnabled' | 'dailyReminderTime' | 'sessionTimerAlertsEnabled'>
>;

export function NotificationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [systemStatus, setSystemStatus] = useState<PermissionStatus>('undetermined');
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

  // Re-checks on mount and every time this screen regains focus — catches the user
  // flipping notifications on/off in the iOS Settings app and coming back.
  useFocusEffect(
    useCallback(() => {
      // getPermissionStatusAsync never rejects (see lib/notifications.ts), but this
      // is awaited inside a try/catch regardless rather than left as a dangling
      // promise — useFocusEffect's callback itself can't be async, so it's wrapped.
      (async () => {
        try {
          setSystemStatus(await getPermissionStatusAsync());
        } catch (error) {
          console.warn('Could not check notification permission status:', error);
        }
      })();
    }, [])
  );

  async function save(patch: SettingsPatch): Promise<Profile | null> {
    if (!user) return null;
    setIsSaving(true);
    try {
      const updated = await repositories.users.updateSettings(user.id, patch);
      setProfile(updated);
      // Keeps this device's scheduled notifications in line with whatever was just
      // saved — the single place that decides what should and shouldn't be scheduled.
      await syncScheduleWithProfile(updated);
      return updated;
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  function showPermissionDeniedAlert() {
    Alert.alert(
      'Notifications Are Turned Off',
      'Enable notifications for Practice Tracker in Settings to turn this on.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  async function handlePushToggle(value: boolean) {
    // The Switch component doesn't await this handler's promise itself, so every
    // await in here is wrapped in one top-level try/catch — nothing is allowed to
    // become an unhandled rejection, even though requestPermissionAsync/save
    // shouldn't reject in the first place (see lib/notifications.ts).
    try {
      if (!value) {
        await save({ pushNotificationsEnabled: false });
        return;
      }

      if (systemStatus === 'granted') {
        await save({ pushNotificationsEnabled: true });
        return;
      }

      if (systemStatus === 'unavailable') {
        Alert.alert('Not Available Yet', 'Notifications will be available after the next app update.');
        return;
      }

      if (systemStatus === 'undetermined') {
        // Only ever prompted here — the moment the user first turns a toggle on,
        // never on app launch.
        const result = await requestPermissionAsync();
        setSystemStatus(result);
        if (result === 'granted') {
          await save({ pushNotificationsEnabled: true });
        } else {
          showPermissionDeniedAlert();
        }
        return;
      }

      // Already denied previously — iOS won't show its own prompt again.
      showPermissionDeniedAlert();
    } catch (error) {
      console.warn('Could not update the Push Notifications setting:', error);
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  const pushIntentOn = profile?.pushNotificationsEnabled ?? true;
  const pushEnabled = pushIntentOn && systemStatus === 'granted';
  const reminderEnabled = profile?.dailyReminderEnabled ?? false;
  const reminderTime = profile?.dailyReminderTime ?? '09:00';
  const timerAlertsEnabled = profile?.sessionTimerAlertsEnabled ?? true;
  const subRowsDisabled = isSaving || !pushEnabled;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Notifications</Text>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>APP NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Push Notifications</Text>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              disabled={isSaving}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.onPrimary}
            />
          </View>

          <View
            style={[
              styles.row,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
              !pushEnabled && styles.rowDisabled,
            ]}
          >
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Daily Practice Reminder</Text>
            </View>
            <Pressable
              onPress={() => setIsTimePickerVisible(true)}
              disabled={subRowsDisabled}
              style={[styles.timePill, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.timePillText, { color: theme.colors.textPrimary }]}>{formatTime12h(reminderTime)}</Text>
            </Pressable>
            <Switch
              value={reminderEnabled}
              onValueChange={(value) => void save({ dailyReminderEnabled: value })}
              disabled={subRowsDisabled}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.onPrimary}
            />
          </View>

          <View
            style={[
              styles.row,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
              !pushEnabled && styles.rowDisabled,
            ]}
          >
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Session Timer Alerts</Text>
              <Text style={[styles.rowCaption, { color: theme.colors.textSecondary }]}>Sound when timer ends</Text>
            </View>
            <Switch
              value={timerAlertsEnabled}
              onValueChange={(value) => void save({ sessionTimerAlertsEnabled: value })}
              disabled={subRowsDisabled}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.onPrimary}
            />
          </View>
        </View>
      </ScrollView>

      <TimePickerModal
        visible={isTimePickerVisible}
        time24={reminderTime}
        onClose={() => setIsTimePickerVisible(false)}
        onSelect={(time24) => void save({ dailyReminderTime: time24 })}
      />
    </SafeAreaView>
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
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowTextGroup: {
    flexShrink: 1,
  },
  rowLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  rowCaption: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  timePill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  timePillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
