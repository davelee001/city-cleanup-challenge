import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

// A single, shared button used across sections (Events, Progress, Posts,
// Chatbot, etc.) so every call-to-action shares the same color, font
// weight, and shape as the rest of the app instead of the browser/OS
// default <Button /> look.
export default function ThemedButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const variantStyle = variant === 'secondary'
    ? styles.secondary
    : variant === 'danger'
      ? styles.danger
      : styles.primary;
  const textStyle = variant === 'secondary' ? styles.secondaryText : styles.primaryText;

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      accessibilityRole="button"
    >
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primary: { backgroundColor: colors.accentBlue },
  secondary: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.borderMuted,
    borderWidth: 1,
  },
  danger: { backgroundColor: colors.dangerBg, borderColor: '#6E3544', borderWidth: 1 },
  disabled: { opacity: 0.55 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  secondaryText: { color: colors.accentBlueSoft, fontSize: 14, fontWeight: '600' },
});
