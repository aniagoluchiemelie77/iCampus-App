import React from 'react';
import {
  ScrollView,
  TextInput,
} from 'react-native';
//import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../components/hooks';
//import { baseUrl } from '../components/HomeScreenComponents';


export const EditProfileScreen = () => {
  const user = useAppSelector(state => state.user);
  // Logic helpers
  const isOtherUser = user.usertype === 'otherUser';
  const isVerified = user.isVerified;
  const canEditNames = user.usertype === 'otherUser' || !user.isVerified;
  const canEditAcademicInfo = !user.isVerified; // School, Dept, StaffId
  const canEditUsername = true; // Editable for everyone

  return (
    <ScrollView style={styles.container}>
      {/* Public Info */}
      <InputGroup label="Username">
        <TextInput 
          defaultValue={user.username} 
          style={styles.input} 
        />
      </InputGroup>

      {/* Identity - Conditioned on usertype and verification */}
      <InputGroup label="First Name" isLocked={!isOtherUser && isVerified}>
        <TextInput 
          defaultValue={user.firstname} 
          editable={isOtherUser || !isVerified}
          style={[styles.input, (!isOtherUser && isVerified) && styles.disabled]} 
        />
      </InputGroup>

      {/* Institutional - Locked once verified */}
      <InputGroup label="Department" isLocked={isVerified}>
        <TextInput 
          defaultValue={user.department} 
          editable={!isVerified}
          style={[styles.input, isVerified && styles.disabled]} 
        />
      </InputGroup>
      
      {/* ... other fields ... */}
    </ScrollView>
  );
};