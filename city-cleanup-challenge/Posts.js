import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

import { API_BASE_URL, apiFetch } from './apiConfig';
import { colors } from './theme';
import ThemedButton from './components/ThemedButton';

export default function Posts({ username }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/posts`);
      const data = await res.json();
      if (data.success) setPosts(data.posts);
      else setError('Failed to load posts.');
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content })
      });
      const data = await res.json();
      if (data.success) {
        setContent('');
        fetchPosts();
      } else {
        setError(data.message || 'Failed to create post.');
      }
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Posts</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="Write a new post..."
          placeholderTextColor={colors.textMuted}
        />
        <ThemedButton title="Post" onPress={handleCreate} disabled={loading} />
      </View>
      {loading && <ActivityIndicator style={{ margin: 10 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.posts}>
        {posts.length === 0 && !loading ? (
          <Text style={styles.empty}>No posts yet.</Text>
        ) : (
          posts.slice().reverse().map(post => (
            <View key={post.id} style={styles.post}>
              <Text style={styles.author}>{post.username}</Text>
              <Text style={styles.postContent}>{post.content}</Text>
              <Text style={styles.date}>{new Date(post.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.pageBackground },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, color: colors.textPrimary },
  form: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.cardDeep,
    color: colors.textPrimary
  },
  posts: { flex: 1 },
  post: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8
  },
  author: { fontWeight: '600', marginBottom: 2, color: colors.textPrimary },
  postContent: { color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  error: { color: colors.danger, marginBottom: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 20 }
});
