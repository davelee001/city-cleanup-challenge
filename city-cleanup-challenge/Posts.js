import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

export default function Posts({ username }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/posts');
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
      const res = await fetch('http://localhost:3000/posts', {
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
        />
        <Button title="Post" onPress={handleCreate} disabled={loading} />
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
              <Text>{post.content}</Text>
              <Text style={styles.date}>{new Date(post.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  form: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 10, marginRight: 8 },
  posts: { flex: 1 },
  post: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 6, marginBottom: 8 },
  author: { fontWeight: 'bold', marginBottom: 2 },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
  error: { color: 'red', marginBottom: 8 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20 }
});
