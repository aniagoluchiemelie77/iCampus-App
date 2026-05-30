import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import {handleLogout} from '../api/localPostApis';
import Modal from 'react-native-modal';
import {PRIMARY_COLOR} from '../assets/styles/colors';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}
export const LogoutModal = ({
  visible,
  onClose,
  navigation,
}: LogoutModalProps) => {
  const handleLogoutAction = async () => {
    try {
      await handleLogout(navigation);
    } catch (e) {
      console.log('Server logout failed, clearing local session anyway.');
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => onClose()}
      swipeDirection="down"
      onSwipeComplete={() => onClose()}
      style={styles.modalOverride}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Logout</Text>
          <Text style={styles.modalSubtitle}>
            Are you sure you want to logout from this device? This action can
            not be reversed.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleLogoutAction}
            >
              <Text style={styles.saveBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  modalSubtitle: {
    marginVertical: 15,
    fontSize: 14,
    color: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR,
  },
  cancelBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverride: {
    margin: 0,
  },
});