import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { baseUrl } from '../components/HomeScreenComponents';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import axios from 'axios';
import { useAppDataContext } from '@components/EventContext';
// import storage from '@react-native-firebase/storage'; // Future Firebase import

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}
// Assuming you have your RootStackParamList defined as discussed
type RootStackParamList = {
  CreatePost: { type: 'post' | 'poll' };
};

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'CreatePost'>;
  route: RouteProp<RootStackParamList, 'CreatePost'>;
}


const CreatePost = ({ route, navigation }: Props) => {
  const { type } = route.params;
  const [content, setContent] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
   const {
      currentUser
    } = useAppDataContext();

  const removeOption = (index: number) => {
    const newOpts = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newOpts);
  };

  const pickMedia = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'mixed',
      selectionLimit: 4 - mediaList.length, 
    };
    const result = await launchImageLibrary(options);

    if (result.assets) {
      const newAssets: MediaItem[] = result.assets.map(asset => ({
        uri: asset.uri || '',
        type: (asset.type?.includes('video') ? 'video' : 'image') as 'image' | 'video',
      }));
      setMediaList(prev => [...prev, ...newAssets].slice(0, 4));
    }
  };
  const handleCreatePost = async () => {
  if (!content && mediaList.length === 0) return;
  
  setIsUploading(true);
  setIsSuccess(false); 
  let finalMediaUrls: string[] = [];
  let mediaType: 'image' | 'video' | null = null;

  try {
    // --- START: MONGODB / CLOUDINARY UPLOAD LOGIC ---
    for (const item of mediaList) {
      const formData = new FormData();
      formData.append('file', {
        uri: item.uri,
        type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: item.type === 'video' ? 'upload.mp4' : 'upload.jpg',
      } as any);
      formData.append('upload_preset', 'your_cloudinary_preset');

      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dbdw3zftx/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(progress);
          },
        }
      );
      finalMediaUrls.push(response.data.secure_url);
      mediaType = item.type;
    }
    // --- END: MONGODB / CLOUDINARY UPLOAD LOGIC ---

    /* --- FUTURE FIREBASE MIGRATION LOGIC (Commented Out) ---
    for (const item of mediaList) {
      const fileName = item.uri.substring(item.uri.lastIndexOf('/') + 1);
      const reference = storage().ref(`posts/${currentUser.uid}/${fileName}`);
      const task = reference.putFile(item.uri);

      task.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      });

      await task;
      const url = await reference.getDownloadURL();
      finalMediaUrls.push(url);
      mediaType = item.type;
    }
    --- END FIREBASE LOGIC ---
    */

    // 2. CONSTRUCT THE POST OBJECT
    const postData = {
      userId: currentUser.uid, // Or currentUser.uid for Firebase
      content: content,
      media: finalMediaUrls.length > 0 ? {
        url: finalMediaUrls, // Array of strings
        mediaType: mediaType
      } : null,
      poll: type === 'poll' ? {
        options: pollOptions.map((opt, i) => ({
          optionId: `opt${i}`,
          text: opt,
          votes: []
        })),
        totalVotes: 0
      } : null,
      createdAt: new Date().toISOString(),
    };

    // 3. SEND TO DATABASE
    // Current MongoDB call:
    await axios.post(`${baseUrl}/posts/create`, postData);

    // Future Firebase call:
    // await firestore().collection('Posts').add(postData);

    navigation.goBack();
  } catch (error) {
    console.error("Upload failed", error);
    Toast.show({
                type: 'error',
                text2: 'Post upload failed, please retry',
                position: 'bottom',
                bottomOffset: 10,
              });
  } finally {
    setIsUploading(false);
    setUploadProgress(100);
    setIsSuccess(true);
    // Wait 1 second so user sees it finished
    await new Promise(resolve => setTimeout(() => resolve(null), 1000));
    setIsUploading(false);
    navigation.goBack();
  }
};

  // Logic: Can post if there's text OR if it's a poll with text OR if there's media
  const canPost = content.trim().length > 0 || mediaList.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, left: 10, right: 10, bottom: 10}}>
            <MaterialIcons name="chevron-left" size={32} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {type === 'poll' ? 'Create Poll' : 'Create Post'}
          </Text>

          <TouchableOpacity 
            style={[styles.postBtn, !canPost && styles.disabledBtn]} 
            disabled={!canPost}
            onPress={() => {
                handleCreatePost();
            }}
          >
            <Text style={styles.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Use ScrollView so long polls/media don't get cut off */}
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder={type === 'poll' ? "Ask a question..." : "What's happening?"}
            multiline
            autoFocus
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholderTextColor="#666"
          />

          {/* Poll Options */}
          {type === 'poll' && (
            <View style={styles.pollWrapper}>
              <Text style={styles.pollLabel}>Poll Options</Text>
              {pollOptions.map((opt, index) => (
                <View key={index} style={styles.pollInputContainer}>
                  <TextInput
                    style={styles.pollInput}
                    placeholder={`Option ${index + 1}`}
                    value={opt}
                    onChangeText={(val) => {
                      const newOpts = [...pollOptions];
                      newOpts[index] = val;
                      setPollOptions(newOpts);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removeOption(index)}>
                      <MaterialIcons name="remove-circle-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <TouchableOpacity 
                  style={styles.addOptionBtn} 
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Text style={styles.addOptionText}>+ Add another option</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Media Grid Preview */}
          {mediaList.length > 0 && (
            <View style={styles.mediaContainer}>
              {mediaList.map((item, index) => (
                <View key={index} style={styles.mediaPreviewWrapper}>
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
                  ) : (
                    <View style={[styles.mediaPreview, styles.videoPlaceholder]}>
                      <MaterialIcons name="videocam" size={30} color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removeButton} 
                    onPress={() => setMediaList(prev => prev.filter((_, i) => i !== index))}
                  >
                    <MaterialIcons name="cancel" size={22} color="#f54b02" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
            <TouchableOpacity 
                onPress={pickMedia} 
                style={[styles.toolbarBtn, (type === 'poll' || mediaList.length >= 4) && { opacity: 0.5 }]}
                disabled={type === 'poll' || mediaList.length >= 4} 
            >
                <MaterialIcons name="image" size={26} color="#f54b02" />
                <Text style={styles.toolbarText}>Photo/Video</Text>
            </TouchableOpacity>
        </View>
        {isUploading && (
  <View style={[
    styles.bottomToastContainer, 
    isSuccess && styles.successToast // Turns green on success
]}>
  <View style={styles.toastContent}>
    <View style={styles.toastHeader}>
      <Text style={[
          styles.toastTitle, 
          isSuccess && styles.successTitle // Turns text white on success
      ]}>
        {isSuccess ? "Post Published!" : "Publishing your post..."}
      </Text>
      {isSuccess ? (
        <MaterialIcons name="check-circle" size={24} color="#FFF" />
      ) : (
        <Text style={styles.toastPercentage}>{Math.round(uploadProgress)}%</Text>
      )}
    </View>
    
    {!isSuccess && (
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
      </View>
    )}
  </View>
</View>
)}
        <Toast config={toastConfig} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  postBtn: {
    backgroundColor: '#f54b02',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledBtn: {
    backgroundColor: '#f78d60', // Faded blue
  },
  postBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  contentBody: {
    padding: 15,
  },
  input: {
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pollWrapper: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 15,
  },
  pollLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  pollInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  pollInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  addOptionBtn: {
    marginTop: 5,
    alignItems: 'center',
  },
  addOptionText: {
    color: '#f54b02',
    fontSize: 15,
    fontWeight: '500',
  },
  mediaPreviewContainer: {
    marginTop: 15,
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  toolbarText: {
    marginLeft: 8,
    color: '#f54b02',
    fontWeight: '600',
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  mediaPreviewWrapper: {
    width: '48%', // Show 2 items per row
    margin: '1%',
    aspectRatio: 1, // Keep them square
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  progressOverlay: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80, // Adjust to sit above your toolbar
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    // Add shadow to make it pop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    zIndex: 9999, // Ensure it's on top of all other layers
  },
  toastContent: {
    padding: 15,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  toastPercentage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f54b02',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f54b02',
  },
  successToast: {
    backgroundColor: '#28a745', // Green color for success
    borderColor: '#1e7e34',
  },
  successTitle: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default CreatePost;