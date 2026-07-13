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
import { useAppSelector } from '../hooks/hooks';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { useDateTimePicker } from '../hooks/useDateTimePicker';
import { usePicker } from '../hooks/useDropDownPicker';
import { JobTypePicker } from '../components/InputGroup';
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

  const [content, setContent] = useState(
    isEditMode ? editPostData.content : '',
  );
  const [pollOptions, setPollOptions] = useState<string[]>(
    editPostData?.poll ? editPostData.poll.options.map(o => o.text) : ['', ''],
  );
  const postType = route.params?.type ?? 'media';

  const [jobMetadata, setJobMetadata] = useState({
    title: editPostData?.jobMetadata?.title ?? '',
    company: editPostData?.jobMetadata?.company ?? '',
    location: editPostData?.jobMetadata?.location ?? '',
    type: editPostData?.jobMetadata?.type ?? 'Full-time',
    salaryRange: editPostData?.jobMetadata?.salaryRange ?? '',
    applicationLink: editPostData?.jobMetadata?.applicationLink ?? '',
  });

  const [eventMetadata, setEventMetadata] = useState({
    title: editPostData?.eventMetadata?.title ?? '',
    location: editPostData?.eventMetadata?.location ?? '',
    isVirtual: editPostData?.eventMetadata?.isVirtual ?? false,
    startTime:
      editPostData?.eventMetadata?.startTime ??
      new Date().toISOString().split('T')[0],
    endTime:
      editPostData?.eventMetadata?.endTime ??
      new Date().toISOString().split('T')[0],
    date:
      editPostData?.eventMetadata?.date ??
      new Date().toISOString().split('T')[0],
  });
  const [mediaList, setMediaList] = useState<MediaItem[]>(
    editPostData?.media?.url
      ? [
          {
            uri: (Array.isArray(editPostData.media.url)
              ? editPostData.media.url
              : [editPostData.media.url]) as string[],
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
  const { pickerMode, showPicker, hidePicker, formatDate, formatTime } =
    useDateTimePicker();

  const { value: jobType, selectType } = usePicker(jobMetadata.type);

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
  useEffect(() => {
    setJobMetadata(prev => ({
      ...prev,
      type: jobType as
        | 'Full-time'
        | 'Part-time'
        | 'Internship'
        | 'Contract'
        | 'Freelance',
    }));
  }, [jobType]);
  const handleConfirm = (event: any, selectedDate?: Date) => {
    hidePicker();
    if (!selectedDate) return;

    if (pickerMode === 'date') {
      setEventMetadata({
        ...eventMetadata,
        date: formatDate(selectedDate),
      });
    } else if (pickerMode === 'startTime') {
      const time = formatTime(selectedDate);
      setEventMetadata({
        ...eventMetadata,
        startTime: time,
      });
    } else if (pickerMode === 'endTime') {
      const time = formatTime(selectedDate);
      setEventMetadata({
        ...eventMetadata,
        endTime: time,
      });
    }
  };

  const handleContentChange = (text: string) => {
    setContent(text);
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
    words.pop();
    const baseContent = words.join(' ');
    const newContent = baseContent
      ? `${baseContent} @${username} `
      : `@${username} `;
    setContent(newContent);

    setMentionSearchKeyword(null);
    setFilteredUsers([]);
  };

  const removeOption = (index: number) => {
    if (pollOptions.length <= 2) return;
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
        uri: [asset.uri || ''],
        type: asset.type?.includes('video') ? 'video' : 'image',
        isExisting: false,
      }));

      setMediaList(prev => [...prev, ...newAssets].slice(0, 4));
    }
  };

  const handleCreateOrUpdatePost = async () => {
    if (!content.trim() && mediaList.length === 0 && postType !== 'poll')
      return;

    setIsUploading(true);
    setUploadProgress(0);
    let finalMediaUrls: string[] = [];
    let lastMediaType: 'image' | 'video' | null = null;
    const combinedStart = new Date(
      `${eventMetadata.date}T${eventMetadata.startTime}:00Z`,
    ).toISOString();
    const combinedEnd = new Date(
      `${eventMetadata.date}T${eventMetadata.endTime}:00Z`,
    ).toISOString();

    try {
      const newMediaToUpload = mediaList.filter(item => !item.isExisting);
      const existingMediaUrls = mediaList
        .filter(item => item.isExisting)
        .map(item => item.uri);

      for (let i = 0; i < newMediaToUpload.length; i++) {
        const item = newMediaToUpload[i];
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
        content: content,
        postType: postType,
        media:
          combinedMediaUrls.length > 0
            ? {
                url: combinedMediaUrls,
                mediaType: lastMediaType,
              }
            : null,
        poll:
          postType === 'poll'
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
        jobMetadata: postType === 'job' ? jobMetadata : null,
        eventMetadata:
          postType === 'event'
            ? {
                ...eventMetadata,
                startTime: combinedStart,
                endTime: combinedEnd,
              }
            : null,
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
  const hasValidTextOrMedia = content.trim().length > 0 || mediaList.length > 0;

  const hasValidPoll =
    postType === 'poll' &&
    pollOptions.filter(opt => opt.trim().length > 0).length >= 2;

  const hasValidJob =
    postType === 'job' &&
    jobMetadata.title.trim().length > 0 &&
    jobMetadata.company.trim().length > 0 &&
    jobMetadata.location.trim().length > 0;

  const hasValidEvent =
    postType === 'event' &&
    (eventMetadata.title ?? '').trim().length > 0 &&
    (eventMetadata.location ?? '').trim().length > 0 &&
    eventMetadata.date instanceof Date &&
    !isNaN(eventMetadata.date.getTime()) &&
    eventMetadata.startTime instanceof Date &&
    !isNaN(eventMetadata.startTime.getTime());
  const canPost = () => {
    switch (postType) {
      case 'poll':
        return hasValidPoll;
      case 'job':
        return hasValidJob;
      case 'event':
        return hasValidEvent;
      case 'media':
      case 'post':
      default:
        return hasValidTextOrMedia;
    }
  };

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
              : postType === 'poll'
              ? 'Create Poll'
              : postType === 'job'
              ? 'Create Job'
              : postType === 'event'
              ? 'Create Event'
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
            postType === 'poll' ? 'Ask a question...' : "What's happening?"
          }
          multiline
          autoFocus
          style={[styles.input, { color: colors.text, marginTop: 15 }]}
          value={content}
          onChangeText={handleContentChange}
          placeholderTextColor={colors.inputTextHolder}
        />

        {postType === 'poll' && (
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
        {postType === 'job' && (
          <View style={styles.pollWrapper}>
            <TextInput
              placeholder="Job Title"
              value={jobMetadata.title}
              onChangeText={t => setJobMetadata({ ...jobMetadata, title: t })}
              style={[styles.input2, { color: colors.text }]}
              placeholderTextColor={colors.inputTextHolder}
            />
            <TextInput
              placeholder="Company"
              value={jobMetadata.company}
              onChangeText={t => setJobMetadata({ ...jobMetadata, company: t })}
              style={[styles.input2, { color: colors.text }]}
              placeholderTextColor={colors.inputTextHolder}
            />
            <TextInput
              placeholder="Location"
              value={jobMetadata.location}
              onChangeText={t =>
                setJobMetadata({ ...jobMetadata, location: t })
              }
              placeholderTextColor={colors.inputTextHolder}
              style={[styles.input2, { color: colors.text }]}
            />
            <JobTypePicker value={jobMetadata.type} onSelect={selectType} />
          </View>
        )}
        {postType === 'event' && (
          <View style={styles.pollWrapper}>
            <TextInput
              placeholder="Event Title"
              value={eventMetadata.title}
              onChangeText={t =>
                setEventMetadata({ ...eventMetadata, title: t })
              }
              placeholderTextColor={colors.inputTextHolder}
              style={[styles.input2, { color: colors.text }]}
            />
            <TextInput
              placeholder="Location"
              value={eventMetadata.location}
              onChangeText={t =>
                setEventMetadata({ ...eventMetadata, location: t })
              }
              placeholderTextColor={colors.inputTextHolder}
              style={[styles.input2, { color: colors.text }]}
            />
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeBox, { borderColor: colors.border }]}
                onPress={() => showPicker('date')}
              >
                <MaterialIcons
                  name="calendar-month-outlined"
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.microLabel, { color: colors.text }]}>
                  Date
                </Text>
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {eventMetadata.date instanceof Date
                    ? formatDate(eventMetadata.date)
                    : eventMetadata.date || '00:00'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateTimeBox, { borderColor: colors.border }]}
                onPress={() => showPicker('startTime')}
              >
                <MaterialIcons
                  name="schedule-outlined"
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.microLabel, { color: colors.text }]}>
                  Start Time
                </Text>
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {eventMetadata.startTime instanceof Date
                    ? formatTime(eventMetadata.startTime)
                    : eventMetadata.startTime || '00:00'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateTimeBox, { borderColor: colors.border }]}
                onPress={() => showPicker('endTime')}
              >
                <MaterialIcons
                  name="schedule-outlined"
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.microLabel, { color: colors.text }]}>
                  Ends
                </Text>
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {eventMetadata.endTime instanceof Date
                    ? formatTime(eventMetadata.endTime)
                    : eventMetadata.endTime || '00:00'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mediaList.length > 0 && (
          <View style={styles.mediaContainer}>
            {mediaList.map((item, index) => (
              <View key={index} style={styles.mediaPreviewWrapper}>
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: item.uri[0] }}
                    style={styles.mediaPreview}
                  />
                ) : (
                  <Video
                    source={{ uri: item.uri[0] }}
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
            (postType === 'poll' || mediaList.length >= 4) && { opacity: 0.5 },
          ]}
          disabled={postType === 'poll' || mediaList.length >= 4}
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
        {pickerMode && (
          <DateTimePicker
            value={new Date()}
            mode={pickerMode === 'date' ? 'date' : 'time'}
            is24Hour={true}
            display="default"
            onChange={handleConfirm}
          />
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
  input: {
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 15,
    width: '100%',
  },
  input2: {
    fontSize: 14,
    padding: 15,
    width: '100%',
    marginBottom: 15,
  },
  pollWrapper: { marginBottom: 15 },
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
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
  dateTimeBox: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  microLabel: {
    fontSize: 12,
    marginVertical: 6,
  },
  dateTimeText: {
    fontSize: 12,
  },
});

export default CreatePost;
