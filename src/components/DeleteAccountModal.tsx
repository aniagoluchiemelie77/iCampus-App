import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { handleFinalDelete } from '../api/localDeleteApis';
import { useAppSelector } from '../hooks/hooks';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

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
  const user = useAppSelector(state => state.user);
  const { colors } = useTheme();
  const [step, setStep] = useState(0); 
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
      alt => alt.email.toLowerCase() === inputEmail.toLowerCase(),
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
          >
            <Text style={styles.modalSubtitle}>
              To continue, please enter your email address:
            </Text>
            <View style={[styles.inputGroup, { borderColor: colors.border }]}>
              <MaterialIcons
                name="mail-outlined"
                size={14}
                color={colors.primary}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@campus.com"
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.input, {color: colors.text }]}
              />
            </View>
            {emailError && <Text style={[styles.errorText, { color: colors.primary }]}>{emailError}</Text>}
            <TouchableOpacity
              onPress={validateEmailAndProceed}
              style={[styles.continueBtn, { backgroundColor: colors.btnColor }]}
            >
              <Text style={[styles.continueBtnText, { color: colors.btnTextColor }]}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              Why are you leaving us? Help us improve (Optional)
            </Text>
            <View style={styles.chipContainer}>
              {popularReasons.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, reason === item && {backgroundColor: colors.primary}]}
                  onPress={() => setReason(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reason === item ? {
                        color: '#fff'
                      }:{
                        color: colors.text
                      }
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.input, {color: colors.text }]}
                placeholder="Tell us more..."
                multiline
              />
            </View>
            <TouchableOpacity onPress={nextStep} style={[styles.continueBtn, { backgroundColor: colors.btnColor }]}>
              <Text style={[styles.continueBtnText, { color: colors.btnTextColor }]}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <MaterialIcons
              name="error-outline-outlined"
              size={40}
              color={colors.primary}
              style={styles.errorIcon}
            />
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              Deleting your account is permanent. You will lose all your iCampus
              credits and history.
            </Text>
            <TouchableOpacity onPress={nextStep} style={[styles.continueBtn, { backgroundColor: colors.btnColor }]}>
              <Text style={[styles.continueBtnText, { color: colors.btnTextColor }]}>I Understand</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 4:
        return (
          <View>
            <MaterialIcons
              name="sentiment-dissatisfied-outlined"
              size={40}
              color={colors.primary}
              style={styles.errorIcon}
            />
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              We're sad to see you go. iCampus won't be the same without you.
            </Text>
            <TouchableOpacity
              onPress={() => handleFinalDelete({ navigation, reason })}
              style={[styles.continueBtn, { backgroundColor: colors.btnColor }]}
            >
              <Text style={[styles.continueBtnText, { color: colors.btnTextColor }]}>
                Delete my account forever
              </Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => onClose()}
      swipeDirection="down"
      onSwipeComplete={() => onClose()}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>Delete Account</Text>
          {renderStep()}
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignContent: 'center',
  },
  modalContent: {
    borderRadius: 25,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginBottom: 15,
    fontSize: 14,
    width: '100%',
  },
  errorIcon: {
    marginVertical: 15,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 8,
  },
  chip: {
    padding: 10,
    margin: 1,
    borderRadius: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 0.8,
    marginBottom: 15,
  },
  input: {
    padding: 10,
    flex: 1,
    marginLeft: 5,
    fontSize: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  continueBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 20,
  },
  continueBtnText: {
    fontSize: 14
  },
});