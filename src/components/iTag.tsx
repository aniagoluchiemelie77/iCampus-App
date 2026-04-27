import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LogoSizeable } from '../assets/images/Logo';
import { getContrastColor } from '../utils/colorHelper';
import { PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { DEFAULT_GRADIENT } from '../assets/styles/colors';

const { width } = Dimensions.get('window');


export const ITagCard = ({
  iTagData,
  isPremium,
  isOwner,
}: {
  iTagData: any;
  isPremium: boolean;
  isOwner: boolean;
}) => {
  const design = iTagData.designOptions;
  const backgroundColor = design?.backgroundColor || '#3b2115';
  const backgroundImage = isPremium ? design?.backgroundImage : null;
  const isValidImage =
    isPremium &&
    typeof backgroundImage === 'string' &&
    backgroundImage.includes('https://');

  const cardColors =
    isPremium && design ? [backgroundColor, backgroundColor] : DEFAULT_GRADIENT;

  const textColor = getContrastColor(cardColors[0]);
  const CardContent = (
    <View
      style={[
        styles.glassOverlay,
        isPremium && {
          backgroundColor: `rgba(255,255,255, ${
            design?.glassmorphismOpacity || 0.05
          })`,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <LogoSizeable width={50} height={50} color={textColor} />
      </View>
      <View style={styles.chipSection}>
        <Icon name="integrated-circuit-chip" size={45} color="#D4AF37" />
        {isPremium && (
          <Icon
            name="wifi"
            size={24}
            color={textColor}
            style={styles.contactless}
          />
        )}
      </View>
      <View style={styles.numberContainer}>
        <Text
          style={[
            styles.cardNumber,
            { color: textColor, letterSpacing: isOwner ? 2 : 4 },
          ]}
        >
          {isOwner
            ? iTagData.cardNumber || '**** **** **** ****'
            : '**** **** **** ****'}
        </Text>
      </View>
      <View style={styles.cardFooter}>
        {isPremium && (
          <Text style={[styles.tierBadge, { color: textColor }]}>
            {iTagData.tier}
          </Text>
        )}
        <Text style={[styles.cardUsername, { color: textColor }]}>
          @{iTagData.username}
        </Text>
      </View>
    </View>
  );
  if (backgroundImage && isValidImage) {
    return (
      <View style={styles.iTagCardContainer}>
        <ImageBackground
          source={{ uri: backgroundImage }}
          style={StyleSheet.absoluteFill}
          imageStyle={{ borderRadius: 20 }}
        >
          {CardContent}
        </ImageBackground>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={cardColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.iTagCardContainer}
    >
      {CardContent}
    </LinearGradient>
  );
};
const styles = StyleSheet.create({
  iTagCardContainer: {
    width: width * 0.7,
    height: 220,
    borderRadius: 20,
    alignSelf: 'center',
    elevation: 10,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    padding: 4,
  },
  glassOverlay: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  chipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  contactless: {
    marginLeft: 10,
    transform: [{ rotate: '90deg' }],
    opacity: 0.6,
  },
  numberContainer: {
    marginVertical: 15,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardUsername: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  brandContainer: {
    alignItems: 'flex-end',
  },
  tierBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    opacity: 0.8,
  },
});