import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../context/ThemeContext';
import { getStationDetailsApi } from '../api/localGetApis'; 
import Toast from 'react-native-toast-message';
import {UserAvatar} from './UserAvatar';
import {UserIdentity} from './UserIdentity'
import { User } from '../types/firebase';

interface StationDetailModalProps {
  visible: boolean;
  onClose: () => void;
  stationId: string | null;
}
interface StationDetails {
  stationName: string;
  address: string;
  agent: User;
}


export const DropOffStationDetailModal = ({ visible, onClose, stationId }: StationDetailModalProps) => {
  const [data, setData] = useState<StationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const fetchDetails = useCallback(async () => {
  if (!stationId) return;
  setLoading(true);
  const result = await getStationDetailsApi(stationId);
  if (result.success) {
    setData(result.data);
  } else {
    Toast.show({
        type: 'error',
        text2: "Couldnt't fetch institution's details, please retry."
    })
  }
  setLoading(false);
}, [stationId]);
  useEffect(() => {
  if (visible && stationId) {
    fetchDetails();
  }
}, [visible, stationId, fetchDetails])

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} swipeDirection="down" onSwipeComplete={onClose} style={styles.modalOverride}>
        <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : data ? (
          <>
            <Text style={[styles.title, {color: colors.textDarker}]}>{data?.stationName}</Text>
            <Text style={[styles.subtitle, {color: colors.text}]}>{data?.address}</Text>
            
            <Text style={[styles.subtitle, {color: colors.text}]}>Managed By:</Text>
        <View style={styles.agentContainer}>
          <UserAvatar 
            profilePic={data?.agent.profilePic}
            firstName={data?.agent.firstname}
            lastName={data?.agent.lastname}
            style={styles.avatar} 
          />
          <UserIdentity 
            firstname={data?.agent.firstname || ''}
            lastname={data?.agent.lastname}
            username={data?.agent.username}
            tier={data?.agent.tier || 'free'}
            isVerified={data?.agent.isVerified}
            size={'medium'}
            organizationName={data?.agent.organizationName || ''}
            containerStyle={{flex: 1}}
          />
        </View>
          </>
        ) : <Text style={[styles.subtitle, {color: colors.primaryTint}]}>Failed to load details.</Text>}
    
      </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalContent: {
    padding: 24,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15
  },
  modalOverride: {
    margin: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  count:{
    fontSize: 15,
    fontWeight: 'bold'
  },
  agentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)', // Subtle background to group them
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
});