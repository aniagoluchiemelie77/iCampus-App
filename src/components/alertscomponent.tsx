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
    success: 'check-circle-outlined',
    error: 'error-outline-outlined',
    warning: 'warning-amber-outlined',
    info: 'info-outlined',
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
          style={[
            SweetAlertPopupStyles.container,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons
            name={iconMap[type]}
            size={50}
            color={iconColorMap[type]}
            style={SweetAlertPopupStyles.icon}
          />
          <Text
            style={[SweetAlertPopupStyles.title, { color: colors.textDarker }]}
          >
            {title}
          </Text>
          <Text style={[SweetAlertPopupStyles.message, { color: colors.text }]}>
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
    alignContent: 'center',
    backgroundColor: '#111',
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
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});