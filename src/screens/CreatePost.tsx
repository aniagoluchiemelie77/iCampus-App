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
import Video from 'react-native-video';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper';
import { fetchUserConnections } from '../api/localGetApis';
import { submitOrUpdatePostService } from '../api/localPostApis';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  isExisting?: boolean;
}

const CreatePost = ({ route, navigation }: any) => {
  const editPostData = route.params?.post;
  const isEditMode = !!editPostData;
  const type = editPostData
    ? editPostData.poll
      ? 'poll'
      : 'post'
    : route.params?.type || 'post';

  // 1. INITIAL STATES (Pre-filled if editing)
  const [content, setContent] = useState(
    editPostData ? editPostData.content : '',
  );
  const [pollOptions, setPollOptions] = useState<string[]>(
    editPostData?.poll
      ? editPostData.poll.options.map((o: any) => o.text)
      : ['', ''],
  );
  const [mediaList, setMediaList] = useState<MediaItem[]>(
    editPostData?.media?.url
      ? editPostData.media.url.map((url: string) => ({
          uri: url,
          type: editPostData.media.mediaType,
          isExisting: true,
        }))
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
      const result = await fetchUserConnections();
      setFollowingUsers(result.data);
    };
    loadTaggingContext();
  }, []);

  const handleContentChange = (text: string) => {
    setContent(text);
    const lastAtPos = text.lastIndexOf('@');
    if (
      lastAtPos !== -1 &&
      (lastAtPos === 0 || text.charAt(lastAtPos - 1) === ' ')
    ) {
      const keyword = text.slice(lastAtPos + 1);
      if (keyword.includes(' ')) {
        setMentionSearchKeyword(null);
        setFilteredUsers([]);
      } else {
        setMentionSearchKeyword(keyword);
        const matches = followingUsers.filter(
          user =>
            user.username.toLowerCase().includes(keyword.toLowerCase()) ||
            user.displayName.toLowerCase().includes(keyword.toLowerCase()),
        );
        setFilteredUsers(matches);
      }
    } else {
      setMentionSearchKeyword(null);
      setFilteredUsers([]);
    }
  };
  const handleSelectUserToTag = (username: string) => {
    if (mentionSearchKeyword !== null) {
      const lastAtPos = content.lastIndexOf('@');
      const baseContent = content.slice(0, lastAtPos);
      setContent(`${baseContent}@${username} `);
    }
    setMentionSearchKeyword(null);
    setFilteredUsers([]);
  };

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
        type: (asset.type?.includes('video') ? 'video' : 'image') as
          | 'image'
          | 'video',
        isExisting: false,
      }));
      setMediaList(prev => [...prev, ...newAssets].slice(0, 4));
    }
  };

  const handleCreateOrUpdatePost = async () => {
    if (!content && mediaList.length === 0) return;
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
        const currentProgress = Math.round((i / newMediaToUpload.length) * 100);
        setUploadProgress(currentProgress);
        const downloadUrl = await uploadToFirebase(
          item.uri,
          `posts/${currentUser.uid}`,
        );

        finalMediaUrls.push(downloadUrl);
        lastMediaType = item.type;
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
  const canPost = content.trim().length > 0 || mediaList.length > 0;

  return (
    <SafeAreaView style={styles.container}>
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
              style={[styles.postBtn, !canPost && styles.disabledBtn]}
              disabled={!canPost}
              onPress={handleCreateOrUpdatePost}
            >
              <Text style={styles.postBtnText}>
                {isEditMode ? 'Save' : 'Post'}
              </Text>
            </TouchableOpacity>
          }
        />
        {/* Scroll Input Containers */}
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder={
              type === 'poll' ? 'Ask a question...' : "What's happening?"
            }
            multiline
            autoFocus
            style={styles.input}
            value={content}
            onChangeText={handleContentChange}
            placeholderTextColor={PRIMARY_COLOR_TINT}
          />

          {/* Poll Render Pipeline */}
          {type === 'poll' && (
            <View style={styles.pollWrapper}>
              <Text style={styles.pollLabel}>Poll Options</Text>
              {pollOptions.map((opt, index) => (
                <View key={index} style={styles.pollInputContainer}>
                  <TextInput
                    style={styles.pollInput}
                    placeholder={`Option ${index + 1}`}
                    value={opt}
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
                        color={PRIMARY_COLOR}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Text style={styles.addOptionText}> Add another option</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* Media Grid Preview Panel */}
          {mediaList.length > 0 && (
            <View style={styles.mediaContainer}>
              {mediaList.map((item, index) => (
                <View key={index} style={styles.mediaPreviewWrapper}>
                  {item.type === 'image' ? (
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.mediaPreview}
                    />
                  ) : (
                    <Video
                      source={{ uri: item.uri }}
                      style={styles.mediaPreview}
                      muted={true}
                      repeat={true}
                      resizeMode="cover"
                      paused={false}
                      controls={false}
                      shutterColor="transparent"
                    />
                  )}

                  {/* Remove Button Overlay */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      setMediaList(prev => prev.filter((_, i) => i !== index))
                    }
                  >
                    <MaterialIcons
                      name="cancel-outlined"
                      size={22}
                      color={PRIMARY_COLOR}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* --- Floating Mentions List UI Overlay --- */}
        {mentionSearchKeyword !== null && filteredUsers.length > 0 && (
          <View style={styles.mentionOverlayContainer}>
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

        {/* Bottom Tool Bar */}
        <View style={styles.toolbar}>
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
              color={PRIMARY_COLOR}
            />
            <Text style={styles.toolbarText}>Photo/Video</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Progress Drawer */}
        {isUploading && (
          <View style={styles.bottomToastContainer}>
            <View>
              <View style={styles.toastHeader}>
                <Text
                  style={[styles.toastTitle, isSuccess && styles.successTitle]}
                >
                  {isSuccess ? 'Post Action Completed!' : 'Processing...'}
                </Text>
                {isSuccess ? (
                  <MaterialIcons
                    name="check-circle-outlined"
                    size={24}
                    color={PRIMARY_COLOR}
                  />
                ) : (
                  <Text style={styles.toastPercentage}>
                    {Math.round(uploadProgress)}%
                  </Text>
                )}
              </View>
              {!isSuccess && (
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${uploadProgress}%` },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  postBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledBtn: { opacity: 0.5 },
  postBtnText: { color: '#fff', fontWeight: 'bold' },
  input: { fontSize: 16, textAlignVertical: 'top', minHeight: 100 },
  pollWrapper: { marginTop: 20 },
  pollLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#222',
  },
  pollInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    width: '100%',
  },
  pollInput: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    color: '#333',
  },
  addOptionBtn: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#fadccc',
    borderRadius: 15,
  },
  addOptionText: { color: PRIMARY_COLOR, fontWeight: 'bold' },
  mediaContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 },
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
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
  },
  toolbar: {
    height: 50,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    justifyContent: 'center',
    paddingLeft: 15,
  },
  toolbarBtn: { alignContent: 'center' },
  toolbarText: {
    marginTop: 4,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: '#FADCCC',
    padding: 15,
    borderRadius: 10,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toastTitle: { color: '#222', fontWeight: 'bold' },
  successTitle: { color: PRIMARY_COLOR },
  toastPercentage: { color: PRIMARY_COLOR },
  progressBarBackground: {
    height: 4,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginTop: 10,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  mentionOverlayContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: '#fadccc',
    zIndex: 10,
  },
  mentionUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
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
