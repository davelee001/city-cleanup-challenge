import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Cleanup Map
        </ThemedText>
      </ThemedView>
      <ThemedText>Discover cleanup opportunities and events in your area.</ThemedText>
      <Collapsible title="🗺️ Interactive Map">
        <ThemedText>
          View real-time cleanup locations, reported litter, and ongoing cleanup events in your area.{' '}
          <ThemedText type="defaultSemiBold">Tap on markers</ThemedText> to see details and join activities.
        </ThemedText>
        <ThemedText>
          The map shows <ThemedText type="defaultSemiBold">verified cleanup sites</ThemedText>{' '}
          and community-reported environmental issues.
        </ThemedText>
      </Collapsible>
      <Collapsible title="📍 Report Issues">
        <ThemedText>
          Found litter or environmental problems? Take a photo and report it directly from the map.{' '}
          <ThemedText type="defaultSemiBold">Geotagged reports</ThemedText> help organize cleanup efforts.
        </ThemedText>
      </Collapsible>
      <Collapsible title="🎯 Cleanup Events">
        <ThemedText>
          Join scheduled cleanup events organized by the community. Events show{' '}
          <ThemedText type="defaultSemiBold">participant count</ThemedText>,{' '}
          <ThemedText type="defaultSemiBold">tools needed</ThemedText>, and{' '}
          <ThemedText type="defaultSemiBold">estimated impact</ThemedText>.
        </ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
      </Collapsible>
      <Collapsible title="🪙 Blockchain Rewards">
        <ThemedText>
          Earn <ThemedText type="defaultSemiBold">EcoTokens</ThemedText> for verified cleanup activities.{' '}
          Built on the <ThemedText type="defaultSemiBold">Celo blockchain</ThemedText> for transparent,{' '}
          traceable environmental impact.
        </ThemedText>
      </Collapsible>
      <Collapsible title="📱 Mobile Features">
        <ThemedText>
          This app works on <ThemedText type="defaultSemiBold">Android, iOS, and web</ThemedText>.{' '}
          Camera integration for issue reporting, offline mode for remote areas, and{' '}
          <ThemedText type="defaultSemiBold">push notifications</ThemedText> for nearby events.
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
