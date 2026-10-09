import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';

interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userType: 'student' | 'lecturer' | 'enterprise' | 'otherUser';
  isOwner: boolean;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  setActiveTab,
  userType,
  isOwner,
}) => {
  const { colors } = useTheme();
  const getTabs = () => {
    const tabs = ['Posts', 'Media', 'Reposts'];
    if (userType === 'enterprise') {
      tabs.push('Jobs', 'Events');
    }
    if (isOwner) {
      tabs.push('Bookmarks');
    }
    return tabs;
  };

  const tabs = getTabs();

  return (
    <View
      style={[
        styles.tabWrapper,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarScrollContainer}
        style={[
          styles.tabBarWrapper,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab
                  ? { color: colors.primary }
                  : { color: colors.text },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabWrapper: {
    borderBottomWidth: 0.8,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBarScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
    paddingVertical: 0,
  },
  tabBarWrapper: {
    marginVertical: 10,
    flexGrow: 0,
    height: 52,
  },
});