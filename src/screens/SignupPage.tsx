import { useRoute, RouteProp } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import StudentSignup from '../components/StudentSignup';
import InstructorSignup from '../components/InstructorSignup';
import OtherUserSignup from '../components/OtherUserSignup';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
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
    <SafeAreaView style={styles.safeArea}>
      <IconBackground />
      <KeyboardAvoidingView
        style={styles.bkg}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {component}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  bkg: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});

export default SignupPage;
