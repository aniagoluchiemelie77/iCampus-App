import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ProgressBar,
  Avatar,
  IconButton,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { User, ChatMessage, Lecture } from 'types/firebase';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import LiveAudioStream from 'react-native-live-audio-stream';
import { useNavigation } from '@react-navigation/native';
import { RTCView } from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import { WavingToast, SpeakerToast } from './LecturerLiveClassSession';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
interface StudentLiveSessionProps {
  lecture: Lecture;
  checks: boolean[];
  hasException: boolean;
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
  checks,
  hasException,
  attendeeList = [],
  socket,
}: StudentLiveSessionProps) => {
  const user = useAppSelector(state => state.user);
  const localAudioTrack = useRef<any>(null);
  const navigation = useNavigation<any>();
  const [chatVisible, setChatVisible] = useState(false);
  const passedChecks = checks.filter((c: boolean) => c).length;
  const [waverName, setWaverName] = useState<string | null>(null);
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
  const [attendeeModalVisible, setAttendeeModalVisible] = useState(false);
  const [permittedSpeaker, setPermittedSpeaker] = useState<User | null>(null);
  const [wavers, setWavers] = useState<any[]>([]);
  const [currentAttendees, setCurrentAttendees] =
    useState<User[]>(attendeeList);
  const triggerWaveToast = (name: string) => {
    setWaverName(name);
  };
  const [lecturerLiveData, setLecturerData] = useState<LecturerDataProps>({
    firstname: '',
    profilePic: [],
    isCameraOn: true,
    cameraStreamUrl: null,
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
      student_waved: (data: { firstName: string }) => {
        triggerWaveToast(data.firstName);
        setWaverName(data.firstName);
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
  return (
    <View style={LiveClassSessionStyles.mainContainer}>
      <View style={LiveClassSessionStyles.header}>
        <Text style={LiveClassSessionStyles.liveText}>● LIVE</Text>
      </View>

      {/* 2. Shared Screen Area */}
      <View style={LiveClassSessionStyles.sharedScreen}>
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
      <View style={LiveClassSessionStyles.monitoringSection}>
        {activeSpeaker || permittedSpeaker ? (
          <Text style={LiveClassSessionStyles.speakerNote}>
            Speaker:{' '}
            {currentAttendees.find(a => a.uid === activeSpeaker)?.firstname ||
              permittedSpeaker?.firstname ||
              'Someone'}
          </Text>
        ) : null}
      </View>
      {/* 3. Course & Attendance Info */}
      <View style={LiveClassSessionStyles.infoSection}>
        <View style={LiveClassSessionStyles.row}>
          <View>
            <Text style={LiveClassSessionStyles.courseTitle}>
              {lecture.topicName || 'Lecture Title'}
            </Text>
          </View>
          <View style={LiveClassSessionStyles.durationBox}>
            <Text style={LiveClassSessionStyles.durationText}>
              Duration: {elapsedTime}
            </Text>
          </View>
        </View>

        {/* Attendee Horizontal List */}
        <View style={LiveClassSessionStyles.attendeeContainer}>
          {currentAttendees.slice(0, 4).map((student: User, i: number) => (
            <Avatar.Image
              key={student.uid || i}
              size={40}
              source={{
                uri:
                  student.profilePic?.[0] || 'https://via.placeholder.com/40',
              }}
              style={LiveClassSessionStyles.attendeeCircle}
            />
          ))}
          <View style={LiveClassSessionStyles.attendeeCount}>
            <Text style={LiveClassSessionStyles.attendeeCountText}>
              +{currentAttendees.length}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Transcription & Interaction */}
      <View style={LiveClassSessionStyles.bottomSection}>
        <View style={LiveClassSessionStyles.transcriptionBox}>
          <View style={LiveClassSessionStyles.aiHeader}>
            <IconButton icon="auto-fix" size={14} iconColor={PRIMARY_COLOR} />
            <Text style={LiveClassSessionStyles.aiLabel}>
              AI LIVE TRANSCRIPTION
            </Text>
          </View>
          <Text
            style={LiveClassSessionStyles.transcriptionText}
            numberOfLines={3}
          >
            {transcription || 'Listening to lecturer...'}
          </Text>
        </View>
        {/* Inside your bottomSection or near the FAB */}
        {isMicAllowed && (
          <TouchableOpacity
            style={LiveClassSessionStyles.micButton}
            onPress={() => setIsLocalMuted(!isLocalMuted)}
          >
            <MaterialIcons
              name={isLocalMuted ? 'mic-off' : 'mic'}
              size={24}
              color={PRIMARY_COLOR}
            />
            <Text style={LiveClassSessionStyles.micStatusText}>
              {isLocalMuted ? 'Muted' : 'You are Live'}
            </Text>
          </TouchableOpacity>
        )}
        {/* Floating Action Button (FAB) Area */}
        {!fabVisible && (
          <TouchableOpacity
            style={homeStyles.fab}
            onPress={() => {
              setFabVisible(true);
              setUnreadCount(0);
            }}
          >
            <MaterialIcons name="widgets" size={28} color="#fff" />
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
      </View>
      <View style={LiveClassSessionStyles.progressFooter}>
        <ProgressBar
          progress={hasException ? 1 : passedChecks / 7}
          color={hasException ? '#4CAF50' : PRIMARY_COLOR} // Use Green (#4CAF50) for verified exceptions
        />
        <Text
          style={[
            LiveClassSessionStyles.progressLabel,
            hasException && { color: '#4CAF50', fontWeight: 'bold' },
          ]}
        >
          {hasException
            ? 'Attendance Verified via Exception '
            : `${passedChecks}/7 Checks Verified`}
        </Text>
      </View>

      {/* Chat Modal (60% Height) */}
      <Portal>
        <Modal
          visible={chatVisible}
          onDismiss={() => setChatVisible(false)}
          contentContainerStyle={LiveClassSessionStyles.chatModal}
        >
          <Text style={LiveClassSessionStyles.chatHeader}>Live Class Chat</Text>
          <ScrollView
            style={LiveClassSessionStyles.messageList}
            contentContainerStyle={{ paddingBottom: 20 }}
            ref={ref => ref?.scrollToEnd({ animated: true })} // Auto-scroll to bottom
          >
            {messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  LiveClassSessionStyles.messageBubble,
                  msg.senderId === user.uid
                    ? LiveClassSessionStyles.myMessage
                    : LiveClassSessionStyles.theirMessage,
                ]}
              >
                <Text style={LiveClassSessionStyles.senderName}>
                  {msg.firstName}
                </Text>
                <Text style={LiveClassSessionStyles.messageText}>
                  {msg.text}
                </Text>
              </View>
            ))}
            {messages.length === 0 && (
              <Text style={LiveClassSessionStyles.emptyChat}>
                No messages yet. Start the conversation!
              </Text>
            )}
          </ScrollView>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={LiveClassSessionStyles.chatInputRow}>
              <TextInput
                mode="outlined"
                placeholder="Type a message..."
                value={inputText}
                onChangeText={setInputText}
                style={LiveClassSessionStyles.chatInput}
                outlineColor={PRIMARY_COLOR_TINT}
                activeOutlineColor={PRIMARY_COLOR}
                onSubmitEditing={sendMessage}
              />
              <IconButton
                icon="send"
                iconColor={PRIMARY_COLOR}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
      {/* Attendees list modal */}
      <Portal>
        <Modal
          visible={attendeeModalVisible}
          onDismiss={() => setAttendeeModalVisible(false)}
          style={LiveClassSessionStyles.modalOverlay}
        >
          <View style={LiveClassSessionStyles.bottomModalContainer}>
            <View style={LiveClassSessionStyles.modalHandle} />
            <View style={LiveClassSessionStyles.attendeeListHeader}>
              <Text style={LiveClassSessionStyles.attendeeListTitle}>
                Class Attendance ({currentAttendees.length})
              </Text>
            </View>

            <ScrollView style={LiveClassSessionStyles.attendeeScrollList}>
              {currentAttendees.map((student, index) => (
                <View
                  key={student.uid || index}
                  style={LiveClassSessionStyles.studentRow}
                >
                  <Avatar.Image
                    size={45}
                    source={{
                      uri:
                        student.profilePic?.[0] ||
                        'https://via.placeholder.com/45',
                    }}
                  />
                  <View style={LiveClassSessionStyles.studentInfo}>
                    <Text style={LiveClassSessionStyles.studentName}>
                      {student.firstname} {student.lastname}
                    </Text>
                  </View>
                  {/* Visual indicator if they are the one waving */}
                  {waverName === student.firstname && (
                    <MaterialIcons
                      name="front-hand"
                      size={20}
                      color={PRIMARY_COLOR}
                    />
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={LiveClassSessionStyles.closeModalButton}
              onPress={() => setAttendeeModalVisible(false)}
            >
              <Text style={LiveClassSessionStyles.closeModalButtonText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
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
  mainContainer: { flex: 1, backgroundColor: '#fff', position: 'relative' },
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
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 13,
  },
  endButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  waveNotification: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  waveText: { fontSize: 12, color: PRIMARY_COLOR, fontWeight: 'bold' },
  sharedScreen: {
    width: '100%',
    height: 250, // Standard aspect ratio height
    backgroundColor: '#2222',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Critical for PiP positioning
    elevation: 5,
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  infoSection: { padding: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2222',
    paddingBottom: 7,
  },
  lectureSubtitle: { fontSize: 14, color: '#666' },
  durationBox: { alignItems: 'flex-end' },
  durationText: { fontSize: 11, color: '#2222' },
  attendeeContainer: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'center',
  },
  attendeeCircle: { marginRight: -10, borderWidth: 2, borderColor: '#fff' },
  attendeeCount: {
    marginLeft: 15,
    fontWeight: 'bold',
    backgroundColor: PRIMARY_COLOR_TINT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeCountText: { color: PRIMARY_COLOR, fontSize: 12, fontWeight: 'bold' },
  bottomSection: { flexDirection: 'row', padding: 15, flex: 1 },
  transcriptionBox: {
    flex: 1,
    backgroundColor: '#F0F2FF', // Soft blue-ish tint for AI feel
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR_TINT, // Visual accent
    marginRight: 10,
    height: 100,
    justifyContent: 'center',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: -8, // Align icon with text
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY_COLOR_TINT,
    letterSpacing: 0.5,
  },
  transcriptionText: {
    fontSize: 13,
    color: '#2222',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  chatModal: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 10, // Margin ensures the "press outside" area is visible
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.75,
    position: 'absolute',
    bottom: 0,
  },
  chatHeader: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 10,
    color: '#2222',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    alignSelf: 'flex-end',
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    marginRight: 10,
    color: '#666',
  },
  progressFooter: { padding: 10, backgroundColor: '#fff' },
  progressLabel: {
    textAlign: 'center',
    fontSize: 10,
    marginTop: 4,
    color: '#2222',
  },
  waveToast: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    zIndex: 999,
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
  messageList: { flex: 1, marginVertical: 10 },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY_COLOR,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  senderName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#fff',
  },
  messageText: { fontSize: 14, color: '#fff' },
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
    paddingVertical: 8,
    borderRadius: 20,
    position: 'absolute',
    bottom: 80,
    right: 20,
    elevation: 4,
    backgroundColor: '#fff',
  },
  micStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  speakerToast: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR,
    maxWidth: '40%',
    zIndex: 100,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
    marginRight: 8,
  },
  speakerText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  //
  sharingActive: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  sharingOverlay: {
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  hintText: {
    color: PRIMARY_COLOR_TINT,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
  },
  stopShareButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 13,
  },
  stopShareText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  startSharePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 13,
    borderRadius: 14,
  },
  startSharePlaceholderText: {
    color: PRIMARY_COLOR_TINT,
    fontSize: 13,
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
    elevation: 10, // Sits on top of the shared screen
    zIndex: 10,
  },
  miniPreview: {
    flex: 1,
  },
  //
  controlWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  previewVideo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 70,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVideoText: {
    fontSize: 10,
    color: '#fff',
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
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent black
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotLive: { backgroundColor: PRIMARY_COLOR },
  dotOffline: { backgroundColor: '#fff' },
  controlsOverlay: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  muteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  muteAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  buttonRow: { flexDirection: 'row' },
  monitoringSection: {
    marginVertical: 15,
    paddingLeft: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerNote: {
    paddingVertical: 10,
    fontSize: 12,
    color: '#2222',
    marginRight: 15,
  },
  horizontalMonitorContainer: {
    paddingRight: 20,
    paddingVertical: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  modalContainer: {
    padding: 20,
    borderRadius: 12,
    alignContent: 'center',
    width: '80%',
    zIndex: 120,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  },
  modalButtonRowBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  modalButtonRowBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  bottomModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#eee',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 15,
  },
  attendeeListHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  attendeeListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2222',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  attendeeScrollList: {
    paddingBottom: 20,
  },
  studentInfo: {
    marginLeft: 15,
    flex: 1,
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
