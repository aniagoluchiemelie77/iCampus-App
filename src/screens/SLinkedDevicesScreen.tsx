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
import { fetchLinkedDevicesAPI } from '../api/localGetApis';
import Toast from 'react-native-toast-message';

export const LinkedDevicesScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user) || {};
  const dispatch = useDispatch();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const result = await revokeDeviceSession(deviceIdToRevoke);
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
          name={item.deviceType === 'desktop' ? 'laptop' : 'smartphone'}
          size={30}
          color={colors.primary}
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
  const loadDeviceData = async () => {
    try {
      setIsLoading(true);
      const id = await DeviceInfo.getUniqueId();
      setCurrentDeviceId(id);

      const response = await fetchLinkedDevicesAPI();
      if (response.success) {
        const uniqueSessions = Array.from(
          new Map(
            response.data.map((session: UserSession) => [
              session.deviceName,
              session,
            ]),
          ).values(),
        ) as UserSession[];
        const currentSession = response.data.find(
          (s: UserSession) => s.deviceId === id,
        );
        if (
          currentSession &&
          !uniqueSessions.some((s: any) => s.deviceId === id)
        ) {
          const index = uniqueSessions.findIndex(
            (s: any) => s.deviceName === currentSession.deviceName,
          );
          if (index !== -1) uniqueSessions[index] = currentSession;
        }
        setSessions(uniqueSessions);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to load devices',
          text2: response.message,
        });
      }
    } catch (error) {
      console.error('Error loading linked devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeviceData();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Linked Devices" />
      <FlatList
        data={sessions}
        keyExtractor={item => item.deviceId}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={loadDeviceData}
        contentContainerStyle={{ marginHorizontal: 15 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  infoContainer: { flex: 1, marginLeft: 13 },
  deviceName: { fontSize: 14, fontWeight: '600' },
  thisDevice: { color: PRIMARY_COLOR, fontWeight: 'bold' },
  deviceMeta: { fontSize: 12, marginTop: 5 },
  removeButton: {
    marginLeft: 8,
  },
});