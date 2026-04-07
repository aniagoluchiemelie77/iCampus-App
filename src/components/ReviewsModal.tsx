import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from './Classroomcomponent';
import { useNavigation } from '@react-navigation/native';
import { LiveClassSessionStyles } from './StudentLiveClassSession';
import axios from 'axios';
import {baseUrl} from './HomeScreenComponents';
import { Lecture, User } from 'types/firebase';

interface ReviewModalProps {
  lectureData: Lecture;
  visible: boolean; 
  user: User; 
  lecturerUid: string;
}

export const ReviewModal = ({ visible, lectureData, user, lecturerUid }: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const navigation = useNavigation<any>();
  const handleSubmit = async () => {
    try {
      const payload = {
        lectureId: lectureData.id,
        studentId: user.uid,
        lecturerId: lecturerUid,
        rating,
        comment,
      };

      await axios.post(`${baseUrl}users/student/class/submit-review`, payload);
      navigation.navigate('Home'); 
    } catch (err) {
      console.error("Review failed", err);
    }
  };
  return (
    <Portal>
      <Modal visible={visible} contentContainerStyle={LiveClassSessionStyles.modalOverlay}>
        <View style={LiveClassSessionStyles.modalContainer}>
        <Text style={LiveClassSessionStyles.modalTitle}>Rate this Lecture: {lectureData.topicName}</Text>
        <View style={LiveClassSessionStyles.modalReviewContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <MaterialIcons 
                name={star <= rating ? "star" : "star-outline"} 
                size={43} 
                color={PRIMARY_COLOR} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Any feedback for the lecturer?"
          value={comment}
          onChangeText={setComment}
          multiline
          mode="outlined"
          style={LiveClassSessionStyles.reviewModalInput}
        />

        <TouchableOpacity 
          style={LiveClassSessionStyles.reviewModalBtn}
          onPress={handleSubmit}
        >
          <Text style={LiveClassSessionStyles.reviewModalBtnText}>Submit Review</Text>
        </TouchableOpacity>
        </View>
      </Modal>
    </Portal>
  );
};