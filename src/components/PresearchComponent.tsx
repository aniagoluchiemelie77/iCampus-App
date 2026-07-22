
import React, { Dispatch, SetStateAction } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { EmptyState } from './EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';

interface TabItem {
  id: string;
  label: string;
}
interface PreSearchComponentProps {
  tabs?: TabItem[];
  setActiveTab?: Dispatch<SetStateAction<any>> | ((id: string) => void);
  setSearchQuery?: Dispatch<SetStateAction<string>> | ((query: string) => void);
}
export const PreSearchComponent = ({ 
  tabs = [] as TabItem[], 
  setActiveTab = () => {}, 
  setSearchQuery = () => {} 
}: PreSearchComponentProps) => {
    const { colors } = useTheme();
  return (
    <ScrollView contentContainerStyle={[styles.preSearchContainer, {backgroundColor: colors.backgroundSecondary}]} showsVerticalScrollIndicator={false}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1784701708/Humaaans_-_3_Characters_nfkjsr.png' }} 
          style={styles.illustrationImage}
          resizeMode="contain"
        />
        <EmptyState
          iconName="explore-outlined"
          title="Discover iCampus"
          subtitle="Type a keyword above to search through courses, assignments, lecturers, and resources instantly."
          style={styles.emptyStateMargin}
        />

      {tabs && tabs.length > 0 && (
        <>
          <Text style={[styles.preSearchSectionTitle, { color: colors.text }]}>
            Suggested Categories
          </Text>
          <View style={styles.suggestionChipsRow}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.suggestionChip, { borderColor: colors.border }]}
                onPress={() => {
                  setActiveTab(tab.id);
                  setSearchQuery(tab.label);
                }}
              >
                <Text style={[styles.suggestionChipText, { color: colors.primary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  preSearchContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 30,
    flex: 1
  },
  illustrationImage: {
    width: 240,
    height: 180,
    marginBottom: 15,
  },
  emptyStateMargin: {
    marginBottom: 15
  },
  preSearchSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  suggestionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  suggestionChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});