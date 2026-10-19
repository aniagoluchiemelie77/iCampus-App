import React, { forwardRef, memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { CommentMedia, GifResult, PostComment } from '../types/firebase';
import { UserAvatar } from './UserAvatar';
import { useTheme } from '../context/ThemeContext';
import { formatCount } from '../utils/followCountFormatter';
import { compactRelativeTime, displayName, lastProfilePic } from '../utils/postHelpers';
import { searchGifsAPI } from '../api/localGetApis';
import { LinkedText } from './PostCard';

const QUICK_EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '😢', '🙏', '💯'];

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------
interface CommentItemProps {
  comment: PostComment;
  currentUserId?: string;
  onLike: (comment: PostComment) => void;
  onReply: (comment: PostComment) => void;
  onRetry: (comment: PostComment) => void;
  onDiscard: (comment: PostComment) => void;
  onLoadReplies?: (rootId: string) => void;
  repliesLoading?: boolean;
  repliesComplete?: boolean;
  isReply?: boolean;
}

export const CommentItem = memo(
  ({
    comment,
    currentUserId,
    onLike,
    onReply,
    onRetry,
    onDiscard,
    onLoadReplies,
    repliesLoading,
    repliesComplete,
    isReply,
  }: CommentItemProps) => {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    // The author is embedded by the server; never assume it is present.
    const author = comment.author || ({} as PostComment['author']);
    const name = displayName(author) || 'iCampus user';
    const liked = !!currentUserId && (comment.likes || []).includes(currentUserId);
    const isMedia = comment.type !== 'text' && !!comment.media?.url;
    const shownReplies = comment.replies || [];
    const hiddenReplies = Math.max(0, comment.replyCount - shownReplies.filter(r => !r.pending && !r.failed).length);
    const openProfile = () => author.uid && navigation.navigate('Profile', { identifier: author.uid });

    return (
      <View style={[styles.commentRow, isReply && styles.replyRow, comment.pending && { opacity: 0.6 }]}>
        <TouchableOpacity onPress={openProfile} accessibilityLabel={`Open ${name}'s profile`}>
          <UserAvatar
            profilePic={lastProfilePic(author.profilePic)}
            firstName={author.firstname}
            lastName={author.lastname}
            organizationName={author.organizationName || undefined}
            style={isReply ? styles.replyAvatar : styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.commentBody}>
          <View
            style={[
              styles.bubble,
              { backgroundColor: colors.backgroundSecondary },
              comment.type === 'sticker' && styles.bubbleSticker,
              comment.failed && { borderColor: colors.primary, borderWidth: 1 },
            ]}
          >
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: colors.textDarker }]} numberOfLines={1} onPress={openProfile}>
                {name}
              </Text>
              {author.isVerified && <MaterialIcons name="verified" size={13} color={colors.primary} />}
            </View>
            {!!comment.text && (
              <LinkedText
                content={comment.text}
                colors={colors}
                onMentionPress={m => navigation.navigate('Profile', { identifier: m.replace('@', '') })}
              />
            )}
            {isMedia && <CommentMediaView media={comment.media!} sticker={comment.type === 'sticker'} />}
          </View>

          {comment.failed ? (
            <View style={styles.actionsRow}>
              <MaterialIcons name="error-outline" size={14} color={colors.primary} />
              <Text style={[styles.failedText, { color: colors.primary }]}>Not sent</Text>
              <Text style={[styles.actionLink, { color: colors.textDarker }]} onPress={() => onRetry(comment)}>
                Retry
              </Text>
              <Text style={[styles.actionLink, { color: colors.text }]} onPress={() => onDiscard(comment)}>
                Discard
              </Text>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <Text style={[styles.timeText, { color: colors.text }]}>
                {comment.pending ? 'Sending…' : compactRelativeTime(comment.createdAt)}
              </Text>
              <TouchableOpacity
                onPress={() => onLike(comment)}
                disabled={comment.pending}
                style={styles.likeButton}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                accessibilityLabel={`${liked ? 'Unlike' : 'Like'} comment, ${comment.likesCount} likes`}
              >
                <MaterialIcons
                  name={liked ? 'favorite' : 'favorite-border'}
                  size={14}
                  color={liked ? '#E0245E' : colors.text}
                />
                {comment.likesCount > 0 && (
                  <Text style={[styles.actionLink, { color: liked ? '#E0245E' : colors.text }]}>
                    {formatCount(comment.likesCount)}
                  </Text>
                )}
              </TouchableOpacity>
              {!comment.pending && (
                <Text style={[styles.actionLink, { color: colors.textDarker }]} onPress={() => onReply(comment)}>
                  Reply
                </Text>
              )}
            </View>
          )}

          {!isReply && shownReplies.length > 0 && (
            <View style={styles.repliesBlock}>
              {shownReplies.map(reply => (
                <CommentItem
                  key={reply.commentId}
                  comment={reply}
                  currentUserId={currentUserId}
                  onLike={onLike}
                  onReply={() => onReply(comment)}
                  onRetry={onRetry}
                  onDiscard={onDiscard}
                  isReply
                />
              ))}
            </View>
          )}
          {!isReply && hiddenReplies > 0 && !repliesComplete && (
            <TouchableOpacity
              style={styles.viewReplies}
              onPress={() => onLoadReplies?.(comment.commentId)}
              disabled={repliesLoading}
            >
              <View style={[styles.viewRepliesLine, { backgroundColor: colors.border }]} />
              {repliesLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.viewRepliesText, { color: colors.text }]}>
                  View {hiddenReplies} more {hiddenReplies === 1 ? 'reply' : 'replies'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  },
);

