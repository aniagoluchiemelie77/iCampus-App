import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { Lecture } from '../types/firebase';
import {LiveClassSessionStyles} from './StudentLiveClassSession';
import { useTheme } from '../context/ThemeContext';

interface OngoingLectureModalProps {
  lecture: Lecture | null;
  onDismiss: () => void;
  visible: boolean;
  onJoin: () => void;
}

export const OngoingLectureModal = ({
  visible,
  lecture,
  onJoin,
  onDismiss,
}: OngoingLectureModalProps) => {
  const { colors } = useTheme();
  if (!lecture) return null;
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={LiveClassSessionStyles.modalOverlay}
      >
        <View
          style={[
            LiveClassSessionStyles.modalContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text
            style={[
              LiveClassSessionStyles.modalTitle,
              { color: colors.textDarker },
            ]}
          >
            {lecture?.topicName} - Live Lecture Ongoing!
          </Text>
          <Text
            style={[
              LiveClassSessionStyles.modalSubText,
              { color: colors.text },
            ]}
          >
            Your online class is currently live. Would you like to join now?
          </Text>
          <View style={LiveClassSessionStyles.row}>
            <TouchableOpacity
              onPress={onDismiss}
              style={[
                LiveClassSessionStyles.reviewModalBtn,
                { borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  LiveClassSessionStyles.reviewModalBtnText,
                  { color: colors.primary },
                ]}
              >
                Not Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onJoin}
              style={[
                LiveClassSessionStyles.reviewModalBtn,
                { backgroundColor: colors.btnColor },
              ]}
            >
              <Text
                style={[
                  LiveClassSessionStyles.reviewModalBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                Join Class
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};