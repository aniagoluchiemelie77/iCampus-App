import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import VIForegroundService from '@voximplant/react-native-foreground-service';
import { LiveClassSessionStyles } from './StudentLiveClassSession';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import { User, Lecture } from '../types/firebase';
import { UserAvatar } from './UserAvatar';
import { useLiveTranscription } from '../hooks/useLiveTransciption';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import {
  ChatModal,
  AttendeeListModal,
  ConfirmationModal,
  LecturerStreamControls,
  WavingToast,
  SpeakerToast,
} from './liveClassComponents';
interface LecturerLiveSessionProps {
  lecture: Lecture;
  socket: any;
  attendeeList?: User[];
}

export const LecturerLiveClassSession = ({
  lecture,
  socket,
  attendeeList = [],
}: LecturerLiveSessionProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const pc = useRef<RTCPeerConnection | null>(null);
  const localAudioTrack = useRef<any>(null);
  const LOW_BANDWIDTH_THRESHOLD = 300;
  const RECOVERY_THRESHOLD = 800;
  const AVATAR_SIZE = 40;
  const AVATAR_OVERLAP = -10;
  const BADGE_WIDTH = 60;

  const [isAudioOnlyFallback, setIsAudioOnlyFallback] = useState(false);
  const [maxVisibleAvatars, setMaxVisibleAvatars] = useState(4);
  const consecutiveLowStatsCount = useRef(0);

  const [wavers, setWavers] = useState<any[]>([]);
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
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [permittedSpeaker, setPermittedSpeaker] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [activeSpeakersList, setActiveSpeakersList] = useState<any[]>([]);
  const [attendeeModalVisible, setAttendeeModalVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [streamStats, setStreamStats] = useState({
    label: 'Checking...',
    color: colors.text,
  });
  const [localStream, setLocalStream] = useState<any>(null);
  const getQualityStatus = useCallback(
    (bitrate: number) => {
      if (bitrate > 2500)
        return { label: 'Excellent (1080p)', color: colors.success };
      if (bitrate > 1000) return { label: 'Good (720p)', color: '#8BC34A' };
      if (bitrate > 500)
        return { label: 'Fair (480p)', color: colors.pendingDelivery };
      return { label: 'Poor (Low Res)', color: colors.primary };
    },
    [colors.success, colors.pendingDelivery, colors.primary],
  );
  const initializeWebRTC = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      localAudioTrack.current = stream.getAudioTracks()[0];
      socket.emit('stream_ready', {
        lectureId: lecture.id,
        streamUrl: (stream as any).toURL(),
      });

      if (pc.current) {
        stream.getTracks().forEach(track => {
          pc.current?.addTrack(track, stream);
        });

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        socket.emit('webrtc_signal', {
          lectureId: lecture.id,
          signal: offer,
        });
      }
    } catch (err) {
      console.error('WebRTC Setup Error:', err);
    }
  }, [lecture.id, socket]);
  const handleContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    const availableWidth = width - BADGE_WIDTH;
    const effectiveAvatarWidth = AVATAR_SIZE + AVATAR_OVERLAP;
    const computedMax = Math.floor(availableWidth / effectiveAvatarWidth);
    setMaxVisibleAvatars(Math.max(2, computedMax));
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
    isHost: true,
    currentUserFirstName: user.firstname!,
    isMicActive: isMicAllowed,
    onTranscriptChunk: (label, text) => {
      appendTranscriptionText(label, text);
      socket.emit('share_transcription_chunk', {
        lectureId: lecture.id,
        speakerLabel: label,
        text: text,
      });
    },
  });
  const startScreenShare = async () => {
    const channelConfig = {
      id: 'liveness_channel',
      name: 'iCampus Live Session',
      description: 'Keeps the lecture alive while screen sharing',
      enableVibration: false,
      importance: 4,
    };
    try {
      await VIForegroundService.getInstance().createNotificationChannel(
        channelConfig,
      );
      await VIForegroundService.getInstance().startService({
        channelId: 'liveness_channel',
        id: 1234,
        title: 'iCampus Live',
        text: `Sharing screen for ${lecture.topicName}`,
        icon: 'icampus_logo',
        button: 'Stop Sharing',
        priority: 2,
      });
      const stream = await mediaDevices.getDisplayMedia();
      setIsSharingScreen(true);
      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        (videoTrack as any).addEventListener('ended', () => {
          stopScreenShare();
        });
      }

      socket.emit('lecturer_started_sharing', {
        lectureId: lecture.id,
        streamId: stream.toURL(),
      });
    } catch (e) {
      console.log('User denied screen capture or setup failed:', e);
      setIsSharingScreen(false);
      await VIForegroundService.getInstance().stopService();
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
      username: `${user.firstname} ${user.lastname}`,
      profilePic: user.profilePic || '',
    });
    setInputText('');
  };
  const handleAdaptiveStreamDegradation = useCallback(
    (bitrateKbps: number) => {
      if (!localStream) return;

      const videoTrack = localStream.getVideoTracks()[0];
      if (!videoTrack) return;

      if (bitrateKbps < LOW_BANDWIDTH_THRESHOLD && !isAudioOnlyFallback) {
        consecutiveLowStatsCount.current += 1;
        if (consecutiveLowStatsCount.current >= 2) {
          setIsAudioOnlyFallback(true);
          videoTrack.enabled = false;
          socket.emit('lecturer_network_fallback', {
            lectureId: lecture.id,
            mode: 'audio-only',
          });

          Toast.show({
            type: 'info',
            text1: 'Low Network Connection',
            text2: 'Switching to audio-only mode to prevent disconnection.',
          });
        }
      } else if (bitrateKbps >= RECOVERY_THRESHOLD && isAudioOnlyFallback) {
        consecutiveLowStatsCount.current = 0;
        setIsAudioOnlyFallback(false);
        videoTrack.enabled = true;

        socket.emit('lecturer_network_fallback', {
          lectureId: lecture.id,
          mode: 'full-stream',
        });

        Toast.show({
          type: 'success',
          text1: 'Network Recovered',
          text2: 'Restoring live video feed.',
        });
      } else {
        if (bitrateKbps >= LOW_BANDWIDTH_THRESHOLD) {
          consecutiveLowStatsCount.current = 0;
        }
      }
    },
    [localStream, isAudioOnlyFallback, lecture.id, socket],
  );
  useEffect(() => {
    if (!socket || !lecture?.id) return;

    const setupSession = async () => {
      try {
        if (!pc.current) {
          pc.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
        }
        await initializeWebRTC();
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Hardware Error',
          text2: 'Could not access camera or microphone.',
        });
      }
    };

    setupSession();

    socket.on(
      'student_waved_received',
      (data: { uid: string; firstname: string; profilePic: string }) => {
        setWavers(prev =>
          prev.find(w => w.uid === data.uid) ? prev : [...prev, data],
        );
      },
    );

    socket.on(
      'active_speaker_changed',
      (data: { firstname: string; uid: string }) => {
        setActiveSpeaker(data.uid);
        if (data.uid !== user.uid) {
          setActiveSpeakersList(prev =>
            prev.find(s => s.uid === data.uid)
              ? prev
              : [...prev, { uid: data.uid, firstname: data.firstname }],
          );
        }
      },
    );

    socket.on('receive_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('update_attendee_list', (newList: User[]) => {
      setCurrentAttendees(newList);
    });

    socket.on(
      'transcription_update',
      (data: { speakerLabel: string; text: string }) => {
        appendTranscriptionText(data.speakerLabel, data.text);
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
        } else if (localAudioTrack.current) {
          localAudioTrack.current.enabled = true;
          setIsLocalMuted(false);
          Toast.show({
            type: 'success',
            text1: 'Floor is Yours',
            text2:
              'The lecturer has granted you microphone access. You are now live.',
          });
        }
      },
    );

    return () => {
      socket.off('student_waved_received');
      socket.off('active_speaker_changed');
      socket.off('receive_message');
      socket.off('update_attendee_list');
      socket.off('transcription_update');
      socket.off('mic_permission_granted_received');
    };
  }, [
    socket,
    lecture.id,
    user.uid,
    currentAttendees,
    initializeWebRTC,
    isLocalMuted,
  ]);
  useEffect(() => {
    if (!lecture.isLive || !pc.current) return;

    const interval = setInterval(async () => {
      try {
        if (pc.current) {
          const stats = await pc.current.getStats();
          let currentBitrate = 0;

          stats.forEach((report: any) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              currentBitrate = report.bitrate || 0;
            }
          });

          const currentBitrateKbps = currentBitrate / 1000;
          setStreamStats(getQualityStatus(currentBitrateKbps));
          handleAdaptiveStreamDegradation(currentBitrateKbps);
        }
      } catch (e) {
        console.log('Quality Stats Error:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [
    lecture.isLive,
    localStream,
    isAudioOnlyFallback,
    handleAdaptiveStreamDegradation,
    getQualityStatus,
  ]);
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
    if (localAudioTrack.current) {
      localAudioTrack.current.enabled = !isLocalMuted;
      socket.emit('toggle_lecturer_mic', {
        lectureId: lecture.id,
        isMuted: isLocalMuted,
      });
    }
  }, [isLocalMuted, socket, lecture.id]);
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

  const handleEndLecture = () => {
    socket.emit('end_lecture', { lectureId: lecture.id });
    setEndModalVisible(false);
    navigation.navigate('Home', { activeTab: 'classroom' });
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
    setPermittedSpeaker(null);
    Toast.show({ type: 'info', text1: 'All student microphones revoked.' });
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
              End Live Session
            </Text>
          </TouchableOpacity>
        }
      />
      {/* Presentation / Screen Share Matrix */}
      <View
        style={[
          LiveClassSessionStyles.sharedScreen,
          isSharingScreen && LiveClassSessionStyles.sharingActive,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {isAudioOnlyFallback ? (
          <View style={LiveClassSessionStyles.sharingOverlay}>
            <MaterialIcons name="audiotrack" size={50} color={colors.primary} />
            <Text
              style={[
                LiveClassSessionStyles.statusText,
                { color: colors.textDarker },
              ]}
            >
              Audio Optimization Active
            </Text>
            <Text
              style={[LiveClassSessionStyles.hintText, { color: colors.text }]}
            >
              Video paused due to weak signal coverage. Retaining high-priority
              audio stream.
            </Text>
          </View>
        ) : isSharingScreen ? (
          <View style={LiveClassSessionStyles.sharingOverlay}>
            <MaterialIcons
              name="screen-share-outlined"
              size={50}
              color={colors.primary}
            />
            <Text
              style={[
                LiveClassSessionStyles.statusText,
                { color: colors.textDarker },
              ]}
            >
              You are sharing your screen
            </Text>
            <Text
              style={[LiveClassSessionStyles.hintText, { color: colors.text }]}
            >
              You can now leave the app to show your materials.
            </Text>
            <TouchableOpacity
              onPress={stopScreenShare}
              style={[
                LiveClassSessionStyles.stopShareButton,
                { backgroundColor: colors.btnColor },
              ]}
            >
              <Text
                style={[
                  LiveClassSessionStyles.stopShareText,
                  { color: colors.btnTextColor },
                ]}
              >
                Stop Sharing
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              LiveClassSessionStyles.startSharePlaceholder,
              { backgroundColor: colors.btnColor },
            ]}
            onPress={startScreenShare}
          >
            <MaterialIcons
              name="present-to-all-outlined"
              size={25}
              color={colors.btnTextColor}
            />
            <Text
              style={[
                LiveClassSessionStyles.startSharePlaceholderText,
                { color: colors.btnTextColor },
              ]}
            >
              Start Screen Share
            </Text>
          </TouchableOpacity>
        )}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            LiveClassSessionStyles.horizontalMonitorContainer
          }
        >
          <LecturerStreamControls
            localStream={localStream}
            isLive={lecture.isLive ?? false}
            socket={socket}
            lectureId={lecture.id}
            wavers={wavers}
            onMuteAll={muteAll}
            onGrantMic={grantMic}
          />
          <View style={LiveClassSessionStyles.monitorCard}>
            <MaterialIcons name="speed" size={24} color={colors.text} />
            <Text
              style={[
                LiveClassSessionStyles.monitorValue,
                { color: streamStats.color },
              ]}
            >
              {streamStats.label}
            </Text>
          </View>
        </ScrollView>
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
            {isLocalMuted ? 'Muted' : 'You are Live'}
          </Text>
        </TouchableOpacity>
      )}
      {!fabVisible && (
        <TouchableOpacity
          style={homeStyles.fabLower}
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
        actions={['Live Chat', 'View Lectures']}
        unreadCount={unreadCount}
        onChatOpen={() => setChatVisible(true)}
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
        onConfirm={handleEndLecture}
        title="End Live Session?"
        subText="This will stop the stream for all attendees and finalize attendance records."
        colors={colors}
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
