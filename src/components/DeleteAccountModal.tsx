import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { handleFinalDelete } from '../api/localDeleteApis';
import { useAppSelector } from '../components/hooks';
import Modal from 'react-native-modal';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

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
  const [step, setStep] = useState(0); // 0 to 4
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

    // Check Primary
    const isPrimaryMatch = inputEmail === user.email.toLowerCase();

    // Check Alternates (default to empty array if null/undefined)
    const alternates = user.alternateEmails || [];
    const isAlternateMatch = alternates.some(
      alt => alt.toLowerCase() === inputEmail,
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
            <View style={styles.inputGroup}>
              <MaterialIcons
                name="mail-outlined"
                size={14}
                color={PRIMARY_COLOR}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@campus.com"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={styles.input}
              />
            </View>
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            <TouchableOpacity
              onPress={validateEmailAndProceed}
              style={styles.continueBtn}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={styles.modalSubtitle}>
              Why are you leaving us? Help us improve (Optional)
            </Text>
            <View style={styles.chipContainer}>
              {popularReasons.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, reason === item && styles.selectedChip]}
                  onPress={() => setReason(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reason === item && styles.selectedChipText,
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
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={styles.input}
                placeholder="Tell us more..."
                multiline
              />
            </View>
            <TouchableOpacity onPress={nextStep} style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>Continue</Text>
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
              color="#222"
              style={styles.errorIcon}
            />
            <Text style={styles.modalSubtitle}>
              Deleting your account is permanent. You will lose all your iCampus
              credits and history.
            </Text>
            <TouchableOpacity onPress={nextStep} style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>I Understand</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 4:
        return (
          <View>
            <MaterialIcons
              name="sentiment-dissatisfied-outlined"
              size={40}
              color="#222"
              style={styles.errorIcon}
            />
            <Text style={styles.modalSubtitle}>
              We're sad to see you go. iCampus won't be the same without you.
            </Text>
            <TouchableOpacity
              onPress={() => handleFinalDelete({ navigation, reason })}
              style={styles.continueBtn}
            >
              <Text style={styles.continueBtnText}>
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
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Account</Text>
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
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    width: '80%',
    alignContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 15,
  },
  modalSubtitle: {
    marginBottom: 15,
    fontSize: 14,
    color: '#222',
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
    backgroundColor: 'fadccc',
    borderRadius: 12,
  },
  selectedChip: {
    backgroundColor: PRIMARY_COLOR,
  },
  chipText: {
    fontSize: 14,
    color: '#2222',
  },
  selectedChipText: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR,
  },
  cancelBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 15,
  },
  input: {
    padding: 10,
    flex: 1,
    marginLeft: 5,
    color: '#2222',
    fontSize: 14,
    backgroundColor: '#fadccc',
  },
  errorText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  continueBtn: {
    width: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: PRIMARY_COLOR,
    marginVertical: 20,
  },
  continueBtnText: {
    fontSize: 14,
    color: '#fff',
  },
});