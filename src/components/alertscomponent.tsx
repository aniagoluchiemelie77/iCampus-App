import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface SweetAlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}
const SweetAlertModal: React.FC<SweetAlertModalProps> = ({ visible, onClose, title, message, type = 'success' }) => {
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
      <View style={styles.container}>
        <Icon
          name={iconMap[type]}
          size={50}
          color={iconColorMap[type]}
          style={styles.icon}
        />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SweetAlertModal;
