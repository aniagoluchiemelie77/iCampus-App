import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  Platform,
  StyleSheet,
  ScrollView,
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
import { CustomButton } from '../assets/components/AppUIComponents';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';
import { fetchUserConnections } from '../api/localGetApis';
import { submitOrUpdatePostService } from '../api/localPostApis';
import { PageHeader } from '../components/PageHeader';
import { MentionUserModal } from '../components/MentionUserModal';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../../App';
import { useDateTimePicker } from '../hooks/useDateTimePicker';
import { usePicker } from '../hooks/useDropDownPicker';
import { JobTypePicker } from '../components/InputGroup';
import { HorizontalScrollableMediaPreviewList } from '../components/MediaPreview';
import { useAppDataContext } from '../context/EventContext';
import { PostAudience } from '../types/firebase';
import {
  applyMentionAwareChange,
  extractMentionTokens,
  findMentionRanges,
  getActiveMentionQuery,
  splitTextWithMentions,
} from '../utils/mentions';
interface MediaItem {
  uri: string[];
  type: 'image' | 'video';
  isExisting?: boolean;
}
type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;

export const CreatePost = ({ route, navigation }: Props) => {
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
              'image' | 'video',
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

  const currentUser = useAppSelector(state => state.user) || {};
  const { upsertPost } = useAppDataContext();
  // Institution admins can address a memo to their own school only (its
  // students and lecturers). The server enforces this too.
  const canPostToSchool =
    currentUser?.isInstitutionAdmin === true && !!currentUser?.schoolCode;
  const [audience, setAudience] = useState<PostAudience>(
    editPostData?.audience === 'school' ? 'school' : 'public',
  );
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [isMentionModalVisible, setIsMentionModalVisible] = useState(false);
  const [mentionKeyword, setMentionKeyword] = useState('');
  // Confirmed mentions ("@username"): highlighted and deleted as a whole.
  const [mentionTokens, setMentionTokens] = useState<string[]>(() =>
    isEditMode ? extractMentionTokens(editPostData.content || '') : [],
  );
  const selectionRef = useRef({ start: content.length, end: content.length });
  // Set only when the caret must be moved programmatically; cleared on the
  // next native selection event so the user keeps full control.
  const [forcedSelection, setForcedSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const isPlainPost = postType !== 'poll' && postType !== 'job' && postType !== 'event';

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
        'Full-time' | 'Part-time' | 'Internship' | 'Contract' | 'Freelance',
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

  const updateMentionLookup = (text: string, cursor: number, tokens: string[]) => {
    const active = getActiveMentionQuery(text, cursor, tokens);
    if (active) {
      setMentionKeyword(active.query);
      setIsMentionModalVisible(true);
    } else {
      setIsMentionModalVisible(false);
    }
  };

  const handleContentChange = (next: string) => {
    // Deleting into a confirmed mention removes the whole "@name".
    const result = applyMentionAwareChange(content, next, mentionTokens);
    const remainingTokens = mentionTokens.filter(
      token => findMentionRanges(result.text, [token]).length > 0,
    );
    setContent(result.text);
    if (remainingTokens.length !== mentionTokens.length) {
      setMentionTokens(remainingTokens);
    }
    selectionRef.current = { start: result.cursor, end: result.cursor };
    if (result.removedMention) {
      // The native field still holds the half-deleted text; move the caret to
      // where the mention started.
      setForcedSelection({ start: result.cursor, end: result.cursor });
    }
    updateMentionLookup(result.text, result.cursor, remainingTokens);
  };

  const handleSelectUserToTag = (user: any) => {
    const identifier = user?.username || user?.firstname;
    if (!identifier) return;
    const token = `@${identifier}`;
    const cursor = selectionRef.current.start;
    const active = getActiveMentionQuery(content, cursor, mentionTokens);
    // Replace the "@partial" at the caret (not just the last word).
    const start = active ? active.start : cursor;
    const after = content.slice(cursor).replace(/^[^\s]*/, '');
    const insertion = after.startsWith(' ') ? token : `${token} `;
    const newContent = content.slice(0, start) + insertion + after;
    const newCursor = start + insertion.length + (after.startsWith(' ') ? 1 : 0);

    setContent(newContent);
    setMentionTokens(prev => (prev.includes(token) ? prev : [...prev, token]));
    selectionRef.current = { start: newCursor, end: newCursor };
    setForcedSelection({ start: newCursor, end: newCursor });
    setIsMentionModalVisible(false);
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
    (eventMetadata.location ?? '').trim().length > 0;

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

  const handleCreateOrUpdatePost = async () => {
    if (!canPost()) {
      Toast.show({
        type: 'info',
        text1: 'Missing Info',
        text2: 'Please ensure you fill in all required post information',
      });
      return;
    }

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
          const downloadUrl = await uploadToCloudinary(
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
        audience: canPostToSchool ? audience : 'public',
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

      const result = await submitOrUpdatePostService(
        postData,
        isEditMode,
        editPostData?.postId,
      );
      if (!result.success) return;
      // New posts come back in feed shape; show them at the top right away.
      if (!isEditMode && result.data?.postId) {
        upsertPost(result.data);
      }

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
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
          <CustomButton
            title={isEditMode ? 'Save' : 'Post'}
            style={[styles.postBtn, !canPost() && styles.disabledBtn]}
            disabled={!canPost()}
            onPress={handleCreateOrUpdatePost}
          />
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            isPlainPost && styles.plainScrollContainer,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {canPostToSchool && (
            <View style={styles.audienceBlock}>
              <Text style={[styles.audienceLabel, { color: colors.text }]}>Who can see this?</Text>
              <View style={styles.audienceRow}>
                {(
                  [
                    { id: 'public', icon: 'public', label: 'Everyone' },
                    { id: 'school', icon: 'school', label: 'My school only' },
                  ] as const
                ).map(option => {
                  const selected = audience === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setAudience(option.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.audienceChip,
                        { borderColor: colors.primary },
                        selected && { backgroundColor: colors.primary },
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon}
                        size={15}
                        color={selected ? '#fff' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.audienceChipText,
                          { color: selected ? '#fff' : colors.primary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {audience === 'school' && (
                <Text style={[styles.audienceHint, { color: colors.text }]}>
                  Only students and lecturers of your school will see this memo.
                  It can't be reposted.
                </Text>
              )}
            </View>
          )}
          <View
            style={
              isPlainPost
                ? styles.plainComposer
                : [
                    styles.cardContainer,
                    { backgroundColor: colors.backgroundSecondary },
                  ]
            }
          >
            {/* Styled children instead of `value`, so confirmed mentions can
                be coloured inside the editable text. */}
            <TextInput
              placeholder="What's on your mind? Mention people with @..."
              placeholderTextColor={colors.inputTextHolder}
              multiline
              autoFocus
              scrollEnabled={!isPlainPost}
              style={[
                styles.input,
                isPlainPost && styles.plainInput,
                { color: colors.text },
              ]}
              onChangeText={handleContentChange}
              selection={forcedSelection}
              onSelectionChange={({ nativeEvent }) => {
                selectionRef.current = nativeEvent.selection;
                if (forcedSelection) setForcedSelection(undefined);
              }}
            >
              {splitTextWithMentions(content, mentionTokens).map((segment, i) => (
                <Text
                  key={`${i}-${segment.isMention ? 'm' : 't'}`}
                  style={
                    segment.isMention
                      ? [styles.mentionText, { color: colors.primary }]
                      : { color: colors.text }
                  }
                >
                  {segment.text}
                </Text>
              ))}
            </TextInput>

            {mediaList.length > 0 && (
              <HorizontalScrollableMediaPreviewList
                mediaList={mediaList}
                colors={colors}
                disabled={postType === 'poll' || mediaList.length >= 4}
                onPickMedia={pickMedia}
                onRemove={index =>
                  setMediaList(prev => prev.filter((_, i) => i !== index))
                }
              />
            )}
          </View>

          {/* Dynamic Post Types */}
          {postType === 'poll' && (
            <View
              style={[
                styles.cardContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Poll Options
              </Text>
              {pollOptions.map((opt, index) => (
                <View
                  key={index}
                  style={[
                    styles.pollInputContainer,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
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
                  {pollOptions.length > 1 && (
                    <TouchableOpacity onPress={() => removeOption(index)}>
                      <MaterialIcons
                        name="cancel"
                        size={20}
                        color={colors.primary}
                        style={{ marginLeft: 10 }}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <TouchableOpacity
                  style={[
                    styles.addOptionBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '10',
                    },
                  ]}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <MaterialIcons
                    name="add"
                    size={18}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.addOptionText, { color: colors.primary }]}
                  >
                    Add Option
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {postType === 'job' && (
            <View
              style={[
                styles.cardContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Job Details
              </Text>
              <TextInput
                placeholder="Job Title (e.g. Senior React Native Dev)"
                value={jobMetadata.title}
                onChangeText={t => setJobMetadata({ ...jobMetadata, title: t })}
                style={[
                  styles.modernInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholderTextColor={colors.inputTextHolder}
              />
              <TextInput
                placeholder="Company Name"
                value={jobMetadata.company}
                onChangeText={t =>
                  setJobMetadata({ ...jobMetadata, company: t })
                }
                style={[
                  styles.modernInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholderTextColor={colors.inputTextHolder}
              />
              <TextInput
                placeholder="Location (e.g. Remote, Lagos)"
                value={jobMetadata.location}
                onChangeText={t =>
                  setJobMetadata({ ...jobMetadata, location: t })
                }
                placeholderTextColor={colors.inputTextHolder}
                style={[
                  styles.modernInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <JobTypePicker value={jobMetadata.type} onSelect={selectType} />
            </View>
          )}

          {postType === 'event' && (
            <View
              style={[
                styles.cardContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Event Details
              </Text>
              <TextInput
                placeholder="Event Title"
                value={eventMetadata.title}
                onChangeText={t =>
                  setEventMetadata({ ...eventMetadata, title: t })
                }
                placeholderTextColor={colors.inputTextHolder}
                style={[
                  styles.modernInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <TextInput
                placeholder="Location or Virtual Link"
                value={eventMetadata.location}
                onChangeText={t =>
                  setEventMetadata({ ...eventMetadata, location: t })
                }
                placeholderTextColor={colors.inputTextHolder}
                style={[
                  styles.modernInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[
                    styles.dateTimeBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() => showPicker('date')}
                >
                  <MaterialIcons
                    name="calendar-month"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.microLabel, { color: colors.text }]}>
                    Date
                  </Text>
                  <Text
                    style={[styles.dateTimeText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {typeof eventMetadata.date === 'string'
                      ? eventMetadata.date
                      : eventMetadata.date.toLocaleTimeString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dateTimeBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() => showPicker('startTime')}
                >
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.microLabel, { color: colors.text }]}>
                    Start
                  </Text>
                  <Text
                    style={[styles.dateTimeText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {typeof eventMetadata.startTime === 'string'
                      ? eventMetadata.startTime
                      : eventMetadata.startTime.toLocaleTimeString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dateTimeBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() => showPicker('endTime')}
                >
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.microLabel, { color: colors.text }]}>
                    Ends
                  </Text>
                  <Text
                    style={[styles.dateTimeText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {typeof eventMetadata.endTime === 'string'
                      ? eventMetadata.endTime
                      : eventMetadata.endTime.toLocaleTimeString()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Modern Action Toolbar (Includes Media Trigger) */}
        {postType !== 'poll' && (
          <View
            style={[
              styles.actionToolbar,
              {
                backgroundColor: isPlainPost
                  ? colors.background
                  : colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.toolbarActionBtn}
              onPress={pickMedia}
            >
              <View
                style={[
                  styles.toolbarIconCircle,
                  { backgroundColor: colors.primary + '15' },
                ]}
              >
                <MaterialIcons
                  name="photo-library"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.toolbarActionText, { color: colors.text }]}>
                Photo/Video
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tagging / Mentions Modal */}
        <MentionUserModal
          visible={isMentionModalVisible}
          initialKeyword={mentionKeyword}
          suggestions={followingUsers}
          onSelect={handleSelectUserToTag}
          onClose={() => setIsMentionModalVisible(false)}
        />

        {/* Upload Status Overlay */}
        {isUploading && (
          <View
            style={[
              styles.bottomToastContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.toastHeader}>
              <Text
                style={[
                  styles.toastTitle,
                  isSuccess
                    ? { color: colors.success }
                    : { color: colors.text },
                ]}
              >
                {isSuccess
                  ? 'Successfully Published!'
                  : `Uploading... ${uploadProgress}%`}
              </Text>
              {isSuccess && (
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color={colors.success}
                />
              )}
            </View>
            {!isSuccess && (
              <View
                style={[
                  styles.progressBarBackground,
                  { backgroundColor: colors.border },
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
  container: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  // Normal posts: the composer is the page itself, edge to edge.
  plainScrollContainer: { flexGrow: 1, paddingTop: 4 },
  plainComposer: { flex: 1 },
  plainInput: {
    flex: 1,
    minHeight: 320,
    fontSize: 17,
    lineHeight: 25,
    padding: 0,
    backgroundColor: 'transparent',
  },
  mentionText: { fontWeight: '700' },
  audienceBlock: { marginBottom: 14 },
  audienceLabel: { fontSize: 12.5, fontWeight: '700', marginBottom: 8, opacity: 0.8 },
  audienceRow: { flexDirection: 'row', gap: 8 },
  audienceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  audienceChipText: { fontSize: 13, fontWeight: '700' },
  audienceHint: { fontSize: 12, marginTop: 8, opacity: 0.8 },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  postBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    width: 'auto',
  },
  disabledBtn: { opacity: 0.5 },
  input: {
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    lineHeight: 22,
    flex: 1,
  },
  modernInput: {
    fontSize: 14,
    width: '100%',
    marginBottom: 12,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  pollInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  pollInput: {
    flex: 1,
    fontSize: 14,
  },
  addOptionBtn: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 4,
  },
  addOptionText: { fontSize: 14, fontWeight: '600' },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateTimeBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  microLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  actionToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  toolbarActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toastTitle: { fontSize: 14, fontWeight: '600' },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default CreatePost;
