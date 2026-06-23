import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { User, ChatMessage, Lecture } from '../types/firebase';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { UserAvatar } from './UserAvatar';
import LiveAudioStream from 'react-native-live-audio-stream';
import { useNavigation } from '@react-navigation/native';
import { useLiveTranscription } from '../hooks/useLiveTransciption';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
} from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import {
  ChatModal,
  AttendeeListModal,
  WavingToast,
  SpeakerToast,
  ConfirmationModal,
  LecturerTab,
} from './liveClassComponents';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from './PageHeader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
interface StudentLiveSessionProps {
  lecture: Lecture;
  socket: any;
  lecturerLiveData: any;
}
export const StudentLiveClassSession = ({
  lecture,
  socket,
  lecturerLiveData,
}: StudentLiveSessionProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const pc = useRef<RTCPeerConnection | null>(null);
  const navigation = useNavigation<any>();
  const AVATAR_SIZE = 40;
  const AVATAR_OVERLAP = -10;
  const BADGE_WIDTH = 60;
  const [chatVisible, setChatVisible] = useState(false);
  const [activeSpeakersList, setActiveSpeakersList] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string>(
    'Waiting for audio...',
  );
  const [fabVisible, setFabVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMicAllowed, setIsMicAllowed] = useState(false);
  const [isLocalMuted, setIsLocalMuted] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isWaving, setIsWaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [maxVisibleAvatars, setMaxVisibleAvatars] = useState(4);
  const [attendeeModalVisible, setAttendeeModalVisible] = useState(false);
  const [permittedSpeaker, setPermittedSpeaker] = useState<User | null>(null);
  const [wavers, setWavers] = useState<any[]>([]);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [currentAttendees, setCurrentAttendees] = useState<User[]>([]);
  const handleContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    const availableWidth = width - BADGE_WIDTH;
    const effectiveAvatarWidth = AVATAR_SIZE + AVATAR_OVERLAP;
    const computedMax = Math.floor(availableWidth / effectiveAvatarWidth);
    setMaxVisibleAvatars(Math.max(2, computedMax));
  };
  const checkNetworkQuality = useCallback(async () => {
    if (!pc.current) return;

    const stats = await pc.current.getStats();
    stats.forEach((report: any) => {
      if (report.type === 'inbound-rtp' && report.packetsLost > 50) {
        console.log('Low network detected, switching to audio-only...');
        switchToAudioOnly();
      }
    });
  }, [pc]);

  const switchToAudioOnly = async () => {
    if (!pc.current) return;
    const senders = pc.current.getSenders();
    senders.forEach(sender => {
      if (sender.track && sender.track.kind === 'video') {
        sender.track.enabled = false;
      }
    });

    Toast.show({
      type: 'info',
      text1: 'Low Bandwidth',
      text2: 'Video stream disabled to maintain audio quality.',
    });
  };
  const appendTranscriptionText = (label: string, text: string) => {
    setTranscription(prev => {
      const currentBuffer =
        prev === 'Waiting for audio...' ||
        prev === 'Listening to classroom room audio tracks...'
          ? ''
          : prev;
      const cleanLine = currentBuffer.endsWith(`${label} `)
        ? text
        : `\n${label} ${text}`;
      return (currentBuffer + cleanLine).slice(-200);
    });
  };
  const { sendAudioChunkToDeepgram } = useLiveTranscription({
    lectureId: lecture.id,
    isHost: false, // Students are not the host
    currentUserFirstName: user.firstname!,
    isMicActive: isMicAllowed,
    onTranscriptChunk: (label, text) => {
      appendTranscriptionText(label, text);
      // Broadcast the student's transcription to everyone else
      socket.emit('share_transcription_chunk', {
        lectureId: lecture.id,
        speakerLabel: label,
        text: text,
      });
    },
  });
  useEffect(() => {
    if (isMicAllowed && !isLocalMuted) {
      LiveAudioStream.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        bufferSize: 4096,
        wavFile: 'temp_audio.wav',
      });

      LiveAudioStream.on('data', (data: string) => {
        socket.emit('student_audio_chunk', {
          lectureId: lecture.id,
          audio: data,
        });
      });

      LiveAudioStream.start();
    } else {
      LiveAudioStream.stop();
    }
    return () => {
      LiveAudioStream.stop();
    };
  }, [isMicAllowed, isLocalMuted, socket, lecture.id]);
  useEffect(() => {
    const start = new Date(lecture.startTime).getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      const mins = Math.floor(diff / 60)
        .toString()
        .padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lecture.startTime]);
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      mic_permission_granted_received: (data: { targetUid: string }) => {
        const student = currentAttendees.find(a => a.uid === data.targetUid);
        setPermittedSpeaker(student || null);
        if (data.targetUid === user.uid) {
          setIsMicAllowed(true);
          setIsLocalMuted(false);
          Toast.show({
            type: 'success',
            text1: 'Floor is Yours',
            text2: 'You are now live.',
          });
        }
      },
      student_waved_received: (data: {
        uid: string;
        firstname: string;
        profilePic: string;
      }) => {
        setWavers(prev => {
          if (prev.find(w => w.uid === data.uid)) return prev;
          return [...prev, data];
        });
      },
      stream_received: ({ streamUrl }: { streamUrl: string }) => {
        setIsSharingScreen(true);
        setRemoteStreamUrl(streamUrl);
      },
      lecture_ended_by_host: () => {
        navigation.navigate('Home');
      },
      receive_message: (newMessage: ChatMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (!chatVisible) setUnreadCount(prev => prev + 1);
      },
      active_speaker_changed_received: (data: {
        uid: string;
        firstname: string;
      }) => {
        setActiveSpeaker(data.firstname);
        setActiveSpeakersList(prev => {
          if (prev.find(s => s.uid === data.uid)) return prev;
          return [...prev, data];
        });
      },
    };
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
    };
  }, [socket, user.uid, navigation, chatVisible, currentAttendees]);
  useEffect(() => {
    if (!socket || !lecture?.id || !user?.uid) return;
    socket.emit('join_lecture_session', {
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
    const handleAttendeeUpdate = (updatedList: User[]) => {
      setCurrentAttendees(updatedList);
    };
    const handleIncomingTranscript = (data: {
      speakerLabel: string;
      text: string;
    }) => {
      appendTranscriptionText(data.speakerLabel, data.text);
    };
    socket.on('update_attendee_list', handleAttendeeUpdate);
    socket.on('share_transcription_chunk', handleIncomingTranscript);
    socket.on('webrtc_signal_received', async (data: any) => {
      if (!pc.current) return;
      try {
        if (data.signal.type === 'offer') {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(data.signal),
          );
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          socket.emit('webrtc_signal', {
            lectureId: lecture.id,
            signal: answer,
          });
        } else if (data.signal.candidate) {
          await pc.current.addIceCandidate(
            new RTCIceCandidate(data.signal.candidate),
          );
        }
      } catch (err) {
        console.error('Failed to process WebRTC signal:', err);
      }
    });
    return () => {
      socket.off('update_attendee_list', handleAttendeeUpdate);
      socket.off('transcription_update', handleIncomingTranscript);
    };
  }, [socket, lecture.id, user]);
  useEffect(() => {
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (pc.current) {
      const interval = setInterval(checkNetworkQuality, 5000);
      return () => clearInterval(interval);
    }

    return () => {
      pc.current?.close();
    };
  }, [checkNetworkQuality]);
  useEffect(() => {
    if (!isMicAllowed) {
      LiveAudioStream.stop();
      return;
    }
    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      bufferSize: 4096,
      wavFile: '',
    };
    LiveAudioStream.init(options);
    LiveAudioStream.on('data', (base64Data: string) => {
      const audioBuffer = Buffer.from(base64Data, 'base64').buffer;
      sendAudioChunkToDeepgram(audioBuffer);
    });
    LiveAudioStream.start();

    return () => {
      LiveAudioStream.stop();
    };
  }, [isMicAllowed, sendAudioChunkToDeepgram]);
  const sendMessage = () => {
    if (inputText.trim().length === 0) return;
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
    if (isWaving) return;
    socket.emit('student_waved', {
      lectureId: lecture.id,
      uid: user.uid,
      firstname: user.firstname,
      profilePic: user.profilePic || '',
    });
    setWavers(prev => [...prev, { uid: user.uid, firstname: user.firstname }]);
    setIsWaving(true);
    setFabVisible(false);

    Toast.show({
      type: 'info',
      text1: 'Request Sent',
      text2: 'Hand raised for the lecturer.',
    });
  };
  const handleLeaveLecture = () => {
    socket.emit('leave_lecture', {
      lectureId: lecture.id,
      uid: user.uid,
    });
    setIsMicAllowed(false);
    setIsLocalMuted(true);
    setEndModalVisible(false);
    navigation.navigate('Home', { activeTab: 'classroom' });
  };
  return (
    <View
      style={[
        LiveClassSessionStyles.mainContainer,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader
        title="● LIVE"
        showBackButton={false}
        rightElement={
          <TouchableOpacity
            onPress={() => setEndModalVisible(true)}
            style={[
              LiveClassSessionStyles.endButton,
              { backgroundColor: colors.btnColor },
            ]}
          >
            <Text
              style={[
                LiveClassSessionStyles.endButtonText,
                { color: colors.btnTextColor },
              ]}
            >
              Leave Session
            </Text>
          </TouchableOpacity>
        }
      />

      {/* 2. Shared Screen Area */}
      <View
        style={[
          LiveClassSessionStyles.sharedScreen,
          isSharingScreen && LiveClassSessionStyles.sharingActive,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {remoteStreamUrl && (
          <RTCView
            streamURL={remoteStreamUrl}
            style={LiveClassSessionStyles.fullScreenVideo}
            objectFit="cover"
          />
        )}
        <LecturerTab
          lecturer={lecturerLiveData}
          isCameraOn={lecturerLiveData?.isCameraOn}
          streamUrl={lecturerLiveData?.cameraStreamUrl}
        />
      </View>
      <View
        style={[
          LiveClassSessionStyles.monitoringSection,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {activeSpeaker || permittedSpeaker ? (
          <Text
            style={[LiveClassSessionStyles.speakerNote, { color: colors.text }]}
          >
            Speaker:{' '}
            {currentAttendees.find(a => a.uid === activeSpeaker)?.firstname ||
              permittedSpeaker?.firstname ||
              'Someone'}
          </Text>
        ) : null}
        {isWaving! && (
          <TouchableOpacity
            style={[
              LiveClassSessionStyles.muteAllButton,
              { backgroundColor: colors.btnColor },
            ]}
            onPress={handleWave}
          >
            <MaterialIcons
              name={'waving-hand-outlined'}
              size={18}
              color={colors.btnTextColor}
            />
            <Text
              style={[
                LiveClassSessionStyles.muteAllText,
                { color: colors.btnTextColor },
              ]}
            >
              Wave
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View
        style={[
          LiveClassSessionStyles.infoSection,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={LiveClassSessionStyles.row}>
          <Text
            style={[
              LiveClassSessionStyles.courseTitle,
              { color: colors.textDarker },
            ]}
          >
            {lecture.topicName || 'Untitled Session'}
          </Text>
          <Text
            style={[
              LiveClassSessionStyles.durationText,
              { color: colors.text },
            ]}
          >
            Duration: {elapsedTime}
          </Text>
        </View>
        <View
          style={LiveClassSessionStyles.attendeeContainer}
          onLayout={handleContainerLayout}
        >
          {currentAttendees
            .slice(0, maxVisibleAvatars)
            .map((student: User, i: number) => (
              <UserAvatar
                key={student.uid || i}
                profilePic={student.profilePic}
                firstName={student.firstname}
                lastName={student.lastname}
                username={student.username}
                style={LiveClassSessionStyles.attendeeCircle}
              />
            ))}
          {currentAttendees.length > maxVisibleAvatars && (
            <TouchableOpacity
              style={[
                LiveClassSessionStyles.attendeeCount,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => setAttendeeModalVisible(true)}
            >
              <Text
                style={[
                  LiveClassSessionStyles.attendeeCountText,
                  { color: colors.btnTextColor },
                ]}
              >
                +{currentAttendees.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. Transcription & Interaction */}
      <View
        style={[
          LiveClassSessionStyles.bottomSection,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={LiveClassSessionStyles.aiHeader}>
          <MaterialIcons
            name="auto-awesome-outlined"
            size={16}
            color={colors.primary}
          />
          <Text
            style={[LiveClassSessionStyles.aiLabel, { color: colors.primary }]}
          >
            Live Transcription
          </Text>
        </View>
        <Text
          style={[
            LiveClassSessionStyles.transcriptionText,
            { color: colors.text },
          ]}
        >
          {transcription || 'Listening to classroom room audio tracks...'}
        </Text>
      </View>
      {isMicAllowed && (
        <TouchableOpacity
          style={[
            LiveClassSessionStyles.micButton,
            { backgroundColor: colors.btnColor },
          ]}
          onPress={() => setIsLocalMuted(!isLocalMuted)}
        >
          <MaterialIcons
            name={isLocalMuted ? 'mic-off' : 'mic'}
            size={24}
            color={colors.btnTextColor}
          />
          <Text
            style={[
              LiveClassSessionStyles.micStatusText,
              { color: colors.btnTextColor },
            ]}
          >
            {isLocalMuted ? 'Muted' : 'Speak'}
          </Text>
        </TouchableOpacity>
      )}
      {!fabVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => {
            setFabVisible(true);
            setUnreadCount(0);
          }}
        >
          <MaterialIcons name="widgets" size={28} color={colors.btnTextColor} />
        </TouchableOpacity>
      )}
      <ExpandableFAB
        isVisible={fabVisible}
        onClose={() => setFabVisible(false)}
        actions={['Live Chat', 'Hand Wave', 'View Lectures']}
        unreadCount={unreadCount}
        onChatOpen={() => setChatVisible(true)}
        onWave={() => {
          socket.emit('send_wave', {
            lectureId: lecture.id,
            firstName: user.firstname,
          });
          setFabVisible(false);
        }}
      />
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
        attendees={currentAttendees}
        wavers={wavers}
        colors={colors}
      />
      <ConfirmationModal
        visible={endModalVisible}
        onDismiss={() => setEndModalVisible(false)}
        onConfirm={handleLeaveLecture}
        title="Leave Live Session?"
        subText="This will end the session and finalize your attendance record."
        colors={colors}
        islecturer={false}
      />
      {wavers.length > 0 && (
        <WavingToast activeUsers={wavers} onHide={() => setWavers([])} />
      )}
      {activeSpeakersList.length > 0 && (
        <SpeakerToast
          activeUsers={activeSpeakersList}
          onHide={() => setActiveSpeakersList([])}
        />
      )}
    </View>
  );
};

export const LiveClassSessionStyles = StyleSheet.create({
  mainContainer: { flex: 1, position: 'relative', paddingHorizontal: 15 },
  liveText: { color: PRIMARY_COLOR, fontWeight: 'bold', fontSize: 12 },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
  },
  endButtonText: { fontWeight: 'bold', fontSize: 14 },
  sharedScreen: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    overflow: 'hidden',
    alignContent: 'center',
    position: 'relative',
    elevation: 5,
    marginBottom: 15,
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  infoSection: { padding: 15, borderRadius: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  durationBox: { alignItems: 'flex-end' },
  durationText: { fontSize: 12 },
  attendeeContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  attendeeCircle: { marginRight: 6, borderWidth: 2, borderColor: '#fff' },
  attendeeCount: {
    marginLeft: 10,
    fontWeight: 'bold',
    padding: 15,
    borderRadius: 12,
    alignContent: 'center',
  },
  attendeeCountText: { fontSize: 12, fontWeight: 'bold' },
  bottomSection: { padding: 15, borderRadius: 15 },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  transcriptionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  chatModal: {
    padding: 20,
    marginHorizontal: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.75,
    position: 'absolute',
    bottom: 0,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  emptyChat: {
    textAlign: 'center',
    color: PRIMARY_COLOR_TINT,
    marginTop: 20,
    fontSize: 12,
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    position: 'absolute',
    bottom: 20,
    left: 20,
    elevation: 4,
    zIndex: 100,
  },
  micStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sharingActive: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  sharingOverlay: {
    flex: 1,
    alignContent: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  hintText: {
    fontSize: 14,
  },
  stopShareButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
    marginTop: 20,
  },
  stopShareText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  startSharePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 15,
    paddingVertical: 10,
  },
  startSharePlaceholderText: {
    marginLeft: 3,
    fontSize: 14,
    fontWeight: 'bold',
  },
  monitoringSection: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'scroll',
  },
  speakerNote: {
    fontSize: 14,
    marginRight: 8,
  },
  horizontalMonitorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monitorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monitorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  muteAllText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  muteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 6,
  },
});
