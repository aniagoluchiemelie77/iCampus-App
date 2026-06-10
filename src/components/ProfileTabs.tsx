import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PRIMARY_COLOR } from 'assets/styles/colors';
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
    <View style={[styles.tabWrapper, {backgroundColor: colors.backgroundSecondary}]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
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
                activeTab === tab ? {color: colors.primary} : {color: colors.text}
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
  container: {
    alignItems: 'center',
  },
  tabItem: {
    marginRight: 7,
    padding: 10,
    alignContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});