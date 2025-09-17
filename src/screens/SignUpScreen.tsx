import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';
import { Dropdown } from 'react-native-element-dropdown';

const SignUpScreen = () => {
  const [step, setStep] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [country, setCountry] = useState('');
  const [institution, setInstitution] = useState('');
  const [institutionItems, setInstitutionItems] = useState([]);
  const [userType, setUserType] = useState<'student' | 'lecturer' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [staffId, setStaffId] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Fetch universities based on selected country
  useEffect(() => {
    if (!country) return;
    fetch(
      'https://raw.githubusercontent.com/Asjad-Ilahi/world-universities-data/main/updated_universities.json',
    )
      .then(res => res.json())
      .then(data => {
        const filtered = data
          .filter((uni: any) => uni.country === country)
          .map((uni: any) => ({
            label: uni.name,
            value: uni.name,
          }));
        setInstitutionItems(filtered);
      });
  }, [country]);

  const nextStep = () => setStep(prev => prev + 1);

  const handleSubmit = () => {
    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept the terms and conditions');
      return;
    }

    const payload = {
      country,
      institution,
      userType,
      email,
      password,
      ...(userType === 'student' && { matricNumber, hobbies }),
      ...(userType === 'lecturer' && { staffId }),
    };

    console.log('Submitting:', payload);
    Alert.alert('Success', 'Account created!');
    // navigation.navigate('Home');
  };

  return (
    <View style={styles.bkg}>
      <View style={styles.container}>
        <Text style={styles.header}>Sign Up</Text>
        {step === 0 && (
          <>
            <TouchableOpacity
              onPress={() => setShowCountryPicker(true)}
              style={styles.selector}
            >
              <Text>{country || 'Select Country'}</Text>
            </TouchableOpacity>
            <CountryPicker
              show={showCountryPicker}
              lang="en" // ✅ Required prop
              pickerButtonOnPress={item => {
                setCountry(item.name.en);
                setShowCountryPicker(false);
                nextStep();
              }}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Dropdown
              data={institutionItems}
              labelField="label"
              valueField="value"
              search
              placeholder="Select Institution"
              value={institution}
              onChange={item => {
                setInstitution(item.value);
                nextStep();
              }}
              style={styles.dropdown}
            />
          </>
        )}

        {step === 2 && (
          <View style={styles.toggle}>
            <Button
              title="I'm a Student"
              onPress={() => {
                setUserType('student');
                nextStep();
              }}
            />
            <Button
              title="I'm a Lecturer"
              onPress={() => {
                setUserType('lecturer');
                nextStep();
              }}
            />
          </View>
        )}

        {step === 3 && (
          <>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <Button title="Next" onPress={nextStep} />
          </>
        )}

        {step === 4 && (
          <>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
            />
            <Button title="Next" onPress={nextStep} />
          </>
        )}

        {userType === 'student' && step === 5 && (
          <>
            <TextInput
              placeholder="Matric Number"
              value={matricNumber}
              onChangeText={setMatricNumber}
              style={styles.input}
            />
            <Button title="Next" onPress={nextStep} />
          </>
        )}

        {userType === 'student' && step === 6 && (
          <>
            <TextInput
              placeholder="Hobbies (optional)"
              value={hobbies}
              onChangeText={setHobbies}
              style={styles.input}
            />
            <Button title="Next" onPress={nextStep} />
          </>
        )}

        {userType === 'lecturer' && step === 5 && (
          <>
            <TextInput
              placeholder="Staff ID"
              value={staffId}
              onChangeText={setStaffId}
              style={styles.input}
            />
            <Button title="Next" onPress={nextStep} />
          </>
        )}

        {(step === 7 || (userType === 'lecturer' && step === 6)) && (
          <>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
              <Text style={{ color: termsAccepted ? 'green' : 'red' }}>
                {termsAccepted
                  ? '✓ Terms Accepted'
                  : '☐ Accept Terms & Conditions'}
              </Text>
            </TouchableOpacity>
            <Button title="Sign Up" onPress={handleSubmit} />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bkg: {
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    width: '90%',
    height: '60%',
    borderRadius: 10,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#41644A',
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    color: '#f8c662',
  },
  input: { borderBottomWidth: 1, marginBottom: 15, padding: 10 },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selector: { padding: 15, backgroundColor: '#eee', marginBottom: 20 },
  dropdown: { marginBottom: 20, borderWidth: 1, padding: 10 },
});

export default SignUpScreen;
