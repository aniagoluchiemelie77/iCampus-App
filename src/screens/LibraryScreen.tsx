import ReactNativeBlobUtil from 'react-native-blob-util';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, Animated, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchFeaturedBooksByDepartment,
  searchLibraryBooks,
} from '../api/localGetApis.ts';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BookCard } from '../components/BookCard';
import { Book } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { useTheme } from '../context/ThemeContext';

const PLACEHOLDERS = ['book titles...', 'authors...', 'ISBN...', 'fields...'];

export const LibraryScreen: React.FC = () => {
  const { colors } = useTheme();
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
      const result = await searchLibraryBooks(query);

      if (result.success) {
        setBooks(result.books);
      } else {
        setBooks([]);
      }
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
  const handleDownload = useCallback(async (url: string, fileName: string) => {
    const { config, fs } = ReactNativeBlobUtil;
    const cleanFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
    const path = `${fs.dirs.DownloadDir}/${cleanFileName}.pdf`;

    try {
      await config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path: path,
          title: fileName,
          description: 'Downloading from iCampus Library',
          mime: 'application/pdf',
        },
      }).fetch('GET', url);

      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: 'Saved to Downloads',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: 'Please check your connection.',
      });
    }
  }, []);
  const fetchFeaturedBooks = useCallback(async () => {
    setLoading(true);
    const userDept = user?.department || '';
    try {
      const result = await fetchFeaturedBooksByDepartment(userDept);

      if (result.success) {
        setBooks(result.books);
      } else {
        setBooks([]);
      }
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
    let isMounted = true;
    const interval = setInterval(() => {
      if (!isMounted) return;

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(100),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted)
          setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
      });
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fadeAnim]);
  const onQueryChange = (text: string) => {
    setQuery(text);
    if (text.length === 0) fetchFeaturedBooks();
  };
  return (
    <SafeAreaView
      style={[
        LibraryScreenStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="iCampus Library" />
      <View
        style={[LibraryScreenStyles.searchBar, { borderColor: colors.border }]}
      >
        <View style={{ flex: 1 }}>
          {query.length === 0 && (
            <Animated.Text
              style={[
                LibraryScreenStyles.placeholderOverlay,
                { opacity: fadeAnim, color: colors.inputTextHolder },
              ]}
            >
              Search {PLACEHOLDERS[placeholderIndex]}
            </Animated.Text>
          )}
          <TextInput
            placeholder=""
            value={query}
            onChangeText={onQueryChange}
            onSubmitEditing={handleSearch}
            style={[LibraryScreenStyles.input, { color: colors.text }]}
          />
        </View>
        <TouchableOpacity onPress={handleSearch}>
          <MaterialIcons
            name="search"
            size={24}
            color={colors.inputTextHolder}
          />
        </TouchableOpacity>
      </View>
      {loading || isSearching ? (
        <View style={LibraryScreenStyles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[LibraryScreenStyles.loadingText, { color: colors.text }]}
          >
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
              iconName="search-off"
              title="No Books Found"
              subtitle="We couldn't find any results for your search. Try adjusting your keywords."
              buttonText="Refresh Library"
              onPress={fetchFeaturedBooks}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};
export const LibraryScreenStyles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    paddingHorizontal: 6,
    borderRadius: 12,
    height: 60,
    borderWidth: 1,
  },
  card: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    alignItems: 'center',
  },
  cover: { width: 50, height: 50, borderRadius: 10, overflow: 'hidden' },
  infoContainer: { flex: 1, padding: 12 },
  title: { fontSize: 14, fontWeight: '700' },
  author: { fontSize: 13, color: PRIMARY_COLOR_TINT, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: PRIMARY_COLOR },
  sizeText: { fontSize: 12 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  downloadText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  placeholderOverlay: {
    position: 'absolute',
    left: 4,
    fontSize: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  loaderContainer: {
    flex: 1,
    alignContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
  },
});