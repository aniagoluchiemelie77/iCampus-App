import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

/**
 * Shown on web in place of the Bluetooth attendance controls. Browsers can't
 * broadcast a Bluetooth signal at all, and the BLE, biometric and camera
 * modules attendance relies on are native-only (stubbed in the web build).
 */
export const AttendanceWebNotice = ({ role }: { role: 'student' | 'lecturer' }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary + '40' }]}>
      <View style={[styles.icon, { backgroundColor: colors.primary + '1A' }]}>
        <MaterialIcons name="smartphone" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.textDarker }]}>
        {role === 'lecturer' ? 'Take attendance from your phone' : 'Mark attendance from your phone'}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>
        {role === 'lecturer'
          ? 'Attendance works by your phone broadcasting a short-range Bluetooth signal in the room. Web browsers can’t broadcast Bluetooth, so open this lecture in the iCampus mobile app to start the session.'
          : 'Attendance checks that you’re in the room using Bluetooth, then confirms it’s you with your fingerprint or a selfie. Your browser can’t do these, so open this lecture in the iCampus mobile app to mark attendance.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center', gap: 10 },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center', opacity: 0.85 },
});
