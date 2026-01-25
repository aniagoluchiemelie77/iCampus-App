import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, } from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker'; // if you use this library
import { useState } from 'react';
import {baseUrl} from './HomeScreenComponents';
import { Dropdown } from 'react-native-element-dropdown';

export type VerifiedStudent = {
  firstname: string;
  lastname: string;
  department: string;
  current_level: string;
  phone_number: string;
  matriculation_number: string;
  school_name: string;
};
export const isValidEmail = (inputEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputEmail);
  };
export const isValidPassword = (inputPassword: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
    return passwordRegex.test(inputPassword);
  };
type ProgressBarProps = { step: number; setStep: (value: number) => void; };
const ProgressBar = ({ step, setStep }: ProgressBarProps) => {
  const steps = [0, 1, 2, 3, 4, 5];

  return (
    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
      {steps.map((s, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => setStep(s)}
          style={{
            flex: 1,
            height: 6,
            marginHorizontal: 4,
            borderRadius: 3,
            backgroundColor: s <= step ? '#4A90E2' : '#ccc',
          }}
        />
      ))}
    </View>
  );
};

const StudentSignup = () => {
  const [step, setStep] = useState(0);

  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [matric, setMatric] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudent | null>(null);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [institutionItems, setInstitutionItems] = useState<
      { label: string; value: string }[]
    >([]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const checkICampusOperational = async (institutionName: string) => {
    // API call here
    return true; // or false
  };

  const verifyMatricNumber = async (matric: string) => {
    // API call here
    // return VerifiedStudent or null
  };
  const verifyStudent = async () => {
  console.log('🔍 Verifying matric number...');
  setVerifying(true);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${baseUrl}verifyStudent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_name: institution,
        matriculation_number: matric,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Student verified:', data);
      setVerifiedStudent(data); // store VerifiedStudent object
      setStudentNotFound(false);
      nextStep(); // proceed to Email step
    } else {
      console.log('❌ Student not found');
      setStudentNotFound(true);
    }
  } catch (error) {
    console.error('Verification error:', (error as Error).message);
    setStudentNotFound(true);
  } finally {
    clearTimeout(timeout);
    setVerifying(false);
  }
};


  return (
    <View style={{ padding: 20 }}>

      <ProgressBar step={step} setStep={setStep} />
      <Text style={styles.title}>Student Signup</Text>

      {/* STEP 0 — Select Country */}
      {step === 0 && (
        <>
          <Text style={styles.inputHeader}>Select Country:</Text>

          <TouchableOpacity
            onPress={() => setShowCountryPicker(true)}
            style={styles.selector}
          >
            <Text style={styles.selectorHeader2}>
              {country || 'Select Country'}
            </Text>
          </TouchableOpacity>

          <CountryPicker
            show={showCountryPicker}
            lang="en"
            pickerButtonOnPress={item => {
              setCountry(item.name.en);
              setShowCountryPicker(false);
              nextStep();
            }}
          />
        </>
      )}

      {/* STEP 1 — Select Institution */}
      {step === 1 && (
        <>
          <Text style={styles.inputHeader}>Select Institution:</Text>

          <Dropdown
            data={institutionItems}
            labelField="label"
            valueField="value"
            search
            placeholder="Select Institution"
            value={institution}
            onChange={async item => {
              setInstitution(item.value);

              const operational = await checkICampusOperational(item.value);
              if (operational) {
                nextStep();
              } else {
                Alert.alert('iCampus is not operational for this institution.');
              }
            }}
            style={styles.dropdown}
          />
        </>
      )}

      {/* STEP 2 — Matric Number */}
      {step === 2 && (
        <>
          <Text style={styles.inputHeader}>Enter Matric Number:</Text>

          <TextInput
            placeholder="Matric Number"
            placeholderTextColor="#fff"
            value={matric}
            onChangeText={setMatric}
            style={styles.input}
          />

          <TouchableOpacity style={styles.toggleBtns} onPress={verifyStudent} disabled={matric.length < 3 || verifying} > <Text style={styles.selectorHeader}> {verifying ? 'Verifying...' : 'Verify'} </Text> </TouchableOpacity>
          {studentNotFound && ( <Text style={styles.validationText}>Matric number not found.</Text> )}

          {verifiedStudent && (
            <View style={{ marginTop: 10 }}>
              <Text>Firstname: {verifiedStudent.firstname}</Text>
              <Text>Lastname: {verifiedStudent.lastname}</Text>
              <Text>Department: {verifiedStudent.department}</Text>
              <Text>Level: {verifiedStudent.current_level}</Text>
            </View>
          )}
        </>
      )}

      {/* STEP 3 — Email */}
      {step === 3 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputKAVContainer}
        >
          <Text style={styles.inputHeader}>Enter your Email:</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#fff"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={styles.validationText}>
            {!isValidEmail(email) && email.length > 0
              ? 'Invalid email format'
              : ''}
          </Text>

          <TouchableOpacity
            style={styles.toggleBtns}
            onPress={nextStep}
            disabled={!isValidEmail(email)}
          >
            <Text style={styles.selectorHeader}>Next</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

      {/* STEP 4 — Password */}
      {step === 4 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputKAVContainer}
        >
          <Text style={styles.inputHeader}>Create Password:</Text>

          <TextInput
            placeholder="Password"
            placeholderTextColor="#000"
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isValidPassword(password) && password.length > 0 && (
            <Text style={styles.validationText}>
              Password must be at least 13 characters and include uppercase,
              lowercase, number, and symbol.
            </Text>
          )}

          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#000"
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {confirmPassword.length > 0 &&
            confirmPassword !== password && (
              <Text style={styles.validationText}>
                Passwords do not match.
              </Text>
            )}

          <TouchableOpacity
            style={[
              styles.toggleBtns,
              (!isValidPassword(password) ||
                confirmPassword !== password) &&
                styles.disabledBtn,
            ]}
            onPress={nextStep}
            disabled={
              !isValidPassword(password) ||
              confirmPassword !== password
            }
          >
            <Text style={styles.selectorHeader}>Next</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

      {/* STEP 5 — Confirm Email */}
      {step === 5 && (
        <>
          <Text style={styles.inputHeader}>Confirm Your Email</Text>
          <Text style={{ marginBottom: 20 }}>
            A confirmation link has been sent to: {email}
          </Text>

          <TouchableOpacity
            style={styles.toggleBtns}
            onPress={() => Alert.alert('Email confirmation resent')}
          >
            <Text style={styles.selectorHeader}>Resend Link</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    width: '33%', // step 1 of 3 for example
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  selected: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default StudentSignup;
