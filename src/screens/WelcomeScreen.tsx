import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WelcomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Good Evening Chiemelie</Text>
      <Text style={styles.subtitle}>Welcome Back</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#222',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
  },
});

export default WelcomeScreen;