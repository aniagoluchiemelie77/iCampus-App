

import React from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from './Classroomcomponent';

export const MyQRCodeSection = ({ itagusername }: { itagusername: string }) => {
  return (
    <View style={QRCodeStyles.qrSection}>
      <Text style={QRCodeStyles.sectionLabel}>Your Receiving iTag</Text>
      <View style={QRCodeStyles.qrWrapper}>
        <QRCode
          value={itagusername} 
          size={200}
          color={PRIMARY_COLOR}
          backgroundColor="white"
        />
      </View>
      <Text style={QRCodeStyles.iTagText}>@{itagusername}</Text>
    </View>
  );
};
const QRCodeStyles = StyleSheet.create({
    qrSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sectionLabel:{
    fontSize: 18,
    color: '#2222',
    fontWeight: 'bold',
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 10,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
  },
  iTagText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});