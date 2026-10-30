import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { StyleSheet } from 'react-native';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { UserIdentity } from './UserIdentity';
import {UserAvatar} from './UserAvatar';
import {RTCView } from 'react-native-webrtc';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

/**
 * Bottom sheet on React Native's own Modal. These used react-native-paper's
 * Portal, which crashes because the app has no Paper Provider.
 */
const BottomSheet = ({
  visible,
  onDismiss,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    statusBarTranslucent
    onRequestClose={onDismiss}
  >
    <View style={styles.bottomOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      {children}
    </View>
  </Modal>
);

interface LecturerControlsProps {
  localStream: any;
  isLive: boolean;
  socket: any;
  lectureId: string;
  onMuteAll: () => void;
  wavers: any[];
  onGrantMic: (uid: string) => void;
}
interface GroupToastProps {
  activeUsers: any[];
  onHide: () => void;
}
interface LiveControlButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: number;
}
/** Round icon button used in the live-class control dock. */
export const LiveControlButton = ({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
  disabled = false,
  badge = 0,
}: LiveControlButtonProps) => {
  const { colors: themeColors } = useTheme();
  const bg = danger
    ? '#E53935'
    : active
      ? PRIMARY_COLOR
      : 'rgba(120,120,120,0.16)';
  const fg = danger || active ? '#fff' : themeColors.textDarker;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.controlBtnWrap, disabled && { opacity: 0.4 }]}
    >
      <View style={[styles.controlBtn, { backgroundColor: bg }]}>
        <MaterialIcons name={icon} size={22} color={fg} />
        {badge > 0 && (
          <View style={styles.controlBadge}>
            <Text style={styles.controlBadgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.controlLabel, { color: themeColors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
export const WavingToast = ({ activeUsers, onHide }: GroupToastProps) => {
  const { colors: themeColors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const userCount = activeUsers.length;
  let displayMessage = '';

  if (userCount === 1) {
    displayMessage = `👋 ${activeUsers[0].firstname} is waving`;
  } else if (userCount === 2) {
    displayMessage = `👋 ${activeUsers[0].firstname} and ${activeUsers[1].firstname} are waving`;
  } else if (userCount > 2) {
    displayMessage = `👋 ${activeUsers[0].firstname} and ${
      userCount - 1
    } others are waving`;
  }

  useEffect(() => {
    if (userCount === 0) return;
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onHide());
    }, 6000);

    return () => clearTimeout(timer);
  }, [userCount, onHide, slideAnim]);

  if (userCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.waveToast,
        { transform: [{ translateY: slideAnim }] },
        { backgroundColor: themeColors.backgroundSecondary },
      ]}
    >
      <Text
        style={[styles.waveText, { color: themeColors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayMessage}
      </Text>
    </Animated.View>
  );
};

export const SpeakerToast = ({ activeUsers, onHide }: GroupToastProps) => {
  const { colors: themeColors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const userCount = activeUsers.length;
  let displayMessage = '';

  if (userCount === 1) {
    displayMessage = `${activeUsers[0].firstname} is speaking...`;
  } else if (userCount === 2) {
    displayMessage = `${activeUsers[0].firstname} & ${activeUsers[1].firstname} are speaking...`;
  } else if (userCount > 2) {
    displayMessage = `${activeUsers[0].firstname} and ${
      userCount - 1
    } others are speaking...`;
  }

  useEffect(() => {
    if (userCount === 0) return;

    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onHide());
    }, 5000);

    return () => clearTimeout(timer);
  }, [userCount, onHide, slideAnim]);

  if (userCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.speakerToast,
        { transform: [{ translateY: slideAnim }] },
        { backgroundColor: themeColors.backgroundSecondary },
      ]}
    >
      <MaterialIcons name="mic" size={18} color={themeColors.primary} />
      <Text
        style={[styles.speakerText, { color: themeColors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayMessage}
      </Text>
    </Animated.View>
  );
};
const MessageBubble = React.memo(({ msg, isOwnMessage, colors }: any) => (
  <View
    style={[
      styles.messageBubble,
      isOwnMessage ? styles.myMessage : styles.theirMessage,
    ]}
  >
    {!isOwnMessage && (
      <Text style={[styles.senderName, { color: colors.text }]}>
        {msg.username}
      </Text>
    )}
    <Text
      style={[
        styles.messageText,
        { color: isOwnMessage ? colors.btnTextColor : colors.text },
      ]}
    >
      {msg.text}
    </Text>
  </View>
));
const ChatInput = ({ text, onChangeText, onSend, colors }: any) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View
      style={[
        styles.chatInputRow,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TextInput
        placeholder="Type a message..."
        value={text}
        onChangeText={onChangeText}
        placeholderTextColor={colors.inputTextHolder}
        style={[styles.chatInput, { color: colors.text }]}
        onSubmitEditing={onSend}
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={!text.trim()}
        style={styles.sendBtn}
      >
        <MaterialIcons name="send" color={colors.primary} size={17} />
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
);
const AttendeeRow = React.memo(({ student, isWaving, colors }: any) => (
  <View style={styles.studentRow}>
    <UserAvatar
      profilePic={student.profilePic}
      firstName={student.firstname}
      lastName={student.lastname}
      username={student.username}
      style={styles.attendeesAvatar}
    />
    <View style={styles.studentInfo}>
      <UserIdentity
        firstname={student.firstname!}
        lastname={student.lastname}
        username={student.username}
        tier={student.tier || 'free'}
        isVerified={student.isVerified}
        size="small"
      />
    </View>
    {isWaving && (
      <MaterialIcons
        name="waving-hand"
        size={22}
        color={colors.primary}
        style={styles.waveIcon}
      />
    )}
  </View>
));
export const LecturerStreamControls = ({
  localStream,
  isLive,
  socket,
  lectureId,
  onMuteAll,
  wavers,
  onGrantMic,
}: LecturerControlsProps) => {
  const { colors: themeColors } = useTheme();
  const [isCameraOff, setIsCameraOff] = useState(false);
  const toggleCamera = () => {
    const newStatus = !isCameraOff;
    setIsCameraOff(newStatus);
    socket.emit('toggle_lecturer_camera', {
      lectureId,
      isCameraOn: !newStatus,
    });
  };
  return (
    <View style={styles.controlWrapper}>
      {localStream ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={[
            styles.previewVideo,
            { backgroundColor: themeColors.backgroundSecondary },
          ]}
          objectFit="cover"
          mirror={true}
        />
      ) : (
        <View style={styles.previewVideo}>
          <MaterialIcons
            name="videocam-off"
            size={40}
            color={themeColors.primary}
          />
          <Text style={[styles.previewVideoText, { color: themeColors.text }]}>
            Camera is Off
          </Text>
        </View>
      )}
      {wavers.length > 0 && (
        <TouchableOpacity
          style={[
            styles.muteAllButton,
            { backgroundColor: themeColors.btnColor },
          ]}
          onPress={() => onGrantMic(wavers[0].uid)}
        >
          <MaterialIcons
            name={'waving-hand'}
            size={18}
            color={themeColors.btnTextColor}
          />
          <Text
            style={[styles.muteAllText, { color: themeColors.btnTextColor }]}
          >
            Grant Mic
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.muteAllButton,
          { backgroundColor: themeColors.btnColor },
        ]}
        onPress={toggleCamera}
      >
        <MaterialIcons
          name={isCameraOff ? 'videocam-off' : 'videocam'}
          size={18}
          color={themeColors.btnTextColor}
        />
        <Text style={[styles.muteAllText, { color: themeColors.btnTextColor }]}>
          {isCameraOff ? 'Cam off' : 'Cam on'}
        </Text>
      </TouchableOpacity>
      {isLive && (
        <TouchableOpacity
          style={[
            styles.muteAllButton,
            { backgroundColor: themeColors.btnColor },
          ]}
          onPress={onMuteAll}
        >
          <MaterialIcons
            name="mic-off"
            color={themeColors.btnTextColor}
            size={18}
          />
          <Text
            style={[styles.muteAllText, { color: themeColors.btnTextColor }]}
          >
            Mute All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
export const ChatModal = ({
  visible,
  onDismiss,
  messages,
  sendMessage,
  inputText,
  setInputText,
  colors,
  user,
}: any) => {
  const scrollViewRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (visible) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, visible]);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View
        style={[
          styles.bottomModalContainer,
          styles.chatSheet,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={styles.modalHandle} />
        <Text style={[styles.chatHeader, { color: colors.textDarker }]}>
          Live Class Chat
        </Text>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg: any) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwnMessage={msg.userId === user.uid}
              colors={colors}
            />
          ))}
        </ScrollView>

        <ChatInput
          text={inputText}
          onChangeText={setInputText}
          onSend={sendMessage}
          colors={colors}
        />
      </View>
    </BottomSheet>
  );
};
export const AttendeeListModal = ({
  visible,
  onDismiss,
  attendees,
  wavers,
  colors,
}: any) => (
  <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View
        style={[
          styles.bottomModalContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={styles.modalHandle} />
        <Text style={[styles.attendeeListTitle, { color: colors.textDarker }]}>
          Class Attendees ({attendees.length})
        </Text>
        <FlatList
          data={attendees}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <AttendeeRow
              student={item}
              isWaving={wavers.some((w: any) => w.uid === item.uid)}
              colors={colors}
            />
          )}
        />
      </View>
  </BottomSheet>
);
export const ConfirmationModal = ({
  visible,
  onDismiss,
  onConfirm,
  title,
  subText,
  colors,
  islecturer,
}: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onDismiss}
  >
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons name="info-outline" size={50} color={colors.primary} />

        <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
          {title}
        </Text>

        <Text style={[styles.modalSubText, { color: colors.text }]}>
          {subText}
        </Text>

        <View style={styles.modalButtonRow}>
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.modalButtonRowBtn, { borderColor: colors.primary }]}
          >
            <Text
              style={[styles.modalButtonRowBtnText, { color: colors.primary }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <CustomButton
            title={islecturer ? 'End Now' : 'Leave'}
            onPress={onConfirm}
            style={[
              styles.modalButtonRowBtn2,
              { backgroundColor: colors.btnColor },
            ]}
          />
        </View>
      </View>
    </View>
  </Modal>
);
/**
 * Compact "who's here" chip: a few overlapping avatars (latest profile pic,
 * or initials) followed by "+N" for everyone else. Kept small on purpose.
 */
export const ParticipantStack = ({
  participants,
  max = 3,
  onPress,
}: {
  participants: any[];
  max?: number;
  onPress?: () => void;
}) => {
  const { colors: themeColors } = useTheme();
  if (participants.length === 0) return null;
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      style={styles.stackRow}
      accessibilityRole="button"
      accessibilityLabel={`${participants.length} participants`}
    >
      {shown.map((p, i) => (
        <View
          key={p.uid || i}
          style={[
            styles.stackRing,
            { borderColor: themeColors.background, zIndex: max - i },
            i > 0 && styles.stackOverlap,
          ]}
        >
          <UserAvatar
            profilePic={p.profilePic}
            firstName={p.firstname}
            lastName={p.lastname}
            username={p.username}
            style={styles.stackAvatar}
          />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.stackRing,
            styles.stackOverlap,
            styles.stackMore,
            { borderColor: themeColors.background },
          ]}
        >
          <Text style={styles.stackMoreText}>
            +{extra > 99 ? '99' : extra}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
export const LecturerTab = ({ lecturer, isCameraOn, streamUrl }: any) => {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={[
        styles.lecturerTab,
        {
          backgroundColor: themeColors.backgroundSecondary,
          borderColor: themeColors.primary,
        },
      ]}
    >
      <View style={styles.mediaContainer}>
        {isCameraOn && streamUrl ? (
          <RTCView
            streamURL={
              typeof streamUrl === 'string' ? streamUrl : streamUrl.toURL()
            }
            style={styles.lecturerVideo}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <UserAvatar
            profilePic={lecturer?.profilePic}
            firstName={lecturer?.firstname}
            lastName={lecturer?.lastname}
            username={lecturer?.username}
            style={styles.lecturerTabAvatar}
          />
        )}
      </View>
      <View style={styles.otherSection}>
        <Text
          style={[styles.nameText, { color: themeColors.textDarker }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {lecturer?.displayName || 'Lecturer'}
        </Text>
        <MaterialIcons
          name={lecturer?.isMuted ? 'mic-off' : 'mic-none'}
          size={16}
          color={themeColors.text}
        />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  controlBtnWrap: { alignItems: 'center', width: 58 },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  controlLabel: { fontSize: 11, fontWeight: '700', marginTop: 5 },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 10,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY_COLOR,
    borderBottomRightRadius: 0,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
    borderColor: PRIMARY_COLOR_TINT,
    borderWidth: 0.8,
  },
  senderName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  messageText: { fontSize: 14 },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatSheet: { height: '70%', paddingBottom: 76 },
  stackRow: { flexDirection: 'row', alignItems: 'center' },
  stackRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    overflow: 'hidden',
  },
  stackOverlap: { marginLeft: -9 },
  stackAvatar: { width: '100%', height: '100%', borderRadius: 13 },
  stackMore: {
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackMoreText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  lecturerTabAvatar: { width: 90, height: 90, borderRadius: 45 },
  bottomModalContainer: {
    padding: 20,
    width: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '70%',
    paddingBottom: 40,
    position: 'relative',
  },
  chatHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 15,
  },
  messageList: { flex: 1, paddingBottom: 30 },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  chatInput: {
    flex: 1,
    height: 60,
    fontSize: 14,
  },
  sendBtn: {
    marginHorizontal: 6,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  attendeesAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  studentInfo: {
    marginLeft: 15,
    flex: 1,
  },
  waveIcon: {
    marginLeft: 7,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 15,
  },
  attendeeListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  attendeeScrollList: {
    paddingBottom: 20,
  },
  modalContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  modalSubText: {
    fontSize: 14,
    marginBottom: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonRowBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalButtonRowBtn2: {
    paddingHorizontal: 15,
  },
  modalButtonRowBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  previewVideo: {
    position: 'absolute',
    top: 45,
    right: 20,
    width: 70,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewVideoText: {
    fontSize: 12,
    marginTop: 10,
    fontWeight: 'bold',
  },
  overlayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  muteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 6,
  },
  muteAllText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  waveText: { fontSize: 14, flex: 1 },
  waveToast: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    zIndex: 100,
    maxWidth: '70%',
  },
  speakerToast: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '70%',
    zIndex: 100,
  },
  speakerText: {
    fontSize: 14,
    marginLeft: 5,
  },
  lecturerTab: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 100,
  },
  mediaContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'absolute', // Fills the parent
    top: 0,
    left: 0,
  },
  lecturerVideo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  otherSection: {
    width: '100%',
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  nameText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
  },
});
export interface MiniPlayerAction {
  icon: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
}

