import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SwiperFlatList } from 'react-native-swiper-flatlist';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { PRIMARY_COLOR } from '../assets/styles/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const images = [
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769093997/WhatsApp_Image_2025-10-01_at_9.02.34_PM_mn5aox.jpg',
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769094810/startimage3_qolym4.jpg',
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769095199/startimage4_s9d9yi.jpg',
];

const screenWidth = Dimensions.get('window').width;
const { width, height } = Dimensions.get('window');
const SignUpScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  return (
    <View style={{ flex: 1 }}>
      {/* Background Carousel */}
      <SwiperFlatList
        autoplay
        autoplayDelay={9}
        autoplayLoop
        index={0}
        showPagination={false}
        data={images}
        renderItem={({ item }) => (
          <ImageBackground
            source={{ uri: item }}
            style={styles.background}
            resizeMode="cover"
          />
        )}
      />

      {/* Gradient Overlay */}
      <LinearGradient colors={['#00000000', '#000']} style={styles.gradient} />

      {/* Foreground Content */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Get started with <Text style={styles.titleColored}>iCampus</Text>
        </Text>

        <Text style={styles.titleText}>Please select a signup option</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.buttonBoxWithBorder}
            onPress={() =>
              navigation.navigate('SignupPage', { role: 'student' })
            }
          >
            <Text style={styles.buttonText}>Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonBoxWithBorder}
            onPress={() =>
              navigation.navigate('SignupPage', { role: 'teacher' })
            }
          >
            <Text style={styles.buttonText}>Lecturer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonBox, { borderRightWidth: 0 }]}
            onPress={() => navigation.navigate('SignupPage', { role: 'other' })}
          >
            <Text style={styles.buttonText}>Other</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerDiv}>
          <Text style={[styles.footerDivText, { color: '#fff' }]}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerDivText2}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    width,
    height,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  textContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  titleColored: {
    fontSize: 28,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    borderWidth: 1.3,
    borderRadius: 10,
    borderColor: PRIMARY_COLOR,
    marginBottom: 15,
  },
  buttonText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBottomDiv: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  footerDivText: {
    fontSize: 14,
    marginRight: 4,
  },
  footerDivText2: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  buttonBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBoxWithBorder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1.3,
    borderRightColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
});
export default SignUpScreen;
