import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
export interface SweetAlertModalProps {
  visible: boolean;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}
const SweetAlertModal: React.FC<SweetAlertModalProps> = ({
  visible,
  onConfirm,
  title,
  message,
  type = 'success',
}) => {
  const { colors } = useTheme();
  const iconMap = {
    success: 'check-circle',
    error: 'error-outline',
    warning: 'warning-amber',
    info: 'info-outline',
  };

  const iconColorMap = {
    success: colors.success,
    error: colors.primary,
    warning: colors.primaryTint,
    info: colors.pendingDelivery,
  };

  return (
    <Modal isVisible={visible} animationIn="zoomIn" animationOut="zoomOut">
      <TouchableWithoutFeedback
        onPress={onConfirm}
        style={SweetAlertPopupStyles.bckg}
      >
        <View
          style={[SweetAlertPopupStyles.container, { backgroundColor: '#fff' }]}
        >
          <MaterialIcons
            name={iconMap[type]}
            size={50}
            color={iconColorMap[type]}
            style={SweetAlertPopupStyles.icon}
          />
          <Text style={[SweetAlertPopupStyles.title, { color: '#222' }]}>
            {title}
          </Text>
          <Text style={[SweetAlertPopupStyles.message, { color: '#333' }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[
              SweetAlertPopupStyles.button,
              { backgroundColor: colors.btnColor },
            ]}
            onPress={onConfirm}
          >
            <Text
              style={[
                SweetAlertPopupStyles.buttonText,
                { color: colors.btnTextColor },
              ]}
            >
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SweetAlertModal;
export const SweetAlertPopupStyles = StyleSheet.create({
  bckg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  container: {
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  message: {
    fontSize: 14,
    marginBottom: 15,
  },
  button: {
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});