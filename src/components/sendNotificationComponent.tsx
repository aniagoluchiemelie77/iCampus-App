import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { styles } from './LogoutModal';
import { updateTicketStatus } from '../api/localPatchApis';
import { sendSystemNotification } from '../api/localPostApis';

interface Props {
  visible: boolean;
  onClose: () => void;
  ticket: any;
  navigation: any
}

export const SendNotificationModal = ({ visible, onClose, ticket, navigation }: Props) => {
  const { colors } = useTheme();
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendNotification = async () => {
      if (!message.trim()) return;
      setIsSubmitting(true);
      
      const notifRes = await sendSystemNotification({
        recipientId: ticket.userId,
        title: `Update on Ticket #${ticket.ticketRefId}`,
        message,
        category: 'system'
      });
      
      if (notifRes.success) {
        const statusRes = await updateTicketStatus(ticket.ticketRefId, 'pending');
        if (statusRes.success) {
          onClose();
          navigation.goBack();
        }
      }
      
      setIsSubmitting(false);
    };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>Message User</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
            placeholder="E.g., Please provide a screenshot..."
            placeholderTextColor={colors.inputTextHolder}
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.sendBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.sendBtnText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSendNotification} 
              style={[styles.sendBtn, { backgroundColor: colors.btnColor }]}
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.btnTextColor} size={'small'} />
              ) : (
                <Text style={[styles.sendBtnText, { color: colors.btnTextColor }]}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};