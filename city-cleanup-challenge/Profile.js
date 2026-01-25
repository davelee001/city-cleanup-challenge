import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export default function Profile({ username, onLogout, onUsernameChange }) {
  const [profile, setProfile] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/profile/${username}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.user);
          setNewUsername(data.user.username);
          setAvatar(data.user.avatar);
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
      const res = await fetch(`${API_BASE_URL}/profile/${username}` , {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, newPassword, avatar })
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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  if (loading && !profile) return <ActivityIndicator style={{ margin: 20 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.changeAvatarText}>Change Avatar</Text>
        </TouchableOpacity>
      </View>
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
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5' },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  changeAvatarText: {
    color: '#007bff',
    marginTop: 10,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 10, marginTop: 4, backgroundColor: '#fff' },
  error: { color: 'red', marginBottom: 8, textAlign: 'center' },
  success: { color: 'green', marginBottom: 8, textAlign: 'center' }
});
