import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { useAppSelector } from '../hooks/hooks';
import { UserSession } from '../types/firebase';
import { updateUserSessions } from '../context/UserSlice';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { revokeDeviceSession } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';

export const LinkedDevicesScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const handleRemoveDevice = ({
    deviceId,
    deviceName,
  }: {
    deviceId: string;
    deviceName: string;
  }) => {
    Alert.alert('Log out device?', `This will sign you out of ${deviceName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => processRevoke({ deviceIdToRevoke: deviceId }),
      },
    ]);
  };
  const processRevoke = async ({
    deviceIdToRevoke,
  }: {
    deviceIdToRevoke: string;
  }) => {
    try {
      setIsRevoking(deviceIdToRevoke);
      const result = await revokeDeviceSession(
        currentUser.uid,
        deviceIdToRevoke,
      );
      if (result.success) {
        const updatedSessions = currentUser.sessions!.filter(
          s => s.deviceId !== deviceIdToRevoke,
        );
        dispatch(updateUserSessions(updatedSessions));
      }
    } catch (error) {
      console.error('Revoke failed', error);
    }
  };
  const renderItem = ({ item }: { item: UserSession }) => {
    const isCurrent = item.deviceId === currentDeviceId;

    return (
      <View
        style={[
          styles.deviceItem,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name={item.deviceType === 'desktop' ? 'laptop' : 'smart-phone'}
          size={28}
          color={colors.inputTextHolder}
        />

        <View style={styles.infoContainer}>
          <Text style={[styles.deviceName, { color: colors.text }]}>
            {item.deviceName}{' '}
            {isCurrent && <Text style={styles.thisDevice}>(This device)</Text>}
          </Text>
          <Text style={[styles.deviceMeta, { color: colors.text }]}>
            {item.location} •{' '}
            {item.lastUsed ? moment(item.lastUsed).fromNow() : 'Unknown date'}
          </Text>
          <Text style={[styles.ipText, { color: colors.text }]}>
            {item.ipAddress}
          </Text>
        </View>

        {!isCurrent && (
          <TouchableOpacity
            onPress={() =>
              handleRemoveDevice({
                deviceId: item.deviceId,
                deviceName: item.deviceName,
              })
            }
            style={styles.removeButton}
          >
            {isRevoking ? (
              <ActivityIndicator color={colors.primary} size={'small'} />
            ) : (
              <MaterialIcons name="logout" size={20} color={colors.primary} />
            )}
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Linked Devices" />
      <FlatList
        data={currentUser.sessions}
        keyExtractor={item => item.deviceId}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
  },
  infoContainer: { flex: 1, marginLeft: 10 },
  deviceName: { fontSize: 14, fontWeight: '600' },
  thisDevice: { color: PRIMARY_COLOR, fontWeight: 'bold' },
  deviceMeta: { fontSize: 12, marginTop: 3 },
  ipText: { fontSize: 11, marginTop: 3 },
  removeButton: {
    marginLeft: 8,
  },
});