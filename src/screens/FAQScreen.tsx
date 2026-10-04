import React, { useCallback } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { FAQItem } from '../components/MyQRCodeSection';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
  EXCEPTION_ACCOUNT_LIMITS,
  EXCEPTION_COST_IN_ICASH,
} from '../constants/inAppConstants';

interface FAQItemType {
  id: string | number;
  question: string;
  answer: string;
}
const FAQ_DATA: FAQItemType[] = [
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
    id: 'acad-2',
    question: 'How many free Lecture Exceptions do I get each month?',
    answer: `Your monthly free lecture exception allotment depends on your subscription tier: \n Free Tier: ${EXCEPTION_ACCOUNT_LIMITS['free']} free exception per month.\n• Pro Tier: ${EXCEPTION_ACCOUNT_LIMITS['pro']} free exceptions per month.\n• Premium Tier: ${EXCEPTION_ACCOUNT_LIMITS['premium']} free exceptions per month.`,
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
      'If you choose to receive your purchased product at a selected drop-off location during checkout, the seller will be notified immediately to drop the product at your selected locatio. Once it arrives, you will be notified, then head to the station, and the agent scans the generated order QR code from your device to confirm pickup. This instantly dispatches payment to both the seller and the agent (their cut).',
  },
  {
    id: 'acad-3',
    question: 'What happens if I exhaust my free monthly lecture exceptions?',
    answer: `If you have exhausted your free monthly allowance, you can purchase additional exceptions at a cost of ${EXCEPTION_COST_IN_ICASH} iCash each. Please note that if a lecturer disapproves or cancels a purchased exception, no refunds are issued.`,
  },
  {
    id: 'acad-4',
    question:
      'What are the different lecture formats supported for attendance?',
    answer:
      'iCampus supports three distinct types of lecture formats:\n1. Online sessions\n2. Physical classroom sessions',
  },
  {
    id: 'iap-4',
    question:
      'Why can’t I see my sales earnings in my primary wallet immediately?',
    answer:
      'All earnings from sales or agent commissions are securely held in your Sales Hub payout balance. To access and withdraw these funds, you must meet one security criteria: your identity must be verified.',
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
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={{ marginHorizontal: 15 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
