import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaInsetsContext,
} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from './ThemeContext';
import { useAppDataContext } from './EventContext';
import { submitOrUpdatePostService } from '../api/localPostApis';
import { uploadToCloudinaryWithProgress } from '../utils/CloudinaryPresetHelper';

export interface PostUploadJob {
  /** New local files to push to Cloudinary, in display order. */
  newMedia: { uri: string; type: 'image' | 'video' }[];
  /** Already-hosted urls kept from the post being edited. */
  existingUrls: string[];
  /** Media type to fall back on when nothing new is uploaded. */
  fallbackMediaType: 'image' | 'video' | null;
  folder: string;
  isEditMode: boolean;
  postId?: string;
  /** Builds the request body once media urls are known. */
  buildPostData: (
    mediaUrls: string[],
    mediaType: 'image' | 'video' | null,
  ) => Record<string, any>;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number; // 0–100
  step: string;
  isEditMode: boolean;
  error?: string;
}

interface PostUploadContextValue {
  /** Starts the job in the background; resolves immediately. */
  startPostUpload: (job: PostUploadJob) => boolean;
  isUploading: boolean;
  /** Bumped every time a new post is published (lets the feed scroll up). */
  publishedVersion: number;
}

const PostUploadContext = createContext<PostUploadContextValue | undefined>(undefined);

// Media gets 0–90%, the create/update request the rest.
const MEDIA_SHARE = 90;
const SUCCESS_LINGER_MS = 1400;

export const PostUploadProvider = ({ children }: { children: ReactNode }) => {
  const { upsertPost, patchPost } = useAppDataContext();
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    step: '',
    isEditMode: false,
  });
  const [minimized, setMinimized] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const jobRef = useRef<PostUploadJob | null>(null);
  // Urls already uploaded for the current job, so a retry resumes instead of
  // re-uploading everything.
  const uploadedRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    jobRef.current = null;
    uploadedRef.current = [];
    setMinimized(false);
    setState({ status: 'idle', progress: 0, step: '', isEditMode: false });
  }, []);

  const run = useCallback(async () => {
    const job = jobRef.current;
    if (!job || runningRef.current) return;
    runningRef.current = true;
    const total = job.newMedia.length;
    const setProgress = (progress: number, step: string) =>
      setState(prev => ({
        ...prev,
        status: 'uploading',
        progress: Math.max(prev.progress, Math.round(progress)),
        step,
        error: undefined,
      }));

    try {
      for (let i = uploadedRef.current.length; i < total; i++) {
        const item = job.newMedia[i];
        const label = total > 1 ? `Uploading media ${i + 1} of ${total}` : 'Uploading media';
        setProgress((i / total) * MEDIA_SHARE, label);
        const url = await uploadToCloudinaryWithProgress(
          item.uri,
          job.folder,
          item.type,
          fraction => setProgress(((i + fraction) / total) * MEDIA_SHARE, label),
        );
        uploadedRef.current.push(url);
      }

      setProgress(total ? MEDIA_SHARE : 40, job.isEditMode ? 'Saving changes' : 'Publishing post');
      const mediaUrls = [...job.existingUrls, ...uploadedRef.current];
      const mediaType = total ? job.newMedia[total - 1].type : job.fallbackMediaType;
      const result = await submitOrUpdatePostService(
        job.buildPostData(mediaUrls, mediaUrls.length ? mediaType : null),
        job.isEditMode,
        job.postId,
      );
      if (!result.success) {
        throw new Error(result.message || 'The server could not save your post');
      }

      const saved = result.data;
      if (saved && (saved.postId || saved.id)) {
        if (job.isEditMode) {
          patchPost(job.postId || saved.postId, existing => ({ ...existing, ...saved }));
        } else {
          upsertPost(saved);
          setPublishedVersion(v => v + 1);
        }
      }
      setState(prev => ({ ...prev, status: 'success', progress: 100, step: '' }));
      dismissTimer.current = setTimeout(reset, SUCCESS_LINGER_MS);
    } catch (error: any) {
      console.error('Background post upload failed', error);
      setMinimized(false);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error?.message || 'Upload failed. Check your connection.',
      }));
    } finally {
      runningRef.current = false;
    }
  }, [patchPost, upsertPost, reset]);

  const startPostUpload = useCallback(
    (job: PostUploadJob) => {
      if (runningRef.current || state.status === 'uploading') return false;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      jobRef.current = job;
      uploadedRef.current = [];
      setMinimized(false);
      setState({
        status: 'uploading',
        progress: 0,
        step: job.newMedia.length ? 'Preparing media' : 'Publishing post',
        isEditMode: job.isEditMode,
      });
      run();
      return true;
    },
    [run, state.status],
  );

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  return (
    <PostUploadContext.Provider
      value={{
        startPostUpload,
        isUploading: state.status === 'uploading',
        publishedVersion,
      }}
    >
      {children}
      {state.status !== 'idle' && (
        <PostUploadOverlay
          state={state}
          minimized={minimized && state.status === 'uploading'}
          onMinimize={() => setMinimized(true)}
          onExpand={() => setMinimized(false)}
          onRetry={run}
          onDiscard={reset}
        />
      )}
    </PostUploadContext.Provider>
  );
};

