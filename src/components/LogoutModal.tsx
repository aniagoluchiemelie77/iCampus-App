import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { handleLogout } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { CustomButton } from '../assets/components/AppUIComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons name="info-outline" size={60} color={colors.primary} />
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
            Confirm Logout
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            Are you sure you want to logout from this device? This action can
            not be reversed.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <CustomButton
              title="Logout"
              onPress={handleLogoutAction}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '70%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  modalSubtitle: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    gap: 25,
  },
  cancelBtn: {
    paddingHorizontal: 15,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 0.8,
    width: 'auto',
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 15,
    width: 'auto',
  },
  saveBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverride: {
    margin: 0,
  },
  toggleDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    marginBottom: 15,
  },
  toggleText: { fontSize: 14 },
  rowBetweenDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 12 },
  arrayItemsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullWidthBtn: {
    paddingHorizontal: 15,
    marginVertical: 20,
  },
  fullWidthText: { fontWeight: 'bold', fontSize: 14 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  sendBtn: {
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
  },
  sendBtnText: { fontSize: 14, fontWeight: 'bold' },
  input: {
    height: 120,
    borderRadius: 10,
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
});