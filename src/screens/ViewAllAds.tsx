import { PageHeader } from '../components/PageHeader';
import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { navigate } from '../context/navigationContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import { getAds } from '../api/localGetApis';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { AdItemComponent } from '../components/AdItemComponent';
import { useAppSelector } from '../hooks/hooks';

export const ViewAllAdsScreen = () => {
  const { colors } = useTheme();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useAppSelector(state => state.admin);
  const currentUserId = currentUser.uid;
  const adminType = currentUser.adminType;
  const hasSchoolAdminPostedAd = ads.some(ad => ad.addedBy === currentUserId);
  const canCreateAd =
    adminType === 'super_admin' ||
    (adminType === 'school_administrator' && !hasSchoolAdminPostedAd);

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
          canCreateAd ? (
            <CustomButton
              title="Create Advert Banner"
              onPress={() =>
                navigate('AdAorE', {
                  item: null,
                })
              }
              style={styles.addBtn}
            />
          ) : null
        }
      />
      <FlatList
        data={ads}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <AdItemComponent item={item} onRefresh={fetchAds} />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { paddingBottom: 30, marginHorizontal: 15 },
  addBtn: {
    width: 'auto',
    paddingHorizontal: 8,
    height: 40,
  },
});