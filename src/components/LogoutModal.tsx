import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import {handleLogout} from '../api/localPostApis';
import Modal from 'react-native-modal';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => onClose()}
      swipeDirection="down"
      onSwipeComplete={() => onClose()}
      style={styles.modalOverride}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
            Logout
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            Are you sure you want to logout from this device? This action can
            not be reversed.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.btnColor }]}
              onPress={handleLogoutAction}
            >
              <Text style={[styles.saveBtnText, { color: colors.btnTextColor }]}>
                Logout
              </Text>
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    marginVertical: 15,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 0.8,
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverride: {
    margin: 0,
  },
});