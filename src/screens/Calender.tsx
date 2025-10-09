import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

type CalenderProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Calender'>;
};

type HeaderProps = {
  title: string;
  onBack: () => void;
};

const CustomHeader = ({ title, onBack }: HeaderProps) => {
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back-outline" size={25} color="#f54b02" />
        <Text style={styles.headerTitle}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
};

const Calender = ({ navigation }: CalenderProps) => {
  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <CustomHeader title="Add Event" onBack={() => navigation.goBack()} />
      </ScrollView>
    </>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerContainer: {
    backgroundColor: '#fff',
    width: '100%',
    alignSelf: 'flex-start',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 17,
    color: '#f54b02',
    marginLeft: 8,
  },
});
export default Calender;
