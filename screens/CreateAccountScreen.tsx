import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { AuthHeader } from '../components/AuthHeader';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { spacing, fontSize } from '../theme/tokens';
import { repositories } from '../repositories';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../lib/aboutLinks';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAccount'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateAccountScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValid = fullName.trim().length > 0 && EMAIL_REGEX.test(email.trim()) && password.length >= 8;

  async function handleCreateAccount() {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const trimmedEmail = email.trim();
      const authUser = await repositories.auth.signUp({ email: trimmedEmail, password });

      // If email confirmation is required, signUp() returns a user but no session —
      // auth.uid() is null until the link is confirmed, so RLS would reject the profile
      // write below. Send the user to confirm instead of pretending they're logged in.
      const hasSession = (await repositories.auth.getCurrentUser()) !== null;
      if (!hasSession) {
        Alert.alert(
          'Confirm your email',
          `We sent a confirmation link to ${trimmedEmail}. Verify it, then log in.`
        );
        navigation.navigate('Login');
        return;
      }

      await repositories.users.saveProfile({
        id: authUser.id,
        email: authUser.email,
        name: fullName.trim(),
        practiceGoal: null,
        instrument: null,
        theme: 'classical',
        unlocked: false,
        pushNotificationsEnabled: true,
        dailyReminderEnabled: false,
        dailyReminderTime: '09:00',
        sessionTimerAlertsEnabled: true,
      });
      // The auth-state subscription in authStore picks up the new session and flips
      // isAuthenticated, so RootNavigator swaps to the main tab navigator on its own.
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader subtitle="Create your account" />

          <TextField
            label="Full Name"
            placeholder="Antonio Vivaldi"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextField
            label="Email Address"
            placeholder="antonio.vivaldi@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextField label="Password" value={password} onChangeText={setPassword} isPassword />

          <Button
            title="Create Account"
            onPress={handleCreateAccount}
            disabled={!isValid}
            loading={isSubmitting}
          />

          {errorMessage && (
            <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
          )}

          <Text style={[styles.terms, { color: theme.colors.textSecondary }]}>
            By continuing, you agree to our{' '}
            <Text style={{ color: theme.colors.link, fontWeight: '600' }} onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={{ color: theme.colors.link, fontWeight: '600' }} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>

          <View style={styles.flexSpacer} />

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.footer}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: fontSize.md }}>
              Already have an account? <Text style={{ color: theme.colors.link, fontWeight: '700' }}>Log in</Text>
            </Text>
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
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  flexSpacer: { flex: 1, minHeight: spacing.xl },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  terms: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
