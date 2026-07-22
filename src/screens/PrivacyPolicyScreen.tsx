import React from 'react';
import { StyleSheet, Text, ScrollView, TouchableOpacity, Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { INBOUND_SUPPORT_URL } from '@env';

export const PrivacyScreen = () => {
    const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <PageHeader title="Our Privacy Policy" />

      <ScrollView contentContainerStyle={[styles.contentContainer, {backgroundColor: colors.backgroundSecondary}]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, {color: colors.text}]}>Last Updated: July 2026</Text>

        <Text style={[styles.paragraph, {color: colors.text}]}>
          iCampus ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile and web application.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>1. Information We Collect</Text>
        <Text style={[styles.bulletPoint, {color: colors.textDarker}]}>• <Text style={styles.bold}>Personal Data:</Text> Information you voluntarily provide when creating an account, such as your full name, email address, phone number, profile image, and user role tier.</Text>
        <Text style={[styles.bulletPoint, {color: colors.textDarker}]}>• <Text style={styles.bold}>Academic & Activity Data:</Text> Course information, attendance tracking logs, uploaded academic resources, and iCash wallet transaction histories.</Text>
        <Text style={[styles.bulletPoint, {color: colors.textDarker}]}>• <Text style={styles.bold}>Technical Data:</Text> Automatically collected device information, IP addresses, browser types, and access timestamps.</Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>2. How We Use Your Information</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          We use the collected information for purposes that include creating and managing your user account, operating core platform features like automated attendance syncing and the iCash marketplace, sending critical administrative notifications, and maintaining platform safety.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>3. Third-Party Service Providers</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          We utilize trusted third-party cloud infrastructure to operate iCampus securely, including Firebase (Google) for authentication and databases, and Render for backend services, Flutterwave for payments, Persona for identity verification, Postmark for email services. These services adhere to strict data security standards and process data solely on our behalf.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>4. Data Security</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          We implement robust administrative, technical, and physical security measures (including Firebase security rules and encrypted transit protocols) to protect your personal information. However, no method of transmission over the internet is 100% secure.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>5. Your Rights</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          You retain the right to access, update, or correct your personal profile information, or request the deactivation/deletion of your account and associated records by contacting platform administration.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>6. Policy Updates</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          We may update this Privacy Policy from time to time. Continued use of iCampus after modifications constitutes your acceptance of the updated terms.
        </Text>
        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>7. Contact Information</Text>
                <Text style={[styles.paragraph, {color: colors.text}]}>
                          If you have any questions regarding these Terms, please click the button below to reach out to our support channels or system administrators via email.
                        </Text>
                        <TouchableOpacity 
                                  style={[styles.contactButton, {backgroundColor: colors.btnColor}]}
                                  onPress={() => Linking.openURL(`mailto:${INBOUND_SUPPORT_URL}?subject=Support%20Inquiry%20-%20Privacy%20Policy`)}
                                >
                                  <Text style={[styles.contactButtonText, {color: colors.btnTextColor}]}>Contact Support</Text>
                                  <MaterialIcons
                                              name="email-outlined"
                                              size={17}
                                              color={colors.btnTextColor}
                                          />
                                </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    marginBottom: 15,
    alignSelf: 'flex-end'
  },
   sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 9,
    paddingLeft: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  contactButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    alignContent: 'center',
    flexDirection: 'row'
  },
  contactButtonText:{
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4
  }
});