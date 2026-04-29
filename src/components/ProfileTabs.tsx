import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { PRIMARY_COLOR } from 'assets/styles/colors';

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
  const getTabs = () => {
    // 1. Everyone gets these
    const tabs = ['Posts', 'Media', 'Reposts'];
    // 2. Enterprise specific tabs
    if (userType === 'enterprise') {
      tabs.push('Jobs', 'Events');
    }
    // 4. CRITICAL: Only add Bookmarks if the viewer owns the profile
    if (isOwner) {
      tabs.push('Bookmarks');
    }
    return tabs;
  };

  const tabs = getTabs();

  return (
    <View style={styles.tabWrapper}>
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
                activeTab === tab && styles.activeTabText,
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
    borderBottomWidth: .8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  container: {
    paddingHorizontal: 8,
    height: 50,
    alignItems: 'center',
  },
  tabItem: {
    marginRight: 15,
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
});