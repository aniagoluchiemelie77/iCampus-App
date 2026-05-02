import React, {useState, useEffect} from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { useAppSelector } from '../components/hooks';
import {UserSession} from '../types/firebase';
import { updateUserSessions } from '../components/UserSlice';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { revokeDeviceSession } from 'api/localPostApis';

export const LinkedDevicesScreen = () => {
  const currentUser = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  const handleRemoveDevice = ({deviceId, deviceName}: {deviceId: string, deviceName: string}) => {
    Alert.alert(
      "Log out device?",
      `This will sign you out of ${deviceName}.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: () => processRevoke({deviceIdToRevoke: deviceId}) 
        }
      ]
    );
  };

  const processRevoke = async ({deviceIdToRevoke}: {deviceIdToRevoke: string}) => {
    try {
      const result = await revokeDeviceSession(currentUser.uid, deviceIdToRevoke);
      if (result.success) {
        const updatedSessions = currentUser.sessions!.filter(s => s.deviceId !== deviceIdToRevoke);
        dispatch(updateUserSessions(updatedSessions));
      }
    } catch (error) {
      console.error("Revoke failed", error);
    }
  };

  const renderItem = ({ item }: { item: UserSession }) => {
    const isCurrent = item.deviceId === currentDeviceId;

    return (
      <View style={styles.deviceItem}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={item.deviceType === 'desktop' ? 'laptop' : 'smart-phone'} 
            size={28} 
            color={PRIMARY_COLOR_TINT} 
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.deviceName}>
            {item.deviceName} {isCurrent && <Text style={styles.thisDevice}>(This device)</Text>}
          </Text>
          <Text style={styles.deviceMeta}>
            {item.location} • {moment(item.lastUsed).fromNow()}
          </Text>
          <Text style={styles.ipText}>{item.ipAddress}</Text>
        </View>

        {!isCurrent && (
          <TouchableOpacity 
            onPress={() => handleRemoveDevice({ deviceId: item.deviceId, deviceName: item.deviceName })}
            style={styles.removeButton}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  useEffect(() => {
    const fetchDeviceId = async () => {
      const id = await DeviceInfo.getUniqueId();
      setCurrentDeviceId(id);
    };
    fetchDeviceId();
  }, []);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Linked Devices"
       />
      <FlatList
        data={currentUser.sessions}
        keyExtractor={(item) => item.deviceId}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff'},
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  iconContainer: { width: 50, alignItems: 'center' },
  infoContainer: { flex: 1, marginLeft: 10 },
  deviceName: { fontSize: 14, fontWeight: '600', color: '#222' },
  thisDevice: { color: PRIMARY_COLOR, fontWeight: 'bold', fontSize: 12 },
  deviceMeta: { fontSize: 12, color: '#222', marginTop: 3 },
  ipText: { fontSize: 11, color: '#2222', marginTop: 3 },
  removeButton: { padding: 10, backgroundColor: PRIMARY_COLOR, borderRadius: 10},
});