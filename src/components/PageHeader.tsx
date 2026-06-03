import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Logo from '../assets/images/Logo';
import { useTheme } from 'context/ThemeContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
}

export const PageHeader = ({
  title,
  subtitle,
  showBackButton = true,
  rightElement,
}: PageHeaderProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View
      style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.sideContainer}>
        {showBackButton && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons
              name="chevron-left"
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.centerContainer}>
        <View style={styles.headerTitleDiv}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.headerSubtitle, { color: colors.primaryTint }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Logo />
      </View>
      {rightElement && <View style={styles.sideContainer}>{rightElement}</View>}
    </View>
  );
};
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: -15,
  },
  sideContainer: {
    width: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
    textAlign: 'center',
  },
  headerTitleDiv: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 11,
    textAlign: 'center',
  },
});