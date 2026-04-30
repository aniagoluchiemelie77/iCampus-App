import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../components/hooks';
import { InputGroup } from '../components/InputGroup';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { PageHeader } from '../components/PageHeader.tsx';
import { getCountryCallingCode, getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';
import countries from 'i18n-iso-countries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patchUserProfile } from '../api/localPatchApis';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

export const EditProfileScreen = () => {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const isStudent = user.usertype === 'student';
  const isEnterprise = user.usertype === 'enterprise';
  const isTeacher = user.usertype === 'lecturer';
  const isVerified = user.isVerified;
  const countryIso = countries.getAlpha2Code(user.country || '', 'en') ?? 'US';
  const [formData, setFormData] = useState({
    headline: user.headline || '',
    organizationName: user.organizationName || '',
    website: user.website || '',
    username: user.username || '',
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    department: user.department || '',
    phoneNumber: user.phoneNumber || '',
    email: user.email || '',
  });
  const isDirty =
    formData.headline !== (user.headline || '') ||
    formData.organizationName !== (user.organizationName || '') ||
    formData.website !== (user.website || '') ||
    formData.username !== (user.username || '') ||
    formData.firstname !== (user.firstname || '') ||
    formData.lastname !== (user.lastname || '') ||
    formData.department !== (user.department || '') ||
    formData.phoneNumber !== (user.phoneNumber || '') ||
    formData.email !== (user.email || '');
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSave = async () => {
    try {
      const changedData: Partial<typeof formData> = {};
      (Object.keys(formData) as Array<keyof typeof formData>).forEach(key => {
        const originalValue = (user[key as keyof typeof user] || '') as string;
        if (formData[key] !== originalValue) {
          changedData[key] = formData[key];
        }
      });
      const token = await AsyncStorage.getItem('accessToken');
      const result = await patchUserProfile(changedData, token!);
      if (result) {
        dispatch(setUser(result.data));
        Toast.show({
          type: 'success',
          text1: 'Profile Update',
          text2: 'Profile updated successfully',
        });
        navigation.navigate('Profile', { identity: user.uid });
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: 'Failed to update profile',
      });
    }
  };

  const getCountryMetadata = (iso: string) => {
    try {
      const countryCode = `+${getCountryCallingCode(iso as any)}`;
      const example = getExampleNumber(iso as any, examples);
      return {
        countryCode,
        expectedLength: example ? example.nationalNumber.length : 10,
      };
    } catch (error) {
      return { countryCode: '+1', expectedLength: 10 };
    }
  };
  const { countryCode } = getCountryMetadata(countryIso);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title="Edit Profile"
        rightElement={
          isDirty && (
            <TouchableOpacity onPress={handleSave}>
              <Text>Save</Text>
            </TouchableOpacity>
          )
        }
      />
      <InputGroup
        label="Headline"
        defaultValue={formData.headline}
        type="text"
        placeholder="Enter your headline"
        placeholderTextColor={PRIMARY_COLOR_TINT}
        onChangeText={text => handleInputChange('headline', text)}
      />

      {isEnterprise ? (
        <>
          <InputGroup
            label="Company Name"
            defaultValue={formData.organizationName}
            isLocked={isVerified}
            onChangeText={text => handleInputChange('organizationName', text)}
            type="text"
            placeholder="Your company name"
            placeholderTextColor={PRIMARY_COLOR_TINT}
          />
          <InputGroup
            label="Website"
            defaultValue={formData.website}
            isLocked={isVerified}
            onChangeText={text => handleInputChange('website', text)}
            type="text"
            placeholder="https://..."
            placeholderTextColor={PRIMARY_COLOR_TINT}
          />
        </>
      ) : (
        <>
          <InputGroup
            label="Username"
            defaultValue={formData.username}
            isLocked={isVerified}
            onChangeText={text => handleInputChange('username', text)}
            type="text"
            placeholder="Enter your username"
            placeholderTextColor={PRIMARY_COLOR_TINT}
          />
          <InputGroup
            label="First Name"
            defaultValue={formData.firstname}
            isLocked={isVerified}
            onChangeText={text => handleInputChange('firstname', text)}
            type="text"
            placeholder="Enter your first name"
            placeholderTextColor={PRIMARY_COLOR_TINT}
          />
          <InputGroup
            label="Last Name"
            isLocked={isVerified}
            defaultValue={formData.lastname}
            type="text"
            placeholder="Enter your last name"
            placeholderTextColor={PRIMARY_COLOR_TINT}
            onChangeText={text => handleInputChange('lastname', text)}
          />
        </>
      )}
      {(isStudent || isTeacher) && (
        <InputGroup
          label="Department"
          isLocked={isVerified}
          defaultValue={formData.department}
          type="text"
          placeholder="Enter your department"
          placeholderTextColor={PRIMARY_COLOR_TINT}
          onChangeText={text => handleInputChange('department', text)}
        />
      )}

      <InputGroup
        label="Phone number"
        defaultValue={formData.phoneNumber}
        type="phone"
        countryCode={countryCode}
        onChangeText={text => handleInputChange('phoneNumber', text)}
      />

      <InputGroup
        label="Email"
        defaultValue={formData.email}
        isLocked={isVerified}
        type="text"
        keyboardType="email-address"
        placeholder="Enter your email..."
        placeholderTextColor={PRIMARY_COLOR_TINT}
        onChangeText={text => handleInputChange('email', text)}
      />

      <TouchableOpacity style={styles.altEmailBtn}>
        <Text style={styles.altEmailText}>+ Add alternate email</Text>
      </TouchableOpacity>
      <Toast config={toastConfig} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    paddingVertical: 20,
  },
  input: {
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  disabledText: {
    color: '#888',
  },
  altEmailBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  altEmailText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});