export const usePostUpload = () => {
  const ctx = useContext(PostUploadContext);
  if (!ctx) throw new Error('usePostUpload must be used inside PostUploadProvider');
  return ctx;
};

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------
const PostUploadOverlay = ({
  state,
  minimized,
  onMinimize,
  onExpand,
  onRetry,
  onDiscard,
}: {
  state: UploadState;
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) => {
  const { colors } = useTheme();
  // Rendered above the navigator, where no SafeAreaProvider may exist.
  const insets = useContext(SafeAreaInsetsContext) ??
    initialWindowMetrics?.insets ?? { top: 24, bottom: 0, left: 0, right: 0 };
  const fill = useRef(new Animated.Value(state.progress)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: state.progress,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, state.progress]);

  useEffect(() => {
    appear.setValue(0);
    Animated.spring(appear, { toValue: 1, friction: 7, useNativeDriver: true }).start();
  }, [appear, minimized]);

  const width = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const isError = state.status === 'error';
  const isSuccess = state.status === 'success';
  const accent = isError ? colors.primary : isSuccess ? colors.success : colors.primary;
  const title = isSuccess
    ? state.isEditMode
      ? 'Changes saved'
      : 'Post published'
    : isError
      ? 'Upload failed'
      : state.isEditMode
        ? 'Saving your post'
        : 'Posting';

  if (minimized) {
    return (
      <Animated.View
        pointerEvents="box-none"
        style={[
          overlay.pillWrap,
          { top: insets.top + 8, opacity: appear, transform: [{ scale: appear }] },
        ]}
      >
        <Pressable
          onPress={onExpand}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${state.progress} percent. Tap to expand`}
          style={[overlay.pill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        >
          <MaterialIcons name="cloud-upload" size={16} color={colors.primary} />
          <Text style={[overlay.pillText, { color: colors.textDarker }]}>{state.progress}%</Text>
          <View style={[overlay.pillTrack, { backgroundColor: colors.border }]}>
            <Animated.View style={[overlay.trackFill, { width, backgroundColor: colors.primary }]} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={overlay.backdrop} accessibilityViewIsModal>
      <Animated.View
        style={[
          overlay.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
            opacity: appear,
            transform: [
              { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          },
        ]}
      >
        <View style={[overlay.iconCircle, { backgroundColor: accent + '1A' }]}>
          <MaterialIcons
            name={isSuccess ? 'check-circle' : isError ? 'cloud-off' : 'cloud-upload'}
            size={30}
            color={accent}
          />
        </View>
        <Text style={[overlay.title, { color: colors.textDarker }]}>{title}</Text>
        {!isSuccess && !isError && (
          <Text style={[overlay.percent, { color: colors.primary }]}>{state.progress}%</Text>
        )}
        <Text style={[overlay.subtitle, { color: colors.text }]} numberOfLines={3}>
          {isError
            ? state.error
            : isSuccess
              ? state.isEditMode
                ? 'Your post has been updated.'
                : "It's now at the top of your feed."
              : state.step || 'Working on it…'}
        </Text>

        {!isError && (
          <View style={[overlay.track, { backgroundColor: colors.border }]}>
            <Animated.View style={[overlay.trackFill, { width, backgroundColor: accent }]} />
          </View>
        )}

        {state.status === 'uploading' && (
          <TouchableOpacity onPress={onMinimize} style={overlay.linkBtn} accessibilityRole="button">
            <Text style={[overlay.linkText, { color: colors.primary }]}>Hide and keep browsing</Text>
          </TouchableOpacity>
        )}
        {isError && (
          <View style={overlay.actions}>
            <TouchableOpacity
              onPress={onDiscard}
              style={[overlay.secondaryBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[overlay.secondaryText, { color: colors.text }]}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRetry}
              style={[overlay.primaryBtn, { backgroundColor: colors.btnColor }]}
              accessibilityRole="button"
            >
              <MaterialIcons name="refresh" size={18} color={colors.btnTextColor} />
              <Text style={[overlay.primaryText, { color: colors.btnTextColor }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const overlay = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800' },
  percent: { fontSize: 34, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, textAlign: 'center', marginTop: 6, opacity: 0.85, lineHeight: 19 },
  track: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 18 },
  trackFill: { height: '100%', borderRadius: 4 },
  linkBtn: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 10 },
  linkText: { fontSize: 13.5, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 14.5, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 14.5, fontWeight: '700' },
  pillWrap: { position: 'absolute', alignSelf: 'center', zIndex: 9999, elevation: 9999 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  pillText: { fontSize: 13, fontWeight: '800', minWidth: 34 },
  pillTrack: { width: 70, height: 5, borderRadius: 3, overflow: 'hidden' },
});
