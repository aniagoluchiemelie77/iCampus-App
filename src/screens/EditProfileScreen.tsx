import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../hooks/hooks.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { UserAvatar } from '../components/UserAvatar';
import { patchUserProfile } from '../api/localPatchApis';
import { setUser } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/firebase';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useContentWidth } from '../components/desktop/DesktopShell';
import { centeredColumn } from '../utils/layout';
import {
  USERNAME_MAX,
  sanitizeUsernameInput,
  useUsernameAvailability,
} from '../hooks/useUsernameAvailability';
import { getProfileLinks, PROFILE_HOST, PROFILE_PATH } from '../utils/profileLinks';

const FORM_MAX_WIDTH = 680;
const HEADLINE_MAX = 220;
const SUCCESS = '#16a34a';
const DANGER = '#dc2626';

type FormKey =
  | 'headline'
  | 'organizationName'
  | 'website'
  | 'username'
  | 'firstname'
  | 'lastname'
  | 'department'
  | 'email';

const initialForm = (user: User): Record<FormKey, string> => ({
  headline: user.headline || '',
  organizationName: user.organizationName || '',
  website: user.website || '',
  username: (user.username || '').replace(/^@+/, ''),
  firstname: user.firstname || '',
  lastname: user.lastname || '',
  department: user.department || '',
  email: user.email || '',
});

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const Section = ({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: string;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border + '33' },
      ]}
    >
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '14' }]}>
          <MaterialIcons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>{title}</Text>
          {!!description && (
            <Text style={[styles.sectionDescription, { color: colors.text }]}>{description}</Text>
          )}
        </View>
      </View>
      {children}
    </View>
  );
};

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: string;
  locked?: boolean;
  /** Text shown before the input (e.g. a URL prefix). */
  prefix?: string;
  helper?: string;
  error?: string;
  /** Overrides the border/helper colour (e.g. green when available). */
  statusColor?: string;
  right?: React.ReactNode;
  counter?: { value: number; max: number };
}

