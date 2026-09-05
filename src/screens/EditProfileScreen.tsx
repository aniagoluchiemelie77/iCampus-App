import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAppSelector } from '../hooks/hooks.ts';
import { InputGroup } from '../components/InputGroup';
import { PageHeader } from '../components/PageHeader.tsx';
import countries from 'i18n-iso-countries';
import { patchUserProfile } from '../api/localPatchApis';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/firebase';
import { CustomButton } from '../assets/components/AppUIComponents';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

export const EditProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const isMounted = useRef(true);
  const user = useAppSelector((state: { user: User }) => state.user);

  const isStudent = user.usertype === 'student';
  const isEnterprise = user.usertype === 'enterprise';
  const isTeacher = user.usertype === 'lecturer';
  const isVerified = user.isVerified;
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    headline: user.headline || '',
    organizationName: user.organizationName || '',
    website: user.website || '',
    username: user.username || '',
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    department: user.department || '',
    email: user.email || '',
  });
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  const isChanged = useMemo(() => {
    return (
      formData.headline !== (user.headline || '') ||
      formData.organizationName !== (user.organizationName || '') ||
      formData.website !== (user.website || '') ||
      formData.username !== (user.username || '') ||
      formData.firstname !== (user.firstname || '') ||
      formData.lastname !== (user.lastname || '') ||
      formData.department !== (user.department || '') ||
      formData.email !== (user.email || '')
    );
  }, [formData, user]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const changedData: Partial<typeof formData> = {};
      const formKeys = Object.keys(formData) as Array<keyof typeof formData>;

      formKeys.forEach(key => {
        const originalValue = (user[key] || '') as string;
        if (formData[key] !== originalValue) {
          changedData[key] = formData[key];
        }
      });
      if (Object.keys(changedData).length === 0) {
        setIsSaving(false);
        return;
      }
      const result = await patchUserProfile(changedData);
      if (!isMounted.current) return;
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
      console.error('Error saving profile changes:', error);
      if (isMounted.current) {
        Toast.show({
          type: 'error',
          text1: 'Update Error',
          text2: 'Failed to update profile',
        });
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Edit Profile"
        rightElement={
          isChanged && (
            <CustomButton
              title={isSaving ? 'Saving...' : 'Save'}
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, isSaving && styles.disabledBtn]}
            />
          )
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
      >
        <InputGroup
          label="Headline"
          value={formData.headline}
          type="text"
          placeholder="Enter your headline"
          placeholderTextColor={colors.inputTextHolder}
          onChangeText={text => handleInputChange('headline', text)}
        />

        {isEnterprise ? (
          <>
            <InputGroup
              label="Company Name"
              value={formData.organizationName}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('organizationName', text)}
              type="text"
              placeholder="Your company name"
              placeholderTextColor={colors.inputTextHolder}
            />
            <InputGroup
              label="Website"
              value={formData.website}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('website', text)}
              type="text"
              placeholder="https://..."
              placeholderTextColor={colors.inputTextHolder}
            />
          </>
        ) : (
          <>
            <InputGroup
              label="Username"
              value={formData.username}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('username', text)}
              type="text"
              placeholder="Enter your username"
              placeholderTextColor={colors.inputTextHolder}
            />
            <InputGroup
              label="First Name"
              value={formData.firstname}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('firstname', text)}
              type="text"
              placeholder="Enter your first name"
              placeholderTextColor={colors.inputTextHolder}
            />
            <InputGroup
              label="Last Name"
              isLocked={isVerified}
              value={formData.lastname}
              type="text"
              placeholder="Enter your last name"
              placeholderTextColor={colors.inputTextHolder}
              onChangeText={text => handleInputChange('lastname', text)}
            />
          </>
        )}

        {(isStudent || isTeacher) && (
          <InputGroup
            label="Department"
            isLocked={isVerified}
            value={formData.department}
            type="text"
            placeholder="Enter your department"
            placeholderTextColor={colors.inputTextHolder}
            onChangeText={text => handleInputChange('department', text)}
          />
        )}

        <InputGroup
          label="Email"
          value={formData.email}
          isLocked={isVerified}
          type="text"
          keyboardType="email-address"
          placeholder="Enter your email..."
          placeholderTextColor={colors.inputTextHolder}
          onChangeText={text => handleInputChange('email', text)}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  saveBtn: {
    paddingHorizontal: 8,
    height: 40,
    width: 'auto',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
