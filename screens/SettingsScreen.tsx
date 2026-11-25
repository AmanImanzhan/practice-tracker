import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useTheme, useThemeControls } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { spacing, fontSize, radius } from '../theme/tokens';
import { ThemeOptionCard } from '../components/ThemeOptionCard';
import { PAYWALL_ENABLED } from '../lib/features';
import { repositories } from '../repositories';
import type { ThemeName } from '../types/theme';

const THEME_ORDER: ThemeName[] = ['classical', 'dark', 'rose'];

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

interface AccountRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: keyof SettingsStackParamList;
  onPress?: () => void;
}

const ACCOUNT_ROUTE_ROWS: AccountRow[] = [
  { icon: 'person-outline', label: 'Account Profile', route: 'AccountProfile' },
  { icon: 'notifications-outline', label: 'Notifications', route: 'Notifications' },
  { icon: 'download-outline', label: 'Export Practice Data', route: 'ExportData' },
  { icon: 'information-circle-outline', label: 'About Practice Tracker', route: 'About' },
];

export function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { themeName, setThemeName } = useThemeControls();
  const { user } = useAuth();
  const { setProfile } = useProfile();
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleSelectTheme(name: ThemeName) {
    if (!user || isSavingTheme) return;
    setThemeName(name); // applies instantly, no confirmation step in the design
    setIsSavingTheme(true);
    try {
      const updated = await repositories.users.updateSettings(user.id, { theme: name });
      setProfile(updated);
    } catch (error) {
      Alert.alert('Could not save theme', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSavingTheme(false);
    }
  }

  // Required by App Review for non-consumable IAPs: lets a user recover "Full Access"
  // without paying twice (new device, reinstall, or a purchase that never made it to
  // profiles.unlocked because the app was killed mid-verification).
  async function handleRestorePurchases() {
    if (!user || isRestoring) return;
    setIsRestoring(true);
    try {
      const found = await repositories.purchases.restoreFullAccess();
      if (found) {
        const updated = await repositories.users.getProfile(user.id);
        if (updated) setProfile(updated);
        Alert.alert('Purchase restored', 'Full Access has been unlocked on this account.');
      } else {
        Alert.alert('Nothing to restore', 'No previous "Full Access" purchase was found for this Apple ID.');
      }
    } catch (error) {
      Alert.alert('Could not restore purchases', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }

  const accountRows: AccountRow[] = [
    ...ACCOUNT_ROUTE_ROWS,
    // Hidden in 1.0 — no purchase to restore while the paywall is off (lib/features.ts).
    ...(PAYWALL_ENABLED
      ? [{ icon: 'refresh-outline' as const, label: 'Restore Purchases', onPress: handleRestorePurchases }]
      : []),
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Manage your preferences & themes</Text>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>CHOOSE THEME</Text>
        <View style={styles.themeRow}>
          {THEME_ORDER.map((name) => (
            <ThemeOptionCard
              key={name}
              name={name}
              selected={themeName === name}
              onPress={() => handleSelectTheme(name)}
            />
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacing, { color: theme.colors.textSecondary }]}>
          ACCOUNT SETTINGS
        </Text>
        <View style={[styles.accountList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {accountRows.map((row, index) => {
            const rowStyle = [
              styles.accountRow,
              index < accountRows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
            ];
            const isBusy = row.label === 'Restore Purchases' && isRestoring;
            const content = (
              <>
                {isBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                ) : (
                  <Ionicons name={row.icon} size={20} color={theme.colors.textSecondary} />
                )}
                <Text style={[styles.accountLabel, { color: theme.colors.textPrimary }]}>{row.label}</Text>
                {row.route && <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />}
              </>
            );
            const onPress = row.route ? () => navigation.navigate(row.route!) : row.onPress;
            if (!onPress) {
              return (
                <View key={row.label} style={rowStyle}>
                  {content}
                </View>
              );
            }
            return (
              <Pressable key={row.label} style={rowStyle} onPress={onPress} disabled={isBusy}>
                {content}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionSpacing: {
    marginTop: spacing.xxl,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  accountList: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  accountLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
