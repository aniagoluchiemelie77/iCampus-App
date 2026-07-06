import React, { useRef, useEffect } from 'react';
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { DropOffStation } from '../types/firebase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8;

export const ImageCarousel = ({ images }: { images: string[] }) => {
  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % images.length;
      flatListRef.current?.scrollToIndex({
        index: currentIndex.current,
        animated: true,
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [images]);

  return (
    <FlatList
      ref={flatListRef}
      data={images}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, index) => index.toString()}
      getItemLayout={(_, index) => ({
        length: ITEM_WIDTH,
        offset: ITEM_WIDTH * index,
        index,
      })}
      renderItem={({ item }) => (
        <Image source={{ uri: item }} style={styles.logo} />
      )}
    />
  );
};
export const DropOffStationItem = ({
  item,
  onDelete,
  onEdit,
}: {
  item: DropOffStation;
  onDelete: (id: string) => void;
  onEdit: (item: DropOffStation) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.itemCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.togActionCard}>
        <ImageCarousel images={item.images} />
        <View style={styles.sideDiv}>
          <Text style={[styles.name, { color: colors.textDarker }]}>
            {item.name}
          </Text>
          <Text style={[styles.name2, { color: colors.text }]}>
            Address: {item.address}
          </Text>
          <View style={styles.sideBySide}>
            <Text style={[styles.email, { color: colors.text }]}>
              Call: {item.contactPerson}
            </Text>
            <Text style={[styles.date, { color: colors.text }]}>
              Joined:{' '}
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
          <MaterialIcons name="edit" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Delete Drop Off Station?',
              'Are you sure? This action cannot be undone.',
              [
                { text: 'Cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(item.id!),
                },
              ],
            )
          }
          style={styles.iconBtn}
        >
          <MaterialIcons name="delete" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  name2: {
    fontSize: 14,
    marginBottom: 6,
  },
  sideBySide: { flexDirection: 'row', justifyContent: 'space-between' },
  email: {
    fontSize: 14,
  },
  date: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  iconBtn: {
    marginRight: 12,
    padding: 10,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  sideDiv: {
    marginLeft: 10,
    flex: 1,
  },
  togActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
});
