import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Socket } from 'socket.io-client';
import { RtcSurfaceView } from 'react-native-agora';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { User, ChatMessage, Lecture } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks';
import { UserAvatar } from './UserAvatar';
import { useLiveTranscription } from '../hooks/useLiveTransciption';
import { useAgoraClass } from '../hooks/useAgoraClass';
import { useTheme } from '../context/ThemeContext';
import { formatElapsed, toMillis } from '../utils/liveClassRtc';
import { LiveClassSessionStyles as S, LIVE_RED } from './liveClassStyles';
import {
  ChatModal,
  AttendeeListModal,
  ConfirmationModal,
  LiveControlButton,
  ParticipantStack,
} from './liveClassComponents';

interface StudentLiveSessionProps {
  lecture: Lecture;
  socket: Socket | null;
  lecturerLiveData: any;
  /** True once the server has admitted this socket to the lecture room. */
  joined: boolean;
}

type StreamState = 'waiting' | 'connecting' | 'connected' | 'reconnecting';

export { LiveClassSessionStyles } from './liveClassStyles';

export const StudentLiveClassSession = ({
  lecture,
  socket,
  lecturerLiveData,
  joined,
}: StudentLiveSessionProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || {};
  const navigation = useNavigation<any>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const chatVisibleRef = useRef(false);
  const startedAtRef = useRef<number>(
    toMillis((lecture as any).startedAt) ?? Date.now(),
  );

  const [isLecturerMuted, setIsLecturerMuted] = useState<boolean>(
    !!(lecture as any).isLecturerMuted,
  );
  const [isLecturerCameraOn, setIsLecturerCameraOn] = useState<boolean>(
    (lecture as any).isVideoActive !== false,
  );
  const [isScreenShared, setIsScreenShared] = useState<boolean>(
    !!(lecture as any).isScreenSharing,
  );
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(
    !!(lecture as any).isAudioOnly,
  );
  const [chatVisible, setChatVisible] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMicAllowed, setIsMicAllowed] = useState(false);
  const [isLocalMuted, setIsLocalMuted] = useState(true);
  const [speakerName, setSpeakerName] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isWaving, setIsWaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('0:00');
  const [attendeeModalVisible, setAttendeeModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [currentAttendees, setCurrentAttendees] = useState<User[]>([]);

  const currentAttendeesRef = useRef<User[]>([]);
  currentAttendeesRef.current = currentAttendees;
  chatVisibleRef.current = chatVisible;
  const classmates = currentAttendees.filter(a => a.uid !== lecture.hostId);

  const appendTranscriptionText = useCallback((label: string, text: string) => {
    setTranscription(prev => {
      const line = prev.endsWith(`${label} `) ? text : `\n${label} ${text}`;
      return (prev + line).trimStart().slice(-400);
    });
  }, []);

  // ---- Floor mic -> transcription -------------------------------------------
  const micLive = isMicAllowed && !isLocalMuted;
  const { sendAudioChunkToDeepgram } = useLiveTranscription({
    lectureId: lecture.id,
    isHost: false,
    currentUserFirstName: user.firstname || 'Student',
    isMicActive: micLive,
    onTranscriptChunk: (label, text) => {
      appendTranscriptionText(label, text);
      socket?.emit('share_transcription_chunk', {
        lectureId: lecture.id,
        speakerLabel: label,
        text,
      });
    },
  });

  // ---- Media (Agora, receive-only until given the floor) ---------------------
  const agora = useAgoraClass({
    lectureId: lecture.id,
    role: 'audience',
    enabled: true,
    onMicAudio: sendAudioChunkToDeepgram,
    micAudioActive: micLive,
  });
  const streamState: StreamState =
    agora.status === 'reconnecting'
      ? 'reconnecting'
      : agora.status !== 'joined'
        ? 'connecting'
        : agora.hostPresent
          ? 'connected'
          : 'waiting';

  // Given the floor: publish the mic so the whole class hears it.
  useEffect(() => {
    if (agora.status !== 'joined') return;
    agora.setSpeaking(micLive).then(ok => {
      if (micLive && !ok) {
        setIsLocalMuted(true);
        Toast.show({ type: 'error', text1: 'Microphone permission needed to speak' });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micLive, agora.status]);

  // ---- Socket events --------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const handlers: Record<string, (data: any) => void> = {
      live_stream_started: ({ startedAt }) => {
        startedAtRef.current = toMillis(startedAt) ?? startedAtRef.current;
      },
      lecturer_mic_status_changed: ({ isMuted }) => setIsLecturerMuted(!!isMuted),
      lecturer_camera_toggled_received: ({ isCameraOn }) => setIsLecturerCameraOn(!!isCameraOn),
      lecturer_screen_share_started: () => setIsScreenShared(true),
      lecturer_screen_share_stopped: () => setIsScreenShared(false),
      lecturer_network_mode_changed: ({ mode }) => setIsAudioOnly(mode === 'audio-only'),
      mic_permission_granted_received: ({ targetUid }: { targetUid: string }) => {
        const speaker = currentAttendeesRef.current.find(a => a.uid === targetUid);
        setSpeakerName(targetUid === user.uid ? 'You' : speaker?.firstname || 'A classmate');
        if (targetUid === user.uid) {
          setIsMicAllowed(true);
          setIsLocalMuted(false);
          setIsWaving(false);
          Toast.show({
            type: 'success',
            text1: 'The floor is yours',
            text2: 'Your speech is being transcribed for the class.',
          });
        }
      },
      all_mics_revoked_received: () => {
        setSpeakerName(null);
        setIsMicAllowed(false);
        setIsLocalMuted(true);
        setIsWaving(false);
      },
      receive_message: (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
        if (!chatVisibleRef.current && (msg as any).userId !== user.uid) {
          setUnreadCount(c => c + 1);
        }
      },
      active_speaker_changed_received: ({ firstname }) => setSpeakerName(firstname),
      update_attendee_list: (list: User[]) => setCurrentAttendees(list),
      share_transcription_chunk: (data: { speakerLabel: string; text: string }) =>
        appendTranscriptionText(data.speakerLabel, data.text),
    };
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
    };
  }, [socket, user.uid, appendTranscriptionText]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(formatElapsed(startedAtRef.current)), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Actions ----------------------------------------------------------------
  const sendMessage = () => {
    if (!inputText.trim() || !socket) return;
    socket.emit('send_message', {
      text: inputText,
      senderId: user.uid,
      lectureId: lecture.id,
      username: `${user.firstname} ${user.lastname}`,
      profilePic: user.profilePic || '',
    });
    setInputText('');
  };
  const handleWave = () => {
    if (isWaving || !socket) return;
    socket.emit('student_waved', {
      lectureId: lecture.id,
      uid: user.uid,
      firstname: user.firstname,
      profilePic: user.profilePic || '',
    });
    setIsWaving(true);
    Toast.show({
      type: 'info',
      text1: 'Hand raised',
      text2: 'The lecturer can now let you speak.',
    });
  };
  const handleLeaveLecture = () => {
    socket?.emit('leave_lecture', {
      lectureId: lecture.id,
      user: {
        uid: user.uid,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        tier: user.tier || 'free',
        profilePic: user.profilePic || '',
      },
    });
    setIsMicAllowed(false);
    setIsLocalMuted(true);
    setLeaveModalVisible(false);
    navigation.navigate('Home', { activeTab: 'classroom' });
  };

  // ---- Render ----------------------------------------------------------------
  const hostName = lecturerLiveData?.displayName || 'Lecturer';
  // The class is the focus: roughly square on phones, capped at half the
  // screen so the controls stay visible.
  const stageHeight = Math.round(
    Math.min(screenHeight * 0.5, Math.max(260, screenWidth - 32)),
  );
  const hasVideo =
    streamState === 'connected' &&
    agora.hostUid != null &&
    agora.hostVideoOn &&
    (isScreenShared || (isLecturerCameraOn && !isAudioOnly));
  const stageMessage =
    agora.status === 'failed'
      ? { icon: 'wifi-off', title: "Couldn't join the class", hint: agora.error || 'Check your connection and try again.' }
      : streamState === 'waiting'
      ? { icon: 'hourglass-top', title: 'Waiting for the lecturer', hint: 'The class will appear here as soon as it starts.' }
      : streamState === 'reconnecting'
        ? { icon: 'sync', title: 'Reconnecting…', hint: 'Trying to restore the class stream.' }
        : streamState === 'connecting'
          ? { icon: 'cast', title: 'Connecting to class…', hint: 'This usually takes a few seconds.' }
          : isAudioOnly
            ? { icon: 'graphic-eq', title: 'Audio-only mode', hint: "The lecturer's connection is weak, so video is paused." }
            : { icon: 'videocam-off', title: "Lecturer's camera is off", hint: 'You can still hear the class.' };

  return (
    <SafeAreaView
      edges={['top']}
      style={[S.mainContainer, { backgroundColor: colors.background }]}
    >
      <View style={S.topBar}>
        <View style={[S.livePill, streamState !== 'connected' && S.livePillWaiting]}>
          <View style={S.liveDot} />
          <Text style={S.livePillText}>
            {streamState === 'connected' ? 'LIVE' : streamState.toUpperCase()}
          </Text>
        </View>
        <View style={S.topChip}>
          <MaterialIcons name="schedule" size={14} color={colors.primary} />
          <Text style={[S.topChipText, { color: colors.textDarker }]}>{elapsedTime}</Text>
        </View>
        <TouchableOpacity style={S.topBarAction} onPress={() => setLeaveModalVisible(true)}>
          <MaterialIcons name="logout" size={16} color="#fff" />
          <Text style={S.topBarActionText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sessionHeader}>
        <Text style={[styles.sessionTitle, { color: colors.textDarker }]} numberOfLines={2}>
          {lecture.topicName || 'Untitled Session'}
        </Text>
        <View style={styles.sessionMetaRow}>
          <View style={styles.hostRow}>
            <UserAvatar
              profilePic={lecturerLiveData?.profilePic}
              firstName={lecturerLiveData?.firstname}
              lastName={lecturerLiveData?.lastname}
              username={lecturerLiveData?.username}
              style={styles.hostAvatar}
            />
            <Text style={[styles.hostName, { color: colors.textDarker }]} numberOfLines={1}>
              {hostName}
            </Text>
            <View style={[styles.hostBadge, { backgroundColor: colors.primary + '1F' }]}>
              <Text style={[styles.hostBadgeText, { color: colors.primary }]}>HOST</Text>
            </View>
          </View>
          <ParticipantStack
            participants={classmates}
            onPress={() => setAttendeeModalVisible(true)}
          />
        </View>
      </View>

      <View style={[S.stage, { height: stageHeight }]}>
        {hasVideo && agora.hostUid != null && (
          // Agora plays the audio regardless of whether this view is mounted.
          <RtcSurfaceView canvas={{ uid: agora.hostUid, renderMode: isScreenShared ? 2 : 1 }} style={S.stageVideo} />
        )}
        {!hasVideo && (
          <View style={S.stageOverlay}>
            {agora.status === 'failed' ? (
              <TouchableOpacity onPress={agora.retry} style={{ alignItems: 'center' }}>
                <MaterialIcons name="refresh" size={46} color={colors.primary} />
              </TouchableOpacity>
            ) : streamState === 'connected' ? (
              <View style={styles.stageHostRing}>
                <UserAvatar
                  profilePic={lecturerLiveData?.profilePic}
                  firstName={lecturerLiveData?.firstname}
                  lastName={lecturerLiveData?.lastname}
                  username={lecturerLiveData?.username}
                  style={styles.stageHostAvatar}
                />
              </View>
            ) : (
              <MaterialIcons name={stageMessage.icon} size={46} color={colors.primary} />
            )}
            <Text style={S.stageTitle}>{stageMessage.title}</Text>
            <Text style={S.stageHint}>{stageMessage.hint}</Text>
          </View>
        )}
        {streamState === 'connected' && (
          <View style={styles.nameTag}>
            <MaterialIcons
              name={isLecturerMuted ? 'mic-off' : 'mic'}
              size={13}
              color={isLecturerMuted ? '#FF8A80' : '#fff'}
            />
            <Text style={styles.nameTagText} numberOfLines={1}>
              {hostName}
            </Text>
          </View>
        )}
        <View style={S.stageChipsRow}>
          {isScreenShared && (
            <View style={S.stageChip}>
              <MaterialIcons name="screen-share" size={13} color="#fff" />
              <Text style={S.stageChipText}>Screen share</Text>
            </View>
          )}
          {isLecturerMuted && streamState === 'connected' && (
            <View style={[S.stageChip, { backgroundColor: LIVE_RED }]}>
              <MaterialIcons name="mic-off" size={13} color="#fff" />
              <Text style={S.stageChipText}>Lecturer muted</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[S.controlDock, { backgroundColor: colors.backgroundSecondary }]}>
        <LiveControlButton
          icon="waving-hand"
          label={isWaving ? 'Raised' : 'Raise hand'}
          active={isWaving}
          disabled={isWaving || isMicAllowed || !joined}
          onPress={handleWave}
        />
        {isMicAllowed && (
          <LiveControlButton
            icon={isLocalMuted ? 'mic-off' : 'mic'}
            label={isLocalMuted ? 'Unmute' : 'Mute'}
            danger={isLocalMuted}
            onPress={() => setIsLocalMuted(m => !m)}
          />
        )}
        <LiveControlButton
          icon="chat"
          label="Chat"
          badge={unreadCount}
          onPress={() => {
            setChatVisible(true);
            setUnreadCount(0);
          }}
        />
        <LiveControlButton
          icon="people"
          label="People"
          onPress={() => setAttendeeModalVisible(true)}
        />
      </View>

      <ScrollView contentContainerStyle={S.scrollBody} showsVerticalScrollIndicator={false}>
        {speakerName && (
          <View style={S.speakerBanner}>
            <MaterialIcons name="record-voice-over" size={18} color={colors.primary} />
            <Text style={[S.speakerBannerText, { color: colors.textDarker }]}>
              {speakerName === 'You' ? 'You have the floor' : `${speakerName} has the floor`}
            </Text>
          </View>
        )}

        <View style={[S.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[S.cardLabelRow, { marginBottom: 8 }]}>
            <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
            <Text style={[S.cardLabel, { color: colors.primary }]}>LIVE TRANSCRIPTION</Text>
          </View>
          <Text style={[S.transcriptionText, { color: colors.text }]}>
            {transcription || 'Captions will appear here when the lecturer speaks.'}
          </Text>
        </View>
      </ScrollView>

      <ChatModal
        visible={chatVisible}
        onDismiss={() => setChatVisible(false)}
        messages={messages}
        sendMessage={sendMessage}
        inputText={inputText}
        setInputText={setInputText}
        colors={colors}
        user={user}
      />
      <AttendeeListModal
        visible={attendeeModalVisible}
        onDismiss={() => setAttendeeModalVisible(false)}
        attendees={classmates}
        wavers={[]}
        colors={colors}
      />
      <ConfirmationModal
        visible={leaveModalVisible}
        onDismiss={() => setLeaveModalVisible(false)}
        onConfirm={handleLeaveLecture}
        title="Leave Live Session?"
        subText="You can rejoin while the class is still live."
        colors={colors}
        islecturer={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sessionHeader: { paddingHorizontal: 16, paddingBottom: 12 },
  sessionTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  hostAvatar: { width: 26, height: 26, borderRadius: 13 },
  hostName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  hostBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  hostBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  stageHostRing: {
    padding: 4,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  stageHostAvatar: { width: 104, height: 104, borderRadius: 52 },
  nameTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  nameTagText: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
