import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize, spacing } from '../theme/tokens';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  isPassword?: boolean;
}

export function TextField({ label, isPassword, secureTextEntry, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const [isSecure, setIsSecure] = useState(isPassword ?? secureTextEntry ?? false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <TextInput
          {...inputProps}
          secureTextEntry={isSecure}
          placeholderTextColor={theme.colors.placeholder}
          style={[styles.input, { color: theme.colors.textPrimary }]}
        />
        {isPassword && (
          <Pressable onPress={() => setIsSecure((prev) => !prev)} hitSlop={8}>
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputRow: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    height: '100%',
  },
});
