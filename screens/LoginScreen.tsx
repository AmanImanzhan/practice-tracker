import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { AuthHeader } from '../components/AuthHeader';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { OrDivider } from '../components/OrDivider';
import { SocialButton } from '../components/SocialButton';
import { spacing, fontSize } from '../theme/tokens';
import { repositories } from '../repositories';
import { classifyAuthError } from '../lib/authErrors';
import { ensureProfileForSocialSignIn } from '../lib/profile';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function unexpectedErrorMessage(kind: ReturnType<typeof classifyAuthError>): string {
  if (kind === 'network') return 'No internet connection. Please check and try again.';
  return 'Something went wrong. Please try again.';
}

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValid = EMAIL_REGEX.test(email.trim()) && password.length > 0;

  async function handleLogin() {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await repositories.auth.signIn({ email: email.trim(), password });
      // The auth-state subscription in authStore picks this up and RootNavigator
      // swaps to the main tab navigator on its own.
    } catch (error) {
      const kind = classifyAuthError(error);
      setErrorMessage(kind === 'invalidCredentials' ? 'Incorrect email or password.' : unexpectedErrorMessage(kind));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (isSigningInWithGoogle) return;
    setIsSigningInWithGoogle(true);
    setErrorMessage(null);
    try {
      const result = await repositories.auth.signInWithGoogle();
      await ensureProfileForSocialSignIn(result);
    } catch (error) {
      // The user tapping "Cancel" isn't an error worth surfacing.
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      setErrorMessage(unexpectedErrorMessage(classifyAuthError(error)));
    } finally {
      setIsSigningInWithGoogle(false);
    }
  }

  async function handleApple() {
    if (isSigningInWithApple) return;
    setIsSigningInWithApple(true);
    setErrorMessage(null);
    try {
      const result = await repositories.auth.signInWithApple();
      await ensureProfileForSocialSignIn(result);
    } catch (error) {
      // The user tapping "Cancel" on Apple's own sheet isn't an error worth surfacing.
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      setErrorMessage(unexpectedErrorMessage(classifyAuthError(error)));
    } finally {
      setIsSigningInWithApple(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader subtitle="Welcome back." />

          <TextField
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextField label="Password" value={password} onChangeText={setPassword} isPassword />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() || undefined })}
            style={styles.forgotPassword}
          >
            <Text style={{ color: theme.colors.link, fontSize: fontSize.sm, fontWeight: '600' }}>Forgot password?</Text>
          </Pressable>

          <Button title="Log In" onPress={handleLogin} disabled={!isValid} loading={isSubmitting} />

          {errorMessage && (
            <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
          )}

          <OrDivider />

          <SocialButton
            provider="google"
            label="Continue with Google"
            onPress={handleGoogle}
            disabled={isSigningInWithGoogle}
          />
          <View style={styles.spacerSm} />
          <SocialButton
            provider="apple"
            label="Continue with Apple"
            onPress={handleApple}
            disabled={isSigningInWithApple}
          />

          <View style={styles.flexSpacer} />

          <Pressable onPress={() => navigation.navigate('SignUp')} style={styles.footer}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: fontSize.md }}>
              Don&apos;t have an account? <Text style={{ color: theme.colors.link, fontWeight: '700' }}>Sign up</Text>
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  spacerSm: { height: spacing.sm },
  flexSpacer: { flex: 1, minHeight: spacing.xl },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
