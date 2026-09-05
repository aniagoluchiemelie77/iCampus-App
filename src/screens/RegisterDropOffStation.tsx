import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Alert, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import {PageHeader} from '../components/PageHeader';
import { InputGroup } from '../components/InputGroup'; 
import { useLocationServices } from '../hooks/useLocationService.ts'; 
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import { CustomButton } from '../assets/components/AppUIComponents';
import { AttachmentModal } from '../components/ChatInput.tsx';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper.ts';
import { requestDropStationApi } from '../api/localPostApis.ts';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

export const RegisterStationScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const { userCoords } = useLocationServices();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    images: [] as string[],
  });

  const isLocationReady = !!userCoords;
  const { pickImage, pickImageFromCamera } = useMediaPicker();

  const handleSelectOption = async (option: 'camera' | 'library') => {
    setModalVisible(false);
    const fileData =
      option === 'camera' ? await pickImageFromCamera() : await pickImage();

    if (fileData) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, fileData.uri],
      }));
    }
  };

  const submitRegistration = async () => {
    if (
      !formData.name ||
      !formData.address ||
      formData.images.length === 0 ||
      !userCoords
    ) {
      return Toast.show({
        type: 'error',
        text1: 'Incomplete Info',
        text2:
          'Please fill all fields, add at least one image, and ensure location is active.',
      });
    }

    try {
      setSubmitting(true);
      const uploadedUrls: string[] = [];
      for (const uri of formData.images) {
        const url = await uploadToFirebase(uri);
        uploadedUrls.push(url);
      }
      const payload = {
        name: formData.name,
        address: formData.address,
        images: uploadedUrls,
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      };
      const result = await requestDropStationApi(payload);

      if (result.success) {
        Toast.show({
          type: 'success',
          text2:
            'Drop-Off Station registeration request submitted successfully.',
        });
        setSubmitting(false);
        navigation.goBack();
      } else {
        setSubmitting(false);
        Toast.show({
          type: 'error',
          text1: 'Request Error',
          text2: result.error,
        });
      }
    } catch (error: any) {
      setSubmitting(false);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2:
          error.message || 'An error occurred during submission, please retry.',
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Request Drop-Off Station" showBackButton={true} />

      <ScrollView contentContainerStyle={styles.content}>
        <MaterialIcons
          name="storefront"
          size={60}
          color={colors.primary}
          style={styles.mainIcon}
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          Join as a Drop-Off Hub
        </Text>
        <Text style={[styles.subtext, { color: colors.text }]}>
          Provide your business details below. Your location will be
          automatically captured to help iCampus users find your station. Please
          stand at your business location (kiosk, shop, or office) before
          submitting. Do not register from residential addresses.
        </Text>
        <InputGroup
          label="Station Name"
          placeholder="e.g. Victor's Tech Hub"
          onChangeText={val => setFormData({ ...formData, name: val })}
        />
        <InputGroup
          label="Full Address"
          placeholder="Enter detailed street address"
          onChangeText={val => setFormData({ ...formData, address: val })}
        />
        <Text style={[styles.text, { color: colors.text, marginBottom: 20 }]}>
          Station Photos (Required)
        </Text>
        <View style={styles.imageRow}>
          {formData.images.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.thumb} />
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons
              name="add-a-photo"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
        <CustomButton
          title={submitting ? 'Submitting...' : 'Submit Request'}
          style={[
            styles.submitButton,
            {
              backgroundColor: isLocationReady
                ? colors.btnColor
                : colors.primaryTint,
            },
          ]}
          disabled={!isLocationReady}
          onPress={submitRegistration}
        />
      </ScrollView>
      <AttachmentModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPickImage={() => handleSelectOption('library')}
        onTakePhoto={() => handleSelectOption('camera')}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 15 },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  subtext: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  text: { fontSize: 14 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  submitButton: {
    paddingHorizontal: 15,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mainIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
  },
  warningText: { flex: 1, marginLeft: 10, fontSize: 13, lineHeight: 18 },
  imageRow: { flexDirection: 'row', marginBottom: 20 },
  addBtn: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 7,
  },
});