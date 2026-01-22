import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, TouchableOpacity } from 'react-native';
import { SwiperFlatList } from 'react-native-swiper-flatlist';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const images = [
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769093997/WhatsApp_Image_2025-10-01_at_9.02.34_PM_mn5aox.jpg',
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769094810/startimage3_qolym4.jpg',
  'https://res.cloudinary.com/dbdw3zftx/image/upload/v1769095199/startimage4_s9d9yi.jpg',
];

const SignUpScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      
      {/* Background Carousel */}
      <SwiperFlatList
        autoplay
        autoplayDelay={5}
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
      <LinearGradient
        colors={['#00000000', '#000']}
        style={styles.gradient}
      />

      {/* Foreground Content */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Get started with <Text style={styles.titleColored}>iCampus</Text>
        </Text>

        <Text style={styles.titleText}>Please select a signup option</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.buttonBoxWithBorder}>
            <Text style={styles.buttonText}>Student</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonBoxWithBorder}>
            <Text style={styles.buttonText}>Instructor</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonBox}>
            <Text style={styles.buttonText}>Other</Text>
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
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },

  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },

  titleColored: {
    fontSize: 28,
    color: '#f54b02',
    fontWeight: 'bold',
  },

  titleText: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 10,
  },

  buttonRow: {
    flexDirection: 'row',
    width: '90%',
    borderWidth: 0.8,
    borderRadius: 10,
    borderColor: '#f54b02',
    marginBottom: 10,
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
    borderRightWidth: 0.8,
    borderRightColor: '#f54b02',
  },

  buttonText: {
    color: '#f54b02',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 9,
    textAlign: 'center',
  },
});

export default SignUpScreen;
