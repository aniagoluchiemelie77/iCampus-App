import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Socket } from 'socket.io-client';
import {
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
} from 'react-native-webrtc';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { User, ChatMessage, Lecture } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks';
import { UserAvatar } from './UserAvatar';
import { useLiveTranscription } from '../hooks/useLiveTransciption';
import { useTheme } from '../context/ThemeContext';
import {
  createLiveClassPeerConnectionConfig,
  formatElapsed,
  toMillis,
} from '../utils/liveClassRtc';
import { LiveClassSessionStyles as S, LIVE_RED } from './liveClassStyles';
import {
  ChatModal,
  AttendeeListModal,
  ConfirmationModal,
  LecturerTab,
  LiveControlButton,
} from './liveClassComponents';

interface StudentLiveSessionProps {
  lecture: Lecture;
  socket: Socket | null;
  lecturerLiveData: any;
  /** True once the server has admitted this socket to the lecture room. */
  joined: boolean;
}

type StreamState = 'waiting' | 'connecting' | 'connected' | 'reconnecting';

const MAX_VISIBLE_AVATARS = 6;
const RETRY_STREAM_MS = 4000;

const serializeCandidate = (c: any) =>
  typeof c?.toJSON === 'function'
    ? c.toJSON()
    : { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex };

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hostSocketIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatVisibleRef = useRef(false);
  const startedAtRef = useRef<number>(
    toMillis((lecture as any).startedAt) ?? Date.now(),
  );

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [streamState, setStreamState] = useState<StreamState>(
    lecture.isLive ? 'connecting' : 'waiting',
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

  // ---- WebRTC (receive-only) -----------------------------------------------
  const resetPeer = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
  }, []);

  const requestStream = useCallback(() => {
    if (!socket || !joined) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    socket.emit('webrtc_request_stream', { lectureId: lecture.id });
    // If no offer arrives (host not broadcasting yet), ask again shortly.
    retryTimerRef.current = setTimeout(() => {
      if ((pcRef.current as any)?.connectionState !== 'connected') requestStream();
    }, RETRY_STREAM_MS * 2);
  }, [socket, joined, lecture.id]);

  const handleHostSignal = useCallback(
    async ({ signal, senderId }: { signal: any; senderId: string }) => {
      if (!socket) return;
      try {
        if (signal.type === 'offer') {
          resetPeer();
          hostSocketIdRef.current = senderId;
          setStreamState('connecting');
          const pc = new RTCPeerConnection(createLiveClassPeerConnectionConfig());
          pcRef.current = pc;

          (pc as any).ontrack = (event: any) => {
            const [stream] = event.streams || [];
            if (stream) setRemoteStream(stream);
          };
          (pc as any).onicecandidate = (event: any) => {
            if (!event.candidate) return;
            socket.emit('webrtc_signal', {
              lectureId: lecture.id,
              targetSocketId: senderId,
              signal: { candidate: serializeCandidate(event.candidate) },
            });
          };
          (pc as any).onconnectionstatechange = () => {
            if (pcRef.current !== pc) return;
            const state = (pc as any).connectionState;
            if (state === 'connected') {
              setStreamState('connected');
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            } else if (state === 'failed' || state === 'disconnected') {
              setStreamState('reconnecting');
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(requestStream, RETRY_STREAM_MS);
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidatesRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc_signal', {
            lectureId: lecture.id,
            targetSocketId: senderId,
            signal: { type: answer.type, sdp: answer.sdp },
          });
        } else if (signal.candidate) {
          const pc = pcRef.current;
          if (!pc || !(pc as any).remoteDescription) {
            pendingCandidatesRef.current.push(signal.candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('[LIVE_RTC] Failed to process host signal:', err);
      }
    },
    [socket, lecture.id, resetPeer, requestStream],
  );

  // Ask for the stream as soon as we're in the room (and after reconnects).
  useEffect(() => {
    if (joined) requestStream();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [joined, requestStream]);

  useEffect(() => () => resetPeer(), [resetPeer]);

  // ---- Socket events --------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const handlers: Record<string, (data: any) => void> = {
      webrtc_signal_received: handleHostSignal,
      live_stream_started: ({ startedAt }) => {
        startedAtRef.current = toMillis(startedAt) ?? startedAtRef.current;
        setStreamState('connecting');
        requestStream();
      },
      webrtc_viewer_left: ({ viewerSocketId }) => {
        // The host's socket dropped: wait for it to come back.
        if (viewerSocketId === hostSocketIdRef.current) {
          resetPeer();
          setStreamState('reconnecting');
        }
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
  }, [socket, user.uid, handleHostSignal, requestStream, resetPeer, appendTranscriptionText]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(formatElapsed(startedAtRef.current)), 1000);
    return () => clearInterval(timer);
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

  useEffect(() => {
    if (!micLive) return;
    LiveAudioStream.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      bufferSize: 4096,
      wavFile: '',
    });
    const subscription: any = LiveAudioStream.on('data', (base64Data: string) => {
      sendAudioChunkToDeepgram(Buffer.from(base64Data, 'base64').buffer);
    });
    LiveAudioStream.start();
    return () => {
      LiveAudioStream.stop();
      subscription?.remove?.();
    };
  }, [micLive, sendAudioChunkToDeepgram]);

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
  const hasVideo = !!remoteStream && (isScreenShared || (isLecturerCameraOn && !isAudioOnly));
  const stageMessage =
    streamState === 'waiting'
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

      <View style={S.stage}>
        {remoteStream && (
          // Kept mounted even when video is hidden: it also carries the audio.
          <RTCView
            streamURL={remoteStream.toURL()}
            style={[S.stageVideo, !hasVideo && { opacity: 0 }]}
            objectFit={isScreenShared ? 'contain' : 'cover'}
          />
        )}
        {!hasVideo && (
          <View style={S.stageOverlay}>
            {streamState === 'connected' ? (
              <LecturerTab
                lecturer={lecturerLiveData}
                isCameraOn={false}
                streamUrl={null}
              />
            ) : (
              <MaterialIcons name={stageMessage.icon} size={46} color={colors.primary} />
            )}
            <Text style={S.stageTitle}>{stageMessage.title}</Text>
            <Text style={S.stageHint}>{stageMessage.hint}</Text>
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
          <Text style={[S.topicText, { color: colors.textDarker }]}>
            {lecture.topicName || 'Untitled Session'}
          </Text>
          <Text style={[S.subtleText, { color: colors.text }]}>
            with {lecturerLiveData?.displayName || 'your lecturer'} · {classmates.length}{' '}
            {classmates.length === 1 ? 'student' : 'students'}
          </Text>
          {classmates.length > 0 && (
            <TouchableOpacity
              style={S.attendeeContainer}
              onPress={() => setAttendeeModalVisible(true)}
              activeOpacity={0.8}
            >
              {classmates.slice(0, MAX_VISIBLE_AVATARS).map((student, i) => (
                <UserAvatar
                  key={student.uid || i}
                  profilePic={student.profilePic}
                  firstName={student.firstname}
                  lastName={student.lastname}
                  username={student.username}
                  style={S.attendeeCircle}
                />
              ))}
              {classmates.length > MAX_VISIBLE_AVATARS && (
                <View style={S.attendeeCount}>
                  <Text style={S.attendeeCountText}>
                    +{classmates.length - MAX_VISIBLE_AVATARS}
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
