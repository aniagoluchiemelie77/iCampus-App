import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { SwiperFlatList } from 'react-native-swiper-flatlist';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainSignupStyles } from '../assets/styles/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const images = [
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769093997/WhatsApp_Image_2025-10-01_at_9.02.34_PM_mn5aox.jpg',
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769094810/startimage3_qolym4.jpg',
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769095199/startimage4_s9d9yi.jpg',
];

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
            style={MainSignupStyles.background}
            resizeMode="cover"
          />
        )}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['#00000000', '#000']}
        style={MainSignupStyles.gradient}
      />

      {/* Foreground Content */}
      <View style={MainSignupStyles.textContainer}>
        <Text style={MainSignupStyles.title}>
          Get started with{' '}
          <Text style={MainSignupStyles.titleColored}>iCampus</Text>
        </Text>

        <Text style={MainSignupStyles.titleText}>
          Please select a signup option
        </Text>

        <View style={MainSignupStyles.buttonRow}>
          <TouchableOpacity
            style={MainSignupStyles.buttonBoxWithBorder}
            onPress={() =>
              navigation.navigate('SignupPage', { role: 'student' })
            }
          >
            <Text style={MainSignupStyles.buttonText}>Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={MainSignupStyles.buttonBoxWithBorder}
            onPress={() =>
              navigation.navigate('SignupPage', { role: 'teacher' })
            }
          >
            <Text style={MainSignupStyles.buttonText}>Instructor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={MainSignupStyles.buttonBox}
            onPress={() => navigation.navigate('SignupPage', { role: 'other' })}
          >
            <Text style={MainSignupStyles.buttonText}>Other</Text>
          </TouchableOpacity>
        </View>
        <View style={MainSignupStyles.footerDiv}>
          <Text style={MainSignupStyles.footerDivText}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={MainSignupStyles.footerDivText2}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SignUpScreen;
