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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    color: '#fff',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 8,
    textAlign: 'center',
  },
  success: {
    color: '#61dafb',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#61dafb',
    borderRadius: 4,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
});
