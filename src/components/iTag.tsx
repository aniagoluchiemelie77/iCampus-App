import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LogoSizeable } from '../assets/images/Logo';
import { getContrastColor } from '../utils/colorHelper';
import { PRIMARY_COLOR_TINT } from './Classroomcomponent';

const { width } = Dimensions.get('window');

const DEFAULT_GRADIENT = ['#3b2115', '#5a3c2e', '#e05515'];

export const ITagCard = ({
  iTagData,
  isPremium,
  isOwner,
}: {
  iTagData: any;
  isPremium: boolean;
  isOwner: boolean;
}) => {
  const bgColor =
    isPremium && iTagData.customColors
      ? iTagData.customColors[0]
      : DEFAULT_GRADIENT[0];
  const textColor = getContrastColor(bgColor);

  return (
    <LinearGradient
      colors={
        isPremium && iTagData.customColors
          ? iTagData.customColors
          : DEFAULT_GRADIENT
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.iTagCardContainer}
    >
      <View style={styles.glassOverlay}>
        {/* Header: Logo and Card Brand */}
        <View style={styles.cardHeader}>
          <LogoSizeable width={50} height={50} />
        </View>

        {/* Chip Section */}
        <View style={styles.chipSection}>
          <Icon name="integrated-circuit-chip" size={45} color="#D4AF37" />
          <Icon
            name="wifi-rotate_right"
            size={24}
            color={textColor}
            style={styles.contactless}
          />
        </View>

        {/* Card Number (Only if Owner) */}
        <View style={styles.numberContainer}>
          {isOwner ? (
            <Text style={[styles.cardNumber, { color: textColor }]}>
              {iTagData.cardNumber || '8021 2135 **** ****'}
            </Text>
          ) : (
            <Text
              style={[
                styles.cardNumber,
                { color: textColor, letterSpacing: 4 },
              ]}
            >
              **** **** **** ****
            </Text>
          )}
        </View>

        {/* Footer: Username and iCampus Brand */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.label, { color: textColor }]}>
              iTAG USERNAME
            </Text>
            <Text style={[styles.cardUsername, { color: textColor }]}>
              @{iTagData.username}
            </Text>
          </View>
          <View style={styles.brandContainer}>
            <Text style={[styles.brandText, { color: textColor }]}>iCash</Text>
          </View>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontFamily: 'Courier', // Gives it that card-embossed feel
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    opacity: 0.7,
    marginBottom: 2,
  },
  cardUsername: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  brandContainer: {
    alignItems: 'flex-end',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    opacity: 0.9,
  },
});