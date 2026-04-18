import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';

export const VirtualITagCard = ({ userData, plan }: any) => {
  // Use plan to determine card aesthetics (Premium gets a gradient or glow)
  const isPremium = plan === 'premium';
  const isPro = plan === 'pro';

  return (
    <View style={[
      styles.card, 
      isPremium ? styles.premiumGlow : (isPro ? styles.proBorder : styles.freeBorder)
    ]}>
      {/* Brand Watermark */}
      <Text style={styles.watermark}>iCash Identity</Text>
      
      <View style={styles.cardHeader}>
        <View style={styles.profileCircle}>
          <Image source={{ uri: userData.profilePic }} style={styles.pic} />
        </View>
        <View>
          <Text style={styles.name}>{userData.firstname} {userData.lastname}</Text>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>@{userData.iTag}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.statusText}>Verified iCampus {plan.toUpperCase()} User</Text>
        {isPremium && <Icon name="star" color="#FFD700" size={16} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#1E293B', // Deep Slate like Cleva/Neo-banks
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  premiumGlow: {
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border for Premium
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  watermark: {
    position: 'absolute',
    right: -10,
    top: 20,
    fontSize: 40,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.03)', // Subtle tech watermark
    transform: [{ rotate: '15deg' }],
  },
  // ... rest of the styling (Header, Footer, Text)
});