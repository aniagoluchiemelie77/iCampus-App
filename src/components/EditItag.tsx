import React, { useState, useEffect, useMemo } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import {
  Modal,
  View,
  TouchableOpacity,
  Linking,
  Alert,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT} from 'assets/styles/colors';
import { ITagCard } from '../components/iTag';
import { ITag } from '../types/firebase';
import { debounce } from 'lodash';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';

const PRESET_COLORS = [
  '#672a0e',
  '#14335f',
  '#80800d',
  '#8a0c0c',
  '#7b0859',
  '#0b8049',
];
interface EditiTagModalProps {
  visible: boolean;
  onClose: () => void;
  iTagData: ITag;
  onSave: (updatedData: ITag) => void;
}
export const EditiTagModal = ({
  visible,
  onClose,
  iTagData,
  onSave,
}: EditiTagModalProps) => {
  const isPremium = iTagData.tier === 'premium';
  const isPro = iTagData.tier === 'pro';

  const [username, setUsername] = useState(iTagData.username);
  const [bgColor, setBgColor] = useState(
    iTagData.designOptions.backgroundColor,
  );
  const [bgImage, setBgImage] = useState(
    iTagData.designOptions.backgroundImage,
  );

  // Username validation states
  const [isChecking, setIsChecking] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Image Picker Logic
  const pickImage = () => {
    ImagePicker.openPicker({
      width: 1600,
      height: 900,
      cropping: true,
      compressImageQuality: 0.8,
      includeBase64: false,
    })
      .then(image => {
        setBgImage(image.path);
      })
      .catch(e => {
        if (e.code === 'E_PERMISSION_MISSING') {
          Alert.alert(
            'Permission Required',
            'Please allow iCampus access to your photos in settings to change your iTag background.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        }
      });
  };

  const handleSave = async () => {
    if (usernameError) {
      Toast.show({ type: 'error', text1: 'Wait!', text2: usernameError });
      return;
    }
    setLoading(true);
    try {
      let finalImageUrl = bgImage;
      if (bgImage && bgImage.startsWith('file://')) {
        finalImageUrl = await uploadToCloudinary(bgImage);
      }
      const updatePayload = {
        username: username.toLowerCase().trim(),
        designOptions: {
          ...iTagData.designOptions,
          backgroundColor: bgColor,
          backgroundImage: finalImageUrl,
        },
      };

      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.put(
        `${baseUrl}users/update-itag`,
        {
          userId: iTagData.userId,
          updates: updatePayload,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.data.success) {
        onSave({
          ...iTagData,
          ...updatePayload,
        });
        Toast.show({
          type: 'success',
          text1: 'iTag Updated',
          text2: 'Your custom design is now live!',
        });
        onClose();
      }
    } catch (error) {
      console.error('Save iTag Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Debounced Username Availability Check
  const checkUsername = useMemo(
    () =>
      debounce(async (val: string) => {
        if (val === iTagData.username) {
          setUsernameError('');
          return;
        }
        if (val.length < 3) {
          setUsernameError('Too short');
          return;
        }
        setIsChecking(true);
        try {
          const res = await axios.get(`${baseUrl}users/check-itag/${val}`);
          if (res.data.available) {
            setUsernameError('');
          } else {
            setUsernameError('Username already taken');
          }
        } catch (err) {
          console.error('Check Username Error:', err);
          setUsernameError('Error checking availability');
        } finally {
          setIsChecking(false);
        }
      }, 500),
    [iTagData.username],
  );
  useEffect(() => {
    return () => {
      checkUsername.cancel();
    };
  }, [checkUsername]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Customize iTag</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Username Input with Validation Feedback */}
            {(isPro || isPremium) && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>iTag Username</Text>
                </View>
                <View style={styles.inputContainer}>
                  {!isChecking && !usernameError && username.length >= 3 && (
                    <View style={styles.iconWrapper}>
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                  )}
                  <TextInput
                    style={[
                      styles.input,
                      usernameError ? styles.inputError : null,
                    ]}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
                {usernameError && (
                  <Text style={styles.errorText}>{usernameError}</Text>
                )}
              </View>
            )}
            {isPremium && (
              <>
                <Text style={styles.label}>Background Color</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.colorScroll}
                >
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        bgColor === color && styles.selectedColor,
                      ]}
                      onPress={() => setBgColor(color)}
                    />
                  ))}
                </ScrollView>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Background Image</Text>
                  <TouchableOpacity
                    style={styles.imagePickerBtn}
                    onPress={pickImage}
                  >
                    <MaterialIcons
                      name="photo-library"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.imagePickerBtnText}>
                      {bgImage ? 'Change Image' : 'Select from Gallery'}
                    </Text>
                  </TouchableOpacity>
                  {bgImage && (
                    <TouchableOpacity onPress={() => setBgImage(undefined)}>
                      <Text style={styles.removePhotoText}>Remove Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
            {isPremium && (
              <View style={styles.previewContainer}>
                <ITagCard
                  isOwner={true}
                  isPremium={true}
                  iTagData={{
                    ...iTagData,
                    username,
                    designOptions: {
                      ...iTagData.designOptions,
                      backgroundColor: bgColor,
                      backgroundImage: bgImage,
                    },
                  }}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!!usernameError || loading) && { opacity: 0.5 },
              ]}
              onPress={handleSave}
              disabled={!!usernameError || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    minHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  previewContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2222',
    marginBottom: 9,
  },
  inputContainer: {
    borderColor: PRIMARY_COLOR_TINT,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 12,
  },
  iconWrapper: {
    marginRight: 8,
  },
  input: {
    backgroundColor: '#fadccc',
    padding: 12,
    fontSize: 15,
    color: '#2222',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingBottom: 20,
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR,
  },
  cancelBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  colorScroll: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingVertical: 5,
  },
  colorCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: PRIMARY_COLOR,
    transform: [{ scale: 1.1 }],
  },
  imagePickerBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  imagePickerBtnText: {
    color: '#fff',
    marginTop: 5,
    fontWeight: '600',
  },
  labelRow: {
    alignItems: 'center',
    marginBottom: 7,
  },
  errorText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    marginTop: 5,
    fontWeight: '600',
  },
  inputError: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 1,
  },
  removePhotoText: {
    color: PRIMARY_COLOR,
    textAlign: 'right',
    marginTop: 10,
    fontSize: 13,
  },
});