import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../assets/styles/colors';

export type ProgressBarProps = {
  step: number;
  setStep: (s: number) => void;
  totalSteps: number;
};

export const Footer = () => {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.footerDiv}>
      <Text style={styles.footerDivText}>
        Already have an account?
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.footerDivText2}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};
export const ProgressBar = ({
  step,
  setStep,
  totalSteps,
}: ProgressBarProps) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);
  return (
    <View style={styles.progressBarDiv}>
      {steps.map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => {
            if (s < step) {
              setStep(s);
            }
          }}
          style={[
            styles.progressClickable,
            { backgroundColor: s <= step ? PRIMARY_COLOR : PRIMARY_COLOR_TINT },
          ]}
        />
      ))}
    </View>
  );
};
const styles = StyleSheet.create({
    footerDiv: {
        flexDirection: 'row',
        marginTop: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    footerDivText: {
        color: '#fff',
        marginRight: 5,
        fontSize: 15,
    },
    footerDivText2: {
        color: PRIMARY_COLOR,
        fontSize: 15,
    },
    progressBarDiv: {
        flexDirection: 'row',
        marginVertical: 20,
        width: '90%',
    },
    progressClickable: {
       flex: 1,
       height: 6,
       marginHorizontal: 4,
       borderRadius: 3,
  },
})