import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useTheme } from '../context/ThemeContext';
import { patchUser } from '../context/UserSlice';
import { User } from '../types/firebase';
import { fetchSupportedBanks, resolveBankAccountAPI } from '../api/localGetApis.ts';
import { savePayoutAccountAPI } from '../api/localPostApis.ts';

/**
 * Adds the bank account a seller's payouts are sent to.
 *
 * The account must be in the seller's own name (or the organization's name
 * for enterprise accounts). The server enforces this when saving and again
 * on every withdrawal; the app only explains a mismatch early.
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

type BankItem = { label: string; value: string };

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

const bankInitials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '#';

/** Searchable bank list shown as a sheet over the form. */
const BankPickerSheet = ({
  visible,
  banks,
  loading,
  error,
  selected,
  onRetry,
  onSelect,
  onClose,
}: {
  visible: boolean;
  banks: BankItem[];
  loading: boolean;
  error: string;
  selected: string | null;
  onRetry: () => void;
  onSelect: (bank: BankItem) => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? banks.filter(b => b.label.toLowerCase().includes(q)) : banks;
  }, [banks, query]);

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.sheetState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.sheetStateText, { color: colors.text }]}>Loading banks…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.sheetState}>
          <View style={[styles.stateIcon, { backgroundColor: colors.primary + '1A' }]}>
            <MaterialIcons name="cloud-off" size={26} color={colors.primary} />
          </View>
          <Text style={[styles.sheetStateTitle, { color: colors.textDarker }]}>
            Couldn't load banks
          </Text>
          <Text style={[styles.sheetStateText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            onPress={onRetry}
            style={[styles.retryBtn, { borderColor: colors.primary }]}
          >
            <MaterialIcons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <FlatList
        data={filtered}
        keyExtractor={item => item.value}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        contentContainerStyle={styles.bankList}
        ListEmptyComponent={
          <View style={styles.sheetState}>
            <MaterialIcons name="search-off" size={28} color={colors.text} />
            <Text style={[styles.sheetStateText, { color: colors.text }]}>
              No bank matches “{query.trim()}”
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = item.value === selected;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.bankRow,
                {
                  backgroundColor: isSelected
                    ? colors.primary + '14'
                    : pressed
                      ? colors.primary + '0A'
                      : 'transparent',
                },
              ]}
            >
              <View style={[styles.bankAvatar, { backgroundColor: colors.primary + '1A' }]}>
                <Text style={[styles.bankAvatarText, { color: colors.primary }]}>
                  {bankInitials(item.label)}
                </Text>
              </View>
              <Text
                style={[
                  styles.bankName,
                  { color: colors.textDarker, fontWeight: isSelected ? '800' : '600' },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {isSelected && (
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          );
        }}
      />
    );
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.sheetModal}
      avoidKeyboard
      propagateSwipe
    >
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.textDarker }]}>Select your bank</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        {!loading && !error && (
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border + '88' },
            ]}
          >
            <MaterialIcons name="search" size={20} color={colors.text} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${banks.length} banks`}
              placeholderTextColor={colors.inputTextHolder}
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <MaterialIcons name="cancel" size={18} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {renderBody()}
      </View>
    </Modal>
  );
};

export const AddPaymentModal = ({ visible, onClose, user, onSaved }: AddPaymentModalProps) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const country = user?.country || 'Nigeria';
  const isNigeria = country === 'Nigeria';
  const isOrganization = user?.usertype === 'enterprise' && !!user?.organizationName;
  const ownName = isOrganization
    ? user.organizationName!
    : [user?.firstname, user?.lastname].filter(Boolean).join(' ');
  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState('');
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [nameMatches, setNameMatches] = useState<boolean | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [saving, setSaving] = useState(false);
  const resolveAbort = useRef<AbortController | null>(null);
  const banksAbort = useRef<AbortController | null>(null);

  const countryCode = COUNTRY_CODE_MAP[country];
  const numberIsComplete = isNigeria
    ? accountNumber.length === 10
    : accountNumber.length >= 6;

  const loadBanks = useCallback(() => {
    if (!countryCode) return;
    banksAbort.current?.abort();
    const controller = new AbortController();
    banksAbort.current = controller;
    setBanksLoading(true);
    setBanksError('');
    fetchSupportedBanks({ countryCode, signal: controller.signal }).then(res => {
      if (controller.signal.aborted) return;
      setBankItems(res.banks);
      setBanksError(res.error || (res.banks.length ? '' : 'No banks are available right now.'));
      setBanksLoading(false);
    });
  }, [countryCode]);

  useEffect(() => {
    if (!visible || bankItems.length > 0) return;
    loadBanks();
    return () => banksAbort.current?.abort();
  }, [visible, bankItems.length, loadBanks]);

  // Look up the account holder's name so the seller can check it before saving.
  useEffect(() => {
    setAccountName(null);
    setNameMatches(null);
    setResolveError('');
    if (!isNigeria || !bankCode || accountNumber.length !== 10) return;
    resolveAbort.current?.abort();
    const controller = new AbortController();
    resolveAbort.current = controller;
    setResolving(true);
    resolveBankAccountAPI(bankCode, accountNumber, controller.signal).then(res => {
      if (controller.signal.aborted) return;
      setResolving(false);
      if (res.success) {
        setAccountName(res.accountName || null);
        setNameMatches(res.nameMatches ?? null);
      } else if (res.message) setResolveError(res.message);
    });
    return () => controller.abort();
  }, [isNigeria, bankCode, accountNumber]);

  const bankName = useMemo(
    () => bankItems.find(b => b.value === bankCode)?.label,
    [bankItems, bankCode],
  );
  const isMismatch = !!accountName && nameMatches === false;
  const canSave =
    !!bankCode &&
    numberIsComplete &&
    !saving &&
    (!isNigeria || (!!accountName && !isMismatch));

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
      onBackButtonPress={onClose}
      style={styles.modalOverride}
      avoidKeyboard
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '1A' }]}>
            <MaterialIcons name="account-balance" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textDarker }]}>Payout account</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Where your Sales Hub withdrawals are sent
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.ruleCard, { backgroundColor: colors.primary + '10' }]}>
            <MaterialIcons name="verified-user" size={20} color={colors.primary} />
            <Text style={[styles.ruleText, { color: colors.text }]}>
              For your security, the account must be in{' '}
              {isOrganization ? "your organization's" : 'your'} name:{' '}
              <Text style={[styles.ruleName, { color: colors.textDarker }]}>
                {ownName || 'your registered name'}
              </Text>
            </Text>
          </View>

          {!countryCode ? (
            <Text style={[styles.hint, { color: colors.primary }]}>
              Bank payouts aren't available in {country} yet.
            </Text>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textDarker }]}>Bank</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setBankSheetOpen(true)}
                style={[
                  styles.field,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: bankCode ? colors.primary : colors.border + '99',
                  },
                ]}
              >
                {bankName ? (
                  <View style={[styles.bankAvatarSm, { backgroundColor: colors.primary + '1A' }]}>
                    <Text style={[styles.bankAvatarSmText, { color: colors.primary }]}>
                      {bankInitials(bankName)}
                    </Text>
                  </View>
                ) : (
                  <MaterialIcons name="account-balance" size={20} color={colors.text} />
                )}
                <Text
                  style={[
                    styles.fieldText,
                    { color: bankName ? colors.textDarker : colors.inputTextHolder },
                  ]}
                  numberOfLines={1}
                >
                  {bankName || (banksLoading ? 'Loading banks…' : 'Select your bank')}
                </Text>
                {banksLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="unfold-more" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
              {!!banksError && !banksLoading && (
                <TouchableOpacity onPress={loadBanks} style={styles.inlineError}>
                  <MaterialIcons name="error-outline" size={16} color={colors.primary} />
                  <Text style={[styles.inlineErrorText, { color: colors.primary }]}>
                    {banksError} Tap to retry.
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { color: colors.textDarker }]}>Account number</Text>
              <View
                style={[
                  styles.field,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: numberIsComplete ? colors.primary : colors.border + '99',
                  },
                ]}
              >
                <MaterialIcons name="pin" size={20} color={colors.text} />
                <TextInput
                  style={[styles.numberInput, { color: colors.textDarker }]}
                  placeholder={isNigeria ? '10-digit NUBAN' : 'Account number'}
                  placeholderTextColor={colors.inputTextHolder}
                  keyboardType="number-pad"
                  maxLength={isNigeria ? 10 : 20}
                  value={accountNumber}
                  onChangeText={text => setAccountNumber(text.replace(/\D/g, ''))}
                />
                {isNigeria && (
                  <Text style={[styles.counter, { color: colors.text }]}>
                    {accountNumber.length}/10
                  </Text>
                )}
              </View>

              {resolving && (
                <View style={[styles.statusCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.statusText, { color: colors.text }]}>
                    Verifying account name…
                  </Text>
                </View>
              )}
              {!!accountName && (
                <View
                  style={[
                    styles.statusCard,
                    {
                      backgroundColor: (isMismatch ? colors.primary : colors.success) + '14',
                      borderColor: isMismatch ? colors.primary : colors.success,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isMismatch ? 'gpp-bad' : 'verified'}
                    size={22}
                    color={isMismatch ? colors.primary : colors.success}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusCaption, { color: colors.text }]}>
                      Account holder
                    </Text>
                    <Text style={[styles.accountNameText, { color: colors.textDarker }]}>
                      {accountName}
                    </Text>
                    <Text
                      style={[
                        styles.statusCaption,
                        { color: isMismatch ? colors.primary : colors.success, opacity: 1 },
                      ]}
                    >
                      {isMismatch
                        ? `Doesn't match ${ownName || 'your name'}. Use an account in your name.`
                        : 'Name matches your profile'}
                    </Text>
                  </View>
                </View>
              )}
              {!!resolveError && (
                <View style={styles.inlineError}>
                  <MaterialIcons name="error-outline" size={16} color={colors.primary} />
                  <Text style={[styles.inlineErrorText, { color: colors.primary }]}>
                    {resolveError}
                  </Text>
                </View>
              )}

              <CustomButton
                title={saving ? 'Saving…' : 'Save payout account'}
                iconName="lock"
                onPress={handleSave}
                disabled={!canSave}
                isLoading={saving}
                style={styles.submitBtn}
              />
              <Text style={[styles.footnote, { color: colors.text }]}>
                Account names are confirmed with your bank through Flutterwave.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
      <BankPickerSheet
        visible={bankSheetOpen}
        banks={bankItems}
        loading={banksLoading}
        error={banksError}
        selected={bankCode}
        onRetry={loadBanks}
        onSelect={bank => {
          setBankCode(bank.value);
          setBankSheetOpen(false);
        }}
        onClose={() => setBankSheetOpen(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverride: { margin: 0, justifyContent: 'flex-end' },
  container: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12.5, marginTop: 2, opacity: 0.75 },
  formContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36 },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  ruleText: { flex: 1, fontSize: 13, lineHeight: 19 },
  ruleName: { fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8, letterSpacing: 0.2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
  },
  fieldText: { flex: 1, fontSize: 15, fontWeight: '600' },
  numberInput: { flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: 2, height: '100%' },
  counter: { fontSize: 12, fontWeight: '600', opacity: 0.6 },
  bankAvatarSm: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankAvatarSmText: { fontSize: 11, fontWeight: '800' },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  inlineErrorText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusText: { fontSize: 13.5, fontWeight: '600' },
  statusCaption: { fontSize: 11.5, fontWeight: '600', opacity: 0.7 },
  accountNameText: { fontWeight: '800', fontSize: 15, marginVertical: 2 },
  submitBtn: { marginTop: 28, borderRadius: 16, height: 54 },
  footnote: { fontSize: 11.5, textAlign: 'center', marginTop: 12, opacity: 0.6 },

  // Bank picker sheet
  sheetModal: { margin: 0, justifyContent: 'flex-end' },
  sheet: {
    height: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14.5, height: '100%' },
  bankList: { paddingHorizontal: 12, paddingBottom: 30 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 14,
  },
  bankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankAvatarText: { fontSize: 13, fontWeight: '800' },
  bankName: { flex: 1, fontSize: 14.5 },
  sheetState: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetStateTitle: { fontSize: 16, fontWeight: '800' },
  sheetStateText: { fontSize: 13, textAlign: 'center', lineHeight: 19, opacity: 0.8 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: { fontSize: 13.5, fontWeight: '700' },
});

// Kept for any screen that still borrows these.
export const AddPaymentMethodStyles = styles;
