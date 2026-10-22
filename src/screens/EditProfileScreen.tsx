import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../hooks/hooks.ts';
import { InputGroup } from '../components/InputGroup';
import { PageHeader } from '../components/PageHeader.tsx';
import countries from 'i18n-iso-countries';
import { patchUserProfile } from '../api/localPatchApis';
import { checkUsernameAvailabilityAPI } from '../api/localGetApis';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/firebase';
import { CustomButton } from '../assets/components/AppUIComponents';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

// Same rules as the server (utils/username.js) so most problems show
// instantly; the server stays the source of truth for "taken".
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const normalizeUsername = (raw: string) =>
  raw.trim().replace(/^@+/, '').toLowerCase();
const localUsernameProblem = (name: string): string | null => {
  if (!name) return 'Enter a username.';
  if (name.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!/^[a-z]/.test(name)) return 'Start with a letter.';
  if (!/^[a-z0-9_]+$/.test(name)) return 'Use only letters, numbers and _.';
  if (/__/.test(name)) return "Two underscores in a row aren't allowed.";
  return null;
};

type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; message: string }
  | { state: 'invalid' | 'taken' | 'error'; message: string; suggestions?: string[] };

export const EditProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const isMounted = useRef(true);
  const user = useAppSelector((state: { user: User }) => state.user);

  const isStudent = user.usertype === 'student';
  const isEnterprise = user.usertype === 'enterprise';
  const isTeacher = user.usertype === 'lecturer';
  const isVerified = user.isVerified;
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    headline: user.headline || '',
    organizationName: user.organizationName || '',
    website: user.website || '',
    username: user.username || '',
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    department: user.department || '',
    email: user.email || '',
  });
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ state: 'idle' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const currentUsername = normalizeUsername(user.username || '');
  const typedUsername = normalizeUsername(formData.username);
  const usernameChanged = typedUsername !== currentUsername;

  // Debounced availability check while typing.
  useEffect(() => {
    if (!usernameChanged) {
      setUsernameStatus({ state: 'idle' });
      return;
    }
    const problem = localUsernameProblem(typedUsername);
    if (problem) {
      setUsernameStatus({ state: 'invalid', message: problem });
      return;
    }
    setUsernameStatus({ state: 'checking' });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailabilityAPI(typedUsername, controller.signal);
      if (controller.signal.aborted || !isMounted.current) return;
      if (!result.success) {
        setUsernameStatus({ state: 'error', message: result.message });
      } else if (result.available) {
        setUsernameStatus({ state: 'available', message: result.message });
      } else {
        setUsernameStatus({
          state: result.suggestions?.length || /taken/i.test(result.message) ? 'taken' : 'invalid',
          message: result.message,
          suggestions: result.suggestions,
        });
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typedUsername, usernameChanged]);

  const isChanged = useMemo(() => {
    return (
      formData.headline !== (user.headline || '') ||
      formData.organizationName !== (user.organizationName || '') ||
      formData.website !== (user.website || '') ||
      usernameChanged ||
      formData.firstname !== (user.firstname || '') ||
      formData.lastname !== (user.lastname || '') ||
      formData.department !== (user.department || '') ||
      formData.email !== (user.email || '')
    );
  }, [formData, user, usernameChanged]);

  // A changed username must be confirmed free before saving.
  const usernameBlocksSave =
    usernameChanged &&
    (usernameStatus.state === 'checking' ||
      usernameStatus.state === 'invalid' ||
      usernameStatus.state === 'taken');

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleUsernameChange = (text: string) =>
    // Lowercase, and drop characters a username can't contain.
    handleInputChange('username', text.toLowerCase().replace(/[^a-z0-9_@]/g, ''));

  const handleSave = async () => {
    if (isSaving || usernameBlocksSave) return;
    setIsSaving(true);
    try {
      const changedData: Partial<typeof formData> = {};
      const formKeys = Object.keys(formData) as Array<keyof typeof formData>;

      formKeys.forEach(key => {
        if (key === 'username') {
          if (usernameChanged) changedData.username = typedUsername;
          return;
        }
        const originalValue = (user[key] || '') as string;
        if (formData[key] !== originalValue) {
          changedData[key] = formData[key].trim();
        }
      });
      if (Object.keys(changedData).length === 0) {
        setIsSaving(false);
        return;
      }
      const result = await patchUserProfile(changedData);
      if (!isMounted.current) return;
      if (result?.success && result.data) {
        dispatch(setUser(result.data));
        Toast.show({
          type: 'success',
          text1: 'Profile updated',
          text2: changedData.username
            ? `You're now @${result.data.username}.`
            : 'Your changes have been saved.',
        });
        navigation.navigate('Profile', { identity: user.uid });
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
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const statusColor =
    usernameStatus.state === 'available'
      ? '#16a34a'
      : usernameStatus.state === 'checking' || usernameStatus.state === 'idle'
        ? colors.textMuted
        : '#dc2626';
  const statusIcon =
    usernameStatus.state === 'available'
      ? 'check-circle'
      : usernameStatus.state === 'error'
        ? 'wifi-off'
        : 'error-outline';

  const renderUsernameField = () => (
    <View style={styles.groupContainer}>
      <Text style={[styles.label, { color: colors.text }]}>Username</Text>
      <View
        style={[
          styles.usernameWrapper,
          {
            borderColor:
              usernameStatus.state === 'idle' || usernameStatus.state === 'checking'
                ? colors.border
                : statusColor,
          },
        ]}
      >
        <Text style={[styles.atSign, { color: colors.textMuted }]}>@</Text>
        <TextInput
          value={formData.username.replace(/^@+/, '')}
          onChangeText={handleUsernameChange}
          placeholder="your_username"
          placeholderTextColor={colors.inputTextHolder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={USERNAME_MAX + 1}
          style={[styles.usernameInput, { color: colors.text }]}
          accessibilityLabel="Username"
        />
        <View style={styles.statusSlot}>
          {usernameStatus.state === 'checking' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : usernameStatus.state !== 'idle' ? (
            <MaterialIcons name={statusIcon} size={20} color={statusColor} />
          ) : null}
        </View>
      </View>

      {usernameStatus.state === 'idle' ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Letters, numbers and _ only. People mention you as @{currentUsername || 'username'}.
        </Text>
      ) : usernameStatus.state === 'checking' ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Checking availability…
        </Text>
      ) : (
        <Text
          style={[styles.helperText, { color: statusColor }]}
          accessibilityLiveRegion="polite"
        >
          {usernameStatus.message}
        </Text>
      )}

      {'suggestions' in usernameStatus && !!usernameStatus.suggestions?.length && (
        <View style={styles.suggestionRow}>
          <Text style={[styles.suggestionLabel, { color: colors.textMuted }]}>Try:</Text>
          {usernameStatus.suggestions.map(suggestion => (
            <TouchableOpacity
              key={suggestion}
              onPress={() => handleInputChange('username', suggestion)}
              style={[
                styles.suggestionChip,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.suggestionText, { color: colors.primary }]}>
                @{suggestion}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderFieldError = (field: string) =>
    fieldErrors[field] ? (
      <Text style={[styles.fieldError]}>{fieldErrors[field]}</Text>
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Edit Profile"
        rightElement={
          isChanged && (
            <CustomButton
              title={isSaving ? 'Saving...' : 'Save'}
              onPress={handleSave}
              disabled={isSaving || usernameBlocksSave}
              style={[
                styles.saveBtn,
                (isSaving || usernameBlocksSave) && styles.disabledBtn,
              ]}
            />
          )
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <InputGroup
          label="Headline"
          value={formData.headline}
          type="text"
          placeholder="Enter your headline"
          placeholderTextColor={colors.inputTextHolder}
          onChangeText={text => handleInputChange('headline', text)}
        />

        {isEnterprise ? (
          <>
            <InputGroup
              label="Company Name"
              value={formData.organizationName}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('organizationName', text)}
              type="text"
              placeholder="Your company name"
              placeholderTextColor={colors.inputTextHolder}
            />
            <InputGroup
              label="Website"
              value={formData.website}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('website', text)}
              type="text"
              placeholder="https://..."
              placeholderTextColor={colors.inputTextHolder}
            />
          </>
        ) : (
          <>
            {renderUsernameField()}
            <InputGroup
              label="First Name"
              value={formData.firstname}
              isLocked={isVerified}
              onChangeText={text => handleInputChange('firstname', text)}
              type="text"
              placeholder="Enter your first name"
              placeholderTextColor={colors.inputTextHolder}
            />
            <InputGroup
              label="Last Name"
              isLocked={isVerified}
              value={formData.lastname}
              type="text"
              placeholder="Enter your last name"
              placeholderTextColor={colors.inputTextHolder}
              onChangeText={text => handleInputChange('lastname', text)}
            />
          </>
        )}

        {(isStudent || isTeacher) && (
          <InputGroup
            label="Department"
            isLocked={isVerified}
            value={formData.department}
            type="text"
            placeholder="Enter your department"
            placeholderTextColor={colors.inputTextHolder}
            onChangeText={text => handleInputChange('department', text)}
          />
        )}

        <InputGroup
          label="Email"
          value={formData.email}
          isLocked={isVerified}
          type="text"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Enter your email..."
          placeholderTextColor={colors.inputTextHolder}
          onChangeText={text => handleInputChange('email', text)}
        />
        {renderFieldError('email')}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  saveBtn: {
    paddingHorizontal: 8,
    height: 40,
    width: 'auto',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  groupContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  usernameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  atSign: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  statusSlot: {
    width: 24,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12.5,
    marginTop: 6,
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 12.5,
    marginTop: -10,
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 12.5,
    marginRight: 2,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
