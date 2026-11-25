import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { classifyAuthError } from '../lib/authErrors';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;
type Step = 'email' | 'reset';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_REGEX = /^\d{6}$/;

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isResetValid = CODE_REGEX.test(code.trim()) && newPassword.length >= 8;

  async function handleSendCode() {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await repositories.auth.requestPasswordReset(email.trim());
      setStep('reset');
    } catch (error) {
      const kind = classifyAuthError(error);
      setErrorMessage(
        kind === 'network' ? 'No internet connection. Please check and try again.' : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleResetPassword() {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await repositories.auth.confirmPasswordReset(email.trim(), code.trim(), newPassword);
      // verifyOtp establishes a real session, so the user is already logged in at this
      // point — authStore's subscription picks it up and RootNavigator swaps to the
      // main app on its own. No manual navigation: by the time this Alert's button is
      // tapped, the Login/ForgotPassword screens may already be unmounted.
      Alert.alert('Password Updated', 'Your password has been updated.');
    } catch (error) {
      const kind = classifyAuthError(error);
      setErrorMessage(
        kind === 'network'
          ? 'No internet connection. Please check and try again.'
          : kind === 'invalidCredentials'
            ? 'Incorrect or expired code. Please try again.'
            : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader
            subtitle={step === 'email' ? 'Reset your password' : `Enter the code sent to ${email.trim()}`}
          />

          {step === 'email' ? (
            <>
              <TextField
                label="Email Address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <Button title="Send Code" onPress={handleSendCode} disabled={!isEmailValid} loading={isSending} />
            </>
          ) : (
            <>
              <TextField
                label="6-Digit Code"
                placeholder="123456"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TextField label="New Password" value={newPassword} onChangeText={setNewPassword} isPassword />

              <Button title="Reset Password" onPress={handleResetPassword} disabled={!isResetValid} loading={isResetting} />

              <Pressable onPress={handleSendCode} disabled={isSending} style={styles.resend}>
                <Text style={{ color: theme.colors.link, fontSize: fontSize.sm, fontWeight: '600' }}>Resend code</Text>
              </Pressable>
            </>
          )}

          {errorMessage && <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>}

          <View style={styles.flexSpacer} />
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
  resend: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
});
