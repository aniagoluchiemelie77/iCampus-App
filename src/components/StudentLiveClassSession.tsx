import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { User, ChatMessage, Lecture } from '../types/firebase';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { UserAvatar } from './UserAvatar';
import LiveAudioStream from 'react-native-live-audio-stream';
import { useNavigation } from '@react-navigation/native';
import { RTCView } from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import {
  ChatModal,
  AttendeeListModal,
  WavingToast,
  SpeakerToast,
  ConfirmationModal,
} from './liveClassComponents';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from './PageHeader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
interface StudentLiveSessionProps {
  lecture: Lecture;
  socket: any;
  attendeeList?: User[];
  lecturerData: LiveLecturer | null;
}
interface LecturerDataProps {
  firstname: string;
  profilePic: string[];
  isCameraOn: boolean;
  cameraStreamUrl: string | null; // Allow both types
}
export type LiveLecturer = User & {
  isCameraOn?: boolean;
  cameraStreamUrl?: string;
  isMuted?: boolean;
};
export const LecturerTab = ({ lecturer, isCameraOn, streamUrl }: any) => {
  return (
    <View style={LiveClassSessionStyles.lecturerTab}>
      <View style={LiveClassSessionStyles.mediaContainer}>
        {isCameraOn && streamUrl ? (
          <RTCView
            streamURL={
              typeof streamUrl === 'string' ? streamUrl : streamUrl.toURL()
            }
            style={LiveClassSessionStyles.lecturerVideo}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          /* 2. Audio/Fallback Mode: Show Profile Picture */
          <Avatar.Image
            size={80}
            source={{
              uri:
                lecturer?.profilePic?.[0] || 'https://via.placeholder.com/80',
            }}
          />
        )}
      </View>
      <View style={LiveClassSessionStyles.otherSection}>
        <View style={LiveClassSessionStyles.nameBadge}>
          <Text style={LiveClassSessionStyles.nameText} numberOfLines={1}>
            {lecturer?.firstname || 'Lecturer'}
          </Text>
        </View>
        <IconButton
          icon={lecturer?.isMuted ? 'microphone-off' : 'microphone'}
          size={12}
          iconColor={PRIMARY_COLOR}
        />
      </View>
    </View>
  );
};
export const StudentLiveClassSession = ({
  lecture,
  attendeeList = [],
  socket,
}: StudentLiveSessionProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const localAudioTrack = useRef<any>(null);
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
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [maxVisibleAvatars, setMaxVisibleAvatars] = useState(4);
  const [attendeeModalVisible, setAttendeeModalVisible] = useState(false);
  const [permittedSpeaker, setPermittedSpeaker] = useState<User | null>(null);
  const [wavers, setWavers] = useState<any[]>([]);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [currentAttendees, setCurrentAttendees] =
    useState<User[]>(attendeeList);
  const [lecturerLiveData, setLecturerData] = useState<LecturerDataProps>({
    firstname: '',
    profilePic: [],
    isCameraOn: true,
    cameraStreamUrl: null,
  });
  const handleContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    const availableWidth = width - BADGE_WIDTH;
    const effectiveAvatarWidth = AVATAR_SIZE + AVATAR_OVERLAP;
    const computedMax = Math.floor(availableWidth / effectiveAvatarWidth);
    setMaxVisibleAvatars(Math.max(2, computedMax));
  };
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
    if (!socket || !lecture?.id || !user?.uid) return;

    socket.emit('join_lecture_session', {
      lectureId: lecture.id,
      user: {
        uid: user.uid,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        profilePic: user.profilePic,
      },
    });
    socket.on('transcription_update', (data: { text: string }) => {
      setTranscription(prev => (prev + ' ' + data.text).slice(-150));
    });
    socket.emit('toggle_student_audio', {
      lectureId: lecture.id,
      uid: user.uid,
      isMuted: isLocalMuted,
    });
    socket.on('stream_received', ({ streamUrl }: { streamUrl: string }) => {
      console.log('Received Lecturer Stream URL:', streamUrl);
      setIsSharingScreen(true);
      setRemoteStreamUrl(streamUrl);
      setLecturerData(prev => ({ ...prev, cameraStreamUrl: streamUrl }));
    });
    socket.on(
      'lecturer_camera_toggled',
      ({ isCameraOn }: { isCameraOn: boolean }) => {
        setLecturerData(prev => ({ ...prev, isCameraOn }));
      },
    );
    socket.on(
      'mic_permission_granted_received',
      (data: { targetUid: string }) => {
        if (data.targetUid !== user.uid) {
          const student = currentAttendees.find(a => a.uid === data.targetUid);
          setPermittedSpeaker(student || null);
          setWavers(prev => prev.filter(w => w.uid !== data.targetUid));

          if (!isLocalMuted) {
            Toast.show({
              type: 'info',
              text1: 'Speaker System Active',
              text2: `${
                student?.firstname || 'Student'
              } unmuted. Your overlay priority is active.`,
            });
          }
        } else {
          if (localAudioTrack.current) {
            localAudioTrack.current.enabled = true;
            setIsLocalMuted(false);
            Toast.show({
              type: 'success',
              text1: 'Floor is Yours',
              text2:
                'The lecturer has granted you microphone access. You are now live.',
            });
          }
        }
      },
    );
    socket.on(
      'active_speaker_changed',
      (data: { firstname: string; uid: string }) => {
        setActiveSpeaker(data.uid);
        if (data.uid !== user.uid) {
          setActiveSpeakersList(prev => {
            if (prev.find(s => s.uid === data.uid)) return prev;
            return [...prev, { uid: data.uid, firstname: data.firstname }];
          });
        }
      },
    );
    socket.on('lecture_ended_by_host', (data: { lectureId: string }) => {
      if (data.lectureId === lecture.id) {
        setRemoteStreamUrl(null);

        Toast.show({
          type: 'info',
          text1: 'Class Concluded',
          text2: 'The lecturer has ended this live session.',
        });

        navigation.navigate('Home', { activeTab: 'classroom' });
      }
    });
    socket.on('all_mics_revoked_received', () => {
      setIsMicAllowed(false);
      setActiveSpeaker(null);
      setPermittedSpeaker(null);

      if (localAudioTrack && localAudioTrack.current) {
        localAudioTrack.current.stop(); // Stops the hardware microphone recording channel safely
      }

      Toast.show({
        type: 'info',
        text1: 'The lecturer has muted the classroom.',
      });
    });
    socket.on(
      'lecturer_camera_toggled_received',
      (data: { isCameraOn: boolean }) => {
        setLecturerData(prev => ({ ...prev, isCameraOn: data.isCameraOn }));
        Toast.show({
          type: 'info',
          text1: data.isCameraOn
            ? 'Lecturer turned camera on.'
            : 'Lecturer turned camera off.',
        });
      },
    );

    // 2. Consolidated Listeners
    const handlers = {
      mic_permission_granted: (data: { targetUid: string }) => {
        if (data.targetUid === user.uid) {
          setIsMicAllowed(true);
          setIsLocalMuted(false);
        }
      },
      receive_message: (newMessage: ChatMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (!chatVisible) setUnreadCount(prev => prev + 1);
      },
      update_attendee_list: (newList: User[]) => {
        setCurrentAttendees(newList);
      },
    };

    // Attach all
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));

    // 3. Cleanup
    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
      socket.off('toggle_student_audio');
      socket.off('transcription_update');
      socket.emit('leave_lecture', { lectureId: lecture.id, uid: user.uid });
    };
  }, [
    socket,
    lecture.id,
    user.uid,
    user.firstname,
    user.profilePic,
    chatVisible,
    navigation,
    isLocalMuted,
    user.lastname,
    user.username,
    currentAttendees,
  ]);
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
  const handleLeaveLecture = () => {
    console.log('Leaving lecture');
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
      </View>
      {/* 3. Course & Attendance Info */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  liveText: { color: PRIMARY_COLOR, fontWeight: 'bold', fontSize: 12 },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
  },
  endButtonText: { fontWeight: 'bold', fontSize: 14 },
  waveNotification: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
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
  lectureSubtitle: { fontSize: 14, color: '#666' },
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
  transcriptionBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 1,
    borderLeftColor: PRIMARY_COLOR,
    marginRight: 10,
    height: 100,
    justifyContent: 'center',
  },
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
    marginHorizontal: 10, // Margin ensures the "press outside" area is visible
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.75,
    position: 'absolute',
    bottom: 0,
  },
  //
  lecturerTab: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  lecturerVideo: {
    width: '100%',
    height: '100%',
  },
  otherSection: {
    alignSelf: 'flex-end',
    width: '100%',
  },
  smallBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    zIndex: 10,
    borderColor: PRIMARY_COLOR,
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
  // PiP (Picture-in-Picture) Styles
  lecturerCameraPreview: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 80,
    height: 110,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: '#000',
    overflow: 'hidden',
    elevation: 10,
    zIndex: 10,
  },
  miniPreview: {
    flex: 1,
  },
  buttonRow: { flexDirection: 'row' },
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
  monitorTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  monitorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  reviewModalInput: {
    width: '100%',
    backgroundColor: '#fff',
    marginBottom: 15,
    color: '#2222',
    fontSize: 14,
  },
  reviewModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
  },
  reviewModalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalReviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginVertical: 20,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2222',
  },
  closeModalButton: {
    marginTop: 20,
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  nameBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nameText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
