import { PageHeader } from '../components/PageHeader';
import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { navigate } from '../context/navigationContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAds } from '../api/localGetApis'; 
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { AdItemComponent } from '../components/AdItemComponent';

export const ViewAllAdsScreen = () => {
  const { colors } = useTheme();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAds = async () => {
    if (loading) return;
    setLoading(true);

    const result = await getAds();

    if (result.success) {
      setAds(result.data);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: 'Failed to load advertisements',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAds();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Manage Advertisements"
        subtitle="iCampus Sponsor Slots"
        rightElement={
          <TouchableOpacity
            onPress={() =>
              navigate('AdAorE', {
                item: null,
              })
            }
            style={[styles.addBtn, { backgroundColor: colors.btnColor }]}
          >
            <Text style={[styles.addBtnText, { color: colors.btnTextColor }]}>
              Create Ad Banner
            </Text>
            <MaterialIcons name="add" size={24} color={colors.btnTextColor} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={ads}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <AdItemComponent
            item={item}
            onRefresh={fetchAds}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  listContainer: { paddingBottom: 20 },
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12 
  },
  addBtnText: { fontSize: 13, fontWeight: 'bold', marginRight: 4 },
});