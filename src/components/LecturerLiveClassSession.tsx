import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Socket } from 'socket.io-client';
import { RtcSurfaceView } from 'react-native-agora';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../hooks/hooks';
import { User, Lecture } from '../types/firebase';
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
  WavingToast,
  LiveControlButton,
} from './liveClassComponents';

interface LecturerLiveSessionProps {
  lecture: Lecture;
  socket: Socket | null;
  /** True once the server has admitted this socket to the lecture room. */
  joined: boolean;
}

const MAX_VISIBLE_AVATARS = 6;
// Stable identity: WavingToast restarts its hide timer whenever onHide changes.
const noop = () => {};

export const LecturerLiveClassSession = ({
  lecture,
  socket,
  joined,
}: LecturerLiveSessionProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();

  const attendeesRef = useRef<User[]>([]);
  const chatVisibleRef = useRef(false);
  const announcedLiveRef = useRef(false);
  const startedAtRef = useRef<number>(toMillis((lecture as any).startedAt) ?? Date.now());

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [wavers, setWavers] = useState<any[]>([]);
  const [currentAttendees, setCurrentAttendees] = useState<User[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [permittedSpeaker, setPermittedSpeaker] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [attendeeModalVisible, setAttendeeModalVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('0:00');

  attendeesRef.current = currentAttendees;
  chatVisibleRef.current = chatVisible;
  const students = currentAttendees.filter(a => a.uid !== user?.uid);

  const appendTranscriptionText = useCallback((label: string, text: string) => {
    setTranscription(prev => {
      const line = prev.endsWith(`${label} `) ? text : `\n${label} ${text}`;
      return (prev + line).trimStart().slice(-400);
    });
  }, []);

  // ---- Transcription (fed from Agora's mic capture) -------------------------
  const { sendAudioChunkToDeepgram } = useLiveTranscription({
    lectureId: lecture.id,
    isHost: true,
    currentUserFirstName: user?.firstname || 'Host',
    isMicActive: joined && !isLocalMuted,
    onTranscriptChunk: (label, text) => {
      appendTranscriptionText(label, text);
      socket?.emit('share_transcription_chunk', {
        lectureId: lecture.id,
        speakerLabel: label,
        text,
      });
    },
  });

  // ---- Media (Agora) ----------------------------------------------------------
  const agora = useAgoraClass({
    lectureId: lecture.id,
    role: 'host',
    enabled: true,
    onMicAudio: sendAudioChunkToDeepgram,
    micAudioActive: joined && !isLocalMuted,
  });
  const isLiveOnAir = agora.status === 'joined' && joined;

  // Flip the lecture live (and notify students) once both the class room and
  // the Agora channel are up. Re-announced after socket reconnects.
  useEffect(() => {
    if (!socket || !isLiveOnAir) {
      announcedLiveRef.current = false;
      return;
    }
    if (announcedLiveRef.current) return;
    announcedLiveRef.current = true;
    socket.emit('stream_ready', { lectureId: lecture.id });
  }, [socket, isLiveOnAir, lecture.id]);

  useEffect(() => {
    if (agora.status === 'failed' && agora.error) {
      Toast.show({ type: 'error', text1: 'Live connection problem', text2: agora.error });
    }
  }, [agora.status, agora.error]);

  // ---- Socket events --------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const handlers: Record<string, (data: any) => void> = {
      student_waved_received: (data: { uid: string; firstname: string; profilePic: string }) =>
        setWavers(prev => (prev.some(w => w.uid === data.uid) ? prev : [...prev, data])),
      receive_message: (msg: any) => {
        setMessages(prev => [...prev, msg]);
        if (!chatVisibleRef.current && msg.userId !== user?.uid) setUnreadCount(c => c + 1);
      },
      update_attendee_list: (list: User[]) => setCurrentAttendees(list),
      share_transcription_chunk: (data: { speakerLabel: string; text: string }) =>
        appendTranscriptionText(data.speakerLabel, data.text),
      mic_permission_granted_received: ({ targetUid }: { targetUid: string }) => {
        if (targetUid === user?.uid) return;
        setPermittedSpeaker(attendeesRef.current.find(a => a.uid === targetUid) || null);
        setWavers(prev => prev.filter(w => w.uid !== targetUid));
      },
      user_joined_announcement: (data: { uid: string; message: string }) => {
        if (data.uid !== user?.uid) Toast.show({ type: 'success', text2: data.message });
      },
      user_left_announcement: (data: { uid: string; message: string }) => {
        if (data.uid === user?.uid) return;
        setWavers(prev => prev.filter(w => w.uid !== data.uid));
        Toast.show({ type: 'info', text2: data.message });
      },
    };
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
    };
  }, [socket, user?.uid, appendTranscriptionText]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(formatElapsed(startedAtRef.current)), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Controls --------------------------------------------------------------
  useEffect(() => {
    agora.setMicMuted(isLocalMuted);
    if (joined) socket?.emit('toggle_lecturer_mic', { lectureId: lecture.id, isMuted: isLocalMuted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocalMuted, joined, socket, lecture.id, agora.status]);

  const toggleCamera = () => {
    const next = !isCameraOn;
    agora.setCameraOn(next);
    setIsCameraOn(next);
    socket?.emit('toggle_lecturer_camera', { lectureId: lecture.id, isCameraOn: next });
  };

  const startScreenShare = () => {
    if (!agora.startScreenShare()) {
      Toast.show({ type: 'error', text1: 'Could not start screen sharing' });
      return;
    }
    socket?.emit('lecturer_started_sharing', { lectureId: lecture.id });
  };
  const stopScreenShare = () => {
    agora.stopScreenShare();
    socket?.emit('lecturer_stopped_sharing', { lectureId: lecture.id });
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socket) return;
    socket.emit('send_message', {
      text: inputText,
      senderId: user?.uid,
      lectureId: lecture.id,
      username: `${user?.firstname} ${user?.lastname}`,
      profilePic: user?.profilePic || '',
    });
    setInputText('');
  };

  const grantMic = (studentUid: string) => {
    socket?.emit('grant_mic_permission', { lectureId: lecture.id, targetUid: studentUid });
    setWavers(prev => prev.filter(w => w.uid !== studentUid));
  };
  const muteAll = () => {
    socket?.emit('revoke_all_mics', { lectureId: lecture.id });
    setPermittedSpeaker(null);
    Toast.show({ type: 'info', text1: 'All student microphones revoked.' });
  };

  const handleEndLecture = async () => {
    if (!socket || isEnding) return;
    setIsEnding(true);
    try {
      const ack = await socket.timeout(10000).emitWithAck('end_lecture', { lectureId: lecture.id });
      if (!ack?.ok) throw new Error(ack?.message);
      setEndModalVisible(false);
      navigation.navigate('Home', { activeTab: 'classroom' });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Could not end the class',
        text2: err?.message || 'Check your connection and try again.',
      });
      setIsEnding(false);
    }
  };

  // ---- Render ----------------------------------------------------------------
  const isSharingScreen = agora.isScreenSharing;
  const showCameraPreview = agora.status !== 'idle' && agora.status !== 'failed' && isCameraOn && !isSharingScreen;
  const connectionLabel =
    agora.status === 'joined'
      ? 'Broadcasting'
      : agora.status === 'reconnecting'
        ? 'Reconnecting…'
        : agora.status === 'failed'
          ? 'Not connected'
          : 'Connecting…';

  return (
    <SafeAreaView
      edges={['top']}
      style={[S.mainContainer, { backgroundColor: colors.background }]}
    >
      <View style={S.topBar}>
        <View style={[S.livePill, !isLiveOnAir && S.livePillWaiting]}>
          <View style={S.liveDot} />
          <Text style={S.livePillText}>{isLiveOnAir ? 'LIVE' : 'OFFLINE'}</Text>
        </View>
        <View style={S.topChip}>
          <MaterialIcons name="schedule" size={14} color={colors.primary} />
          <Text style={[S.topChipText, { color: colors.textDarker }]}>{elapsedTime}</Text>
        </View>
        <View style={S.topChip}>
          <MaterialIcons name="visibility" size={14} color={colors.primary} />
          <Text style={[S.topChipText, { color: colors.textDarker }]}>{students.length}</Text>
        </View>
        <TouchableOpacity style={S.topBarAction} onPress={() => setEndModalVisible(true)}>
          <MaterialIcons name="call-end" size={16} color="#fff" />
          <Text style={S.topBarActionText}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={S.stage}>
        {showCameraPreview && (
          <RtcSurfaceView canvas={{ uid: 0 }} style={S.stageVideo} />
        )}
        {!showCameraPreview && (
          <View style={S.stageOverlay}>
            <MaterialIcons
              name={
                agora.status === 'failed'
                  ? 'wifi-off'
                  : isSharingScreen
                    ? 'screen-share'
                    : 'videocam-off'
              }
              size={46}
              color={colors.primary}
            />
            <Text style={S.stageTitle}>
              {agora.status === 'failed'
                ? 'Not connected'
                : isSharingScreen
                  ? 'You are sharing your screen'
                  : 'Your camera is off'}
            </Text>
            <Text style={S.stageHint}>
              {agora.status === 'failed'
                ? agora.error || 'Check your connection and try again.'
                : isSharingScreen
                  ? 'Students see your screen. You can switch apps to present.'
                  : 'Students can still hear you.'}
            </Text>
            {agora.status === 'failed' && (
              <TouchableOpacity style={S.stageStopShare} onPress={agora.retry}>
                <Text style={S.stageStopShareText}>Try again</Text>
              </TouchableOpacity>
            )}
            {isSharingScreen && (
              <TouchableOpacity style={S.stageStopShare} onPress={stopScreenShare}>
                <Text style={S.stageStopShareText}>Stop Sharing</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={S.stageChipsRow}>
          <View style={S.stageChip}>
            <MaterialIcons
              name={agora.status === 'joined' ? 'cell-tower' : 'sync'}
              size={13}
              color="#fff"
            />
            <Text style={S.stageChipText}>{connectionLabel}</Text>
          </View>
          {isLocalMuted && (
            <View style={[S.stageChip, { backgroundColor: LIVE_RED }]}>
              <MaterialIcons name="mic-off" size={13} color="#fff" />
              <Text style={S.stageChipText}>Muted</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[S.controlDock, { backgroundColor: colors.backgroundSecondary }]}>
        <LiveControlButton
          icon={isLocalMuted ? 'mic-off' : 'mic'}
          label={isLocalMuted ? 'Unmute' : 'Mute'}
          danger={isLocalMuted}
          onPress={() => setIsLocalMuted(m => !m)}
        />
        <LiveControlButton
          icon={isCameraOn ? 'videocam' : 'videocam-off'}
          label="Camera"
          active={isCameraOn}
          disabled={agora.status !== 'joined' || isSharingScreen}
          onPress={toggleCamera}
        />
        <LiveControlButton
          icon="flip-camera-android"
          label="Flip"
          disabled={agora.status !== 'joined' || !isCameraOn || isSharingScreen}
          onPress={agora.switchCamera}
        />
        <LiveControlButton
          icon={isSharingScreen ? 'stop-screen-share' : 'screen-share'}
          label={isSharingScreen ? 'Stop' : 'Share'}
          active={isSharingScreen}
          disabled={agora.status !== 'joined' || Platform.OS !== 'android'}
          onPress={isSharingScreen ? stopScreenShare : startScreenShare}
        />
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
          badge={wavers.length}
          onPress={() => setAttendeeModalVisible(true)}
        />
      </View>

      <ScrollView contentContainerStyle={S.scrollBody} showsVerticalScrollIndicator={false}>
        {permittedSpeaker && (
          <View style={S.speakerBanner}>
            <MaterialIcons name="record-voice-over" size={18} color={colors.primary} />
            <Text style={[S.speakerBannerText, { color: colors.textDarker }]}>
              {permittedSpeaker.firstname} has the floor
            </Text>
            <TouchableOpacity onPress={muteAll}>
              <Text style={S.linkText}>Mute all</Text>
            </TouchableOpacity>
          </View>
        )}

        {wavers.length > 0 && (
          <View style={[S.card, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={S.cardHeaderRow}>
              <View style={S.cardLabelRow}>
                <MaterialIcons name="waving-hand" size={16} color={colors.primary} />
                <Text style={[S.cardTitle, { color: colors.textDarker }]}>
                  Raised hands ({wavers.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setWavers([])}>
                <Text style={S.linkText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {wavers.map(w => (
              <View key={w.uid} style={S.handRow}>
                <UserAvatar profilePic={w.profilePic} firstName={w.firstname} />
                <Text style={[S.handName, { color: colors.textDarker }]}>{w.firstname}</Text>
                <TouchableOpacity style={S.handAllowBtn} onPress={() => grantMic(w.uid)}>
                  <Text style={S.handAllowText}>Allow to speak</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={[S.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[S.topicText, { color: colors.textDarker }]}>
            {lecture.topicName || 'Untitled Session'}
          </Text>
          <Text style={[S.subtleText, { color: colors.text }]}>
            {students.length} {students.length === 1 ? 'student' : 'students'} in class
          </Text>
          {students.length > 0 && (
            <TouchableOpacity
              style={S.attendeeContainer}
              onPress={() => setAttendeeModalVisible(true)}
              activeOpacity={0.8}
            >
              {students.slice(0, MAX_VISIBLE_AVATARS).map((student, i) => (
                <UserAvatar
                  key={student.uid || i}
                  profilePic={student.profilePic}
                  firstName={student.firstname}
                  lastName={student.lastname}
                  username={student.username}
                  style={S.attendeeCircle}
                />
              ))}
              {students.length > MAX_VISIBLE_AVATARS && (
                <View style={S.attendeeCount}>
                  <Text style={S.attendeeCountText}>
                    +{students.length - MAX_VISIBLE_AVATARS}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[S.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[S.cardLabelRow, { marginBottom: 8 }]}>
            <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
            <Text style={[S.cardLabel, { color: colors.primary }]}>LIVE TRANSCRIPTION</Text>
          </View>
          <Text style={[S.transcriptionText, { color: colors.text }]}>
            {transcription ||
              (isLocalMuted ? 'Unmute to start transcribing.' : 'Listening…')}
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
        attendees={students}
        wavers={wavers}
        colors={colors}
      />
      <ConfirmationModal
        visible={endModalVisible}
        onDismiss={() => setEndModalVisible(false)}
        onConfirm={handleEndLecture}
        title={isEnding ? 'Ending class…' : 'End Live Session?'}
        subText="This stops the stream for all attendees and finalizes attendance records."
        colors={colors}
        islecturer={true}
      />
      {wavers.length > 0 && (
        <WavingToast activeUsers={wavers} onHide={noop} />
      )}
    </SafeAreaView>
  );
};
