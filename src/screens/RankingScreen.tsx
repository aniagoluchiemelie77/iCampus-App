import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, FlatList, useColorScheme } from 'react-native';
import { PRIMARY_COLOR, DARK_BG, LIGHT_BG } from './ThemeConstants';
const RankCard = ({ item, isDark }: any) => {
  // Determine border color based on iScore
  const getBorderColor = (score: number) => {
    if (score >= 90) return '#00E5FF'; 
    if (score >= 75) return '#FFD700'; 
    return '#C0C0C0'; 
  };

  return (
    <TouchableOpacity style={[styles.card, { borderColor: getBorderColor(item.iScore) }]}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        <View style={styles.rankBadge}>
          <Text style={styles.rankLabel}>#{item.rank}</Text>
        </View>
      </View>
      
      <Text style={styles.userName} numberOfLines={1}>{item.firstname}</Text>
      
      <View style={styles.iScoreContainer}>
        <Text style={styles.iScoreValue}>{item.iScore.toFixed(0)}</Text>
        <Text style={styles.iScoreLabel}>iScore</Text>
      </View>
    </TouchableOpacity>
  );
};

export const RankingScreen = ({ navigation, topStudents, topLecturers, userRole }: any) => {
  const isDarkMode = useColorScheme() === 'dark';
  const styles = isDarkMode ? darkStyles : lightStyles;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>iScore Leaderboard</Text>
        <Text style={styles.subTitle}>
          {userRole === 'enterprise' 
            ? "Discover top-tier talent and verified experts." 
            : "Rise through the ranks by engaging with iCampus."}
        </Text>
      </View>

      {/* Top Students Section */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meet our highest ranked Students</Text>
          <Text style={styles.viewAll}>Top 10</Text>
        </View>
        <FlatList
          horizontal
          data={topStudents}
          renderItem={({ item }) => <RankCard item={item} type="student" isDark={isDarkMode} />}
          keyExtractor={(item) => item.uid}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>

      {/* Top Lecturers Section */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated Lecturers</Text>
          <Text style={styles.viewAll}>Top 10</Text>
        </View>
        <FlatList
          horizontal
          data={topLecturers}
          renderItem={({ item }) => <RankCard item={item} type="lecturer" isDark={isDarkMode} />}
          keyExtractor={(item) => item.uid}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>

      {/* Enterprise Special View - Only visible to orgs */}
      {userRole === 'enterprise' && (
        <View style={styles.enterpriseInsight}>
          <Icon name="briefcase-search" size={24} color={PRIMARY_COLOR} />
          <Text style={styles.insightText}>
            Higher iScores correlate with 85% better retention and project completion rates.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};
const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerSection: { padding: 25, backgroundColor: '#FFF' },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  subTitle: { fontSize: 14, color: '#666', marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  card: {
    width: 130,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 3,
  },
  userName: { marginTop: 10, fontWeight: '600', color: '#333' },
  iScoreValue: { fontSize: 22, fontWeight: '900', color: PRIMARY_COLOR },
  // ...
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' }, // Deep Navy/Black
  headerSection: { padding: 25, backgroundColor: '#1E293B' },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  subTitle: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0' },
  card: {
    width: 130,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    borderWidth: 2,
    // Add a subtle glow for dark mode
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  userName: { marginTop: 10, fontWeight: '600', color: '#F8FAFC' },
  iScoreValue: { fontSize: 22, fontWeight: '900', color: '#38BDF8' },
  // ...
});