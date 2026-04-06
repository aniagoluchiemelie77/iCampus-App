import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Avatar,
  IconButton,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { LiveClassSessionStyles } from './StudentLiveClassSession';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { mediaDevices, RTCPeerConnection, RTCView } from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { SpeakerToast, WavingToast } from './StudentLiveClassSession';
import { User, Lecture } from 'types/firebase';
interface LecturerControlsProps {
  localStream: any;
  isLive: boolean;
  socket: any;
  lectureId: string;
  onMuteAll: () => void;
  wavers: any[];
  onGrantMic: (uid: string) => void;
}
interface LecturerLiveSessionProps {
  lecture: Lecture;
  socket: any; // Socket.io types are complex, 'any' is okay here, or use 'Socket' from socket.io-client
  attendeeList?: User[]; // Using the User type you imported earlier
}

export const LecturerStreamControls = ({
  localStream,
  isLive,
  socket,
  lectureId,
  onMuteAll,
  wavers,
  onGrantMic,
}: LecturerControlsProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const toggleMic = () => {
    const newStatus = !isMuted;
    setIsMuted(newStatus);
    socket.emit('toggle_lecturer_mic', { lectureId, isMuted: newStatus });
  };

  const toggleCamera = () => {
    const newStatus = !isCameraOff;
    setIsCameraOff(newStatus);
    socket.emit('toggle_lecturer_camera', {
      lectureId,
      isCameraOn: !newStatus,
    });
  };
  return (
    <View style={LiveClassSessionStyles.controlWrapper}>
      {localStream ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={LiveClassSessionStyles.previewVideo}
          objectFit="cover"
          mirror={true}
        />
      ) : (
        <View style={LiveClassSessionStyles.previewVideo}>
          <IconButton icon="camera-off" size={40} iconColor="#fff" />
          <Text style={LiveClassSessionStyles.previewVideoText}>
            Camera is Off
          </Text>
        </View>
      )}

      {/* 2. Top Badge (Live/Offline) */}
      <View style={LiveClassSessionStyles.statusBadge}>
        <View
          style={[
            LiveClassSessionStyles.dot,
            isLive
              ? LiveClassSessionStyles.dotLive
              : LiveClassSessionStyles.dotOffline,
          ]}
        />
        <Text style={LiveClassSessionStyles.statusText}>
          {isLive ? 'LIVE' : 'OFFLINE'}
        </Text>
      </View>

      {/* 2. Management Controls (Granting Mics) */}
      <View style={LiveClassSessionStyles.controlsOverlay}>
        {/* Waiver Notification - If students wave, show a button to open management */}
        {wavers.length > 0 && (
          <IconButton
            icon="hand-back-left"
            iconColor={PRIMARY_COLOR}
            size={24}
            onPress={() => onGrantMic(wavers[0].uid)}
            style={{ marginRight: 8, backgroundColor: 'inherit' }}
          />
        )}

        <IconButton
          icon={isMuted ? 'microphone-off' : 'microphone'}
          iconColor={PRIMARY_COLOR}
          size={24}
          onPress={toggleMic}
          style={{ backgroundColor: 'inherit', marginRight: 8 }}
        />
        <IconButton
          icon={isCameraOff ? 'video-off' : 'video'}
          iconColor={PRIMARY_COLOR}
          size={24}
          onPress={toggleCamera}
          style={{ backgroundColor: 'inherit', marginRight: 8 }}
        />
        {isLive && (
          <TouchableOpacity
            style={LiveClassSessionStyles.muteAllButton}
            onPress={onMuteAll}
          >
            <IconButton icon="microphone-off" iconColor="#fff" size={21} />
            <Text style={LiveClassSessionStyles.muteAllText}>(Mute All)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
export const LecturerLiveClassSession = ({
  lecture,
  socket,
  attendeeList = [],
}: LecturerLiveSessionProps) => {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const pc = useRef<RTCPeerConnection | null>(null);
  const [wavers, setWavers] = useState<any[]>([]); // Real-time list of students waving
  const [currentAttendees, setCurrentAttendees] =
    useState<User[]>(attendeeList);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [transcription, setTranscription] = useState<string>(
    'Waiting for audio...',
  );
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isMicAllowed, setIsMicAllowed] = useState(true);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [permittedSpeaker, setPermittedSpeaker] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [currentWaverName, setCurrentWaverName] = useState<string | null>(null);
  const [currentSpeakerName, setCurrentSpeakerName] = useState<string | null>(
    null,
  );
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [streamStats, setStreamStats] = useState({
    label: 'Checking...',
    color: '#2222',
  });
  const [localStream, setLocalStream] = useState<any>(null);
  const initializeWebRTC = async () => {
    try {
      const stream = (await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })) as MediaStream;

      setLocalStream(stream);

      if (pc.current) {
        // Option A: The most reliable way in React Native WebRTC
        (pc.current as any).addStream(stream);
      }
    } catch (err) {
      console.error('WebRTC Setup Error:', err);
    }
  };

  const startScreenShare = async () => {
    try {
      // @ts-ignore
      const stream = await mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setIsSharingScreen(true);

      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        // Cast to any to access the native event listener
        (videoTrack as any).addEventListener('ended', () => {
          stopScreenShare();
        });
      }

      socket.emit('lecturer_started_sharing', {
        lectureId: lecture.id,
        streamId: stream.toURL(),
      });
    } catch (e) {
      console.log('User denied screen capture');
      setIsSharingScreen(false);
    }
  };

  const stopScreenShare = () => {
    setIsSharingScreen(false);
    socket.emit('lecturer_stopped_sharing', { lectureId: lecture.id });
  };
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

  // 1. Socket Effects for Lecturer Controls
  useEffect(() => {
    if (!socket || !lecture?.id) return;
    const setupSession = async () => {
      try {
        // Initialize Peer Connection if not exists
        if (!pc.current) {
          pc.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
        }

        // Initialize Stream
        const stream = (await mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })) as MediaStream;

        setLocalStream(stream);
        (pc.current as any).addStream(stream);
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Hardware Error',
          text2: 'Could not access camera or microphone.',
        });
      }
    };

    setupSession();

    // Listen for Hand Waves
    socket.on(
      'student_waved',
      (data: { uid: string; firstName: string; profilePic: string }) => {
        setWavers(prev => {
          if (prev.find(w => w.uid === data.uid)) return prev;
          return [...prev, data];
        });
      },
    );

    // Listen for Speaker Changes (to highlight who is currently talking)
    socket.on(
      'active_speaker_changed',
      (data: { firstName: string; uid: string }) => {
        setActiveSpeaker(data.uid);
        // Trigger toast only if it's not the lecturer themselves
        if (data.uid !== user.uid) {
          setCurrentSpeakerName(data.firstName);
        }
      },
    );

    // Chat Integration
    socket.on('receive_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('update_attendee_list', (newList: User[]) => {
      setCurrentAttendees(newList);
    });
    socket.on('transcription_update', (data: { text: string }) => {
      setTranscription(prev => (prev + ' ' + data.text).slice(-150));
    });
    socket.on('lecturer_started_sharing', () => {
      setRefreshKey(prev => prev + 1);
      Toast.show({ text1: 'Lecturer is now sharing their screen' });
    });
    socket.on('mic_permission_granted', (data: { targetUid: string }) => {
      if (data.targetUid !== user.uid) {
        const student = currentAttendees.find(a => a.uid === data.targetUid);
        setPermittedSpeaker(student || null);

        // Optional: Auto-hide the "Waver" list if that student was in it
        setWavers(prev => prev.filter(w => w.uid !== data.targetUid));

        Toast.show({
          type: 'info',
          text1: 'Mic Granted',
          text2: `${student?.firstname || 'Student'} is now speaking.`,
        });
      }
    });

    return () => {
      socket.off('student_waved');
      socket.off('active_speaker_changed');
      socket.off('receive_message');
      socket.off('update_attendee_list');
      socket.off('transcription_update');
      socket.off('lecturer_started_sharing');
      socket.off('mic_permission_granted');
    };
  }, [socket, lecture.id, user.uid, currentAttendees]);
  useEffect(() => {
    socket.on('mic_permission_granted', (data: any) => {
      if (data.targetUid !== user.uid) {
        // A student is talking! Lower lecturer speaker volume
        // or show a visual indicator
      }
    });
  }, [socket, user.uid]);
  useEffect(() => {
    // Only run the interval if we are live and the connection exists
    if (!lecture.isLive || !pc.current) return;

    const interval = setInterval(async () => {
      try {
        if (pc.current) {
          // @ts-ignore - getStats typing can be tricky in RN
          const stats = await pc.current.getStats();
          let currentBitrate = 0;

          stats.forEach((report: any) => {
            // Look for the outbound video rtp stream (what the lecturer is sending)
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              currentBitrate = report.bitrate || 0;
            }
          });

          setStreamStats(getQualityStatus(currentBitrate / 1000));
        }
      } catch (e) {
        console.log('Quality Stats Error:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lecture.isLive]); // Dependencies ensure it starts/stops correctly
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
    const init = async () => {
      await initializeWebRTC();
    };
    init();
  }, [refreshKey]); // Restarts if refreshKey changes
  const handleEndLecture = () => {
    socket.emit('end_lecture', { lectureId: lecture.id });
    setEndModalVisible(false);
    navigation.navigate('Home');
  };
  const grantMic = (studentUid: string) => {
    socket.emit('grant_mic_permission', {
      lectureId: lecture.id,
      targetUid: studentUid,
    });
    setWavers(prev => prev.filter(w => w.uid !== studentUid));
  };
  const muteAll = () => {
    socket.emit('revoke_all_mics', { lectureId: lecture.id });
    setIsMicAllowed(false);
    setActiveSpeaker(null);
  };
  const getQualityStatus = (bitrate: number) => {
    if (bitrate > 2500)
      return { label: 'Excellent (1080p)', color: PRIMARY_COLOR_TINT };
    if (bitrate > 1000)
      return { label: 'Good (720p)', color: PRIMARY_COLOR_TINT };
    if (bitrate > 500)
      return { label: 'Fair (480p)', color: PRIMARY_COLOR_TINT };
    return { label: 'Poor (Low Res)', color: PRIMARY_COLOR };
  };

  return (
    <View style={LiveClassSessionStyles.mainContainer}>
      <View style={LiveClassSessionStyles.header}>
        <Text style={LiveClassSessionStyles.liveText}>● LIVE</Text>
        <TouchableOpacity
          onPress={() => setEndModalVisible(true)}
          style={LiveClassSessionStyles.endButton}
        >
          <Text style={LiveClassSessionStyles.endButtonText}>End Session</Text>
        </TouchableOpacity>
      </View>
      <View
        key={refreshKey}
        style={[
          LiveClassSessionStyles.sharedScreen,
          isSharingScreen && LiveClassSessionStyles.sharingActive,
        ]}
      >
        {isSharingScreen ? (
          <View style={LiveClassSessionStyles.sharingOverlay}>
            <MaterialIcons
              name="screen-share"
              size={50}
              color={PRIMARY_COLOR}
            />
            <Text style={LiveClassSessionStyles.statusText}>
              You are sharing your screen
            </Text>
            <Text style={LiveClassSessionStyles.hintText}>
              You can now leave the app to show your materials.
            </Text>
            <TouchableOpacity
              onPress={stopScreenShare}
              style={LiveClassSessionStyles.stopShareButton}
            >
              <Text style={LiveClassSessionStyles.stopShareText}>
                Stop Sharing
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={LiveClassSessionStyles.startSharePlaceholder}
            onPress={startScreenShare}
          >
            <MaterialIcons
              name="present-to-all"
              size={30}
              color={PRIMARY_COLOR_TINT}
            />
            <Text style={LiveClassSessionStyles.startSharePlaceholderText}>
              Start Screen Share
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Stream Quality Monitoring and Controls */}
      <View style={LiveClassSessionStyles.monitoringSection}>
        {activeSpeaker ||
          (permittedSpeaker && (
            <Text style={LiveClassSessionStyles.speakerNote}>
              Speaker:{' '}
              {attendeeList.find(a => a.uid === activeSpeaker)?.firstname ||
                permittedSpeaker?.firstname ||
                'Someone'}
            </Text>
          ))}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            LiveClassSessionStyles.horizontalMonitorContainer
          }
        >
          {/* My Camera Preview/Controls */}
          <LecturerStreamControls
            localStream={localStream}
            isLive={lecture.isLive ?? false}
            socket={socket}
            lectureId={lecture.id}
            wavers={wavers} // Pass the state
            onMuteAll={muteAll} // Pass the function
            onGrantMic={grantMic}
          />
          <View style={LiveClassSessionStyles.monitorCard}>
            <MaterialIcons
              name="speed"
              size={24}
              color={streamStats.color} // Dynamic Icon Color
            />
            <Text
              style={[
                LiveClassSessionStyles.monitorValue,
                { color: streamStats.color },
              ]}
            >
              {streamStats.label} {/* Dynamic Text */}
            </Text>
          </View>
        </ScrollView>
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
      </View>
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
        actions={['Live Chat', 'View Lectures']}
        unreadCount={unreadCount}
        onChatOpen={() => setChatVisible(true)}
      />
      {/* Floating Waver Toast */}
      {currentWaverName && (
        <WavingToast
          firstName={currentWaverName}
          onHide={() => setCurrentWaverName(null)}
        />
      )}
      {/* Floating Speaker Toast */}
      {currentSpeakerName && (
        <SpeakerToast
          firstName={currentSpeakerName}
          onHide={() => setCurrentSpeakerName(null)}
        />
      )}
      <Toast config={toastConfig} />
      {/* Chat Modal  */}
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
      {/* End Live Session Confirmation Modal */}
      <Portal>
        <Modal
          visible={endModalVisible}
          onDismiss={() => setEndModalVisible(false)}
          contentContainerStyle={LiveClassSessionStyles.modalOverlay}
        >
          <View style={LiveClassSessionStyles.modalContainer}>
            <MaterialIcons name="warning" size={50} color={PRIMARY_COLOR} />
            <Text style={LiveClassSessionStyles.modalTitle}>
              End Live Session?
            </Text>
            <Text style={LiveClassSessionStyles.modalSubText}>
              This will stop the stream for all students and finalize
              attendance.
            </Text>

            <View style={LiveClassSessionStyles.modalButtonRow}>
              <TouchableOpacity
                onPress={() => setEndModalVisible(false)}
                style={LiveClassSessionStyles.modalButtonRowBtn}
              >
                <Text style={LiveClassSessionStyles.modalButtonRowBtnText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEndLecture}
                style={LiveClassSessionStyles.modalButtonRowBtn}
              >
                <Text style={LiveClassSessionStyles.modalButtonRowBtnText}>
                  End Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};
