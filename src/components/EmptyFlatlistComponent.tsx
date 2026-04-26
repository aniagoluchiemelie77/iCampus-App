import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';

interface EmptyStateProps {
  iconName?: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = "file-search-outline",
  title,
  subtitle,
  buttonText,
  onPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Icon name={iconName} size={80} color={PRIMARY_COLOR_TINT} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {buttonText && onPress && (
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50, 
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginTop: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});