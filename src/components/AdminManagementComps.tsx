import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useAppSelector } from '../hooks/hooks'; 
import { UserAvatar } from './UserAvatar'; 
import { UserIdentity } from './UserIdentity'; 
import {getAllAdmins} from '../api/localGetApis';
import {deleteAdminApi} from '../api/localDeleteApis';

export const AdminManagementSection = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector((state) => state.admin);
  const [admins, setAdmins] = useState<any[]>([]); 
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
  setIsRefreshing(true); 
  try {
    const data = await getAllAdmins();
    setAdmins(data);
  } finally {
    setIsRefreshing(false); 
  }
};
const handleRemoveAdmin = async (uid: string) => {
  Alert.alert(
    "Remove Admin",
    "Are you sure you want to remove this user from administrative access? This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminApi(uid);
            handleRefresh(); 
          } catch (error) {
            Alert.alert("Error", "Could not remove admin.");
          }
        }
      }
    ]
  );
};

  const isSuperAdmin = currentUser.adminType === 'super_admin';

  const renderAdminItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.infoRow}>
        <UserAvatar 
          profilePic={item.profilePic} 
          firstName={item.firstname} 
          lastName={item.lastname} 
          style={styles.avatar} 
        />
        <View style={styles.textContainer}>
          <UserIdentity 
            firstname={item.firstname} 
            lastname={item.lastname} 
            isVerified={item.isVerified}
            size={'medium'}
          />
          <Text style={[styles.adminType, { color: colors.text }]}>
            {item.adminType.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={[styles.lastAccessed, { color: colors.text }]}>
            Last accessed: {new Date(item.lastAccessed).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {isSuperAdmin && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => console.log('Edit', item.uid)}>
            <MaterialIcons name="edit" size={22} color={colors.primary} />
          </TouchableOpacity>
          {item.uid !== currentUser.uid && (
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveAdmin(item.uid)}>
              <MaterialIcons name="delete-outlined" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
  useEffect(() => {
  const loadAdmins = async () => {
    const data = await getAllAdmins();
    setAdmins(data);
  };
  loadAdmins();
}, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={admins}
        keyExtractor={(item) => item.uid}
        renderItem={renderAdminItem}
        ListHeaderComponent={<Text style={styles.headerTitle}>System Administrators</Text>}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  card: { padding: 15, borderRadius: 15, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10},
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
  textContainer: { flex: 1 },
  adminType: { fontSize: 14, fontWeight: '600', marginVertical: 5 },
  lastAccessed: { fontSize: 11 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { padding: 8 },
  removeBtn: { padding: 8 },
});