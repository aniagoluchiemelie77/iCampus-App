import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { PRIMARY_COLOR } from 'assets/styles/colors';

interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userType: 'student' | 'lecturer' | 'enterprise' | 'otherUser';
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, setActiveTab, userType }) => {
  const getTabs = () => {
    const baseTabs = ['Posts', 'Media'];
    if (userType === 'enterprise') {
      return [...baseTabs, 'Jobs', 'Events'];
    }
    return [...baseTabs, 'Bookmarks'];
  };

  const tabs = getTabs();

  return (
    <View style={styles.tabWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
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