import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, FlatList, Image, Dimensions, StyleSheet, Animated, TouchableOpacity, Modal, Text, ActivityIndicator, Linking, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';
import { PRIMARY_COLOR } from './Classroomcomponent';
import ImagePicker from 'react-native-image-crop-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patchUserProfile } from 'api/localPatchApis';
import { updateUserImage } from './UserSlice';
import { useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileImageCarouselProps {
  images: string[];
  isOwner: boolean;
  uid?: string;
}

export const ProfileImageCarousel: React.FC<ProfileImageCarouselProps> = ({
  images,
  isOwner,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const dispatch = useDispatch();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const handlePickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
        loadingLabelText: 'Processing...',
      });
      setPreviewImage(image.path);
    } catch (error: any) {
      if (
        error.message.includes('permission') ||
        error.message.includes('Required')
      ) {
        Alert.alert(
          'Permission Required',
          'iCampus needs access to your gallery to update your profile. Grant access in settings?',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      } else if (error.message.includes('User cancelled')) {
        console.log('User backed out');
      } else {
        console.error('ImagePicker Error: ', error.message);
      }
    }
  };
  const handleConfirmUpload = async () => {
    setIsUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(previewImage!);
      const token = await AsyncStorage.getItem('userToken');
      const result = await patchUserProfile({ profilePic: imageUrl }, token!);
      if (result && result.success) {
        dispatch(updateUserImage(imageUrl));
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile picture updated!',
        });
        setPreviewImage(null);
      }
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
    }
  };
  const displayImages = useMemo(() => {
    return images?.length > 0 ? images : ['https://via.placeholder.com/400'];
  }, [images]);
  // Handle auto-scroll logic
  useEffect(() => {
    if (displayImages.length <= 1) return;
    const timer = setInterval(() => {
      let nextIndex = activeIndex + 1;
      if (nextIndex >= displayImages.length) nextIndex = 0;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 9000); // 5 seconds per image
    return () => clearInterval(timer);
  }, [activeIndex, displayImages]);
  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={displayImages}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={e => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
          );
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
      />
      {/* Glassmorphism Pagination Dots */}
      <View style={styles.paginationContainer}>
        {displayImages.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ],
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          const scale = scrollX.interpolate({
            inputRange: [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ],
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity, transform: [{ scale }] }]}
            />
          );
        })}
      </View>
      {/* Owner Edit Overlay */}
      {isOwner && (
        <TouchableOpacity style={styles.editBtn} onPress={handlePickImage}>
          <MaterialIcons name="photo-camera" size={20} color="#FFF" />
        </TouchableOpacity>
      )}
      {/* Confirmation Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Update Profile Photo</Text>
            <Image
              source={{ uri: previewImage || '' }}
              style={styles.fullPreview}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setPreviewImage(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmUpload}
                style={styles.confirmBtn}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Set as Profile Pic</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 350,
    width: SCREEN_WIDTH,
    backgroundColor: '#fadccc',
    position: 'relative'
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    position: 'absolute',
    top: 15,
    right: 10,
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)', // Glass effect
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginHorizontal: 4,
  },
  editBtn: {
    position: 'absolute',
    bottom: -15,
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5
  },
  previewCard: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    color: '#222',
  },
  fullPreview: {
    width: 250,
    height: 250,
    borderRadius: 20,
    marginBottom: 25,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    padding: 15,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: 'bold'
  },
  confirmBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  confirmBtnText:{
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold'
  }
});