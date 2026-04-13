import ReactNativeBlobUtil from 'react-native-blob-util';

const handleDownload = (url: string, fileName: string) => {
  const { config, fs } = ReactNativeBlobUtil;
  const date = new Date();
  const fileDir = fs.dirs.DownloadDir; 

  config({
    fileCache: true,
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      path: `${fileDir}/${fileName}.pdf`,
      description: 'Downloading book from iCampus Library.',
    },
  })
    .fetch('GET', url)
    .then((res) => {
      console.log('File saved to ', res.path());
    });
};
export const LibraryScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      // Assuming you've built a proxy endpoint on your baseUrl
      const response = await fetch(`${baseUrl}library/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      Alert.alert("Search Error", "Could not connect to the library.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Re-use your Dashboard search bar style */}
      <View style={styles.searchBar}>
        <TextInput 
          placeholder="Search books, authors, ISBN..." 
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch}>
           <MaterialIcons name="search" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookCard 
            book={item} 
            onDownload={() => handleDownload(item.downloadUrl)} 
          />
        )}
      />
    </SafeAreaView>
  );
};