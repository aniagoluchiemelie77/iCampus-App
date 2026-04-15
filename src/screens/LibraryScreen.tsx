import ReactNativeBlobUtil from 'react-native-blob-util';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Text,
  PermissionsAndroid,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import toastConfig from '@components/ToastConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import { baseUrl } from '../components/HomeScreenComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BookCard } from '../components/BookCard';
import { Book } from 'types/firebase';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from '../components/PageHeader.tsx';
const PLACEHOLDERS = ['book titles...', 'authors...', 'ISBN...', 'fields...'];

export const LibraryScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const user = useAppSelector(state => state.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleSearch = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `${baseUrl}users/library/search?q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'Could not connect to the library.',
      });
    } finally {
      setIsSearching(false);
    }
  };
  const handleDownload = async (url: string, fileName: string) => {
    if (Platform.OS === 'android' && Platform.Version < 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    const { config, fs } = ReactNativeBlobUtil;
    const fileDir = fs.dirs.DownloadDir;
    const cleanFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');

    config({
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        path: `${fileDir}/${cleanFileName}.pdf`,
        description: 'Downloading from iCampus Library',
        mime: 'application/pdf',
      },
    })
      .fetch('GET', url)
      .then(res => {
        console.log('Success:', res.path());
      })
      .catch(err =>
        Toast.show({
          type: 'error',
          text1: 'Download Failed',
          text2: err.message,
        }),
      );
  };
  const fetchFeaturedBooks = useCallback(async () => {
    setLoading(true);
    const userDept = user?.department || '';
    try {
      const response = await fetch(
        `${baseUrl}users/library/featured?department=${encodeURIComponent(
          userDept,
        )}`,
      );
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Library Fetch Error',
        text2: 'Could not connect to the library.',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.department]);
  useEffect(() => {
    fetchFeaturedBooks();
  }, [fetchFeaturedBooks]);
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [fadeAnim]);
  return (
    <SafeAreaView style={LibraryScreenStyles.container}>
      <PageHeader title="iCampus Library" />
      <View style={LibraryScreenStyles.searchBar}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {query.length === 0 && (
            <Animated.Text
              style={[
                LibraryScreenStyles.placeholderOverlay,
                { opacity: fadeAnim },
              ]}
            >
              Search {PLACEHOLDERS[placeholderIndex]}
            </Animated.Text>
          )}
          <TextInput
            placeholder=""
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            style={LibraryScreenStyles.input}
          />
        </View>
        <TouchableOpacity onPress={handleSearch}>
          <MaterialIcons name="search" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>
      {loading || isSearching ? (
        <View style={LibraryScreenStyles.loaderContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={LibraryScreenStyles.loadingText}>
            Searching iCampus Library...
          </Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onDownload={() => handleDownload(item.downloadUrl, item.title)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="book-open-variant"
              title="No Books Found"
              subtitle="We couldn't find any results for your search. Try adjusting your keywords."
              buttonText="Refresh Library"
              onPress={fetchFeaturedBooks}
            />
          }
        />
      )}
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};
export const LibraryScreenStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    alignItems: 'center',
  },
  cover: { width: 100, height: 140 },
  infoContainer: { flex: 1, padding: 12 },
  title: { fontSize: 16, fontWeight: '700', color: PRIMARY_COLOR },
  author: { fontSize: 13, color: PRIMARY_COLOR_TINT, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  badge: {
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: PRIMARY_COLOR },
  sizeText: { fontSize: 12, color: '#999' },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  downloadText: { color: '#FFF', fontWeight: '600', marginLeft: 6 },
  placeholderOverlay: {
    position: 'absolute',
    left: 4, // Align with TextInput padding
    fontSize: 15,
    color: '#999',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    backgroundColor: 'transparent',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: PRIMARY_COLOR_TINT,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontSize: 16,
  },
});