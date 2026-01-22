import { useRoute, RouteProp } from '@react-navigation/native';
import { View, Text } from 'react-native';

type SignupPageParams = {
  role: 'student' | 'teacher' | 'other';
};

const SignupPage = () => {
  const route = useRoute<RouteProp<{ params: SignupPageParams }, 'params'>>(); 
  const { role } = route.params;

  return (
    <View >
      {role === 'student' && (
        <>
          <Text>Sign Up as Student</Text>
          <Text>Select your country</Text>
          {/* Country picker here */}
        </>
      )}

      {role === 'teacher' && (
        <>
          <Text>Sign Up as Instructor</Text>
          <Text>Enter your school name</Text>
          {/* School name input here */}
        </>
      )}

      {role === 'other' && (
        <>
          <Text>Sign Up</Text>
          <Text>Enter your email</Text>
          {/* Email input + Google/Gitirup buttons */}
        </>
      )}
    </View>
  );
};


export default SignupPage;