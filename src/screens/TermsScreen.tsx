import React from 'react';
import { StyleSheet, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { INBOUND_SUPPORT_URL } from '@env';

export const TermsScreen = () => {
    const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <PageHeader title="Our Terms of Service" />

      <ScrollView contentContainerStyle={[styles.contentContainer, {backgroundColor: colors.backgroundSecondary}]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, {color: colors.text}]}>Last Updated: July 2026</Text>

        <Text style={[styles.paragraph, {color: colors.text}]}>
          Welcome to iCampus. By accessing or using our mobile application, web platform, and related services, you agree to comply with and be bound by the following terms. Please read them carefully.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          By creating an iCampus account, logging into the platform, or using any feature provided, you signify that you have read, understood, and agreed to be bound by these Terms of Service and our Privacy Policy.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>2. User Accounts & Responsibilities</Text>
        <Text style={[styles.bulletPoint, {color: colors.textDarker}]}>• <Text style={styles.bold}>Accuracy of Information:</Text> You confirm that all registration, profile, and academic details provided by you are accurate, current, and authentic.</Text>
        <Text style={[styles.bulletPoint, {color: colors.textDarker}]}>• <Text style={styles.bold}>Account Security:</Text> You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</Text>
        <Text style={[styles.bulletPoint, {color: colors.textDarker}]}>• <Text style={styles.bold}>Prohibited Conduct:</Text> You agree not to misuse the platform, engage in academic fraud, bypass automated attendance/proctoring controls, compromise system security, or execute fraudulent activities.</Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>3. iCash Digital Token System</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          iCash tokens utilized within the platform serve strictly as internal utility points or campus ecosystem metrics. They do not constitute regulated fiat currency, legal tender, or guaranteed financial instruments. iCampus assumes no liability for peer-to-peer marketplace losses, user errors during token transfers, or third-party disputes arising from marketplace transactions.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>4. Intellectual Property & Content</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Users retain ownership of the academic resources, notes, or posts they upload to iCampus. By uploading content, you grant iCampus a non-exclusive license to host, display, and distribute within the platform ecosystem for educational and community purposes.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>5. Suspension and Termination</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          We reserve the right to suspend or terminate your account immediately, without prior notice, if you violate these terms, compromise platform integrity, or engage in behavior deemed harmful to the iCampus community.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.textDarker}]}>6. Contact Information</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          If you have any questions regarding these Terms, please click the button below to reach out to our support channels or system administrators via email.
        </Text>
        <TouchableOpacity 
          style={[styles.contactButton, {backgroundColor: colors.btnColor}]}
          onPress={() => Linking.openURL(`mailto:${INBOUND_SUPPORT_URL}?subject=Support%20Inquiry%20-%20Terms`)}
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
    marginVertical: 20,
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