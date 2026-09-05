import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Logo from '../assets/images/Logo';
import { useTheme } from '../context/ThemeContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const PageHeader = ({
  title,
  subtitle,
  showBackButton = true,
  leftElement,
  rightElement,
}: PageHeaderProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View
      style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.sideContainer}>
        {leftElement ? (
          leftElement
        ) : showBackButton ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonTouchable}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.centerContainer}>
        <Text
          style={[styles.headerTitle, { color: colors.primary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.headerSubtitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.sideContainer, styles.rightSideContainer]}>
        {rightElement ? rightElement : <Logo />}
      </View>
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
    marginBottom: 20,
  },
  sideContainer: {
    width: 'auto',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSideContainer: {
    alignItems: 'flex-end',
  },
  backButtonTouchable: {
    padding: 4,
    marginLeft: -4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitleDiv: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});