const CommentMediaView = ({ media, sticker }: { media: CommentMedia; sticker: boolean }) => {
  const ratio = media.width && media.height ? media.width / media.height : 1;
  const width = sticker ? 120 : 200;
  return (
    <Image
      source={{ uri: media.url }}
      style={[styles.commentGif, { width, height: width / ratio }, sticker && styles.stickerImage]}
      resizeMode="contain"
      accessibilityLabel={sticker ? 'Sticker' : 'GIF'}
    />
  );
};

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------
interface CommentComposerProps {
  replyingTo: PostComment | null;
  onCancelReply: () => void;
  onSendText: (text: string) => Promise<boolean>;
  onSendMedia: (type: 'gif' | 'sticker', media: CommentMedia) => void;
  currentUser: any;
}

export const CommentComposer = forwardRef<TextInput, CommentComposerProps>(
  ({ replyingTo, onCancelReply, onSendText, onSendMedia, currentUser }, ref) => {
    const { colors } = useTheme();
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const canSend = text.trim().length > 0 && !sending;

    const submit = async () => {
      if (!canSend) return;
      const value = text.trim();
      setSending(true);
      setText('');
      const ok = await onSendText(value);
      // Put the text back if it didn't go through.
      if (!ok) setText(value);
      setSending(false);
    };

    return (
      <View style={[styles.composer, { backgroundColor: colors.background, borderTopColor: colors.border + '66' }]}>
        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons name="reply" size={16} color={colors.primary} />
            <Text style={[styles.replyBarText, { color: colors.text }]} numberOfLines={1}>
              Replying to <Text style={{ fontWeight: '700', color: colors.textDarker }}>{displayName(replyingTo.author) || 'comment'}</Text>
            </Text>
            <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Cancel reply">
              <MaterialIcons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.emojiRow}>
          {QUICK_EMOJIS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setText(t => t + emoji)}
              style={styles.emojiButton}
              accessibilityLabel={`Add ${emoji}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inputRow}>
          <UserAvatar
            profilePic={lastProfilePic(currentUser?.profilePic)}
            firstName={currentUser?.firstname}
            lastName={currentUser?.lastname}
            style={styles.composerAvatar}
          />
          <View style={[styles.inputShell, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border + '66' }]}>
            <TextInput
              ref={ref}
              style={[styles.input, { color: colors.textDarker }]}
              placeholder={replyingTo ? 'Write a reply…' : 'Add a comment…'}
              placeholderTextColor={colors.inputTextHolder}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setPickerVisible(true);
              }}
              style={styles.gifButton}
              accessibilityLabel="Add a GIF or sticker"
            >
              <Text style={[styles.gifButtonText, { color: colors.primary, borderColor: colors.primary }]}>GIF</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={submit}
            disabled={!canSend}
            style={[styles.sendButton, { backgroundColor: canSend ? colors.btnColor : colors.border }]}
            accessibilityLabel="Post comment"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.btnTextColor} />
            ) : (
              <MaterialIcons name="arrow-upward" size={20} color={colors.btnTextColor} />
            )}
          </TouchableOpacity>
        </View>
        <GifPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelect={(type, media) => {
            setPickerVisible(false);
            onSendMedia(type, media);
          }}
        />
      </View>
    );
  },
);

// ---------------------------------------------------------------------------
// GIF / sticker picker (GIPHY via the backend)
// ---------------------------------------------------------------------------
export const GifPicker = ({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'gif' | 'sticker', media: CommentMedia) => void;
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'gifs' | 'stickers'>('gifs');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const requestId = useRef(0);
  const columns = 3;
  const tile = (Math.min(width, 520) - 32 - (columns - 1) * 6) / columns;

  const load = useCallback(
    async (reset: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      const res = await searchGifsAPI({ query, type: tab, offset: reset ? 0 : nextOffset ?? 0 });
      if (id !== requestId.current) return;
      setEnabled(res.enabled);
      setResults(prev => (reset ? res.results : [...prev, ...res.results]));
      setNextOffset(res.nextOffset);
      setLoading(false);
    },
    [query, tab, nextOffset],
  );

  // Debounced search whenever the query or tab changes while open.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => load(true), query ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, tab]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
          <View style={styles.pickerTabs}>
            {(['gifs', 'stickers'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.pickerTab, { borderColor: colors.primary }, tab === t && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.pickerTabText, { color: tab === t ? '#fff' : colors.primary }]}>
                  {t === 'gifs' ? 'GIFs' : 'Stickers'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.searchShell, { backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons name="search" size={18} color={colors.text} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${tab === 'gifs' ? 'GIFs' : 'stickers'}`}
              placeholderTextColor={colors.inputTextHolder}
              style={[styles.searchInput, { color: colors.textDarker }]}
              autoCorrect={false}
            />
          </View>
          {!enabled ? (
            <View style={styles.pickerEmpty}>
              <MaterialIcons name="gif-box" size={36} color={colors.text} />
              <Text style={[styles.pickerEmptyText, { color: colors.text }]}>
                GIFs and stickers aren't set up yet. Use emoji for now.
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              numColumns={columns}
              columnWrapperStyle={{ gap: 6 }}
              contentContainerStyle={{ gap: 6, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    onSelect(tab === 'gifs' ? 'gif' : 'sticker', {
                      url: item.url,
                      previewUrl: item.previewUrl,
                      width: item.width,
                      height: item.height,
                    })
                  }
                  accessibilityLabel={item.title || 'GIF'}
                >
                  <Image
                    source={{ uri: item.previewUrl }}
                    style={[styles.pickerTile, { width: tile, height: tile, backgroundColor: tab === 'gifs' ? colors.backgroundSecondary : 'transparent' }]}
                    resizeMode={tab === 'gifs' ? 'cover' : 'contain'}
                  />
                </TouchableOpacity>
              )}
              onEndReached={() => nextOffset !== null && !loading && load(false)}
              onEndReachedThreshold={0.6}
              ListEmptyComponent={
                loading ? null : (
                  <Text style={[styles.pickerEmptyText, { color: colors.text }]}>No results. Try another search.</Text>
                )
              }
              ListFooterComponent={loading ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
              keyboardShouldPersistTaps="handled"
            />
          )}
          <Text style={[styles.attribution, { color: colors.text }]}>Powered by GIPHY</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  commentRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  replyRow: { paddingVertical: 6, paddingHorizontal: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentBody: { flex: 1, marginLeft: 10 },
  bubble: { borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', maxWidth: '100%' },
  bubbleSticker: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  authorName: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  commentGif: { borderRadius: 12, marginTop: 6 },
  stickerImage: { borderRadius: 0, backgroundColor: 'transparent' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, marginLeft: 6 },
  timeText: { fontSize: 12, opacity: 0.7 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionLink: { fontSize: 12.5, fontWeight: '700' },
  failedText: { fontSize: 12.5, fontWeight: '700', marginLeft: -10 },
  repliesBlock: { marginTop: 4 },
  viewReplies: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 6, paddingVertical: 4 },
  viewRepliesLine: { width: 24, height: 1 },
  viewRepliesText: { fontSize: 12.5, fontWeight: '700' },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, marginBottom: 6 },
  replyBarText: { flex: 1, fontSize: 12.5 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  emojiButton: { padding: 4 },
  emoji: { fontSize: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerAvatar: { width: 32, height: 32, borderRadius: 16, marginBottom: 4 },
  inputShell: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 14, paddingRight: 6 },
  input: { flex: 1, fontSize: 14.5, maxHeight: 110, paddingVertical: 9 },
  gifButton: { paddingHorizontal: 4, paddingVertical: 9 },
  gifButtonText: { fontSize: 11, fontWeight: '800', borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10 },
  dragIndicator: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  pickerTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pickerTab: { borderWidth: 1.2, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6 },
  pickerTabText: { fontSize: 13, fontWeight: '700' },
  searchShell: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9 },
  pickerTile: { borderRadius: 10 },
  pickerEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  pickerEmptyText: { fontSize: 13.5, textAlign: 'center', marginTop: 20, opacity: 0.8, paddingHorizontal: 20 },
  attribution: { fontSize: 10.5, textAlign: 'center', opacity: 0.55, paddingVertical: 8 },
});
