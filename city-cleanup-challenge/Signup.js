import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { API_BASE_URL } from './apiConfig';

export default function Signup({ onSignup, onSwitchToLogin }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError('');
  };

  const validateForm = () => {
    const username = form.username.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const location = form.location.trim();

    if (!username || !email || !phone || !location || !form.password || !form.confirmPassword) {
      return 'Please complete every field.';
    }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
      return 'Username must be 3-30 characters with no spaces.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15 || !/^\+?[\d\s().-]+$/.test(phone)) {
      return 'Please enter a valid phone number.';
    }
    if (location.length < 2) {
      return 'Please enter your city or area.';
    }
    if (form.password.length < 10) {
      return 'Password must be at least 10 characters.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.';
    }
    return '';
  };

  const handleSignup = async () => {
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          location: form.location.trim(),
          password: form.password,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('Account created! Taking you to login...');
        setTimeout(() => {
          if (onSignup) onSignup(data.user?.username, data.user?.role || 'user');
        }, 700);
      } else {
        setError(data.message || 'We could not create your account.');
      }
    } catch (err) {
      setError('We could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = ({
    field,
    label,
    placeholder,
    keyboardType = 'default',
    autoComplete,
    secureTextEntry = false,
    hint,
    maxLength,
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#78948A"
        value={form[field]}
        onChangeText={(value) => updateField(field, value)}
        keyboardType={keyboardType}
        autoCapitalize={field === 'username' || field === 'email' ? 'none' : 'words'}
        autoCorrect={false}
        autoComplete={autoComplete}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        editable={!isSubmitting}
        accessibilityLabel={label}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );

  return (
    <LinearGradient colors={['#E8F7EE', '#F5FBF7', '#E2F2EA']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CITY CLEANUP</Text>
            </View>
            <Text style={styles.title}>Make your city shine</Text>
            <Text style={styles.subtitle}>
              Join your community, document your cleanup, and earn rewards for verified impact.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create your account</Text>
            <Text style={styles.cardSubtitle}>Tell us a little about yourself to get started.</Text>

            {error ? (
              <View style={[styles.message, styles.errorMessage]} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.message, styles.successMessage]} accessibilityRole="alert">
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {renderField({
              field: 'username',
              label: 'Username',
              placeholder: 'Choose a unique username',
              autoComplete: 'username',
              maxLength: 30,
              hint: 'Use 3-30 letters, numbers, dots, underscores, or hyphens.',
            })}
            {renderField({
              field: 'email',
              label: 'Email address',
              placeholder: 'you@example.com',
              keyboardType: 'email-address',
              autoComplete: 'email',
              maxLength: 254,
            })}
            {renderField({
              field: 'phone',
              label: 'Phone number',
              placeholder: '+256 700 000 000',
              keyboardType: 'phone-pad',
              autoComplete: 'tel',
              maxLength: 30,
            })}
            {renderField({
              field: 'location',
              label: 'Location',
              placeholder: 'City, district, or neighborhood',
              autoComplete: 'street-address',
              maxLength: 120,
              hint: 'This helps us show relevant cleanup events near you.',
            })}
            {renderField({
              field: 'password',
              label: 'Password',
              placeholder: 'At least 10 characters',
              autoComplete: 'new-password',
              secureTextEntry: true,
              maxLength: 128,
            })}
            {renderField({
              field: 'confirmPassword',
              label: 'Confirm password',
              placeholder: 'Enter your password again',
              autoComplete: 'new-password',
              secureTextEntry: true,
              maxLength: 128,
            })}

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create my account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already part of the community?</Text>
              <TouchableOpacity
                onPress={onSwitchToLogin}
                disabled={isSubmitting}
                accessibilityRole="button"
              >
                <Text style={styles.loginLink}> Log in</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.privacyNote}>
              Your contact details stay private and are used for account and cleanup updates.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  hero: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#D4ECDD',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16,
  },
  badgeText: {
    color: '#17633D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: '#153F2B',
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#4D695B',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 500,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderColor: '#DCEBE2',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingVertical: 28,
    shadowColor: '#123B27',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  cardTitle: {
    color: '#173D2B',
    fontSize: 25,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: '#61776B',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
    marginTop: 6,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#254B38',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    minHeight: 50,
    backgroundColor: '#F7FAF8',
    borderColor: '#C8DDD0',
    borderWidth: 1,
    borderRadius: 12,
    color: '#173D2B',
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  hint: {
    color: '#71877B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  message: {
    borderRadius: 12,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorMessage: {
    backgroundColor: '#FFF0ED',
    borderColor: '#F3C5BB',
    borderWidth: 1,
  },
  errorText: {
    color: '#9B3527',
    fontSize: 14,
    lineHeight: 20,
  },
  successMessage: {
    backgroundColor: '#EAF8EF',
    borderColor: '#B9DFC7',
    borderWidth: 1,
  },
  successText: {
    color: '#17633D',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#218653',
    borderRadius: 13,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#17633D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#7CAC91',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 22,
  },
  loginPrompt: {
    color: '#61776B',
    fontSize: 14,
  },
  loginLink: {
    color: '#17633D',
    fontSize: 14,
    fontWeight: '800',
  },
  privacyNote: {
    color: '#789084',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: 'center',
  },
});
