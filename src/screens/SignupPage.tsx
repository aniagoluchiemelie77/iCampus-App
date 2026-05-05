import { useRoute, RouteProp } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import { SignupScreenStyles } from '../assets/styles/colors';
import StudentSignup from '../components/StudentSignup';
import InstructorSignup from '../components/InstructorSignup';
import OtherUserSignup from '../components/OtherUserSignup';

type SignupPageParams = {
  role: 'student' | 'teacher' | 'other';
};

const roleConfig = {
  student: {
    component: <StudentSignup />,
  },
  teacher: {
    component: <InstructorSignup />,
  },
  other: {
    component: <OtherUserSignup />,
  },
};

const SignupPage = () => {
  const route = useRoute<RouteProp<{ params: SignupPageParams }, 'params'>>();
  const { role } = route.params;

  const { component } = roleConfig[role];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={SignupScreenStyles.bkg}
    >
      <IconBackground />
      {component}
    </KeyboardAvoidingView>
  );
};

export default SignupPage;
