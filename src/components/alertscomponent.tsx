import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SweetAlertPopupStyles } from '../assets/styles/colors';

export interface SweetAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}
const SweetAlertModal: React.FC<SweetAlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'success',
}) => {
  const iconMap = {
    success: 'check-circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  const iconColorMap = {
    success: '#4BB543',
    error: '#FF3B30',
    warning: '#FFA500',
    info: '#007AFF',
  };

  return (
    <Modal isVisible={visible} animationIn="zoomIn" animationOut="zoomOut">
      <View style={SweetAlertPopupStyles.container}>
        <Icon
          name={iconMap[type]}
          size={50}
          color={iconColorMap[type]}
          style={SweetAlertPopupStyles.icon}
        />
        <Text style={SweetAlertPopupStyles.title}>{title}</Text>
        <Text style={SweetAlertPopupStyles.message}>{message}</Text>
        <TouchableOpacity
          style={SweetAlertPopupStyles.button}
          onPress={onClose}
        >
          <Text style={SweetAlertPopupStyles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};


export default SweetAlertModal;
