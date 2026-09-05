
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Image } from 'react-native';
import { EmptyState } from './EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';
import { getAds } from '../api/localGetApis';
import AdBanner from './AdsBanner';
import { AdItem } from '../types/firebase';

export const PreSearchComponent = () => {
  const { colors } = useTheme();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  useEffect(() => {
    const fetchAdvertisements = async () => {
      setLoadingAds(true);
      const result = await getAds();
      if (result.success) {
        setAds(result.data);
      }
      setLoadingAds(false);
    };

    fetchAdvertisements();
  }, []);
  return (
    <ScrollView
      contentContainerStyle={[
        styles.preSearchContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {!loadingAds && ads.length > 0 && <AdBanner ads={ads} />}
      <Image
        source={{
          uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1784701708/Humaaans_-_3_Characters_nfkjsr.png',
        }}
        style={styles.illustrationImage}
        resizeMode="contain"
      />
      <EmptyState
        iconName="search"
        title="Discover iCampus"
        subtitle="Type a keyword above to search through courses, assignments, lecturers, and resources instantly."
      />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  preSearchContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 20,
    flex: 1,
  },
  illustrationImage: {
    width: 240,
    height: 200,
    marginBottom: 10,
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