import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';

interface Props {
  reason?: string;
}

export const AccessDeniedScreen = ({ reason = "You do not have permission to view this session." }: Props) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <MaterialIcons name="lock-outline" size={80} color={PRIMARY_COLOR} />
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.reason}>{reason}</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 20,
    color: PRIMARY_COLOR,
  },
  reason: {
    fontSize: 16,
    textAlign: 'center',
    color: PRIMARY_COLOR_TINT,
    marginTop: 10,
    marginBottom: 30,
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});