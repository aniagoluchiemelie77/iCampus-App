import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import type { Notification } from '../types/firebase';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  CalendarScreenStyles,
} from '../assets/styles/colors';
import {HeaderProps} from './ProductDetails';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CustomHeader: React.FC<HeaderProps> = ({ title, onBack }) => {
  return (
    <View style={CalendarScreenStyles.headerContainer}>
      <TouchableOpacity
        onPress={onBack}
        style={CalendarScreenStyles.backButton}
      >
        <Icon name="arrow-back-outline" size={25} color="#f54b02" />
        <Text style={CalendarScreenStyles.headerTitle}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
};

const Notifications = () => {
    const user = useAppSelector(state => state.user);
    const navigation2 = useNavigation<NavigationProp>();
    const [notifications, setNotifications] = useState<Notification[]>([]);;

    //Fetch Notifications
    useEffect(() => {
        fetch(`http://192.168.1.98:5000/users/notifications?userId=${user.uid}&limit=10&offset=0`)
            .then(res => res.json())
            .then(data => {
                setNotifications(data.notifications);
            })
            .catch(err => console.error("Error:", err));
    }, [user?.uid]);
  return (
    <View>
      <CustomHeader
        title="Notifications"
        onBack={() => navigation2.goBack()}
      />
      <Text>Notifications</Text>
      {notifications.length === 0 ? (
        <Text>No notifications found.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notificationId}
          renderItem={({ item }) => (
            <View style={{ marginVertical: 8, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
              <Text>{item.message}</Text>
              <Text style={{ fontSize: 12, color: 'gray' }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default Notifications;