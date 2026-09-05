import {SchoolItem} from '../components/SchoolItem';
import {PageHeader} from '../components/PageHeader';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { navigate } from '../context/navigationContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import { getInstitutionsAPI } from '../api/localGetApis';
import { useTheme } from '../context/ThemeContext';
import { deleteInstitutionApi } from '../api/localDeleteApis';
import Toast from 'react-native-toast-message';

export const ViewAllSchoolsScreen = () => {
  const { colors } = useTheme();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);

  const fetchSchools = async (pageNum: number) => {
    if (loading) return;
    setLoading(true);

    const data = await getInstitutionsAPI(pageNum, 20);

    setSchools(prev => (pageNum === 1 ? data : [...prev, ...data]));
    setLoading(false);
  };

  const handleLoadMore = () => {
    pageRef.current += 1;
    fetchSchools(pageRef.current);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="iCampus Authorized Institutions"
        subtitle="Manage iCampus Network"
        rightElement={
          <CustomButton
            title="Add School"
            onPress={() =>
              navigate('SchoolAorE', {
                item: null,
              })
            }
            style={[styles.addBtn, { backgroundColor: colors.btnColor }]}
          />
        }
      />
      <FlatList
        data={schools}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SchoolItem
            item={item}
            onDelete={async (id: any) => {
              const result = await deleteInstitutionApi(id);
              if (result.success) {
                fetchSchools(1);
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Delete Failed',
                  text2: result.error,
                });
              }
            }}
            onEdit={(i: any) => {
              navigate('SchoolAorE', { item: i });
            }}
          />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ marginHorizontal: 15, paddingBottom: 30 }}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { paddingHorizontal: 8, height: 40, width: 'auto' },
  addBtnText: { fontSize: 14, fontWeight: 'bold' },
});