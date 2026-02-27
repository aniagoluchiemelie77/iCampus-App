import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import type { User } from '../types/firebase';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CalendarScreenStyles } from '../assets/styles/colors';
import { Button } from 'react-native-paper'; // or any UI lib
import type { CalendarEvent } from '../types/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { baseUrl } from '../components/HomeScreenComponents';

type HeaderProps = {
  title: string;
  onBack: () => void;
};

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

const AddEventTabs: React.FC = () => {
  const navigation = useNavigation();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertMessage, setAlertMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user from AsyncStorage:', error);
      }
    };
    loadUser();
  }, []);
  const [activeTab, setActiveTab] = useState<
    'Private' | 'Public' | 'Department'
  >('Private');
  //const [eventType, setEventType] = useState<EventType>('Lectures');

  const [form, setForm] = useState<CalendarEvent>({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    eventStartTime: '',
    eventEndTime: '',
    eventType: undefined,
    isRecurring: false,
    recurrenceRule: '',
    tags: [],
    courseTitle: '',
    lectureType: undefined,
    restriction: '',
    department: user?.department ?? '',
    level: user?.current_level ?? '',
    creatorType: user?.usertype ?? 'student',
    createdBy: user?.uid ?? '',
    createdAt: new Date().toISOString(),
    id: '',
    _id: '',
  });
  if (!user) {
    return <ActivityIndicator size="large" color="#f54b02" />;
  }
  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const renderCommonFields = () => (
    <>
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Title: </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          placeholder="Event title..."
          placeholderTextColor={'#787777ff'}
          onChangeText={v => handleChange('title', v)}
        />
      </View>
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Description (optional): </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          placeholder="Event Description..."
          placeholderTextColor={'#787777ff'}
          onChangeText={v => handleChange('description', v)}
        />
      </View>
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Event Venue: </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          onChangeText={v => handleChange('location', v)}
          placeholder="Event Venue..."
          placeholderTextColor={'#787777ff'}
        />
      </View>
      <View style={CalendarScreenStyles.inputGroupDate}>
        <View style={CalendarScreenStyles.inputGroupDateSubdiv}>
          <Text style={CalendarScreenStyles.label}>Start Date:</Text>
          <TouchableOpacity
            style={CalendarScreenStyles.input2}
            onPress={() => setStartDatePickerVisibility(true)}
          >
            <Text>
              {startDate ? startDate.toDateString() : 'Select Event Start Date'}
            </Text>
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={isStartDatePickerVisible}
            mode="date"
            onConfirm={selectedDate => {
              setStartDatePickerVisibility(false);
              if (selectedDate) {
                setStartDate(selectedDate);
                handleChange('startDate', selectedDate.toISOString());
              }
            }}
            onCancel={() => setStartDatePickerVisibility(false)}
          />
        </View>

        <View style={CalendarScreenStyles.inputGroupDateSubdiv}>
          <Text style={CalendarScreenStyles.label}>End Date:</Text>
          <TouchableOpacity
            style={CalendarScreenStyles.input2}
            onPress={() => setEndDatePickerVisibility(true)}
          >
            <Text>
              {endDate ? endDate.toDateString() : 'Select Event End Date'}
            </Text>
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={isEndDatePickerVisible}
            mode="date"
            onConfirm={selectedDate => {
              setEndDatePickerVisibility(false);
              if (selectedDate) {
                setEndDate(selectedDate);
                handleChange('endDate', selectedDate.toISOString());
              }
            }}
            onCancel={() => setEndDatePickerVisibility(false)}
          />
        </View>
      </View>
      <View style={CalendarScreenStyles.inputGroupDate}>
        <View style={CalendarScreenStyles.inputGroupDateSubdiv}>
          <Text style={CalendarScreenStyles.label}>Event Start Time:</Text>
          <TouchableOpacity
            style={CalendarScreenStyles.input2}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Text>
              {startTime
                ? startTime.toLocaleTimeString()
                : 'Select Event Start Time'}
            </Text>
          </TouchableOpacity>
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime || new Date()}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartTimePicker(false);
                if (selectedDate) {
                  setStartTime(selectedDate);
                  handleChange(
                    'eventStartTime',
                    selectedDate.toLocaleTimeString(),
                  );
                }
              }}
            />
          )}
        </View>

        <View style={CalendarScreenStyles.inputGroupDateSubdiv}>
          <Text style={CalendarScreenStyles.label}>Event End Time:</Text>
          <TouchableOpacity
            style={CalendarScreenStyles.input2}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Text>
              {endTime ? endTime.toLocaleTimeString() : 'Select Event End Time'}
            </Text>
          </TouchableOpacity>
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime || new Date()}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndTimePicker(false);
                if (selectedDate) {
                  setEndTime(selectedDate);
                  handleChange(
                    'eventEndTime',
                    selectedDate.toLocaleTimeString(),
                  );
                }
              }}
            />
          )}
        </View>
      </View>
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Tags (optional): </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          onChangeText={v => handleChange('tags', v)}
          placeholder="eg 'Lectures', 'outings', etc ..."
          placeholderTextColor={'#787777ff'}
        />
      </View>
    </>
  );

  const renderPrivateFields = () => (
    <>
      {renderCommonFields()}
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Event Type: </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          onChangeText={v => handleChange('eventType', v)}
          placeholder="Event Type"
          placeholderTextColor={'#787777ff'}
        />
      </View>
      <View style={CalendarScreenStyles.inputGroupDate}>
        <Text style={CalendarScreenStyles.label}>Set as repeating event?</Text>
        <Switch
          value={isRecurring}
          onValueChange={value => {
            setIsRecurring(value);
            handleChange('isRecurring', value);
          }}
        />
      </View>
      {isRecurring && (
        <View style={CalendarScreenStyles.inputGroup}>
          <Text style={CalendarScreenStyles.label}>Recurrence Rule </Text>
          <TextInput
            style={CalendarScreenStyles.input}
            placeholder="e.g., Every Monday, Monthly, etc."
            placeholderTextColor={'#787777ff'}
            onChangeText={v => handleChange('recurrenceRule', v)}
          />
        </View>
      )}
    </>
  );

  const renderDepartmentFields = () => (
    <>
      {renderCommonFields()}
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Event Type: </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          onChangeText={v => handleChange('eventType', v)}
          placeholder="'Lectures', 'Sports', 'Outings', etc ..."
          placeholderTextColor={'#787777ff'}
        />
      </View>
      {form.eventType === 'Lectures' && (
        <>
          <View style={CalendarScreenStyles.inputGroup}>
            <Text style={CalendarScreenStyles.label}>Course Title: </Text>
            <TextInput
              style={CalendarScreenStyles.input}
              onChangeText={v => handleChange('courseTitle', v)}
              placeholder="Course Title..."
              placeholderTextColor={'#787777ff'}
            />
          </View>
          <View style={CalendarScreenStyles.inputGroup}>
            <Text style={CalendarScreenStyles.label}>Lecture Type: </Text>
            <TextInput
              style={CalendarScreenStyles.input}
              onChangeText={v => handleChange('courseTitle', v)}
              placeholder="'Lecture', 'Webinar', 'Seminar', 'Workshop'..."
              placeholderTextColor={'#787777ff'}
            />
          </View>
        </>
      )}
    </>
  );

  const renderPublicFields = () => (
    <>
      {renderCommonFields()}
      <View style={CalendarScreenStyles.inputGroup}>
        <Text style={CalendarScreenStyles.label}>Event Type: </Text>
        <TextInput
          style={CalendarScreenStyles.input}
          onChangeText={v => handleChange('eventType', v)}
          placeholder="'Lectures', 'Sports', 'Outings', etc ..."
          placeholderTextColor={'#787777ff'}
        />
      </View>
      {form.eventType === 'Lectures' && (
        <>
          <View style={CalendarScreenStyles.inputGroup}>
            <Text style={CalendarScreenStyles.label}>Course Title: </Text>
            <TextInput
              style={CalendarScreenStyles.input}
              onChangeText={v => handleChange('courseTitle', v)}
              placeholder="Course Title..."
              placeholderTextColor={'#787777ff'}
            />
          </View>
          <View style={CalendarScreenStyles.inputGroup}>
            <Text style={CalendarScreenStyles.label}>Lecture Type: </Text>
            <TextInput
              style={CalendarScreenStyles.input}
              onChangeText={v => handleChange('courseTitle', v)}
              placeholder="'Lecture', 'Webinar', 'Seminar', 'Workshop'..."
              placeholderTextColor={'#787777ff'}
            />
          </View>
          <View style={CalendarScreenStyles.inputGroupDate}>
            <Text style={CalendarScreenStyles.label}>
              Target a specific level?
            </Text>
            <Switch
              value={isRestricted}
              onValueChange={value => {
                setIsRestricted(value);
                handleChange('isRestricted', value);
              }}
            />
          </View>
          {isRestricted && (
            <View style={CalendarScreenStyles.inputGroup}>
              <Text style={CalendarScreenStyles.label}>Target Level:</Text>
              <TextInput
                style={CalendarScreenStyles.input}
                placeholder="e.g., 300, 200, 100, etc."
                placeholderTextColor={'#787777ff'}
                onChangeText={v => handleChange('restriction', v)}
              />
            </View>
          )}
        </>
      )}
    </>
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 2. Prepare event payload
      const basePayload: Omit<CalendarEvent, '_id' | 'id'> = {
        createdBy: user.uid,
        creatorType: user.usertype ? user.usertype : '',
        title: form.title,
        description: form.description,
        courseTitle: form.courseTitle,
        department: undefined,
        level: undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        eventType: form.eventType,
        lectureType: form.lectureType,
        visibility: activeTab.toLowerCase() as
          | 'private'
          | 'department'
          | 'public',
        restriction: form.restriction,
        createdAt: new Date().toISOString(),
        eventTime: undefined,
        location: form.location,
        eventStartTime: form.eventStartTime,
        eventEndTime: form.eventEndTime,
        isRecurring: undefined,
        recurrenceRule: undefined,
        tags: form.tags,
      };
      // 🔁 Extend based on activeTab
      let eventPayload: Omit<CalendarEvent, '_id' | 'id'>;
      if (activeTab === 'Private') {
        eventPayload = {
          ...basePayload,
          userId: user.uid,
          isRecurring: form.isRecurring,
          recurrenceRule: form.recurrenceRule || '',
        };
      } else if (activeTab === 'Department') {
        eventPayload = {
          ...basePayload,
          department: user.department,
          level: form.restriction,
        };
      } else if (activeTab === 'Public') {
        eventPayload = {
          ...basePayload,
          restriction: form.restriction,
        };
      } else {
        eventPayload = basePayload;
      }
      const token = await AsyncStorage.getItem('accessToken');
      // 3. Send to backend (replace with your actual endpoint)
      const response = await fetch(`${baseUrl}user/events/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // if using auth
        },
        body: JSON.stringify(eventPayload),
      });
      if (!response.ok) {
        setAlertType('error');
        setAlertMessage('Failed to create new event, please retry.');
        setAlertVisible(true);
      }
      // 4. Handle success
      const result = await response.json();
      console.log('Event created:', result);
      setAlertType('success');
      setAlertMessage('Event created successfully.');
      setAlertVisible(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={CalendarScreenStyles.container}>
      <CustomHeader title="Add Event" onBack={() => navigation.goBack()} />
      <View style={CalendarScreenStyles.tabContainer}>
        <Button
          onPress={() => setActiveTab('Private')}
          style={
            activeTab === 'Private'
              ? CalendarScreenStyles.activeTabButton
              : CalendarScreenStyles.inactiveTabButton
          }
          labelStyle={
            activeTab === 'Private'
              ? CalendarScreenStyles.tabTextActive
              : CalendarScreenStyles.tabTextInactive
          }
        >
          Private
        </Button>

        <Button
          onPress={() => setActiveTab('Public')}
          style={
            activeTab === 'Public'
              ? CalendarScreenStyles.activeTabButton
              : CalendarScreenStyles.inactiveTabButton
          }
          labelStyle={
            activeTab === 'Public'
              ? CalendarScreenStyles.tabTextActive
              : CalendarScreenStyles.tabTextInactive
          }
        >
          Public
        </Button>

        {user.isCourseRep && (
          <Button
            onPress={() => setActiveTab('Department')}
            style={
              activeTab === 'Department'
                ? CalendarScreenStyles.activeTabButton
                : CalendarScreenStyles.inactiveTabButton
            }
            labelStyle={
              activeTab === 'Department'
                ? CalendarScreenStyles.tabTextActive
                : CalendarScreenStyles.tabTextInactive
            }
          >
            Department
          </Button>
        )}
      </View>

      <View style={CalendarScreenStyles.tabContentsContainer}>
        {activeTab === 'Private' && renderPrivateFields()}
        {activeTab === 'Public' && renderPublicFields()}
        {activeTab === 'Department' && renderDepartmentFields()}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={CalendarScreenStyles.submitBtn}
        >
          {isSubmitting ? 'Submitting...' : 'Add Event'}
        </Button>
      </View>
      <SweetAlertModal
        visible={alertVisible}
        onConfirm={() => setAlertVisible(false)}
        title={
          alertType === 'success'
            ? 'Success!'
            : alertType === 'error'
            ? 'Oops!'
            : 'Notice'
        }
        message={alertMessage}
        type={alertType}
      />
    </ScrollView>
  );
};

export default AddEventTabs;
