import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../lib/aboutLinks';
import { ensureProfileForSocialSignIn } from '../lib/profile';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const isValidEmail = EMAIL_REGEX.test(email.trim());

  function handleSignUp() {
    navigation.navigate('CreateAccount', { email: email.trim() });
  }

  async function handleGoogle() {
    if (isSigningInWithGoogle) return;
    setIsSigningInWithGoogle(true);
    try {
      const result = await repositories.auth.signInWithGoogle();
      await ensureProfileForSocialSignIn(result);
    } catch (error) {
      // The user tapping "Cancel" isn't an error worth surfacing.
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Could not sign in with Google', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSigningInWithGoogle(false);
    }
  }

  async function handleApple() {
    if (isSigningInWithApple) return;
    setIsSigningInWithApple(true);
    try {
      const result = await repositories.auth.signInWithApple();
      await ensureProfileForSocialSignIn(result);
    } catch (error) {
      // The user tapping "Cancel" on Apple's own sheet isn't an error worth surfacing.
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Could not sign in with Apple', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSigningInWithApple(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader subtitle="Master your craft, one session at a time." />

          <TextField
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Button title="Sign Up" onPress={handleSignUp} disabled={!isValidEmail} />

          <Text style={[styles.terms, { color: theme.colors.textSecondary }]}>
            By clicking continue, you agree to our{' '}
            <Text style={{ color: theme.colors.link, fontWeight: '600' }} onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={{ color: theme.colors.link, fontWeight: '600' }} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>

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
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  spacerSm: { height: spacing.sm },
  flexSpacer: { flex: 1, minHeight: spacing.xl },
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
