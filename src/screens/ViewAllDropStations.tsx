import {DropOffStationItem} from '../components/DropOffStationItem';
import {PageHeader} from '../components/PageHeader';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { navigate } from '../context/navigationContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getDropOffStationsAPI } from '../api/localGetApis';
import { useTheme } from '../context/ThemeContext';

export const ViewAllDropStations = () => {
    const { colors } = useTheme();
  const [dropOffStations, setDropOffStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);

  const fetchDropOffStations = async (pageNum: number) => {
  if (loading) return; 
  setLoading(true);
  
  const data = await getDropOffStationsAPI(pageNum, 20);
  
  setDropOffStations(prev => pageNum === 1 ? data : [...prev, ...data]);
  setLoading(false);
};

 const handleLoadMore = () => {
  pageRef.current += 1;
  fetchDropOffStations(pageRef.current);
};

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <PageHeader 
        title="iCampus Authorized Drop Stations" 
        subtitle="Manage iCampus Network"
        rightElement={
          <TouchableOpacity onPress={() => navigate('AddDropStation')} style={[styles.addBtn, { backgroundColor: colors.btnColor }]}>
            <Text style={[styles.addBtnText, {color: colors.btnTextColor}]}>Add Drop Station</Text>
            <MaterialIcons name="add" size={28} color={colors.btnTextColor} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={dropOffStations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DropOffStationItem item={item} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};
const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 15 },
    addBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, alignContent: 'center' },
    addBtnText: { fontSize: 14, fontWeight: 'bold', },
})