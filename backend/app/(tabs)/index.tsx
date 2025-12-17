<<<<<<< HEAD
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
=======
import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
<<<<<<< HEAD
  const isDark = colorScheme === 'dark';
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <ThemedView style={[styles.heroSection, { backgroundColor: isDark ? '#166534' : '#dcfce7' }]}>
        <ThemedView style={styles.heroContent}>
          <ThemedText style={styles.heroEmoji}>🌍</ThemedText>
          <ThemedText style={styles.heroTitle}>City Cleanup Challenge</ThemedText>
          <ThemedText style={styles.heroTagline}>Clean • Connect • Earn</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Join your community in making the world cleaner, one neighborhood at a time
=======
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
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
          </ThemedText>
        </ThemedView>
      </ThemedView>

<<<<<<< HEAD
      {/* Features Section */}
      <ThemedView style={styles.content}>
        <ThemedView style={styles.featuresContainer}>
          <ThemedText type="title" style={styles.sectionTitle}>How It Works</ThemedText>
          
          <ThemedView style={styles.featureCard}>
            <ThemedView style={[styles.featureIconContainer, { backgroundColor: '#f0fdf4' }]}>
              <ThemedText style={styles.featureIcon}>📷</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureTextContainer}>
              <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
                Report Issues
              </ThemedText>
              <ThemedText style={styles.featureDescription}>
                Spot litter or environmental problems? Take a photo and report it instantly to help organize cleanup efforts
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.featureCard}>
            <ThemedView style={[styles.featureIconContainer, { backgroundColor: '#f0f9ff' }]}>
              <ThemedText style={styles.featureIcon}>👥</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureTextContainer}>
              <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
                Join Events
              </ThemedText>
              <ThemedText style={styles.featureDescription}>
                Participate in organized community cleanup events and connect with eco-conscious neighbors
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.featureCard}>
            <ThemedView style={[styles.featureIconContainer, { backgroundColor: '#fefce8' }]}>
              <ThemedText style={styles.featureIcon}>🪙</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureTextContainer}>
              <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
                Earn Rewards
              </ThemedText>
              <ThemedText style={styles.featureDescription}>
                Get blockchain-verified EcoTokens for your environmental contributions and impact
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Stats Section */}
        <ThemedView style={styles.statsSection}>
          <ThemedText type="title" style={styles.sectionTitle}>Community Impact</ThemedText>
          <ThemedView style={styles.statsGrid}>
            <ThemedView style={styles.statCard}>
              <ThemedText style={styles.statNumber}>2,847</ThemedText>
              <ThemedText style={styles.statLabel}>Items Cleaned</ThemedText>
              <ThemedText style={styles.statIcon}>🗑️</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <ThemedText style={styles.statNumber}>156</ThemedText>
              <ThemedText style={styles.statLabel}>Active Users</ThemedText>
              <ThemedText style={styles.statIcon}>👥</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <ThemedText style={styles.statNumber}>34</ThemedText>
              <ThemedText style={styles.statLabel}>Events</ThemedText>
              <ThemedText style={styles.statIcon}>📅</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <ThemedText style={styles.statNumber}>12</ThemedText>
              <ThemedText style={styles.statLabel}>Neighborhoods</ThemedText>
              <ThemedText style={styles.statIcon}>🏘️</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* CTA Section */}
        <ThemedView style={styles.ctaSection}>
          <ThemedText type="title" style={styles.ctaTitle}>Ready to Make a Difference?</ThemedText>
          <ThemedText style={styles.ctaSubtext}>
            Join thousands of eco-warriors making their communities cleaner and greener
          </ThemedText>
          
          <TouchableOpacity 
            style={[styles.ctaButton, { backgroundColor: tintColor }]}
            onPress={() => alert('Get Started feature coming soon!')}
          >
            <ThemedText style={styles.ctaButtonText}>Get Started Today</ThemedText>
            <ThemedText style={styles.ctaButtonIcon}>🚀</ThemedText>
          </TouchableOpacity>
          
          <ThemedView style={styles.benefitsList}>
            <ThemedText style={styles.benefit}>✅ Track your environmental impact</ThemedText>
            <ThemedText style={styles.benefit}>✅ Connect with local eco-warriors</ThemedText>
            <ThemedText style={styles.benefit}>✅ Earn blockchain-verified rewards</ThemedText>
            <ThemedText style={styles.benefit}>✅ Make your neighborhood cleaner</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
=======
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
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
=======
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
    backgroundColor: 'transparent',
  },
  heroEmoji: {
    fontSize: 80,
<<<<<<< HEAD
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
  },
  heroTagline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
=======
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
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
<<<<<<< HEAD
    color: '#374151',
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 28,
  },
  featuresContainer: {
    paddingVertical: 32,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    marginBottom: 4,
    fontSize: 18,
  },
  featureDescription: {
    opacity: 0.7,
    lineHeight: 20,
    fontSize: 14,
  },
  statsSection: {
    paddingVertical: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
=======
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
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
<<<<<<< HEAD
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  ctaSection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  ctaTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 28,
  },
  ctaSubtext: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
=======
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
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
<<<<<<< HEAD
    marginRight: 8,
  },
  ctaButtonIcon: {
    fontSize: 18,
  },
  benefitsList: {
    alignItems: 'flex-start',
  },
  benefit: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
=======
  },
  ctaSubtext: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 14,
    lineHeight: 20,
>>>>>>> 57e5a20 (🌍 Create City Cleanup Challenge landing page)
  },
});
