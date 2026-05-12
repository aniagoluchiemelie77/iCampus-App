import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';

type Props = StackScreenProps<RootStackParamList, 'SuspendedScreen'>;

export const SuspendedScreen = ({ route, navigation }: Props) => {
  const { reason } = route.params;
  const [checking, setChecking] = useState(false);
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@icampus.edu.ng?subject=iCash Account Suspension');
  };
  const checkAccountStatus = async () => {
    setChecking(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok && !data.user.isSuspended) {
        navigation.replace('Home', { activeTab: 'home' });
      }
    } catch (err) {
      console.log("Still suspended or network error");
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Icon name="account-cancel" size={100} color={PRIMARY_COLOR} />
      <Text style={styles.title}>Account Restricted</Text>
      <Text style={styles.reasonText}>{reason || "Security protocol triggered."}</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Your iCampus account has been restricted. This usually happens after multiple 
          failed iCash PIN attempts or suspicious activity. You cannot access 
          services until this is resolved.
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.primaryBtn} 
        onPress={checkAccountStatus}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Refresh Account Status</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.supportLink} onPress={handleContactSupport}>
        <Icon name="email-outline" size={20} color={PRIMARY_COLOR} />
        <Text style={styles.supportLinkText}>Contact iCampus Security</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 30, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: PRIMARY_COLOR, marginTop: 20 },
  reasonText: { fontSize: 16, color: PRIMARY_COLOR_TINT, fontWeight: '600', marginTop: 8 },
  infoBox: { backgroundColor: '#eee7e4', padding: 20, borderRadius: 16, marginVertical: 30, borderLeftWidth: 4, borderLeftColor: PRIMARY_COLOR },
  infoText: { fontSize: 14, color: PRIMARY_COLOR_TINT, textAlign: 'left', lineHeight: 22 },
  primaryBtn: { backgroundColor: PRIMARY_COLOR, width: '80%', padding: 18, borderRadius: 14, alignItems: 'center', elevation: 2 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  supportLink: { marginTop: 30, flexDirection: 'row', alignItems: 'center', gap: 8 },
  supportLinkText: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
});