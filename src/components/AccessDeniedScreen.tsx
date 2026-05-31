import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  reason?: string;
}

export const AccessDeniedScreen = ({
  reason = 'You do not have permission to view this session.',
}: Props) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons name="lock-outline" size={80} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>
          Access Denied
        </Text>
        <Text style={[styles.reason, { color: colors.primaryTint }]}>
          {reason}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, {color: colors.btnTextColor}]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
  },
  subContainer: {
    padding: 20,
    alignContent: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 20,
  },
  reason: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});