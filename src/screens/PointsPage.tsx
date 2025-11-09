import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  CalendarScreenStyles,
} from '../assets/styles/colors';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type PointsPageRouteProp = RouteProp<RootStackParamList, 'PointsPage'>;
export type HeaderProps = {
  title: string;
  onBack: () => void;
};
interface Props {
  route: PointsPageRouteProp;
}
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
const PointsPage: React.FC<Props> = ({ route }) => {
  const { mode } = route.params;
  const navigation = useNavigation();
  return (
    <View>
      <CustomHeader title="My Points" onBack={() => navigation.goBack()} />
      <Text>PointsPage</Text>
    </View>
  );
};

export default PointsPage;