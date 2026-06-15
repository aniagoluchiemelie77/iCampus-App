import React, { useCallback } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { FAQItem } from '../components/MyQRCodeSection';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface FAQItemType {
  id: string | number;
  question: string;
  answer: string;
}
const FAQ_DATA: FAQItemType[] = [
  {
    id: 'iscore-1',
    question: 'What is the Unified iScore and how is it calculated?',
    answer:
      'The iScore is a comprehensive metric (capped at 100) that measures your platform engagement, performance, and reputation. It dynamically adjusts its calculation rules depending on whether you are a Student, Lecturer, or standard user. \n Reputation accounts for up to 20 points of your score. It aggregates ratings from your profile reviews.\n•  For Lecturers, points are driven by review averages and active time. \n• For students, points are calculated from your average Test Scores and lecture attendance rates.\n• For normal users, iScore relies entirely on community metrics, combining library usage and platform activity. \n You can also earn points by launching library sessions, downloading books, and interacting with the in-app AI Assistant. \n Lastly, to prevent jarring monthly jumps, iCampus uses a smoothing formula. It carries forward 30% of your previous month’s iScore and blends it with 70% of your current month’s calculated iScore.',
  },
  {
    id: 'icash-1',
    question: 'What is iCash?',
    answer:
      'iCash is the unified digital medium of exchange used across the iCampus platform and future subsidiaries of Aniagolu Global Tech Services Ltd. It ensures a stable internal economy by keeping transactions independent of volatile local currencies.',
  },
  {
    id: 'acad-1',
    question: 'What are Lecture Exceptions and how do they work?',
    answer:
      'Lecture Exceptions are formal absence permits that students can request by providing a valid reason to be excused from a specific lecture on a specified date. Once submitted, the request goes directly to the lecturer for review and pending acceptance.',
  },
  {
    id: 'test-1',
    question: 'How do online Tests work?',
    answer:
      'Tests are created by lecturers with strict start and end times. To begin, you must take a selfie which the AI matches against your official institutional record. During the test, the front camera constantly monitors for outside cheating motions. Glancing away from the screen is capped at 5 seconds; exceeding this triggers an on-screen warning and increments your warning count. Your final score is calculated and displayed immediately after the test concludes.',
  },
  {
    id: 'iap-1',
    question: 'How do physical product purchases and home delivery work?',
    answer:
      'When purchasing a physical item for home delivery, you provide your delivery address and phone number during checkout. Once your package arrives, the seller will scan a unique QR code generated on your phone. This scan verifies that you received the item, minimizes fraud, and releases the payment to the seller.',
  },
  {
    id: 'icash-2',
    question: 'What is the exchange rate for iCash?',
    answer:
      'iCash operates on a fixed exchange rate where 1 iCash equals exactly 0.74 USD (or its equivalent value in your local currency). Local currency inputs are automatically converted at the prevailing market rate into USD before iCash is issued.',
  },
  {
    id: 'acad-2',
    question: 'How many free Lecture Exceptions do I get each month?',
    answer:
      'Your monthly allotment depends on your subscription tier:\n• Free Tier: 1 free exception per month.\n• Pro Tier: 2 free exceptions per month.\n• Premium Tier: 3 free exceptions per month.',
  },
  {
    id: 'test-2',
    question: 'What actions will trigger an automatic test submission?',
    answer:
      'An automatic test submission and completion will be triggered instantly if you minimize the application or exit the test screen. Additionally, there is a strict cap on cheating warnings; if your warning count reaches or exceeds this threshold, the system will lock you out and automatically submit your test.',
  },
  {
    id: 'iap-2',
    question: 'How does the drop-off station delivery option work?',
    answer:
      'If you choose a drop-off location, you will select from a list of nearby stations and agents during checkout. The seller is notified to drop the product off there. Once it arrives, you head to the station, and the agent scans your phone’s QR code to confirm pickup. This instantly dispatches payment to both the seller and the agent (their cut).',
  },
  {
    id: 'icash-3',
    question: 'How secure are my iCash transactions?',
    answer:
      'Security is handled at an architectural level using a Zero-Trust protocol. All debits require Multi-Factor Authorization (MFA) via Biometric Fingerprint/Face Detection or a high-entropy 6-digit Transaction PIN. Data is also fully protected using end-to-end AES-256 encryption.',
  },
  {
    id: 'acad-3',
    question: 'What happens if I exhaust my free monthly exceptions?',
    answer:
      'If you have exhausted your free monthly allowance, you can purchase additional exceptions at a cost of 0.5 iCash each. Please note that if a lecturer disapproves or cancels a purchased exception, no refunds are issued.',
  },
  {
    id: 'iap-3',
    question: 'What happens when I buy a digital file or a course?',
    answer:
      'For digital files, the download URL is sent to you immediately after payment, and funds are instantly dispatched to the seller. For courses, completing the purchase grants you immediate access to your courses within your downloads section.',
  },
  {
    id: 'icash-4',
    question: 'How does the platform prevent fraud and double-spending?',
    answer:
      'iCampus runs a centralized ledger utilizing atomic transactions, meaning a wallet cannot start a second transaction until the first is fully processed or rolled back. Additionally, "Velocity Triggers" automatically freeze and flag your account for review if an unusual number of high-value transfers occur within 60 seconds.',
  },
  {
    id: 'acad-4',
    question:
      'What are the different lecture formats supported for attendance?',
    answer:
      'iCampus supports three distinct types of lecture formats:\n1. Online sessions\n2. Pre-recorded video sessions\n3. Physical classroom sessions',
  },
  {
    id: 'iap-4',
    question:
      'Why can’t I see my sales earnings in my primary wallet immediately?',
    answer:
      'All earnings from sales or agent commissions are securely held in your Sales Hub payout balance. To access and withdraw these funds, you must meet two security criteria: your identity must be verified, and Two-Factor Authentication (2FA) must be enabled.',
  },
  {
    id: 'icash-5',
    question: 'Are there any fees associated with using iCash?',
    answer:
      'Yes, the ecosystem applies standard transaction fees: an App Tax of 15% on peer-to-peer services/in-app purchases, and a 1% processing withdrawal fee when you convert your iCash back into local fiat currency.',
  },
  {
    id: 'acad-5',
    question:
      'How does physical class attendance tracking work via BLE (Bluetooth Low Energy)?',
    answer:
      'While physical attendance can be managed manually outside the app, the system features automated BLE tracking. The lecturer acts as the Bluetooth host. Students in close proximity simply turn on their Bluetooth and snap a quick verification selfie. The application then automatically compiles and processes the secure attendance list for the lecturer.',
  },
  {
    id: 'iap-5',
    question: 'Who needs to undergo identity verification for payouts?',
    answer:
      'Students and lecturers are automatically verified by the platform system. However, if your account is registered as an "Enterprise" or "Other" user tier, you must complete a persona verification check before you can access your Sales Hub payouts.',
  },
  {
    id: 'icash-6',
    question: 'Can I track my transaction history?',
    answer:
      'Absolutely. Every single movement of iCash generates a unique, unchangeable Transaction Hash on an immutable ledger. You will also receive real-time push notifications the exact millisecond any transaction is initiated.',
  },
  {
    id: 'iap-6',
    question: 'What security is required to withdraw or transfer iCash?',
    answer:
      'To protect your earnings and funds from unauthorized access, any iCash withdrawal or peer-to-peer (P2P) transfer strictly requires you to input your secure 6-digit Transaction PIN.',
  },
  {
    id: 'iap-7',
    question: 'What happens if an order is cancelled?',
    answer:
      'If an order gets cancelled, the cancellation reason will be immediately updated and displayed to the sellers and the buyer will be refunded.',
  },
];
export const FAQScreen = () => {
  const { colors } = useTheme();
  const renderFAQItem = useCallback(({ item }: { item: FAQItemType }) => {
    return <FAQItem question={item.question} answer={item.answer} />;
  }, []);
  const keyExtractor = useCallback((item: FAQItemType) => String(item.id), []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="FAQs"
        showBackButton={true}
      />

      <FlatList
        data={FAQ_DATA}
        keyExtractor={keyExtractor}
        renderItem={renderFAQItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  listContent: {
    padding: 16,
  },
});
