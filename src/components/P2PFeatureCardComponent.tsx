import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from './Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface FeatureCardProps {
  title: string;
  sub: string;
  icon: string;
  onPress: () => void; // Use 'onSave' to match your JSX
}
export const FeatureCard = ({ title, sub, icon, onPress }: FeatureCardProps) => (
  <TouchableOpacity 
    style={styles.card} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.iconContainer}>
      <Icon name={icon} size={30} color='#fff' />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{sub}</Text>
    </View>
    <Icon name="chevron-right" size={22} color="#fff" />
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR, 
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderColor: '#fff',
    borderWidth: 1,
    backgroundColor: 'inherit', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    marginVertical: 6,
    alignItems: 'center',
    width: '100%'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center'
  },
  cardSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)', 
  },
});