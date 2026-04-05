import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
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
import Video from 'react-native-video';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { User, ChatMessage } from 'types/firebase';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import LiveAudioStream from 'react-native-live-audio-stream';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const WavingToast = ({
  firstName,
  onHide,
}: {
  firstName: string;
  onHide: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  useEffect(() => {
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
  }, [onHide, slideAnim]);

  return (
    <Animated.View
      style={[styles.waveToast, { transform: [{ translateY: slideAnim }] }]}
    >
      <Text style={styles.waveText}>👋 {firstName} is waving</Text>
    </Animated.View>
  );
};
export const SpeakerToast = ({
  firstName,
  onHide,
}: {
  firstName: string;
  onHide: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();

    // Keep it visible as long as they are speaking, or auto-hide after 5s
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onHide());
    }, 5000);

    return () => clearTimeout(timer);
  }, [onHide, slideAnim]);

  return (
    <Animated.View
      style={[styles.speakerToast, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.liveIndicator} />
      <Text style={styles.speakerText}> {firstName} is speaking...</Text>
    </Animated.View>
  );
};
export const LecturerTab = ({ lecturer, isCameraOn, streamUrl }: any) => {
  return (
    <View style={styles.lecturerTab}>
      <View style={styles.mediaContainer}>
        {isCameraOn && streamUrl ? (
          /* 1. Video Mode: Using react-native-video or your RTC View */
          <Video
            source={{ uri: streamUrl }}
            style={styles.lecturerVideo}
            resizeMode="cover"
            muted={true}
            repeat={true}
          />
        ) : (
          /* 2. Audio/Fallback Mode: Show Profile Picture */
          <Avatar.Image
            size={80}
            source={{
              uri:
                lecturer?.profilePic?.[0] || 'https://via.placeholder.com/80',
            }}
            style={styles.avatarBorder}
          />
        )}
      </View>

      {/* 3. Mic Status Indicator (Visual Feedback) */}
      <View style={styles.micIndicator}>
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
  lecturerData,
  socket,
}: any) => {
  const user = useAppSelector(state => state.user);
  const [chatVisible, setChatVisible] = useState(false);
  const passedChecks = checks.filter((c: boolean) => c).length;
  const [waverName, setWaverName] = useState<string | null>(null);
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
  const triggerWaveToast = (name: string) => {
    setWaverName(name);
  };
  useEffect(() => {
    if (!socket || !lecture?.id || !user?.uid) return;
    socket.emit('join_lecture', {
      lectureId: lecture.id,
      userUid: user.uid,
      firstName: user.firstname,
    });
    socket.on('mic_permission_granted', (data: { targetUid: string }) => {
      if (data.targetUid === user.uid) {
        setIsMicAllowed(true);
        setIsLocalMuted(false); // Auto-unmute when granted
        // Optional: Toast.show({ text1: "You are now live!" });
      }
    });
    socket.on('transcription_update', (data: { text: string }) => {
      setTranscription(prev => (prev + ' ' + data.text).slice(-150));
    });
    socket.on('student_waved', (data: { firstName: string }) => {
      triggerWaveToast(data.firstName);
    });
    socket.on('receive_message', (newMessage: ChatMessage) => {
      setMessages(prev => [...prev, newMessage]);
      if (!chatVisible) {
        setUnreadCount(prev => prev + 1);
      }
    });
    socket.on('mic_permission_revoked', () => {
      setIsMicAllowed(false);
      setIsLocalMuted(true);
    });
    return () => {
      socket.off('mic_permission_granted');
      socket.off('mic_permission_revoked');
      socket.emit('leave_lecture', { lectureId: lecture.id });
      socket.off('transcription_update');
      socket.off('student_waved');
      socket.off('receive_message');
    };
  }, [socket, chatVisible, lecture.id, user?.uid, user?.firstname]);
  useEffect(() => {
    if (!socket) return;
    socket.emit('toggle_student_audio', {
      lectureId: lecture.id,
      uid: user.uid,
      isMuted: isLocalMuted,
    });
  }, [isLocalMuted, socket, lecture.id, user.uid]);
  useEffect(() => {
    if (!socket) return;
    socket.on(
      'active_speaker_changed',
      (data: { firstName: string; uid: string }) => {
        if (data.uid !== user.uid) {
          setActiveSpeaker(data.firstName);
        } else {
          setActiveSpeaker(null);
        }
      },
    );

    return () => {
      socket.off('active_speaker_changed');
    };
  }, [socket, user.uid]);
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
      // Calling it here is fine, but the cleanup (return) is the issue
      LiveAudioStream.stop();
    }

    // FIXED CLEANUP: Synchronous wrapper for the async stop
    return () => {
      LiveAudioStream.stop();
      // If stop() returns a promise, just call it.
      // Don't 'return' it and don't use 'await' here.
    };
  }, [isMicAllowed, isLocalMuted, socket, lecture.id]);
  const sendMessage = () => {
    if (inputText.trim().length === 0) return;
    socket.emit('send_message', {
      text: inputText,
      senderId: user.uid,
      lectureId: lecture.id,
      firstName: user.firstname,
      profilePic: user.profilePic?.[0] || '',
    });
    setInputText('');
  };
  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.liveText}>● LIVE</Text>
      </View>

      {/* 2. Shared Screen Area */}
      <View style={styles.sharedScreen}>
        <Video
          source={{ uri: lecture.sharedScreenStreamUrl }}
          style={styles.fullScreenVideo}
          resizeMode="contain"
        />
        <LecturerTab
          lecturer={lecturerData}
          isCameraOn={lecturerData?.isCameraOn}
          streamUrl={lecturerData?.cameraStreamUrl}
        />
      </View>

      {/* 3. Course & Attendance Info */}
      <View style={styles.infoSection}>
        <View style={styles.row}>
          <View>
            <Text style={styles.courseTitle}>
              {lecture.courseTitle || 'Course Title'}
            </Text>
            <Text style={styles.lectureSubtitle}>
              {lecture.title || 'Lecture Title'}
            </Text>
          </View>
          <View style={styles.durationBox}>
            <Text style={styles.durationText}>
              Duration: {lecture.duration || '00:00'}
            </Text>
          </View>
        </View>

        {/* Attendee Horizontal List */}
        <View style={styles.attendeeContainer}>
          {attendeeList.slice(0, 4).map((student: User, i: number) => (
            <Avatar.Image
              key={student.uid || i}
              size={40}
              source={{
                uri:
                  student.profilePic?.[0] || 'https://via.placeholder.com/40',
              }}
              style={styles.attendeeCircle}
            />
          ))}
          <View style={styles.attendeeCount}>
            <Text style={styles.attendeeCountText}>+{attendeeList.length}</Text>
          </View>
        </View>
      </View>

      {/* 4. Transcription & Interaction */}
      <View style={styles.bottomSection}>
        <View style={styles.transcriptionBox}>
          <View style={styles.aiHeader}>
            <IconButton icon="auto-fix" size={14} iconColor={PRIMARY_COLOR} />
            <Text style={styles.aiLabel}>AI LIVE TRANSCRIPTION</Text>
          </View>
          <Text style={styles.transcriptionText} numberOfLines={3}>
            {transcription || 'Listening to lecturer...'}
          </Text>
        </View>
        {/* Inside your bottomSection or near the FAB */}
        {isMicAllowed && (
          <TouchableOpacity
            style={styles.micButton}
            onPress={() => setIsLocalMuted(!isLocalMuted)}
          >
            <MaterialIcons
              name={isLocalMuted ? 'mic-off' : 'mic'}
              size={24}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.micStatusText}>
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
            {unreadCount > 0 && <View style={styles.smallBadge} />}
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
      <View style={styles.progressFooter}>
        <ProgressBar
          progress={hasException ? 1 : passedChecks / 7}
          color={hasException ? '#4CAF50' : PRIMARY_COLOR} // Use Green (#4CAF50) for verified exceptions
        />
        <Text
          style={[
            styles.progressLabel,
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
          contentContainerStyle={styles.chatModal}
        >
          <Text style={styles.chatHeader}>Live Class Chat</Text>
          <ScrollView
            style={styles.messageList}
            contentContainerStyle={{ paddingBottom: 20 }}
            ref={ref => ref?.scrollToEnd({ animated: true })} // Auto-scroll to bottom
          >
            {messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.senderId === user.uid
                    ? styles.myMessage
                    : styles.theirMessage,
                ]}
              >
                <Text style={styles.senderName}>{msg.firstName}</Text>
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))}
            {messages.length === 0 && (
              <Text style={styles.emptyChat}>
                No messages yet. Start the conversation!
              </Text>
            )}
          </ScrollView>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.chatInputRow}>
              <TextInput
                mode="outlined"
                placeholder="Type a message..."
                value={inputText}
                onChangeText={setInputText}
                style={styles.chatInput}
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
      {waverName && (
        <WavingToast firstName={waverName} onHide={() => setWaverName(null)} />
      )}
      {activeSpeaker && (
        <SpeakerToast
          firstName={activeSpeaker}
          onHide={() => setActiveSpeaker(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  liveText: { color: PRIMARY_COLOR, fontWeight: 'bold', fontSize: 12 },
  waveNotification: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  waveText: { fontSize: 12, color: PRIMARY_COLOR, fontWeight: 'bold' },
  sharedScreen: {
    height: 250,
    backgroundColor: '#2222',
    position: 'relative', // CRITICAL: Allows absolute children to stay inside
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  infoSection: { padding: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
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
    top: 15,
    width: 90,
    height: 90,
    borderRadius: 45, // Makes the whole tab circular
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    backgroundColor: '#000',
  },
  mediaContainer: {
    flex: 1,
    borderRadius: 45,
    overflow: 'hidden', // CRITICAL: Clips the video into a circle
  },
  lecturerVideo: {
    width: '100%',
    height: '100%',
  },
  avatarBorder: {
    backgroundColor: '#E1E1E1',
  },
  micIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
});
