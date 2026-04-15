import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Logo from '../assets/images/Logo';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';

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
  rightElement 
}: PageHeaderProps) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      {/* Left Section: Back Button */}
      <View style={styles.sideContainer}>
        {showBackButton && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={32} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        )}
      </View>

      {/* Middle Section: Title, Logo, and Subtitle */}
      <View style={styles.centerContainer}>
        <View style={styles.headerTitleDiv}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        </View>
        <Logo />
      </View>

      {/* Right Section: Custom Element or Spacer */}
      <View style={styles.sideContainer}>
        {rightElement ? rightElement : <View style={{ width: 32 }} />}
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
    backgroundColor: '#fff',
  },
  sideContainer: {
    width: 40, 
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
    color: PRIMARY_COLOR,
    marginBottom: 3,
    textAlign: 'center',
  },
  headerTitleDiv: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  headerSubtitle: {
    fontSize: 11,
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
  },
});