import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';

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
      const res = await fetch('http://localhost:3000/chatbot', {
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
          editable={!loading}
        />
        <Button title="Send" onPress={sendMessage} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  chat: { flex: 1, marginBottom: 12 },
  bot: { color: '#333', backgroundColor: '#e0e0e0', padding: 8, borderRadius: 6, marginBottom: 4 },
  user: { color: '#fff', backgroundColor: '#007AFF', padding: 8, borderRadius: 6, alignSelf: 'flex-end', marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 10, marginRight: 8 }
});
