import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import DropDownPicker from 'react-native-dropdown-picker';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import { PageHeader } from '../components/PageHeader';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useTheme } from '../context/ThemeContext';
import { patchUser } from '../context/UserSlice';
import { User } from '../types/firebase';
import { fetchSupportedBanks, resolveBankAccountAPI } from '../api/localGetApis.ts';
import { savePayoutAccountAPI } from '../api/localPostApis.ts';

/**
 * Adds the bank account a seller's payouts are sent to.
 *
 * Purchases no longer use this modal: they go through FlutterwavePaySheet
 * (Flutterwave's hosted checkout), so card numbers never pass through the
 * app's own forms or the iCampus server.
 */
interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  /** Called with the saved account (number masked). */
  onSaved?: (account: NonNullable<User['payoutAccount']>) => void;
  // Accepted for older call sites; unused.
  currencyData?: unknown;
  mode?: 'withdraw';
}

const COUNTRY_CODE_MAP: Record<string, string> = {
  Nigeria: 'NG',
  Egypt: 'EG',
  Ghana: 'GH',
  Kenya: 'KE',
  Rwanda: 'RW',
  Cameroon: 'CM',
  Ethiopia: 'ET',
  Uganda: 'UG',
  Tanzania: 'TZ',
  'South Africa': 'ZA',
  USA: 'US',
  'United States of America': 'US',
};

export const AddPaymentModal = ({ visible, onClose, user, onSaved }: AddPaymentModalProps) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const country = user?.country || 'Nigeria';
  const isNigeria = country === 'Nigeria';
  const [bankItems, setBankItems] = useState<{ label: string; value: string }[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [saving, setSaving] = useState(false);
  const resolveAbort = useRef<AbortController | null>(null);

  const countryCode = COUNTRY_CODE_MAP[country];
  const numberIsComplete = isNigeria
    ? accountNumber.length === 10
    : accountNumber.length >= 6;

  useEffect(() => {
    if (!visible || !countryCode || bankItems.length > 0) return;
    const controller = new AbortController();
    setBanksLoading(true);
    fetchSupportedBanks({ countryCode, signal: controller.signal })
      .then(banks => setBankItems(banks))
      .finally(() => setBanksLoading(false));
    return () => controller.abort();
  }, [visible, countryCode, bankItems.length]);

  // Look up the account holder's name so the seller can check it before saving.
  useEffect(() => {
    setAccountName(null);
    setResolveError('');
    if (!isNigeria || !bankCode || accountNumber.length !== 10) return;
    resolveAbort.current?.abort();
    const controller = new AbortController();
    resolveAbort.current = controller;
    setResolving(true);
    resolveBankAccountAPI(bankCode, accountNumber, controller.signal).then(res => {
      if (controller.signal.aborted) return;
      setResolving(false);
      if (res.success) setAccountName(res.accountName || null);
      else if (res.message) setResolveError(res.message);
    });
    return () => controller.abort();
  }, [isNigeria, bankCode, accountNumber]);

  const bankName = useMemo(
    () => bankItems.find(b => b.value === bankCode)?.label,
    [bankItems, bankCode],
  );
  const canSave =
    !!bankCode && numberIsComplete && !saving && (!isNigeria || !!accountName);

  const handleSave = async () => {
    if (!canSave || !bankCode) return;
    setSaving(true);
    const res = await savePayoutAccountAPI({ bankCode, accountNumber, bankName });
    setSaving(false);
    if (!res.success) {
      Toast.show({ type: 'error', text1: 'Could not save account', text2: res.message });
      return;
    }
    dispatch(patchUser({ payoutAccount: res.payoutAccount }));
    Toast.show({ type: 'success', text1: 'Payout account saved' });
    onSaved?.(res.payoutAccount);
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      swipeDirection="down"
      onSwipeComplete={onClose}
      style={AddPaymentMethodStyles.modalOverride}
    >
      <View style={[AddPaymentMethodStyles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <PageHeader
          title="Payout bank account"
          showBackButton={false}
          rightElement={
            <MaterialIcons
              name="close"
              size={28}
              onPress={onClose}
              color={colors.primary}
              style={{ padding: 10 }}
            />
          }
        />
        <ScrollView
          contentContainerStyle={AddPaymentMethodStyles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[AddPaymentMethodStyles.hint, { color: colors.text }]}>
            Withdrawals from your Sales Hub balance are sent to this account. It
            must be in your name.
          </Text>

          {!countryCode ? (
            <Text style={[AddPaymentMethodStyles.hint, { color: colors.primary }]}>
              Bank payouts aren't available in {country} yet.
            </Text>
          ) : (
            <>
              <Text style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}>Bank</Text>
              <DropDownPicker
                open={openBank}
                value={bankCode}
                items={bankItems}
                setOpen={setOpenBank}
                setValue={setBankCode}
                loading={banksLoading}
                placeholder={banksLoading ? 'Loading banks…' : 'Select your bank'}
                searchable
                listMode="MODAL"
                style={[
                  AddPaymentMethodStyles.dropdown,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                textStyle={{ color: colors.text }}
                searchTextInputStyle={{ color: colors.text }}
                modalContentContainerStyle={{ backgroundColor: colors.backgroundSecondary }}
              />

              <Text style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}>
                Account number
              </Text>
              <TextInput
                style={[AddPaymentMethodStyles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder={isNigeria ? '10-digit NUBAN' : 'Account number'}
                placeholderTextColor={colors.inputTextHolder}
                keyboardType="number-pad"
                maxLength={isNigeria ? 10 : 20}
                value={accountNumber}
                onChangeText={text => setAccountNumber(text.replace(/\D/g, ''))}
              />

              {resolving && (
                <View style={AddPaymentMethodStyles.statusRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.text }}>Checking account…</Text>
                </View>
              )}
              {!!accountName && (
                <View style={[AddPaymentMethodStyles.accountVerifiedBox, { backgroundColor: colors.primary + '15' }]}>
                  <MaterialIcons name="check-circle" size={18} color={colors.success || colors.primary} />
                  <Text style={[AddPaymentMethodStyles.accountNameText, { color: colors.text }]}>
                    {accountName}
                  </Text>
                </View>
              )}
              {!!resolveError && (
                <Text style={[AddPaymentMethodStyles.hint, { color: colors.primary }]}>{resolveError}</Text>
              )}

              <CustomButton
                title={saving ? 'Saving…' : 'Save payout account'}
                onPress={handleSave}
                disabled={!canSave}
                isLoading={saving}
                style={AddPaymentMethodStyles.submitBtn}
              />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export const AddPaymentMethodStyles = StyleSheet.create({
  modalOverride: { margin: 0 },
  container: { flex: 1 },
  formContent: { paddingHorizontal: 16, paddingBottom: 40 },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 8, opacity: 0.85 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  dropdown: { borderRadius: 12, borderWidth: 0.8, minHeight: 52 },
  input: {
    borderWidth: 0.8,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  accountVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  accountNameText: { fontWeight: '700', fontSize: 14 },
  submitBtn: { marginTop: 28, borderRadius: 14 },
});
