import React, {useState, useEffect, useMemo} from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {getDistanceInMiles} from '../utils/distanceCalculator';
import {DropOffStation} from '../types/firebase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface StationCarouselProps {
  stations: DropOffStation[];
  selectedStation?: DropOffStation | null;
  onSelect?: (station: DropOffStation) => void;
  userCoords: { lat: number; lng: number } | null;
}
interface StationCardProps {
  item: DropOffStation;
  isSelected?: boolean;
  onSelect?: (station: DropOffStation) => void;
  userCoords: { lat: number; lng: number } | null;
}
const StationCard = ({
  item,
  isSelected,
  onSelect,
  userCoords,
}: StationCardProps) => {
  const { colors } = useTheme();
  const images = useMemo(() => item.images || [], [item.images]);
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  const distance = userCoords
    ? getDistanceInMiles(
        userCoords.lat,
        userCoords.lng,
        item.latitude || 0,
        item.longitude || 0,
      ).toFixed(1)
    : 'N/A';

  return (
    <TouchableOpacity
      onPress={() => onSelect && onSelect(item)}
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: isSelected ? colors.primary : 'transparent',
          borderWidth: isSelected ? 2 : 0, // Ensure border highlights properly
          width: width * 0.8,
        },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: images[index] }} style={styles.image} />
        {isSelected && (
          <View style={[styles.badge, { backgroundColor: colors.btnColor }]}>
            <MaterialIcons
              name="check-circle-outlined"
              size={16}
              color={colors.btnTextColor}
            />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.textDarker }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.address, { color: colors.text + '99' }]}
          numberOfLines={2}
        >
          {item.address}
        </Text>
        <Text style={[styles.distance, { color: colors.primary }]}>
          {parseFloat(distance) < 1
            ? 'Less than 1 mile away'
            : parseFloat(distance) === 1
            ? '1 mile away'
            : `${distance} miles away`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
export const StationCarousel = ({
  stations,
  selectedStation,
  onSelect,
  userCoords,
}: StationCarouselProps) => (
  <FlatList
    horizontal
    data={stations}
    renderItem={({ item }) => (
      <StationCard
        item={item}
        isSelected={selectedStation?.id === item.id}
        onSelect={onSelect}
        userCoords={userCoords}
      />
    )}
    keyExtractor={item => item.id}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.listContent}
  />
);

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 15 },
  card: {
    height: 100,
    flexDirection: 'row',
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 80,
    resizeMode: 'cover',
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  name: { fontWeight: 'bold', fontSize: 14 },
  address: { fontSize: 12, marginVertical: 5 },
  distance: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  imageContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: 8,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});