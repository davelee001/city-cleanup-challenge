import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.modalEmoji}>🌱</ThemedText>
      <ThemedText type="title" style={styles.modalTitle}>Join the Movement</ThemedText>
      <ThemedText style={styles.modalDescription}>
        Ready to make a real impact? Download our app and start participating in cleanup events, 
        report environmental issues, and earn rewards for making your community cleaner.
      </ThemedText>
      <ThemedView style={styles.benefitsList}>
        <ThemedText style={styles.benefit}>✅ Track your environmental impact</ThemedText>
        <ThemedText style={styles.benefit}>✅ Connect with local eco-warriors</ThemedText>
        <ThemedText style={styles.benefit}>✅ Earn blockchain-verified rewards</ThemedText>
        <ThemedText style={styles.benefit}>✅ Make your neighborhood cleaner</ThemedText>
      </ThemedView>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Back to Home</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.8,
  },
  benefitsList: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  benefit: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'left',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
