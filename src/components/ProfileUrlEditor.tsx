/**
 * "Edit your custom URL" sheet, LinkedIn style: the owner picks the name at
 * the end of their public link (useicampus.io/user/<name>). The name is
 * their username, so it is unique and the server resolves it to the same
 * account as the permanent uid link, which keeps working after a change.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { setUser } from '../context/UserSlice';
import { patchUserProfile } from '../api/localPatchApis';
import { CustomButton } from '../assets/components/AppUIComponents';
import {
  USERNAME_MAX,
  sanitizeUsernameInput,
  useUsernameAvailability,
} from '../hooks/useUsernameAvailability';
import { getProfileLinks, PROFILE_HOST, PROFILE_PATH } from '../utils/profileLinks';

interface ProfileUrlEditorProps {
  visible: boolean;
  onClose: () => void;
  profile: { uid?: string; username?: string } | null | undefined;
  /** Called with the saved username so the screen can update itself. */
  onSaved?: (username: string) => void;
}

const SUCCESS = '#16a34a';
const DANGER = '#dc2626';

export const ProfileUrlEditor = ({ visible, onClose, profile, onSaved }: ProfileUrlEditorProps) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const current = profile?.username || '';
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const { status, setStatus, typedUsername, changed, blocksSave } = useUsernameAvailability(
    value,
    current,
  );
  const links = getProfileLinks(profile);

  // Start from the saved name each time the sheet opens.
  useEffect(() => {
    if (visible) setValue(current);
  }, [visible, current]);

  const close = () => {
    if (!saving) onClose();
  };

  const save = async () => {
    if (!changed || blocksSave || saving) return;
    setSaving(true);
    try {
      const result = await patchUserProfile({ username: typedUsername });
      if (result?.success && result.data) {
        dispatch(setUser(result.data));
        const saved = result.data.username || typedUsername;
        onSaved?.(saved);
        Toast.show({
          type: 'success',
          text1: 'Custom URL updated',
          text2: `${PROFILE_HOST}${PROFILE_PATH}${saved}`,
        });
        onClose();
      } else if (result?.field === 'username') {
        setStatus({ state: 'taken', message: result.message, suggestions: result.suggestions });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Update failed', text2: 'Could not save your custom URL.' });
    } finally {
      setSaving(false);
    }
  };

  const copy = (url: string, label: string) => {
    Clipboard.setString(url);
    Toast.show({ type: 'success', text2: `${label} copied` });
  };

  const statusColor =
    status.state === 'available' ? SUCCESS : status.state === 'checking' || status.state === 'idle' ? colors.text : DANGER;
  const borderColor =
    status.state === 'available' || status.state === 'invalid' || status.state === 'taken' || status.state === 'error'
      ? statusColor
      : focused
        ? colors.primary
        : colors.border + '80';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={styles.headRow}>
            <View style={[styles.headIcon, { backgroundColor: colors.primary + '1A' }]}>
              <MaterialIcons name="link" size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.title, { color: colors.textDarker }]}>Edit your custom URL</Text>
              <Text style={[styles.subtitle, { color: colors.text }]}>
                Personalise the link to your profile. Old links to your permanent URL keep working.
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textDarker }]}>Custom URL</Text>
          <View style={[styles.urlField, { borderColor, backgroundColor: colors.background }]}>
            <Text style={[styles.prefix, { color: colors.text }]} numberOfLines={1}>
              {PROFILE_HOST}
              {PROFILE_PATH}
            </Text>
            <TextInput
              value={value}
              onChangeText={text => setValue(sanitizeUsernameInput(text))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={save}
              placeholder="your-name"
              placeholderTextColor={colors.inputTextHolder}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={Platform.OS === 'web'}
              maxLength={USERNAME_MAX}
              style={[styles.input, { color: colors.textDarker }]}
              accessibilityLabel="Custom profile URL"
            />
            <View style={styles.statusSlot}>
              {status.state === 'checking' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : status.state === 'available' ? (
                <MaterialIcons name="check-circle" size={20} color={SUCCESS} />
              ) : status.state !== 'idle' ? (
                <MaterialIcons name="error-outline" size={20} color={DANGER} />
              ) : null}
            </View>
          </View>
          <View style={styles.helperRow}>
            <Text
              style={[styles.helper, { color: statusColor }, status.state === 'idle' && styles.muted]}
              accessibilityLiveRegion="polite"
            >
              {status.state === 'idle'
                ? '3–20 characters: letters, numbers and _. Must start with a letter.'
                : status.state === 'checking'
                  ? 'Checking availability…'
                  : status.message}
            </Text>
            <Text style={[styles.counter, { color: colors.text }]}>
              {value.length}/{USERNAME_MAX}
            </Text>
          </View>

          {'suggestions' in status && !!status.suggestions?.length && (
            <View style={styles.suggestions}>
              {status.suggestions.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setValue(s)}
                  style={[styles.chip, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '0F' }]}
                >
                  <Text style={[styles.chipText, { color: colors.primary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.linkCard, { backgroundColor: colors.background }]}>
            <View style={styles.linkRow}>
              <MaterialIcons name="public" size={16} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={[styles.linkLabel, { color: colors.text }]}>Public link</Text>
                <Text style={[styles.linkValue, { color: colors.textDarker }]} numberOfLines={1}>
                  {links.display}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => copy(links.url, 'Profile link')}
                hitSlop={8}
                accessibilityLabel="Copy public link"
              >
                <MaterialIcons name="content-copy" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {links.hasCustomUrl && !!links.permanentUrl && (
              <View style={[styles.linkRow, styles.linkDivider, { borderTopColor: colors.border + '40' }]}>
                <MaterialIcons name="lock-outline" size={16} color={colors.text} />
                <View style={styles.flex}>
                  <Text style={[styles.linkLabel, { color: colors.text }]}>Permanent link</Text>
                  <Text style={[styles.linkValue, styles.muted, { color: colors.textDarker }]} numberOfLines={1}>
                    {links.permanentUrl.replace(/^https:\/\//, '')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => copy(links.permanentUrl, 'Permanent link')}
                  hitSlop={8}
                  accessibilityLabel="Copy permanent link"
                >
                  <MaterialIcons name="content-copy" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={close}
              disabled={saving}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryText, { color: colors.textDarker }]}>Cancel</Text>
            </TouchableOpacity>
            <CustomButton
              title="Save URL"
              onPress={save}
              isLoading={saving}
              disabled={!changed || blocksSave}
              style={[styles.primaryBtn, (!changed || blocksSave) && styles.disabled]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16, opacity: 0.6 },
  headRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  headIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 3, opacity: 0.75 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  urlField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 10,
    minHeight: 52,
  },
  prefix: { fontSize: 15, opacity: 0.6, flexShrink: 1 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 12, minWidth: 60 },
  statusSlot: { width: 24, alignItems: 'center' },
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 7 },
  helper: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  counter: { fontSize: 12, opacity: 0.55 },
  muted: { opacity: 0.65 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  linkCard: { borderRadius: 14, paddingHorizontal: 14, marginTop: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  linkLabel: { fontSize: 11.5, fontWeight: '600', opacity: 0.7, marginBottom: 1 },
  linkValue: { fontSize: 13.5, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  primaryBtn: { flex: 1, width: 'auto', height: 48, borderRadius: 12 },
  disabled: { opacity: 0.5 },
});
