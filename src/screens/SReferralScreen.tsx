import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { captureRef } from "react-native-view-shot";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../components/hooks';
import Clipboard from '@react-native-clipboard/clipboard';
import { PageHeader } from '../components/PageHeader.tsx';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';

export const ReferralScreen = () => {
    const cardRef = useRef<View>(null);
    const {referralCode} = useAppSelector(state => state.user);
    const handleShareImage = async () => {
        try {
            const uri = await captureRef(cardRef, {
                format: "png",
                quality: 1,
            });
            await Share.share({ url: uri, message: `Join me on iCampus! Code: ${referralCode}` });
        } catch (err: any) {
            console.error("Failed to share referral card:", err);
            Toast.show({
                type: 'error',
                text1: 'Share Error',
                text2: err || 'Failed to share referral card',
            });
        }
    };
    const handleCopyCode = () => {
        Clipboard.setString(referralCode!);
        Toast.show({
            type: 'success',
            text2: 'Referral code copied to clipboard!',
        });
    };

  return (
    <View style={styles.container}>
        <PageHeader
            title="Referrals"    
        />
        <View ref={cardRef} collapsable={false} style={styles.card}>
            <Text style={styles.cardBrand}>iCampus</Text>
            <View style={styles.cardContent}>
                <QRCode
                    value={referralCode}
                    size={120}
                    color={PRIMARY_COLOR}
                    backgroundColor="white"
                    quietZone={10} 
                />
                <Text style={styles.codeLabel}>YOUR UNIQUE CODE</Text>
                <Text style={styles.codeText}>{referralCode}</Text>
            </View>
        </View>
        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareImage}>
                <MaterialIcons name="share" size={24} color={PRIMARY_COLOR} />
                <Text style={styles.buttonLabel}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleCopyCode}>
                <MaterialIcons name="content-copy" size={24} color={PRIMARY_COLOR} />
                <Text style={styles.buttonLabel}>Copy Referral Code</Text>
            </TouchableOpacity>
        </View>
        <Toast config={toastConfig} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    aspectRatio: 0.75,
    backgroundColor: "#fadccc",
    borderRadius: 24,
    padding: 25,
    elevation: 10, 
    shadowColor: PRIMARY_COLOR_TINT, 
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    marginVertical: 15
  },
  cardBrand: { color: PRIMARY_COLOR, fontWeight: '800', fontSize: 17, textAlign: 'center' },
  cardContent: {
    alignItems: 'center',
    width: '100%',
    marginTop: 10
  },
  codeLabel: { color: PRIMARY_COLOR, fontSize: 12, marginVertical: 10 },
  codeText: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fadccc',
    flexDirection: 'row',
    alignContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6200EE',
  },
  buttonLabel: { color: PRIMARY_COLOR, marginLeft: 6, fontSize: 14 }
});