import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import { getFlutterwavePublicKey } from '../config/payments';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import {
  confirmPaymentAPI,
  createPaymentIntentAPI,
  PaymentIntent,
} from '../api/localPostApis';
import { symbolForCurrency } from '../utils/UserTransactionsHelpers';

export type PaymentRequest = Parameters<typeof createPaymentIntentAPI>[0];
export type PaymentConfirmation = Extract<
  Awaited<ReturnType<typeof confirmPaymentAPI>>,
  { success: true }
>;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** What is being bought; the server prices it. */
  request: PaymentRequest | null;
  title: string;
  subtitle?: string;
  /** Called once the server has verified the payment and applied it. */
  onPaid: (result: PaymentConfirmation) => void;
}

type Phase = 'pricing' | 'ready' | 'confirming' | 'unconfirmed' | 'error';

export const formatMoney = (amount: number, currency: string) =>
  `${symbolForCurrency(currency)}${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Bottom sheet for every in-app purchase: asks the server for the price,
 * opens Flutterwave's hosted checkout (card, bank transfer, USSD; OTP and
 * 3-D Secure are handled there), then has the server verify the payment.
 * If the app can't reach the server after paying, the Flutterwave webhook
 * still completes the purchase.
 */
export const FlutterwavePaySheet = ({
  visible,
  onClose,
  request,
  title,
  subtitle,
  onPaid,
}: Props) => {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('pricing');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [message, setMessage] = useState('');
  const pending = useRef<{ txRef: string; transactionId: string } | null>(null);
  const requestKey = request ? JSON.stringify(request) : '';

  const loadIntent = useCallback(async () => {
    if (!request) return;
    if (!getFlutterwavePublicKey()) {
      setPhase('error');
      setMessage("Payments aren't set up yet. Please try again later.");
      return;
    }
    setPhase('pricing');
    setIntent(null);
    const res = await createPaymentIntentAPI(request);
    if (res.success) {
      setIntent(res);
      setPhase('ready');
    } else {
      setPhase('error');
      setMessage(res.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  useEffect(() => {
    if (visible) {
      pending.current = null;
      loadIntent();
    }
  }, [visible, loadIntent]);

  const confirm = useCallback(async () => {
    const paid = pending.current;
    if (!paid) return;
    setPhase('confirming');
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await confirmPaymentAPI(paid.txRef, paid.transactionId);
      if (res.success) {
        pending.current = null;
        onPaid(res);
        return;
      }
      // 4xx: the server checked and refused (refunded, mismatch, ...).
      if (res.status && res.status < 500) {
        pending.current = null;
        setPhase('error');
        setMessage(res.message);
        return;
      }
      await wait(1500 * (attempt + 1));
    }
    setPhase('unconfirmed');
  }, [onPaid]);

  const handleRedirect = useCallback(
    (data: { status: string; transaction_id?: string; tx_ref: string }) => {
      if (data.status === 'successful' && data.transaction_id) {
        pending.current = { txRef: data.tx_ref, transactionId: String(data.transaction_id) };
        confirm();
      } else {
        Toast.show({ type: 'info', text1: 'Payment cancelled' });
        // Flutterwave won't reuse a reference, so get a fresh one.
        loadIntent();
      }
    },
    [confirm, loadIntent],
  );

  const busy = phase === 'confirming';
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textDarker }]}>{title}</Text>
              {!!subtitle && (
                <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text>
              )}
            </View>
            {!busy && (
              <TouchableOpacity onPress={close} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {phase === 'pricing' && (
            <ActivityIndicator style={styles.block} color={colors.primary} />
          )}

          {phase === 'ready' && intent && (
            <>
              <View style={[styles.amountCard, { backgroundColor: colors.primary + '12' }]}>
                {intent.subtotal != null && (
                  <>
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>Items</Text>
                      <Text style={[styles.rowValue, { color: colors.text }]}>
                        {formatMoney(intent.subtotal, intent.currency)}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>Delivery</Text>
                      <Text style={[styles.rowValue, { color: colors.text }]}>
                        {formatMoney(intent.delivery || 0, intent.currency)}
                      </Text>
                    </View>
                  </>
                )}
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total to pay</Text>
                <Text style={[styles.total, { color: colors.textDarker }]}>
                  {formatMoney(intent.amount, intent.currency)}
                </Text>
              </View>
              <PayWithFlutterwave
                onRedirect={handleRedirect}
                onAbort={() => loadIntent()}
                options={{
                  tx_ref: intent.txRef,
                  authorization: getFlutterwavePublicKey(),
                  customer: intent.customer,
                  amount: intent.amount,
                  currency: intent.currency as any,
                  payment_options: 'card,banktransfer,ussd',
                  customizations: { title: 'iCampus', description: intent.title },
                }}
                customButton={({ onPress, disabled }) => (
                  <CustomButton
                    title={`Pay ${formatMoney(intent.amount, intent.currency)}`}
                    iconName="lock"
                    onPress={onPress}
                    disabled={disabled}
                    style={styles.payBtn}
                  />
                )}
              />
              <View style={styles.secureRow}>
                <MaterialIcons name="verified-user" size={14} color={colors.text} />
                <Text style={[styles.secureText, { color: colors.text }]}>
                  Secured by Flutterwave. Card details never touch iCampus.
                </Text>
              </View>
            </>
          )}

          {phase === 'confirming' && (
            <View style={styles.block}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.info, { color: colors.text }]}>Confirming your payment…</Text>
            </View>
          )}

          {phase === 'unconfirmed' && (
            <View style={styles.block}>
              <MaterialIcons name="schedule" size={36} color={colors.primary} />
              <Text style={[styles.info, { color: colors.text }]}>
                We couldn't reach the server to confirm your payment. If you were
                charged, it will be applied automatically within a few minutes.
              </Text>
              <CustomButton title="Check again" onPress={confirm} style={styles.payBtn} />
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.link, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'error' && (
            <View style={styles.block}>
              <MaterialIcons name="error-outline" size={36} color={colors.primary} />
              <Text style={[styles.info, { color: colors.text }]}>{message}</Text>
              {!!request && !!getFlutterwavePublicKey() && (
                <CustomButton title="Try again" onPress={loadIntent} style={styles.payBtn} />
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18, opacity: 0.8 },
  block: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  amountCard: { borderRadius: 18, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  totalLabel: { fontSize: 12, fontWeight: '600', marginTop: 6, opacity: 0.75 },
  total: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  payBtn: { borderRadius: 14, alignSelf: 'stretch' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  secureText: { fontSize: 11, opacity: 0.7 },
  info: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  link: { fontSize: 14, fontWeight: '700', marginTop: 4 },
});
