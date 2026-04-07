import React, {
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
//import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

//import { useNavigation } from '@react-navigation/native';
//import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
//import Logo from '../assets/images/Logo';
import { baseUrl } from './HomeScreenComponents';
//import AsyncStorage from '@react-native-async-storage/async-storage';
//import { useAppSelector } from './hooks';

interface StudentProps {
  lectureTitle: string;
  lectureId: string | number;
  lectureVideoUrl: string;
  admin?: boolean; // The new prop
  extraDetails?: any;
}

export const StudentRecordedLecturesScreen = ({ 
  lectureTitle, 
  lectureId, 
  lectureVideoUrl, 
  admin 
}: StudentProps) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Recorded Materials</Text>
      
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => handlePress(item)}
          >
            <View style={styles.thumbnailContainer}>
               <Image 
                 source={{ uri: item.thumbnail || 'https://via.placeholder.com/150' }} 
                 style={styles.thumbnail} 
               />
               <View style={styles.durationBadge}>
                 <Text style={styles.durationText}>{item.duration || '00:00'}</Text>
               </View>
            </View>

            <View style={styles.info}>
              <Text style={styles.topic}>{item.topicName}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <View style={styles.typeTag}>
                   <Text style={styles.typeTagText}>{item.lectureType}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      {admin && (
        <View style={styles.adminBadge}>
          <Text>Lecturer View: Management Mode Active</Text>
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', padding: 20, color: '#1A1A1A' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  thumbnailContainer: { position: 'relative' },
  thumbnail: { width: 120, height: 90 },
  durationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  durationText: { color: '#fff', fontSize: 10 },
  info: { flex: 1, padding: 10, justifyContent: 'center' },
  topic: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 12, color: '#888' },
  typeTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeTagText: { fontSize: 10, color: '#2196F3', fontWeight: 'bold' },
});