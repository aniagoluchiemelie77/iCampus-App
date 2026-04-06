import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  FlatList,
  Platform,
} from 'react-native';
import {
  Avatar,
  IconButton,
  Portal,
  Modal,
  TextInput,
  Button,
} from 'react-native-paper';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { LiveClassSessionStyles } from './StudentLiveClassSession';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Video from 'react-native-video';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { mediaDevices } from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { SpeakerToast, WavingToast } from './StudentLiveClassSession';
//import { StudentLiveStatusCard } from './StudentLiveStatusCard';
interface LecturerControlsProps {
  url: string;
  isLive: boolean;
  socket: any;
  lectureId: string;
}

export const LecturerStreamControls = ({
  url,
  isLive,
  socket,
  lectureId,
}: LecturerControlsProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const toggleMic = () => {
    const newMutedStatus = !isMuted;
    setIsMuted(newMutedStatus);
    socket.emit('toggle_lecturer_mic', {
      lectureId,
      isMuted: newMutedStatus,
    });
  };

  const toggleCamera = () => {
    const newCameraStatus = !isCameraOff;
    setIsCameraOff(newCameraStatus);
    socket.emit('toggle_lecturer_camera', {
      lectureId,
      isCameraOn: !newCameraStatus,
    });
  };
  return (
    <View style={LiveClassSessionStyles.controlWrapper}>
      {!isCameraOff ? (
        <Video
          source={{ uri: url }}
          style={LiveClassSessionStyles.previewVideo}
          muted={true} // Lecturer should NEVER hear their own echo
          resizeMode="cover"
          repeat={true}
        />
      ) : (
        <View
          style={[
            LiveClassSessionStyles.previewVideo,
            {
              backgroundColor: '#2222',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <IconButton icon="camera-off" size={40} iconColor="#555" />
          <Text style={{ color: '#555' }}>Camera is Off</Text>
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

      {/* 3. Bottom Controls (Fixes the "Unused" errors) */}
      <View style={LiveClassSessionStyles.controlsOverlay}>
        <IconButton
          icon={isMuted ? 'microphone-off' : 'microphone'}
          iconColor={isMuted ? '#FF5252' : '#FFF'}
          size={24}
          onPress={toggleMic}
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        />
        <IconButton
          icon={isCameraOff ? 'video-off' : 'video'}
          iconColor={isCameraOff ? '#FF5252' : '#FFF'}
          size={24}
          onPress={toggleCamera}
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        />
      </View>
    </View>
  );
};
export const LecturerLiveClassSession = ({
  lecture,
  exceptions,
  course,
  socket,
}: any) => {
  const user = useAppSelector(state => state.user);
  const [wavers, setWavers] = useState<any[]>([]); // Real-time list of students waving
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputText, setInputText] = useState('');
  const [currentWaverName, setCurrentWaverName] = useState<string | null>(null);
  const [currentSpeakerName, setCurrentSpeakerName] = useState<string | null>(
    null,
  );
  const frontCamera = useCameraDevice('front');

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

    // Listen for Hand Waves
    socket.on(
      'student_waved',
      (data: { uid: string; firstName: string; profilePic: string }) => {
        setWavers(prev => {
          // Avoid duplicates
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
      },
    );

    // Chat Integration
    socket.on('receive_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('student_waved');
      socket.off('active_speaker_changed');
      socket.off('receive_message');
    };
  }, [socket, lecture.id]);
  useEffect(() => {
    socket.on('mic_permission_granted', (data: any) => {
      if (data.targetUid !== user.uid) {
        // A student is talking! Lower lecturer speaker volume
        // or show a visual indicator
      }
    });
  }, [socket, user.uid]);
  useEffect(() => {
    socket.on('lecturer_started_sharing', () => {
      setRefreshKey(prev => prev + 1);
      Toast.show({ text1: 'Lecturer is now sharing their screen' });
    });
  }, [socket]);
  useEffect(() => {
    if (!socket || !lecture?.id) return;

    socket.on(
      'student_waved',
      (data: { uid: string; firstName: string; profilePic: string }) => {
        // 1. Add to the horizontal scroll list
        setWavers(prev => {
          if (prev.find(w => w.uid === data.uid)) return prev;
          return [...prev, data];
        });
        // 2. Trigger the temporary top toast
        setCurrentWaverName(data.firstName);
      },
    );

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

    // ... rest of your socket logic
  }, [socket, lecture.id, user.uid]);
  // 2. Control Functions
  const grantMic = (studentUid: string) => {
    socket.emit('grant_mic_permission', {
      lectureId: lecture.id,
      targetUid: studentUid,
    });
    setWavers(prev => prev.filter(w => w.uid !== studentUid));
  };
  const muteAll = () => {
    socket.emit('revoke_all_mics', { lectureId: lecture.id });
    setActiveSpeaker(null);
  };

  return (
    <View style={LiveClassSessionStyles.mainContainer}>
      <View style={LiveClassSessionStyles.header}>
        <Text style={LiveClassSessionStyles.liveText}>● LIVE</Text>
      </View>
      <View
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

        {/* Small PIP (Picture-in-Picture) for Lecturer's Camera Preview */}
        <View style={LiveClassSessionStyles.lecturerCameraPreview}>
          {/* This shows what the students see of your face */}
          <Camera
            device={frontCamera} // or front
            isActive={lecturerData.isCameraOn}
            style={LiveClassSessionStyles.miniPreview}
          />
        </View>
      </View>
      <View style={LiveClassSessionStyles.monitoringSection}>
        <Text style={LiveClassSessionStyles.sectionLabel}>
          My Broadcast Status
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            LiveClassSessionStyles.horizontalMonitorContainer
          }
        >
          {/* My Camera Preview/Controls */}
          <LecturerStreamControls
            url={lecture.streamUrl}
            isLive={lecture.isLive}
            socket={socket}
            lectureId={lecture.id}
          />
          <View style={LiveClassSessionStyles.monitorCard}>
            <MaterialIcons name="speed" size={24} color={PRIMARY_COLOR} />
            <Text style={LiveClassSessionStyles.monitorTitle}>
              Stream Quality
            </Text>
            <Text style={LiveClassSessionStyles.monitorValue}>
              Excellent (1080p)
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* 2. Interaction Hub */}
      <View style={LiveClassSessionStyles.interactionHub}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>Student Requests</Text>
          {wavers.length > 0 && (
            <Badge style={{ backgroundColor: PRIMARY_COLOR }}>
              {wavers.length}
            </Badge>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.waverScroll}
        >
          {wavers.length === 0 ? (
            <Text style={styles.emptyText}>No active hand waves</Text>
          ) : (
            wavers.map(waver => (
              <TouchableOpacity
                key={waver.uid}
                onPress={() => grantMic(waver.uid)}
                style={styles.waverCard}
              >
                <Avatar.Image size={46} source={{ uri: waver.profilePic }} />
                <View style={styles.micOverlay}>
                  <MaterialIcons name="mic-none" size={16} color="#fff" />
                </View>
                <Text style={styles.waverName} numberOfLines={1}>
                  {waver.firstName}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <Button
          mode="outlined"
          onPress={muteAll}
          icon="microphone-off"
          style={styles.muteAllBtn}
          textColor="#E53935"
        >
          Mute Everyone
        </Button>
      </View>

      {/* 3. Real-time Attendance Monitor */}
      <View style={{ flex: 1, paddingHorizontal: 15 }}>
        <View style={styles.headerRow}>
          <SectionTitle title="Live Attendance Feed" />
          <TouchableOpacity
            onPress={() => {
              /* Navigate to Exception Manager */
            }}
          >
            <Text style={styles.linkText}>Manage Exceptions</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={course.studentsEnrolled}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <StudentLiveStatusCard
              studentId={item}
              isActiveSpeaker={activeSpeaker === item}
              exception={exceptions.find(
                (e: any) => e.studentId === item && e.lectureId === lecture.id,
              )}
            />
          )}
        />
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
      {currentWaverName && (
        <WavingToast
          firstName={currentWaverName}
          onHide={() => setCurrentWaverName(null)}
        />
      )}

      {currentSpeakerName && (
        <SpeakerToast
          firstName={currentSpeakerName}
          onHide={() => setCurrentSpeakerName(null)}
        />
      )}
      <Toast config={toastConfig} />
      <ExpandableFAB
        isVisible={fabVisible}
        onClose={() => setFabVisible(false)}
        actions={['Live Chat', 'View Lectures']}
        unreadCount={unreadCount}
        onChatOpen={() => setChatVisible(true)}
      />
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
    </View>
  );
};
