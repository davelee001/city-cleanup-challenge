import { StyleSheet, TouchableOpacity, ScrollView, View, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section with Gradient */}
      <View style={styles.heroWrapper}>
        <View style={[styles.heroSection, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
          <ThemedView style={styles.heroContent}>
            <ThemedText style={styles.heroEmoji}>🌍</ThemedText>
            <ThemedText style={styles.heroTitle}>City Cleanup Challenge</ThemedText>
            <ThemedText style={[styles.heroTagline, { color: tintColor }]}>Clean • Connect • Earn</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Join your community in making the world cleaner, one neighborhood at a time
            </ThemedText>
            
            {/* Quick Start Button */}
            <TouchableOpacity 
              style={[styles.heroButton, { backgroundColor: tintColor }]}
              onPress={() => alert('Quick start feature coming soon!')}
            >
              <ThemedText style={styles.heroButtonText}>Start Cleaning Today</ThemedText>
              <IconSymbol name="arrow.right.circle.fill" size={20} color="white" />
            </TouchableOpacity>
          </ThemedView>
        </View>
        
        {/* Floating Stats Cards */}
        <View style={styles.floatingStats}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>2,847</ThemedText>
            <ThemedText style={styles.statLabel}>Items Cleaned</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>156</ThemedText>
            <ThemedText style={styles.statLabel}>Active Users</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>34</ThemedText>
            <ThemedText style={styles.statLabel}>Events</ThemedText>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <ThemedView style={styles.content}>
        <ThemedView style={styles.featuresContainer}>
          <ThemedText type="title" style={styles.sectionTitle}>How It Works</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Three simple steps to start making a difference in your community
          </ThemedText>
          
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#f0fdf4' }]}>
                <ThemedText style={styles.featureIcon}>📷</ThemedText>
                <View style={[styles.stepBadge, { backgroundColor: tintColor }]}>
                  <ThemedText style={styles.stepNumber}>1</ThemedText>
                </View>
              </View>
              <ThemedView style={styles.featureTextContainer}>
                <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
                  Report Issues
                </ThemedText>
                <ThemedText style={styles.featureDescription}>
                  Spot litter or environmental problems? Take a photo and report it instantly with GPS location
                </ThemedText>
              </ThemedView>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#f0f9ff' }]}>
                <ThemedText style={styles.featureIcon}>👥</ThemedText>
                <View style={[styles.stepBadge, { backgroundColor: tintColor }]}>
                  <ThemedText style={styles.stepNumber}>2</ThemedText>
                </View>
              </View>
              <ThemedView style={styles.featureTextContainer}>
                <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
                  Join Events
                </ThemedText>
                <ThemedText style={styles.featureDescription}>
                  Participate in organized community cleanup events and connect with eco-conscious neighbors
                </ThemedText>
              </ThemedView>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#fefce8' }]}>
                <ThemedText style={styles.featureIcon}>🪙</ThemedText>
                <View style={[styles.stepBadge, { backgroundColor: tintColor }]}>
                  <ThemedText style={styles.stepNumber}>3</ThemedText>
                </View>
              </View>
              <ThemedView style={styles.featureTextContainer}>
                <ThemedText type="defaultSemiBold" style={styles.featureTitle}>
                  Earn Rewards
                </ThemedText>
                <ThemedText style={styles.featureDescription}>
                  Get blockchain-verified EcoTokens for your environmental contributions and track your impact
                </ThemedText>
              </ThemedView>
            </View>
          </View>
        </ThemedView>

        {/* Impact Section */}
        <ThemedView style={styles.impactSection}>
          <ThemedText type="title" style={styles.sectionTitle}>Community Impact</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Real numbers from our amazing community of eco-warriors
          </ThemedText>
          
          <View style={styles.impactGrid}>
            <View style={styles.impactCard}>
              <View style={styles.impactIconContainer}>
                <ThemedText style={styles.impactIcon}>🗑️</ThemedText>
              </View>
              <ThemedText style={styles.impactNumber}>2,847</ThemedText>
              <ThemedText style={styles.impactLabel}>Items Cleaned</ThemedText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '80%', backgroundColor: tintColor }]} />
              </View>
            </View>
            
            <View style={styles.impactCard}>
              <View style={styles.impactIconContainer}>
                <ThemedText style={styles.impactIcon}>🌱</ThemedText>
              </View>
              <ThemedText style={styles.impactNumber}>156</ThemedText>
              <ThemedText style={styles.impactLabel}>Active Users</ThemedText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '60%', backgroundColor: '#10b981' }]} />
              </View>
            </View>
            
            <View style={styles.impactCard}>
              <View style={styles.impactIconContainer}>
                <ThemedText style={styles.impactIcon}>📅</ThemedText>
              </View>
              <ThemedText style={styles.impactNumber}>34</ThemedText>
              <ThemedText style={styles.impactLabel}>Events Organized</ThemedText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '90%', backgroundColor: '#f59e0b' }]} />
              </View>
            </View>
            
            <View style={styles.impactCard}>
              <View style={styles.impactIconContainer}>
                <ThemedText style={styles.impactIcon}>🏘️</ThemedText>
              </View>
              <ThemedText style={styles.impactNumber}>12</ThemedText>
              <ThemedText style={styles.impactLabel}>Neighborhoods</ThemedText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '70%', backgroundColor: '#8b5cf6' }]} />
              </View>
            </View>
          </View>
        </ThemedView>

        {/* CTA Section */}
        <ThemedView style={styles.ctaSection}>
          <ThemedText type="title" style={styles.ctaTitle}>Ready to Make a Difference?</ThemedText>
          <ThemedText style={styles.ctaSubtext}>
            Join thousands of eco-warriors making their communities cleaner and greener. Every small action creates a big impact!
          </ThemedText>
          
          <View style={styles.ctaButtons}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: tintColor }]}
              onPress={() => alert('Get Started feature coming soon!')}
            >
              <ThemedText style={styles.primaryButtonText}>Get Started Today</ThemedText>
              <IconSymbol name="arrow.right" size={18} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => alert('Learn More feature coming soon!')}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: tintColor }]}>Learn More</ThemedText>
              <IconSymbol name="info.circle" size={18} color={tintColor} />
            </TouchableOpacity>
          </View>
          
          <ThemedView style={styles.benefitsList}>
            <View style={styles.benefit}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={tintColor} />
              <ThemedText style={styles.benefitText}>Track your environmental impact</ThemedText>
            </View>
            <View style={styles.benefit}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={tintColor} />
              <ThemedText style={styles.benefitText}>Connect with local eco-warriors</ThemedText>
            </View>
            <View style={styles.benefit}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={tintColor} />
              <ThemedText style={styles.benefitText}>Earn blockchain-verified rewards</ThemedText>
            </View>
            <View style={styles.benefit}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={tintColor} />
              <ThemedText style={styles.benefitText}>Make your neighborhood cleaner</ThemedText>
            </View>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  heroWrapper: {
    position: 'relative',
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  heroEmoji: {
    fontSize: 80,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  heroButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  floatingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: -30,
    left: 20,
    right: 20,
  },
  statCard: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minWidth: width * 0.25,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    paddingVertical: 20,
  },
  featuresGrid: {
    gap: 20,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  featureIcon: {
    fontSize: 28,
  },
  stepBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '700',
  },
  featureDescription: {
    opacity: 0.7,
    lineHeight: 20,
    fontSize: 14,
  },
  impactSection: {
    paddingVertical: 40,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  impactCard: {
    width: '47%',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  impactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  impactIcon: {
    fontSize: 24,
  },
  impactNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  impactLabel: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  ctaSection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  ctaTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 28,
    fontWeight: 'bold',
  },
  ctaSubtext: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  benefitsList: {
    alignItems: 'flex-start',
    gap: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
