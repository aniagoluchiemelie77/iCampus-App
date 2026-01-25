import { useRoute, RouteProp } from '@react-navigation/native';
import { KeyboardAvoidingView, Text } from 'react-native';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';

type SignupPageParams = {
  role: 'student' | 'teacher' | 'other';
};

const roleConfig = {
  student: {
    title: 'Sign Up as Student',
    subtitle: 'Select your country',
    // component: <CountryPicker />  // optional future extension
  },
  teacher: {
    title: 'Sign Up as Instructor',
    subtitle: 'Enter your school name',
    // component: <SchoolInput />
  },
  other: {
    title: 'Sign Up',
    subtitle: 'Enter your email',
    // component: <EmailInput />
  },
};

const SignupPage = () => {
  const route = useRoute<RouteProp<{ params: SignupPageParams }, 'params'>>();
  const { role } = route.params;

  const { title, subtitle } = roleConfig[role];

  return (
    <KeyboardAvoidingView>
      <IconBackground />
      <Text>{title}</Text>
      <Text>{subtitle}</Text>

      {/* If you want to render specific components later:
          {roleConfig[role].component}
      */}
    </KeyboardAvoidingView>
  );
};

export default SignupPage;
