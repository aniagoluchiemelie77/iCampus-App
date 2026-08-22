import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

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
        <MaterialIcons name="lock" size={80} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>
          Access Denied
        </Text>
        <Text style={[styles.reason, { color: colors.primaryTint }]}>
          {reason}
        </Text>
        <CustomButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 15,
    borderRadius: 10,
  },
});