/**
 * The live class shrunk to a floating player (see LiveClassContext). Tapping
 * the video expands it again; `actions` are the few controls worth keeping.
 */
export const LiveMiniPlayerCard = ({
  video,
  isLive,
  title,
  onExpand,
  actions = [],
}: {
  video: React.ReactNode;
  isLive: boolean;
  title: string;
  onExpand: () => void;
  actions?: MiniPlayerAction[];
}) => {
  const { colors } = useTheme();
  return (
    <View style={miniStyles.container}>
      <Pressable style={miniStyles.video} onPress={onExpand}>
        {video}
        <View style={[miniStyles.livePill, !isLive && miniStyles.livePillWaiting]}>
          <View style={miniStyles.liveDot} />
          <Text style={miniStyles.livePillText}>{isLive ? 'LIVE' : 'WAITING'}</Text>
        </View>
        <View style={miniStyles.expandBadge}>
          <MaterialIcons name="open-in-full" size={13} color="#fff" />
        </View>
      </Pressable>
      <View style={miniStyles.strip}>
        <Text
          style={[miniStyles.title, { color: colors.textDarker }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {actions.map(a => (
          <TouchableOpacity
            key={a.icon}
            onPress={a.onPress}
            hitSlop={6}
            style={[
              miniStyles.action,
              a.danger && { backgroundColor: '#E53935' },
              a.active && { backgroundColor: PRIMARY_COLOR },
            ]}
          >
            <MaterialIcons
              name={a.icon}
              size={17}
              color={a.danger || a.active ? '#fff' : colors.textDarker}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const miniStyles = StyleSheet.create({
  container: { flex: 1 },
  video: {
    flex: 1,
    backgroundColor: '#0d0d0f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  livePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  livePillWaiting: { backgroundColor: 'rgba(120,120,120,0.7)' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  livePillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  expandBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  strip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  title: { flex: 1, fontSize: 12, fontWeight: '700' },
  action: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,120,0.16)',
  },
});
