import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from 'context/ThemeContext';

interface FeatureCardProps {
  title: string;
  sub: string;
  icon: string;
  onPress: () => void;
}
export const FeatureCard = ({
  title,
  sub,
  icon,
  onPress,
}: FeatureCardProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.text,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { borderColor: colors.primary }]}>
        <MaterialIcons name={icon} size={30} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: colors.text }]}>{sub}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.text} />
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    marginVertical: 6,
    alignItems: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 12,
  },
});