import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';

export default function Profile({ username, onLogout, onUsernameChange }) {
  const [profile, setProfile] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:3000/profile/${username}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.user);
          setNewUsername(data.user.username);
        } else {
          setError(data.message || 'Failed to load profile.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Network error.');
        setLoading(false);
      });
  }, [username]);

  const handleUpdate = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/profile/${username}` , {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Profile updated!');
        if (newUsername !== username && onUsernameChange) onUsernameChange(newUsername);
      } else {
        setError(data.message || 'Update failed.');
      }
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  };

  if (loading && !profile) return <ActivityIndicator style={{ margin: 20 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Text style={styles.label}>Username:</Text>
      <TextInput
        style={styles.input}
        value={newUsername}
        onChangeText={setNewUsername}
        autoCapitalize="none"
      />
      <Text style={styles.label}>New Password:</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Leave blank to keep current password"
      />
      <Button title="Update Profile" onPress={handleUpdate} disabled={loading} />
      <View style={{ marginTop: 20 }}>
        <Button title="Logout" onPress={onLogout} color="#d9534f" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 10, marginTop: 4 },
  error: { color: 'red', marginBottom: 8 },
  success: { color: 'green', marginBottom: 8 }
});
