import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import {handleFinalDelete} from '../api/localPostApis';
import { useAppSelector } from '../components/hooks';
import Modal from 'react-native-modal';
import {PRIMARY_COLOR} from '../assets/styles/colors';

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export const DeleteAccountFlow = ({
  visible,
  onClose,
  navigation,
}: DeleteModalProps) => {
    const user = useAppSelector(state => state.user);
  const [step, setStep] = useState(0); // 0 to 4
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');

  const nextStep = () => setStep(prev => prev + 1);
  const validateEmailAndProceed = () => {
  // 1. Email Regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email format.");
    return;
  }

  // 2. Check Primary and Alternate Emails
  const isPrimaryMatch = email.toLowerCase() === user.email.toLowerCase();
  const isAlternateMatch = user.alternateEmails?.some(
    alt => alt.toLowerCase() === email.toLowerCase()
  );

  if (isPrimaryMatch || isAlternateMatch) {
    nextStep();
  } else {
    alert("The email entered does not match our records for this account.");
  }
};
  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <>
            <Text style={styles.modalSubtitle}>To verify, please enter your email address:</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="email@campus.com" />
            <TouchableOpacity onPress={validateEmailAndProceed}>   
                <Text>Continue</Text>
            </TouchableOpacity>
          </>
        );
      case 2:
        return (
          <View>
            <Text>Why are you leaving us? (Optional)</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Tell us more..." />
            <Button title="Next" onPress={nextStep} />
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={{ color: 'red' }}>⚠️ WARNING</Text>
            <Text>Deleting your account is permanent. You will lose all your campus credits and history.</Text>
            <TouchableOpacity onPress={nextStep}>   
                <Text>I Understand</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View>
            <Text>We're sad to see you go. iCampus won't be the same without you. 😢</Text>
            <TouchableOpacity onPress={() => handleFinalDelete(navigation)}>
               <Text style={{ color: 'red' }}>Delete my account forever</Text>
            </TouchableOpacity>
          </View>
        );
    }
  }

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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  modalSubtitle: {
    marginVertical: 15,
    fontSize: 14,
    color: "#222"
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
    borderWidth: .8,
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
  }
});