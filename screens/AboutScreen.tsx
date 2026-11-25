import React from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, radius } from '../theme/tokens';
import {
  APP_STORE_REVIEW_URL,
  FEEDBACK_EMAIL,
  INSTAGRAM_URL,
  PRIVACY_POLICY_URL,
  SHOW_INSTAGRAM_LINK,
  SHOW_SUPPORT_DEVELOPERS_LINK,
  SUPPORT_DEVELOPERS_URL,
  TERMS_OF_SERVICE_URL,
} from '../lib/aboutLinks';

type Props = NativeStackScreenProps<SettingsStackParamList, 'About'>;

const APP_VERSION = Constants.expoConfig?.version ?? '—';

async function handleRateApp() {
  // The Pressable that calls this doesn't await the returned promise, so the entire
  // body — not just the native-module loading part — is wrapped in one top-level
  // try/catch. Nothing here (including the Linking.openURL fallback) is allowed to
  // become an unhandled rejection.
  try {
    // Loaded lazily, on tap, rather than as a top-level import: expo-store-review's
    // native module isn't guaranteed to be linked into every build yet (it's new).
    // A static import throws the moment this screen's module loads — before the app
    // even registers itself — crashing the whole app on startup, not just this button.
    const StoreReview = await import('expo-store-review');
    // Metro's dynamic import can resolve without throwing even when the native module
    // underneath failed to load, leaving exports like these undefined — catching the
    // import alone isn't enough; checking for real functions is what actually covers it.
    if (typeof StoreReview.isAvailableAsync === 'function' && typeof StoreReview.requestReview === 'function') {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        return;
      }
    } else {
      console.warn('expo-store-review is unavailable in this build — falling back to the App Store link.');
    }

    if (APP_STORE_REVIEW_URL) {
      await Linking.openURL(APP_STORE_REVIEW_URL);
      return;
    }
    Alert.alert('Not available yet', 'Practice Tracker isn’t on the App Store yet — check back after launch.');
  } catch (error) {
    // Expected on any build made before expo-store-review was added — not a bug, so
    // this is a console.warn, not console.error (which would pop LogBox's red screen).
    console.warn('expo-store-review could not be loaded, or the App Store link could not be opened:', error);
  }
}

function handleSendFeedback() {
  const subject = encodeURIComponent('Practice Tracker Feedback');
  Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}`).catch(() => {
    Alert.alert('Could not open Mail', `Please email us directly at ${FEEDBACK_EMAIL}.`);
  });
}

interface AboutLink {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const LINKS: AboutLink[] = [
  { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => Linking.openURL(TERMS_OF_SERVICE_URL) },
  { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => Linking.openURL(PRIVACY_POLICY_URL) },
  { icon: 'star-outline', label: 'Rate the App', onPress: handleRateApp },
  { icon: 'chatbubble-ellipses-outline', label: 'Send Feedback', onPress: handleSendFeedback },
  ...(SHOW_INSTAGRAM_LINK
    ? [{ icon: 'logo-instagram' as const, label: 'Follow us on Instagram', onPress: () => Linking.openURL(INSTAGRAM_URL) }]
    : []),
  ...(SHOW_SUPPORT_DEVELOPERS_LINK
    ? [{ icon: 'heart-outline' as const, label: 'Support the Developers', onPress: () => Linking.openURL(SUPPORT_DEVELOPERS_URL) }]
    : []),
];

export function AboutScreen({ navigation }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>Practice Tracker</Text>
          <Text style={[styles.version, { color: theme.colors.textSecondary }]}>Version {APP_VERSION}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {LINKS.map((link, index) => (
            <Pressable
              key={link.label}
              onPress={link.onPress}
              style={[
                styles.row,
                index < LINKS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
              ]}
            >
              <Ionicons name={link.icon} size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>Made with ♥ for musicians</Text>
        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
          © {new Date().getFullYear()} Practice Tracker
        </Text>
      </ScrollView>
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
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  version: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
