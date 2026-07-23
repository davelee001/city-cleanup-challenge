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

import { API_BASE_URL, apiFetch, setAuthSession } from './apiConfig';

export default function Login({ onLogin, onSwitchToSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await setAuthSession(data);
        onLogin(data.user.username, data.user?.role || 'user');
      } else {
        setError(data.message || 'We could not sign you in. Check your details and try again.');
      }
    } catch (err) {
      setError('We could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#061426', '#0A2240', '#0D3155']} style={styles.container}>
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
            <View style={styles.mark}>
              <Text style={styles.markIcon}>♻</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CITY CLEANUP</Text>
            </View>
            <Text style={styles.title}>Turn clean streets into real impact.</Text>
            <Text style={styles.subtitle}>
              Share verified cleanup work, grow your community, and earn rewards.
            </Text>
            <View style={styles.impactRow}>
              <Text style={styles.impactItem}>✓ Verified cleanups</Text>
              <Text style={styles.impactItem}>✓ Community rewards</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>WELCOME BACK</Text>
            <Text style={styles.cardTitle}>Sign in to continue</Text>
            <Text style={styles.cardSubtitle}>Your next cleanup starts here.</Text>

            {error ? (
              <View style={styles.errorMessage} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#7890AA"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  if (error) setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#7890AA"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError('');
                }}
                secureTextEntry
                autoComplete="current-password"
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign in securely</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>NEW TO CITY CLEANUP?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSwitchToSignup}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Create an account</Text>
            </TouchableOpacity>

            <Text style={styles.securityNote}>🔒 Your session is protected with secure access tokens.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'web' ? 64 : 28,
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  hero: {
    width: '100%',
    maxWidth: 520,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  mark: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#153F63',
    borderColor: '#2D6F9E',
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 20,
  },
  markIcon: { color: '#61D6C6', fontSize: 34, fontWeight: '700' },
  badge: {
    backgroundColor: 'rgba(62, 139, 255, 0.14)',
    borderColor: 'rgba(91, 161, 255, 0.36)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 16,
  },
  badgeText: { color: '#8DBDFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  title: {
    maxWidth: 500,
    color: '#F5F8FF',
    fontSize: Platform.OS === 'web' ? 46 : 36,
    fontWeight: '800',
    lineHeight: Platform.OS === 'web' ? 54 : 43,
    letterSpacing: -1,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  subtitle: {
    maxWidth: 470,
    color: '#AEC1D7',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 15,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  impactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 24 },
  impactItem: { color: '#72D7CA', fontSize: 13, fontWeight: '700' },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(13, 35, 61, 0.96)',
    borderColor: '#244B70',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: Platform.OS === 'web' ? 34 : 24,
    paddingVertical: 32,
    shadowColor: '#020912',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 36,
    elevation: 9,
  },
  cardEyebrow: { color: '#69B4FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  cardTitle: { color: '#F5F8FF', fontSize: 28, fontWeight: '800', marginTop: 8 },
  cardSubtitle: { color: '#93A9C0', fontSize: 14, marginBottom: 24, marginTop: 6 },
  fieldGroup: { marginBottom: 17 },
  label: { color: '#D9E6F5', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    width: '100%',
    minHeight: 52,
    backgroundColor: '#091B30',
    borderColor: '#315574',
    borderWidth: 1,
    borderRadius: 13,
    color: '#F5F8FF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  errorMessage: {
    backgroundColor: '#3D1C29',
    borderColor: '#7C3447',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 18,
    padding: 13,
  },
  errorText: { color: '#FFB8C5', fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2878E4',
    borderRadius: 13,
    marginTop: 4,
    padding: 15,
    shadowColor: '#1E6ED3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#315A83', shadowOpacity: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#284766' },
  dividerText: { color: '#7890AA', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#3C6A94',
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
  },
  secondaryButtonText: { color: '#BBD8F7', fontSize: 15, fontWeight: '800' },
  securityNote: { color: '#7890AA', fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
