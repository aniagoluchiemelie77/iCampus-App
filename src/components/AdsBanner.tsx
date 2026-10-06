import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  Linking
} from 'react-native';
import Video from 'react-native-video'; 
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';

export interface AdItem {
  id: string | number;
  type: 'image' | 'video';
  mediaUrl: string;
  targetUrl?: string;
  advertiserLogo: string;
  advertiserName: string;
  tagline?: string;
}

interface AdBannerProps {
  ads: AdItem[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_WIDTH = SCREEN_WIDTH - 32; 
const AUTOPLAY_INTERVAL = 6000; 

export const AdBanner: React.FC<AdBannerProps> = ({ ads }) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!ads || ads.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % ads.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * CONTAINER_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [ads.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CONTAINER_WIDTH);
    if (index !== currentIndex && index >= 0 && index < ads.length) {
      setCurrentIndex(index);
    }
  };

  const handleAdPress = async (targetUrl?: string) => {
    if (!targetUrl) return;
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        Toast.show({
          type: 'error',
          text2: "Couldn't open URL, please retry.",
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: 'An error occurred while opening this ad link, please retry.',
      });
    }
  };

  if (!ads || ads.length === 0) return null;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {ads.map((ad, index) => (
            <TouchableOpacity
              key={ad.id}
              activeOpacity={0.95}
              onPress={() => handleAdPress(ad.targetUrl)}
              style={styles.slideCard}
            >
              {ad.type === 'video' ? (
                <Video
                  source={{ uri: ad.mediaUrl }}
                  style={styles.media}
                  resizeMode="cover"
                  repeat={true}
                  muted={true}
                  paused={currentIndex !== index}
                />
              ) : (
                <Image source={{ uri: ad.mediaUrl }} style={styles.media} />
              )}
              <View style={styles.gradientOverlay} />
              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border || 'rgba(255,255,255,0.1)',
                  },
                ]}
              >
                <Image
                  source={{ uri: ad.advertiserLogo }}
                  style={styles.logo}
                />
                <View style={styles.textContainer}>
                  <Text
                    style={[styles.advertiserName, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {ad.advertiserName}
                  </Text>
                  <Text
                    style={[styles.tagline, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {ad.tagline || 'Tap to learn more'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {ads.length > 1 && (
        <View style={styles.dotsContainer}>
          {ads.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index
                  ? { width: 22, backgroundColor: colors.primary }
                  : { width: 6, backgroundColor: colors.border },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 12,
    alignItems: 'center',
  },
  container: {
    width: CONTAINER_WIDTH,
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  scrollView: {
    width: CONTAINER_WIDTH,
    height: '100%',
  },
  slideCard: {
    width: CONTAINER_WIDTH,
    height: '100%',
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  detailBox: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: '82%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  advertiserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 11,
    opacity: 0.75,
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});

export default AdBanner;