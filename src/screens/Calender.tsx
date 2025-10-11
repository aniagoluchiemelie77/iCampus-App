import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { User } from '../types/firebase';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import {
  CalendarScreenStyles,
  HomeScreenComponentStyles as styles,
} from '../assets/styles/colors';
import { Button } from 'react-native-paper'; // or any UI lib

type EventType = 'Lectures' | 'Webinar' | 'Seminar' | 'Workshop' | 'Other';

type CalenderProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Calender'>;
};

type HeaderProps = {
  title: string;
  onBack: () => void;
};

interface Props {
  user: User;
}

const CustomHeader = ({ title, onBack }: HeaderProps) => {
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

const AddEventTabs: React.FC<Props> = ({ user }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<
    'Private' | 'Public' | 'Department'
  >('Private');
  const [eventType, setEventType] = useState<EventType>('Lectures');

  const [form, setForm] = useState<any>({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    eventType: '',
    isRecurring: false,
    recurrenceRule: '',
    tags: '',
    courseTitle: '',
    lectureType: '',
    restriction: '',
    department: user.department,
    level: user.current_level,
    creatorType: user.usertype,
  });

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const renderCommonFields = () => (
    <>
      <TextInput
        placeholder="Title"
        onChangeText={v => handleChange('title', v)}
      />
      <TextInput
        placeholder="Description (optional)"
        onChangeText={v => handleChange('description', v)}
      />
      <TextInput
        placeholder="Location"
        onChangeText={v => handleChange('location', v)}
      />
      <TextInput
        placeholder="Start Date"
        onChangeText={v => handleChange('startDate', v)}
      />
      <TextInput
        placeholder="End Date"
        onChangeText={v => handleChange('endDate', v)}
      />
      <TextInput
        placeholder="Start Time (optional)"
        onChangeText={v => handleChange('startTime', v)}
      />
      <TextInput
        placeholder="End Time (optional)"
        onChangeText={v => handleChange('endTime', v)}
      />
      <TextInput
        placeholder="Tags (optional)"
        onChangeText={v => handleChange('tags', v)}
      />
    </>
  );

  const renderPrivateFields = () => (
    <>
      {renderCommonFields()}
      <TextInput
        placeholder="Event Type (optional)"
        onChangeText={v => handleChange('eventType', v)}
      />
      <TextInput
        placeholder="Is Recurring? (true/false)"
        onChangeText={v => handleChange('isRecurring', v)}
      />
      <TextInput
        placeholder="Recurrence Rule (optional)"
        onChangeText={v => handleChange('recurrenceRule', v)}
      />
    </>
  );

  const renderDepartmentFields = () => (
    <>
      {renderCommonFields()}
      <TextInput
        placeholder="Event Type"
        onChangeText={v => handleChange('eventType', v)}
      />
      {form.eventType === 'Lectures' && (
        <>
          <TextInput
            placeholder="Course Title"
            onChangeText={v => handleChange('courseTitle', v)}
          />
          <TextInput
            placeholder="Lecture Type (Lecture/Webinar/Seminar/Workshop)"
            onChangeText={v => handleChange('lectureType', v)}
          />
        </>
      )}
    </>
  );

  const renderPublicFields = () => (
    <>
      {renderCommonFields()}
      <TextInput
        placeholder="Event Type"
        onChangeText={v => handleChange('eventType', v)}
      />
      {form.eventType === 'Lectures' && (
        <>
          <TextInput
            placeholder="Course Title"
            onChangeText={v => handleChange('courseTitle', v)}
          />
          <TextInput
            placeholder="Lecture Type"
            onChangeText={v => handleChange('lectureType', v)}
          />
          <TextInput
            placeholder="Restriction (optional)"
            onChangeText={v => handleChange('restriction', v)}
          />
        </>
      )}
    </>
  );

  const handleSubmit = () => {
    console.log('Submitting:', form);
    // Add your API call or state update here
  };

  return (
    <ScrollView contentContainerStyle={CalendarScreenStyles.container}>
      <CustomHeader title="Add Event" onBack={() => navigation.goBack()} />
      <View>
        <Button onPress={() => setActiveTab('Private')}>Private</Button>
        <Button onPress={() => setActiveTab('Public')}>Public</Button>
        {user.isCourseRep && (
          <Button onPress={() => setActiveTab('Department')}>Department</Button>
        )}
      </View>

      <View>
        {activeTab === 'Private' && renderPrivateFields()}
        {activeTab === 'Public' && renderPublicFields()}
        {activeTab === 'Department' && renderDepartmentFields()}
      </View>

      <Button mode="contained" onPress={handleSubmit}>
        Add Event
      </Button>
    </ScrollView>
  );
};

export default AddEventTabs;
