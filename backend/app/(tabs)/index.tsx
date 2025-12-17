import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#4ADE80', dark: '#166534' }}
      headerImage={
        <ThemedView style={styles.heroContainer}>
          <ThemedText style={styles.heroEmoji}>🌍</ThemedText>
          <ThemedText style={styles.heroSubtext}>Clean • Connect • Earn</ThemedText>
        </ThemedView>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={styles.mainTitle}>
          City Cleanup Challenge
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Join your community in making the world cleaner, one neighborhood at a time
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.featuresContainer}>
        <ThemedView style={styles.featureCard}>
          <IconSymbol 
            name="paperplane.fill" 
            size={32} 
            color={tintColor}
            style={styles.featureIcon}
          />
          <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
            Report Issues
          </ThemedText>
          <ThemedText style={styles.featureDescription}>
            Spot litter or environmental issues? Take a photo and report it instantly
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.featureCard}>
          <ThemedText style={styles.featureEmoji}>👥</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
            Join Cleanup Events
          </ThemedText>
          <ThemedText style={styles.featureDescription}>
            Participate in organized community cleanup events in your area
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.featureCard}>
          <ThemedText style={styles.featureEmoji}>🪙</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
            Earn Rewards
          </ThemedText>
          <ThemedText style={styles.featureDescription}>
            Get rewarded with tokens for your environmental contributions
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.statsContainer}>
        <ThemedText type="subtitle" style={styles.statsTitle}>Impact So Far</ThemedText>
        <ThemedView style={styles.statsGrid}>
          <ThemedView style={styles.statItem}>
            <ThemedText style={styles.statNumber}>1,247</ThemedText>
            <ThemedText style={styles.statLabel}>Items Cleaned</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText style={styles.statNumber}>89</ThemedText>
            <ThemedText style={styles.statLabel}>Active Users</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText style={styles.statNumber}>23</ThemedText>
            <ThemedText style={styles.statLabel}>Events</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.ctaContainer}>
        <TouchableOpacity 
          style={[styles.ctaButton, { backgroundColor: tintColor }]}
          onPress={() => alert('Get Started feature coming soon!')}
        >
          <ThemedText style={styles.ctaButtonText}>Get Started Today</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.ctaSubtext}>
          Download the app and start making a difference in your community
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  heroEmoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  heroSubtext: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  featuresContainer: {
    gap: 16,
    marginBottom: 32,
  },
  featureCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(64, 165, 120, 0.1)',
    alignItems: 'center',
    textAlign: 'center',
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 12,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ctaSubtext: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 14,
    lineHeight: 20,
  },
});
