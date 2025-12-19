import { Image } from 'expo-image';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>Cleanup Map</ThemedText>
          <ThemedText style={styles.subtitle}>
            Discover cleanup opportunities and events in your area
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.content}>
        {/* Quick Actions */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
          <ThemedView style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionCard, { borderColor: tintColor }]}>
              <ThemedText style={styles.actionIcon}>📍</ThemedText>
              <ThemedText style={styles.actionTitle}>Report Issue</ThemedText>
              <ThemedText style={styles.actionDesc}>Photo + Location</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { borderColor: tintColor }]}>
              <ThemedText style={styles.actionIcon}>🗓️</ThemedText>
              <ThemedText style={styles.actionTitle}>Find Events</ThemedText>
              <ThemedText style={styles.actionDesc}>Near You</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        {/* Features */}
        <Collapsible title="🗺️ Interactive Cleanup Map">
          <ThemedText style={styles.description}>
            View real-time cleanup locations, reported litter, and ongoing cleanup events in your area.{' '}
            <ThemedText type="defaultSemiBold">Tap on markers</ThemedText> to see details and join activities.
          </ThemedText>
          <ThemedText style={styles.description}>
            The map shows <ThemedText type="defaultSemiBold">verified cleanup sites</ThemedText>{' '}
            and community-reported environmental issues with priority levels.
          </ThemedText>
        </Collapsible>

        <Collapsible title="📍 Report Environmental Issues">
          <ThemedText style={styles.description}>
            Found litter or environmental problems? Take a photo and report it directly from the map.{' '}
            <ThemedText type="defaultSemiBold">Geotagged reports</ThemedText> help organize cleanup efforts efficiently.
          </ThemedText>
          <ThemedView style={styles.feature}>
            <ThemedText style={styles.featureItem}>• Photo verification system</ThemedText>
            <ThemedText style={styles.featureItem}>• Automatic GPS location</ThemedText>
            <ThemedText style={styles.featureItem}>• Priority rating system</ThemedText>
            <ThemedText style={styles.featureItem}>• Progress tracking</ThemedText>
          </ThemedView>
        </Collapsible>

        <Collapsible title="🎯 Community Cleanup Events">
          <ThemedText style={styles.description}>
            Join scheduled cleanup events organized by the community. Events show{' '}
            <ThemedText type="defaultSemiBold">participant count</ThemedText>,{' '}
            <ThemedText type="defaultSemiBold">tools needed</ThemedText>, and{' '}
            <ThemedText type="defaultSemiBold">estimated impact</ThemedText>.
          </ThemedText>
          <ThemedView style={styles.eventExample}>
            <ThemedText style={styles.eventTitle}>📅 Upcoming Event</ThemedText>
            <ThemedText style={styles.eventDetail}>🗓️ Saturday, Dec 21 • 9:00 AM</ThemedText>
            <ThemedText style={styles.eventDetail}>📍 Central Park Cleanup</ThemedText>
            <ThemedText style={styles.eventDetail}>👥 12/25 participants</ThemedText>
            <ThemedText style={styles.eventDetail}>🛠️ Gloves & bags provided</ThemedText>
          </ThemedView>
        </Collapsible>

        <Collapsible title="🪙 Blockchain Rewards System">
          <ThemedText style={styles.description}>
            Earn <ThemedText type="defaultSemiBold">EcoTokens</ThemedText> for verified cleanup activities.{' '}
            Built on the <ThemedText type="defaultSemiBold">Celo blockchain</ThemedText> for transparent,{' '}
            traceable environmental impact tracking.
          </ThemedText>
          <ThemedView style={styles.rewardSystem}>
            <ThemedText style={styles.rewardItem}>🪙 Report Issue: +5 tokens</ThemedText>
            <ThemedText style={styles.rewardItem}>🏆 Complete Cleanup: +20 tokens</ThemedText>
            <ThemedText style={styles.rewardItem}>👥 Organize Event: +50 tokens</ThemedText>
            <ThemedText style={styles.rewardItem}>🌟 Monthly Leader: +100 tokens</ThemedText>
          </ThemedView>
        </Collapsible>

        <Collapsible title="📱 Mobile App Features">
          <ThemedText style={styles.description}>
            This app works on <ThemedText type="defaultSemiBold">Android, iOS, and web</ThemedText>.{' '}
            Advanced features include camera integration, offline mode for remote areas, and{' '}
            <ThemedText type="defaultSemiBold">push notifications</ThemedText> for nearby events.
          </ThemedText>
          <ThemedView style={styles.techFeatures}>
            <ThemedText style={styles.techItem}>📷 Camera integration for reports</ThemedText>
            <ThemedText style={styles.techItem}>🌐 Offline mode capability</ThemedText>
            <ThemedText style={styles.techItem}>🔔 Smart notifications</ThemedText>
            <ThemedText style={styles.techItem}>🎯 Location-based matching</ThemedText>
            <ThemedText style={styles.techItem}>📊 Personal impact dashboard</ThemedText>
          </ThemedView>
        </Collapsible>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#f0fdf4',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    opacity: 0.7,
  },
  description: {
    lineHeight: 22,
    marginBottom: 12,
  },
  feature: {
    marginTop: 12,
  },
  featureItem: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  eventExample: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  rewardSystem: {
    marginTop: 12,
  },
  rewardItem: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.8,
  },
  techFeatures: {
    marginTop: 12,
  },
  techItem: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
});
