import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';

interface LogItemProps {
  log: any;
  onPress?: () => void;
}

const LogItem = ({ log, onPress }: LogItemProps) => {
  const { colors } = useTheme();
  const isSecurity = log.category === 'security';
  const borderColor = isSecurity ? colors.primary : colors.primaryTint;

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderLeftColor: borderColor }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: isSecurity ? colors.primary : colors.textDarker }]}>
          {log.title || 'System Log'}
        </Text>
        <Text style={[styles.date, { color: colors.text }]}>
          {new Date(log.createdAt).toLocaleDateString()}
        </Text>
      </View> 
      <Text style={[styles.message, { color: colors.text }]}>
        {log.message}
      </Text>
        <Text style={[styles.category, { color: colors.primary }]}>
          {log.category?.toUpperCase() || 'GENERAL'}
        </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 15,
    borderLeftWidth: 2,
    elevation: 2, 
    shadowColor: PRIMARY_COLOR_TINT, 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 11,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 15
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default React.memo(LogItem);