const Field = ({
  label,
  icon,
  locked,
  prefix,
  helper,
  error,
  statusColor,
  right,
  counter,
  multiline,
  ...inputProps
}: FieldProps) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const accent = error ? DANGER : statusColor;
  const borderColor = accent ?? (focused ? colors.primary : colors.border + '66');

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textDarker }]}>{label}</Text>
        {locked && (
          <View style={[styles.lockPill, { backgroundColor: colors.primary + '14' }]}>
            <MaterialIcons name="verified-user" size={12} color={colors.primary} />
            <Text style={[styles.lockText, { color: colors.primary }]}>Verified</Text>
          </View>
        )}
        {counter && (
          <Text
            style={[
              styles.counter,
              { color: counter.value > counter.max ? DANGER : colors.text },
            ]}
          >
            {counter.value}/{counter.max}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.inputShell,
          multiline && styles.inputShellMultiline,
          {
            borderColor,
            backgroundColor: locked ? colors.backgroundSecondary : colors.background,
          },
          focused && !accent && { shadowColor: colors.primary, ...styles.focusGlow },
        ]}
      >
        {!!icon && (
          <MaterialIcons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.text}
            style={[styles.inputIcon, multiline && styles.inputIconTop, { opacity: focused ? 1 : 0.55 }]}
          />
        )}
        {!!prefix && (
          <Text style={[styles.prefix, { color: colors.text }]} numberOfLines={1}>
            {prefix}
          </Text>
        )}
        <TextInput
          {...inputProps}
          multiline={multiline}
          editable={!locked && inputProps.editable !== false}
          onFocus={e => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.inputTextHolder}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: locked ? colors.text : colors.textDarker },
            locked && styles.inputLocked,
          ]}
        />
        {locked ? (
          <MaterialIcons name="lock-outline" size={17} color={colors.text} style={styles.trailing} />
        ) : (
          right
        )}
      </View>
      {!!(error || helper) && (
        <Text
          style={[
            styles.helper,
            { color: accent ?? colors.text },
            !accent && styles.muted,
          ]}
          accessibilityLiveRegion={error ? 'polite' : undefined}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const EditProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const isMounted = useRef(true);
  const user = useAppSelector((state: { user: User }) => state.user);
  const contentWidth = Math.min(useContentWidth(), FORM_MAX_WIDTH);
  const twoColumns = contentWidth >= 560;

  const isStudent = user.usertype === 'student';
  const isEnterprise = user.usertype === 'enterprise';
  const isTeacher = user.usertype === 'lecturer';
  const isVerified = !!user.isVerified;

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(() => initialForm(user));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormKey, string>>>({});
  const {
    status: usernameStatus,
    setStatus: setUsernameStatus,
    typedUsername,
    currentUsername,
    changed: usernameChanged,
    blocksSave: usernameBlocksSave,
  } = useUsernameAvailability(formData.username, user.username || '');

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const isChanged = useMemo(() => {
    const original = initialForm(user);
    return (Object.keys(original) as FormKey[]).some(key =>
      key === 'username' ? usernameChanged : formData[key] !== original[key],
    );
  }, [formData, user, usernameChanged]);

  const handleInputChange = (field: FormKey, value: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const discardChanges = () => {
    setFormData(initialForm(user));
    setFieldErrors({});
  };

  const handleSave = async () => {
    if (isSaving || usernameBlocksSave) return;
    const original = initialForm(user);
    const changedData: Partial<Record<FormKey, string>> = {};
    (Object.keys(formData) as FormKey[]).forEach(key => {
      if (key === 'username') {
        if (usernameChanged) changedData.username = typedUsername;
      } else if (formData[key] !== original[key]) {
        changedData[key] = formData[key].trim();
      }
    });
    if (Object.keys(changedData).length === 0) return;

    setIsSaving(true);
    try {
      const result = await patchUserProfile(changedData);
      if (!isMounted.current) return;
      if (result?.success && result.data) {
        dispatch(setUser(result.data));
        Toast.show({
          type: 'success',
          text1: 'Profile updated',
          text2: changedData.username
            ? `Your profile is now at ${PROFILE_HOST}${PROFILE_PATH}${result.data.username}`
            : 'Your changes have been saved.',
        });
        navigation.navigate('Profile', {
          identifier: result.data.username || user.uid,
        });
      } else if (result?.field) {
        // Inline error on the field the server rejected (username taken, etc.).
        setFieldErrors({ [result.field]: result.message });
        if (result.field === 'username') {
          setUsernameStatus({
            state: 'taken',
            message: result.message,
            suggestions: result.suggestions,
          });
        }
      }
    } catch (error) {
      console.error('Error saving profile changes:', error);
      if (isMounted.current) {
        Toast.show({
          type: 'error',
          text1: 'Update Error',
          text2: 'Failed to update profile',
        });
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  // --- Username / custom URL status ---------------------------------------
  const usernameAccent =
    usernameStatus.state === 'available'
      ? SUCCESS
      : usernameStatus.state === 'invalid' ||
          usernameStatus.state === 'taken' ||
          usernameStatus.state === 'error'
        ? DANGER
        : undefined;
  const usernameHelper =
    usernameStatus.state === 'idle'
      ? `Letters, numbers and _ (3–${USERNAME_MAX}). People mention you as @${currentUsername || 'username'}.`
      : usernameStatus.state === 'checking'
        ? 'Checking availability…'
        : usernameStatus.message;

  const previewLinks = getProfileLinks({
    uid: user.uid,
    username: usernameStatus.state === 'available' || !usernameChanged ? typedUsername : user.username,
  });
  const copyLink = () => {
    Clipboard.setString(previewLinks.url);
    Toast.show({ type: 'success', text2: 'Profile link copied' });
  };

  const displayName = isEnterprise
    ? formData.organizationName || 'Your organization'
    : [formData.firstname, formData.lastname].filter(Boolean).join(' ') || 'Your name';

  const nameFields = (
    <>
      <View style={[styles.flex, !twoColumns && styles.fullWidth]}>
        <Field
          label="First name"
          icon="person-outline"
          value={formData.firstname}
          locked={isVerified}
          placeholder="First name"
          autoComplete="given-name"
          onChangeText={text => handleInputChange('firstname', text)}
          error={fieldErrors.firstname}
        />
      </View>
      <View style={[styles.flex, !twoColumns && styles.fullWidth]}>
        <Field
          label="Last name"
          icon="badge"
          value={formData.lastname}
          locked={isVerified}
          placeholder="Last name"
          autoComplete="family-name"
          onChangeText={text => handleInputChange('lastname', text)}
          error={fieldErrors.lastname}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Edit Profile" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            centeredColumn(FORM_MAX_WIDTH),
            { paddingBottom: isChanged ? 120 : 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Identity preview */}
          <View
            style={[
              styles.hero,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border + '33' },
            ]}
          >
            <View style={[styles.heroBand, { backgroundColor: colors.primary + '14' }]} />
            <View style={styles.heroBody}>
              <View style={[styles.avatarRing, { borderColor: colors.backgroundSecondary }]}>
                <UserAvatar
                  profilePic={user.profilePic}
                  firstName={user.firstname}
                  lastName={user.lastname}
                  username={user.username}
                  organizationName={user.organizationName}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.heroText}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.heroName, { color: colors.textDarker }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isVerified && <MaterialIcons name="verified" size={18} color={colors.primary} />}
                </View>
                <Text style={[styles.heroHeadline, { color: colors.text }]} numberOfLines={2}>
                  {formData.headline || 'Add a headline so people know what you do'}
                </Text>
              </View>
              {!isVerified && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('PersonaVerify')}
                  style={[styles.verifyChip, { borderColor: colors.primary }]}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="verified" size={14} color={colors.primary} />
                  <Text style={[styles.verifyChipText, { color: colors.primary }]}>Get verified</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.heroLink, { backgroundColor: colors.background }]}>
              <MaterialIcons name="link" size={16} color={colors.primary} />
              <Text style={[styles.heroLinkText, { color: colors.textDarker }]} numberOfLines={1}>
                {previewLinks.display}
              </Text>
              <TouchableOpacity onPress={copyLink} hitSlop={8} accessibilityLabel="Copy profile link">
                <MaterialIcons name="content-copy" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {isVerified && (
            <View style={[styles.notice, { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '33' }]}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.textDarker }]}>
                Your account is verified, so your name and contact details are locked. Contact
                support if they need to change.
              </Text>
            </View>
          )}

          <Section
            title="Public profile"
            icon="public"
            description="What people see first on your profile and in search."
          >
            <Field
              label="Headline"
              icon="short-text"
              value={formData.headline}
              placeholder={
                isEnterprise
                  ? 'e.g. Campus tech hub for students and startups'
                  : 'e.g. Computer Science student · Aspiring product designer'
              }
              multiline
              maxLength={HEADLINE_MAX}
              counter={{ value: formData.headline.length, max: HEADLINE_MAX }}
              onChangeText={text => handleInputChange('headline', text)}
              error={fieldErrors.headline}
            />
            <Field
              label="Custom profile URL"
              icon="alternate-email"
              prefix={`${PROFILE_HOST}${PROFILE_PATH}`}
              value={formData.username}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              maxLength={USERNAME_MAX}
              onChangeText={text => handleInputChange('username', sanitizeUsernameInput(text))}
              statusColor={usernameAccent}
              helper={usernameHelper}
              right={
                <View style={styles.trailing}>
                  {usernameStatus.state === 'checking' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : usernameStatus.state === 'available' ? (
                    <MaterialIcons name="check-circle" size={19} color={SUCCESS} />
                  ) : usernameAccent ? (
                    <MaterialIcons name="error-outline" size={19} color={DANGER} />
                  ) : null}
                </View>
              }
            />
            {'suggestions' in usernameStatus && !!usernameStatus.suggestions?.length && (
              <View style={styles.suggestionRow}>
                <Text style={[styles.suggestionLabel, { color: colors.text }]}>Try</Text>
                {usernameStatus.suggestions.map(suggestion => (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => handleInputChange('username', suggestion)}
                    style={[
                      styles.suggestionChip,
                      { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '55' },
                    ]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.primary }]}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Section>

          {isEnterprise ? (
            <Section title="Organization" icon="business" description="How your organization appears on iCampus.">
              <Field
                label="Company name"
                icon="business"
                value={formData.organizationName}
                locked={isVerified}
                placeholder="Your company name"
                autoComplete="organization"
                onChangeText={text => handleInputChange('organizationName', text)}
                error={fieldErrors.organizationName}
              />
              <Field
                label="Website"
                icon="language"
                value={formData.website}
                locked={isVerified}
                placeholder="https://yourcompany.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onChangeText={text => handleInputChange('website', text)}
                error={fieldErrors.website}
              />
            </Section>
          ) : (
            <Section title="Personal details" icon="person-outline">
              <View style={[styles.row, !twoColumns && styles.column]}>{nameFields}</View>
              {(isStudent || isTeacher) && (
                <Field
                  label="Department"
                  icon="school"
                  value={formData.department}
                  locked={isVerified}
                  placeholder="e.g. Computer Science"
                  onChangeText={text => handleInputChange('department', text)}
                  error={fieldErrors.department}
                />
              )}
            </Section>
          )}

          <Section title="Contact" icon="mail-outline" description="Used for sign-in and account notices.">
            <Field
              label="Email address"
              icon="mail-outline"
              value={formData.email}
              locked={isVerified}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              placeholder="you@example.com"
              onChangeText={text => handleInputChange('email', text)}
              error={fieldErrors.email}
            />
          </Section>
        </ScrollView>

        {isChanged && (
          <View
            style={[
              styles.saveBar,
              { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border + '40' },
            ]}
          >
            <View style={[styles.saveBarInner, centeredColumn(FORM_MAX_WIDTH)]}>
              <Text style={[styles.saveBarHint, { color: colors.text }]} numberOfLines={1}>
                {usernameBlocksSave && usernameStatus.state !== 'checking'
                  ? 'Fix your custom URL to save'
                  : 'You have unsaved changes'}
              </Text>
              <TouchableOpacity
                onPress={discardChanges}
                disabled={isSaving}
                style={[styles.discardBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.discardText, { color: colors.textDarker }]}>Discard</Text>
              </TouchableOpacity>
              <CustomButton
                title="Save changes"
                onPress={handleSave}
                isLoading={isSaving}
                disabled={usernameBlocksSave}
                style={[styles.saveBtn, usernameBlocksSave && styles.disabledBtn]}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  fullWidth: { width: '100%', flex: 0 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  muted: { opacity: 0.7 },

  // Hero
  hero: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroBand: { height: 56 },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: -30,
  },
  avatarRing: { borderWidth: 3, borderRadius: 40 },
  avatar: { width: 68, height: 68, borderRadius: 34 },
  heroText: { flex: 1, paddingBottom: 2 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  heroHeadline: { fontSize: 13, lineHeight: 18, marginTop: 2, opacity: 0.75 },
  verifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4,
  },
  verifyChipText: { fontSize: 12, fontWeight: '700' },
  heroLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  heroLinkText: { flex: 1, fontSize: 13, fontWeight: '600' },

  notice: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Sections
  section: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    paddingBottom: 4,
    marginBottom: 14,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15.5, fontWeight: '800' },
  sectionDescription: { fontSize: 12.5, marginTop: 2, opacity: 0.7 },
  row: { flexDirection: 'row', gap: 12 },
  column: { flexDirection: 'column', gap: 0 },

  // Fields
  field: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  label: { fontSize: 13, fontWeight: '700', flex: 1 },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  lockText: { fontSize: 10.5, fontWeight: '800' },
  counter: { fontSize: 11.5, opacity: 0.6 },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputShellMultiline: { alignItems: 'flex-start', minHeight: 84 },
  focusGlow: {
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputIcon: { marginRight: 8 },
  inputIconTop: { marginTop: 14 },
  prefix: { fontSize: 14.5, opacity: 0.55, flexShrink: 1, maxWidth: '60%' },
  input: { flex: 1, fontSize: 15, paddingVertical: 12, minWidth: 60 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 13 },
  inputLocked: { opacity: 0.75 },
  trailing: { marginLeft: 8, minWidth: 20, alignItems: 'center' },
  helper: { fontSize: 12.5, lineHeight: 17, marginTop: 6 },

  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
    marginBottom: 16,
  },
  suggestionLabel: { fontSize: 12.5, opacity: 0.7, marginRight: 2 },
  suggestionChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  suggestionText: { fontSize: 13, fontWeight: '600' },

  // Sticky save bar
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  saveBarInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBarHint: { flex: 1, fontSize: 13, opacity: 0.75 },
  discardBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: { fontSize: 14, fontWeight: '700' },
  saveBtn: { width: 'auto', height: 44, paddingHorizontal: 18, borderRadius: 12 },
  disabledBtn: { opacity: 0.5 },
});
