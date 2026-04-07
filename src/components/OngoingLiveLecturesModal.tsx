import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { Lecture } from 'types/firebase';
import {LiveClassSessionStyles} from './StudentLiveClassSession';


interface OngoingLectureModalProps {
  lecture: Lecture | null;
  onDismiss: () => void;
  visible: boolean;
  onJoin: () => void;
}

export const OngoingLectureModal = ({ visible, lecture, onJoin, onDismiss }: OngoingLectureModalProps) => {
  if (!lecture) return null;
  return (
  <Portal>
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={LiveClassSessionStyles.modalOverlay}>
      <View style={LiveClassSessionStyles.modalContainer}>
        <Text style={LiveClassSessionStyles.modalTitle}>{lecture?.topicName} - Live Lecture Ongoing!</Text>
        <Text style={LiveClassSessionStyles.modalSubText}>Your online class is currently live. Would you like to join now?</Text>     
        <View style={LiveClassSessionStyles.row}>
          <TouchableOpacity onPress={onDismiss} style={LiveClassSessionStyles.reviewModalBtn}>
            <Text style={LiveClassSessionStyles.reviewModalBtnText}>Not Now</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onJoin} style={LiveClassSessionStyles.reviewModalBtn}>
            <Text style={LiveClassSessionStyles.reviewModalBtnText}>Join Class</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </Portal>
)};