import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../context/ThemeContext';
import { getSchoolStatsApi } from '../api/localGetApis'; 
import Toast from 'react-native-toast-message';

interface SchoolDetailModalProps {
  visible: boolean;
  onClose: () => void;
  schoolId: string | null;
}
interface SchoolStats {
  schoolName: string;
  contactEmail: string;
  logo: string;
  studentCount: number;
  lecturerCount: number;
}


export const SchoolDetailModal = ({ visible, onClose, schoolId }: SchoolDetailModalProps) => {
  const [data, setData] = useState<SchoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const fetchDetails = useCallback(async () => {
  if (!schoolId) return;
  setLoading(true);
  const result = await getSchoolStatsApi(schoolId);
  if (result.success) {
    setData(result.data);
  } else {
    Toast.show({
        type: 'error',
        text2: "Couldnt't fetch institution's details, please retry."
    })
  }
  setLoading(false);
}, [schoolId]);
  useEffect(() => {
  if (visible && schoolId) {
    fetchDetails();
  }
}, [visible, schoolId, fetchDetails])

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} swipeDirection="down" onSwipeComplete={onClose} style={styles.modalOverride}>
        <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : data ? (
          <>
           <View style={styles.statsRow}>
            <Image source={{ uri: data.logo }} style={styles.logo} />
            <View style={styles.sideBySide}>
            <Text style={[styles.title, {color: colors.textDarker}]}>{data.schoolName}</Text>
            <Text style={[styles.subtitle, {color: colors.text}]}>{data.contactEmail}</Text>
            </View>
           </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.subtitle, {color: colors.text}]}>Students Count</Text>
                <Text style={[styles.count, {color: colors.text}]}>{data.studentCount}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.subtitle, {color: colors.text}]}>Lecturers</Text>
                <Text style={[styles.count, {color: colors.text}]}>{data.lecturerCount}</Text>
                </View>
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
  logo: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  sideBySide: {
    marginLeft: 10,
    flex: 1
  },
  statBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
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
  }
});