import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import ImageUploader from './components/ImageUploader';

const API_BASE_URL = 'http://localhost:3001/api/v1';

export default function Profile({ username, onLogout, onUsernameChange }) {
  const [profile, setProfile] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    // Load profile details and current avatar
    Promise.all([
      fetch(`${API_BASE_URL}/profile/${username}`),
      fetch(`${API_BASE_URL}/user/${username}/avatar`)
    ])
    .then(([profileRes, avatarRes]) => Promise.all([profileRes.json(), avatarRes.json()]))
    .then(([profileData, avatarData]) => {
      if (profileData.success) {
        setProfile(profileData.user);
        setNewUsername(profileData.user.username || username);
      }
      if (avatarData.success) {
        setAvatarUrl(avatarData.avatarUrl);
      }
      setLoading(false);
    })
    .catch(() => {
      setError('Failed to load profile.');
      setLoading(false);
    });
  }, [username]);

  const handleAvatarUploaded = (result) => {
    if (result.success && result.avatarUrl) {
      setAvatarUrl(result.avatarUrl);
      setSuccess('Avatar updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleUpdate = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profile/${username}` , {
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
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarLabel}>Profile Picture</Text>
        <ImageUploader
          uploadType="avatar"
          username={username}
          currentImageUrl={avatarUrl}
          onImageUploaded={handleAvatarUploaded}
          placeholder="Upload Avatar"
          style={styles.avatarUploader}
        />
      </View>
      
      <Text style={styles.title}>Profile Settings</Text>
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
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: '#f5f5f5' 
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  avatarUploader: {
    marginBottom: 8,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    textAlign: 'center',
    color: '#2e8b57'
  },
  label: { 
    fontWeight: 'bold', 
    marginTop: 12,
    color: '#555'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 4, 
    padding: 10, 
    marginTop: 4, 
    backgroundColor: '#fff' 
  },
  error: { 
    color: 'red', 
    marginBottom: 8, 
    textAlign: 'center',
    fontSize: 14
  },
  success: { 
    color: 'green', 
    marginBottom: 8, 
    textAlign: 'center',
    fontSize: 14
  }
});
