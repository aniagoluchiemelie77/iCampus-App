import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
  Platform,
  FlatList,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../components/hooks';
import {
  launchImageLibrary,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { UserAvatar } from '../components/UserAvatar';
import { UserIdentity } from '../components/UserIdentity';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Video from 'react-native-video';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper';
import { fetchUserConnections } from '../api/localGetApis';
import { submitOrUpdatePostService } from '../api/localPostApis';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../../App';
interface MediaItem {
  uri: string[];
  type: 'image' | 'video';
  isExisting?: boolean;
}
type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;
const CreatePost = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const editPostData = route.params?.post;
  const isEditMode = !!editPostData;

  const type = editPostData
    ? editPostData.poll
      ? 'poll'
      : 'post'
    : route.params?.type || 'post';

  const [content, setContent] = useState(
    editPostData ? editPostData.content : '',
  );
  const [pollOptions, setPollOptions] = useState<string[]>(
    editPostData?.poll ? editPostData.poll.options.map(o => o.text) : ['', ''],
  );
  const [mediaList, setMediaList] = useState<MediaItem[]>(
    editPostData?.media?.url
      ? [
          {
            // Force TypeScript to evaluate this strictly as an array of strings
            uri: (Array.isArray(editPostData.media.url)
              ? editPostData.media.url
              : [editPostData.media.url]) as string[],

            // Cast the generic string fallback into the exact union type allowed
            type: (editPostData.media?.mediaType || 'image') as
              | 'image'
              | 'video',
            isExisting: true,
          },
        ]
      : [],
  );

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const currentUser = useAppSelector(state => state.user);
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [mentionSearchKeyword, setMentionSearchKeyword] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadTaggingContext = async () => {
      try {
        const result = await fetchUserConnections();
        setFollowingUsers(result.data || []);
      } catch (err) {
        console.error('Failed to load user connections for tagging', err);
      }
    };
    loadTaggingContext();
  }, []);

  const handleContentChange = (text: string) => {
    setContent(text);

    // FIX: Look at the current text slice up to the current word boundary instead of absolute last string character
    const words = text.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord && currentWord.startsWith('@')) {
      const keyword = currentWord.slice(1);
      setMentionSearchKeyword(keyword);

      if (keyword.length === 0) {
        setFilteredUsers(followingUsers);
      } else {
        const matches = followingUsers.filter(
          user =>
            user.username?.toLowerCase().includes(keyword.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(keyword.toLowerCase()),
        );
        setFilteredUsers(matches);
      }
    } else {
      setMentionSearchKeyword(null);
      setFilteredUsers([]);
    }
  };

  const handleSelectUserToTag = (username: string) => {
    const words = content.split(/\s/);
    words.pop(); // Remove the incomplete '@username' fragment
    const baseContent = words.join(' ');

    // Append the autocomplete string neatly structured
    const newContent = baseContent
      ? `${baseContent} @${username} `
      : `@${username} `;
    setContent(newContent);

    setMentionSearchKeyword(null);
    setFilteredUsers([]);
  };

  const removeOption = (index: number) => {
    if (pollOptions.length <= 2) return; // Safeguard poll baseline constraints
    setPollOptions(prev => prev.filter((_, i) => i !== index));
  };

  const pickMedia = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'mixed',
      selectionLimit: 4 - mediaList.length,
    };
    const result = await launchImageLibrary(options);

    if (result.assets) {
      const newAssets: MediaItem[] = result.assets.map(asset => ({
        // FIX: Wrap the single local string URI path inside an array
        uri: [asset.uri || ''],
        type: asset.type?.includes('video') ? 'video' : 'image',
        isExisting: false,
      }));

      setMediaList(prev => [...prev, ...newAssets].slice(0, 4));
    }
  };

  const handleCreateOrUpdatePost = async () => {
    if (!content.trim() && mediaList.length === 0 && type !== 'poll') return;

    setIsUploading(true);
    setUploadProgress(0);
    let finalMediaUrls: string[] = [];
    let lastMediaType: 'image' | 'video' | null = null;

    try {
      const newMediaToUpload = mediaList.filter(item => !item.isExisting);
      const existingMediaUrls = mediaList
        .filter(item => item.isExisting)
        .map(item => item.uri);

      for (let i = 0; i < newMediaToUpload.length; i++) {
        const item = newMediaToUpload[i];
        // Distribute steps evenly per file chunk completed
        const currentProgress = Math.round((i / newMediaToUpload.length) * 100);
        setUploadProgress(currentProgress);
        const targetUri = item.uri[0];

        if (targetUri) {
          const downloadUrl = await uploadToFirebase(
            targetUri,
            `posts/${currentUser.uid}`,
          );

          finalMediaUrls.push(downloadUrl);
          lastMediaType = item.type;
        }
      }

      const combinedMediaUrls = [...existingMediaUrls, ...finalMediaUrls];
      if (mediaList.length > 0 && !lastMediaType) {
        lastMediaType = mediaList[0].type;
      }

      setUploadProgress(100);
      const postData = {
        userId: currentUser.uid,
        content: content,
        media:
          combinedMediaUrls.length > 0
            ? {
                url: combinedMediaUrls,
                mediaType: lastMediaType,
              }
            : null,
        poll:
          type === 'poll'
            ? {
                options: pollOptions.map((opt, i) => ({
                  optionId:
                    editPostData?.poll?.options[i]?.optionId || `opt${i}`,
                  text: opt,
                  votes: editPostData?.poll?.options[i]?.votes || [],
                })),
                totalVotes: editPostData?.poll?.totalVotes || 0,
              }
            : null,
        updatedAt: isEditMode ? new Date().toISOString() : undefined,
        createdAt: isEditMode
          ? editPostData.createdAt
          : new Date().toISOString(),
      };

      await submitOrUpdatePostService(
        postData,
        isEditMode,
        editPostData?.postId,
      );

      setIsSuccess(true);
      Toast.show({
        type: 'success',
        text2: isEditMode
          ? 'Post updated successfully!'
          : 'Post created successfully!',
      });

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Post processing failed', error);
      Toast.show({
        type: 'error',
        text2: 'Upload failed, please retry',
        position: 'bottom',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // FIX: Allow post interactions to succeed if media layers exist independently of string parameters
  const hasValidTextOrMedia = content.trim().length > 0 || mediaList.length > 0;
  const hasValidPoll =
    type === 'poll' &&
    pollOptions.filter(opt => opt.trim().length > 0).length >= 2;
  const canPost = type === 'poll' ? hasValidPoll : hasValidTextOrMedia;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <PageHeader
          title={
            isEditMode
              ? 'Edit Post'
              : type === 'poll'
              ? 'Create Poll'
              : 'Create Post'
          }
          rightElement={
            <TouchableOpacity
              style={[
                styles.postBtn,
                { backgroundColor: colors.btnColor },
                !canPost && styles.disabledBtn,
              ]}
              disabled={!canPost}
              onPress={handleCreateOrUpdatePost}
            >
              <Text
                style={[styles.postBtnText, { color: colors.btnTextColor }]}
              >
                {isEditMode ? 'Save' : 'Post'}
              </Text>
            </TouchableOpacity>
          }
        />

        <TextInput
          placeholder={
            type === 'poll' ? 'Ask a question...' : "What's happening?"
          }
          multiline
          autoFocus
          style={[styles.input, { color: colors.text }]}
          value={content}
          onChangeText={handleContentChange}
          placeholderTextColor={colors.inputTextHolder}
        />

        {type === 'poll' && (
          <View style={styles.pollWrapper}>
            <Text style={[styles.pollLabel, { color: colors.text }]}>
              Poll Options
            </Text>
            {pollOptions.map((opt, index) => (
              <View key={index} style={styles.pollInputContainer}>
                <TextInput
                  style={[styles.pollInput, { color: colors.text }]}
                  placeholder={`Option ${index + 1}`}
                  value={opt}
                  placeholderTextColor={colors.inputTextHolder}
                  onChangeText={val => {
                    const newOpts = [...pollOptions];
                    newOpts[index] = val;
                    setPollOptions(newOpts);
                  }}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(index)}>
                    <MaterialIcons
                      name="cancel-outlined"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {pollOptions.length < 4 && (
              <TouchableOpacity
                style={[styles.addOptionBtn, { borderColor: colors.primary }]}
                onPress={() => setPollOptions([...pollOptions, ''])}
              >
                <Text style={[styles.addOptionText, { color: colors.primary }]}>
                  Add another option
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {mediaList.length > 0 && (
          <View style={styles.mediaContainer}>
            {mediaList.map((item, index) => (
              <View key={index} style={styles.mediaPreviewWrapper}>
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: item.uri[0] }} // <-- FIXED: Access the string at index 0
                    style={styles.mediaPreview}
                  />
                ) : (
                  <Video
                    source={{ uri: item.uri[0] }} // <-- FIXED: Access the string at index 0
                    style={styles.mediaPreview}
                    muted
                    repeat
                    resizeMode="cover"
                    paused={false}
                    controls={false}
                    shutterColor="transparent"
                  />
                )}
                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={() =>
                    setMediaList(prev => prev.filter((_, i) => i !== index))
                  }
                >
                  <MaterialIcons
                    name="cancel-outlined"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {mentionSearchKeyword !== null && filteredUsers.length > 0 && (
          <View
            style={[
              styles.mentionOverlayContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item.uid || item.id}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.mentionUserItem}
                  onPress={() => handleSelectUserToTag(item.username)}
                >
                  <UserAvatar
                    profilePic={item.profilePic}
                    firstName={item.firstname}
                    lastName={item.lastname}
                    organizationName={item.organizationName}
                    style={styles.miniAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <UserIdentity
                      firstname={item.firstname}
                      lastname={item.lastname}
                      username={item.username}
                      tier={item.tier}
                      size="small"
                      isOrganization={item.usertype === 'enterprise'}
                      organizationName={item.organizationName}
                    />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={pickMedia}
          style={[
            styles.toolbarBtn,
            (type === 'poll' || mediaList.length >= 4) && { opacity: 0.5 },
          ]}
          disabled={type === 'poll' || mediaList.length >= 4}
        >
          <MaterialIcons
            name="image-outlined"
            size={26}
            color={colors.primary}
          />
          <Text style={[styles.toolbarText, { color: colors.primary }]}>
            Photo/Video
          </Text>
        </TouchableOpacity>

        {isUploading && (
          <View style={styles.bottomToastContainer}>
            <View style={styles.toastHeader}>
              <Text
                style={[
                  styles.toastTitle,
                  isSuccess
                    ? { color: colors.success }
                    : { color: colors.text },
                ]}
              >
                {isSuccess ? 'Post Action Completed!' : 'Processing...'}
              </Text>
              {isSuccess && (
                <MaterialIcons
                  name="check-circle-outlined"
                  size={24}
                  color={colors.success}
                />
              )}
            </View>
            {!isSuccess && (
              <View
                style={[
                  styles.progressBarBackground,
                  { backgroundColor: colors.primaryTint },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${uploadProgress}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15, position: 'relative' },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
  },
  disabledBtn: { opacity: 0.5 },
  postBtnText: { fontSize: 14, fontWeight: 'bold' },
  input: { fontSize: 14, textAlignVertical: 'top', minHeight: 100 },
  pollWrapper: { marginVertical: 15 },
  pollLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pollInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    width: '100%',
    height: 60,
    borderWidth: 0.8,
    borderRadius: 10,
    paddingHorizontal: 7,
  },
  pollInput: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
  },
  addOptionBtn: {
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
  },
  addOptionText: { fontSize: 14, fontWeight: 'bold' },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 15,
  },
  mediaPreviewWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  mediaPreview: { width: 80, height: 80, borderRadius: 8 },
  videoPlaceholder: {
    backgroundColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  removeButton: {
    top: -5,
    right: -5,
    padding: 7,
    borderRadius: 4,
  },
  toolbarBtn: { alignContent: 'center', borderWidth: 1, padding: 9 },
  toolbarText: {
    marginTop: 5,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    padding: 15,
    borderRadius: 10,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
  },
  toastTitle: { fontSize: 14, fontWeight: 'bold' },
  progressBarBackground: {
    height: 4,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  mentionOverlayContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    maxHeight: 200,
    zIndex: 100,
  },
  mentionUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  mentionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
});

export default CreatePost;
