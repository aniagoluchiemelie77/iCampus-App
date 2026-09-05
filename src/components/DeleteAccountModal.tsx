import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  Modal,
} from 'react-native';
import { handleFinalDelete } from '../api/localDeleteApis';
import { useAppSelector } from '../hooks/hooks';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export const DeleteAccountModal = ({
  visible,
  onClose,
  navigation,
}: DeleteModalProps) => {
  const user = useAppSelector(state => state.user) || {};
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [emailError, setEmailError] = useState('');
  const popularReasons = [
    'Too expensive',
    'Found a better alternative',
    'Hard to use',
    'Missing features',
    'Temporary break',
  ];

  const nextStep = () => setStep(prev => prev + 1);
  const validateEmailAndProceed = () => {
    setEmailError('');
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email format.');
      return;
    }
    const inputEmail = email.toLowerCase();
    const isPrimaryMatch = inputEmail === user.email.toLowerCase();
    const alternates = user.recoveryEmails || [];
    const isAlternateMatch = alternates.some(
      alt => alt.email.toLowerCase() === inputEmail.toLowerCase().trim(),
    );

    if (isPrimaryMatch || isAlternateMatch) {
      nextStep();
    } else {
      setEmailError('This email does not match our records.');
    }
  };
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
            style={{ width: '100%' }}
          >
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              To continue, please enter your email address:
            </Text>
            <View style={[styles.inputGroup, { borderColor: colors.border }]}>
              <MaterialIcons
                name="email"
                size={20}
                color={colors.primary}
                style={{ marginRight: 7 }}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email..."
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
            {emailError && (
              <Text style={[styles.errorText, { color: colors.primary }]}>
                {emailError}
              </Text>
            )}

            <CustomButton
              title="Continue"
              onPress={validateEmailAndProceed}
              style={styles.continueBtn}
            />
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
            style={{ width: '100%' }}
          >
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              Why are you leaving us? Help us improve (Optional)
            </Text>
            <View style={styles.chipContainer}>
              {popularReasons.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    reason === item && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setReason(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reason === item
                        ? {
                            color: '#fff',
                          }
                        : {
                            color: colors.primary,
                          },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.inputGroup, { borderColor: colors.border }]}>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.input, { color: colors.text }]}
                placeholder="Tell us more..."
                multiline
              />
            </View>
            <CustomButton
              title="Continue"
              onPress={nextStep}
              style={styles.continueBtn}
            />
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
            style={{ width: '100%' }}
          >
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              Deleting your account is permanent. You will lose all your iCampus
              history.
            </Text>
            <CustomButton
              title="I Understand"
              onPress={nextStep}
              style={styles.continueBtn}
            />
          </Animated.View>
        );
      case 4:
        return (
          <View style={{ width: '100%' }}>
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              We're really sad to see you go. iCampus won't be the same without
              you.
            </Text>
            <CustomButton
              title="Delete my account forever"
              onPress={() => handleFinalDelete({ navigation, reason })}
              style={styles.continueBtn}
            />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons
            name={'info-outline'}
            color={colors.primary}
            size={60}
          />
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
            Delete Account
          </Text>
          {renderStep()}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 25,
    padding: 25,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 25,
  },
  modalSubtitle: {
    marginBottom: 20,
    fontSize: 14,
    width: '100%',
    lineHeight: 20,
  },
  errorIcon: {
    marginVertical: 15,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chip: {
    padding: 10,
    margin: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  inputGroup: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  continueBtn: {
    paddingHorizontal: 15,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 14,
  },
});