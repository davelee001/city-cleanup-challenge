import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const sections = [
  ['Privacy', 'We use account details, cleanup photos, location, verification results, and wallet transaction information to authenticate users, verify original cleanup work, prevent fraud, support moderation, and make approved rewards. Private evidence and precise location are not published on-chain.'],
  ['Retention and deletion', 'Temporary uploads are removed quickly. Rejected evidence is normally removed after the appeal period, and approved evidence is retained only for the documented verification and payment period. You may request access, correction, export, or deletion. Some security, fraud-prevention, financial, audit, and public blockchain records must be retained.'],
  ['Safe and eligible use', 'Submit only original evidence of lawful, non-hazardous solid-waste cleanup. Do not submit AI-generated, manipulated, duplicate, stolen, or previously rewarded images. Avoid faces, private addresses, vehicle plates, and other people’s personal information.'],
  ['CELO rewards', 'Rewards are conditional promotional payments and are not guaranteed. Testnet CELO has no promised monetary value. Never share a seed phrase or private key with City Cleanup. Confirmed public blockchain records cannot be erased.'],
  ['Support', 'Use the project’s published private support channel for security, privacy, deletion, or account-compromise reports. Never place passwords, tokens, private keys, precise GPS, identity documents, or private evidence in a public issue.'],
];

export default function Legal({ onClose }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Return to sign in"
      >
        <Text style={styles.backText}>‹ Back to sign in</Text>
      </TouchableOpacity>
      <Text style={styles.eyebrow}>CITY CLEANUP POLICIES</Text>
      <Text style={styles.title}>Privacy, terms, and support</Text>
      <Text style={styles.updated}>Effective July 26, 2026</Text>
      {sections.map(([title, body]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      ))}
      <Text style={styles.notice}>
        Complete policies are published with the project. Launch-jurisdiction
        legal review and a monitored private support contact remain required.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07182D' },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', padding: 24, paddingBottom: 56 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 12 },
  backText: { color: '#8DBDFF', fontSize: 14, fontWeight: '600' },
  eyebrow: { color: '#69B4FF', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 20 },
  title: { color: '#F5F8FF', fontSize: 30, fontWeight: '600', marginTop: 8 },
  updated: { color: '#8298AF', fontSize: 13, marginBottom: 24, marginTop: 8 },
  card: { backgroundColor: '#10243E', borderColor: '#244B70', borderWidth: 1, borderRadius: 14, marginBottom: 12, padding: 18 },
  cardTitle: { color: '#72D7CA', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  body: { color: '#B7C9DC', fontSize: 14, lineHeight: 22 },
  notice: { color: '#8298AF', fontSize: 12, lineHeight: 19, marginTop: 10 },
});
