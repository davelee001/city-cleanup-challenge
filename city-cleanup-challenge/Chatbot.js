import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';

import { API_BASE_URL, apiFetch } from './apiConfig';
import { colors } from './theme';
import ThemedButton from './components/ThemedButton';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am your guide. Ask me how to make a post!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { from: 'user', text: input };
    setMessages([...messages, userMessage]);
    setLoading(true);
    try {
      // Get bot response
      const res = await apiFetch(`${API_BASE_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setMessages(msgs => [...msgs, { from: 'bot', text: data.reply || 'Sorry, I did not understand.' }]);
    } catch {
      setMessages(msgs => [...msgs, { from: 'bot', text: 'Network error.' }]);
    }
    setInput('');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chatbot Guide</Text>
      <ScrollView style={styles.chat} contentContainerStyle={{ paddingBottom: 20 }}>
        {messages.map((msg, i) => (
          <Text key={i} style={msg.from === 'bot' ? styles.bot : styles.user}>{msg.text}</Text>
        ))}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your question..."
          placeholderTextColor={colors.textMuted}
          editable={!loading}
        />
        <ThemedButton title="Send" onPress={sendMessage} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.pageBackground },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, color: colors.textPrimary },
  chat: { flex: 1, marginBottom: 12 },
  bot: { color: colors.textPrimary, backgroundColor: colors.cardAlt, padding: 8, borderRadius: 8, marginBottom: 4 },
  user: { color: colors.white, backgroundColor: colors.accentBlue, padding: 8, borderRadius: 8, alignSelf: 'flex-end', marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.cardDeep,
    color: colors.textPrimary
  }
});
