import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { IconButton, Portal, Modal, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import VIForegroundService from '@voximplant/react-native-foreground-service';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { LiveClassSessionStyles } from './StudentLiveClassSession';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ExpandableFAB from './ExpandableFAB';
import { homeStyles } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { mediaDevices, RTCPeerConnection, RTCView } from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import { User, Lecture } from 'types/firebase';
import { UserAvatar } from './UserAvatar';
import { UserIdentity } from './UserIdentity';
import { useLiveTranscription } from '../hooks/useLiveTransciption';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
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
  socket: any;
  attendeeList?: User[];
}
interface GroupToastProps {
  activeUsers: any[];
  onHide: () => void;
}
export const WavingToast = ({ activeUsers, onHide }: GroupToastProps) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const userCount = activeUsers.length;
  let displayMessage = '';

  if (userCount === 1) {
    displayMessage = `👋 ${activeUsers[0].firstname} is waving`;
  } else if (userCount === 2) {
    displayMessage = `👋 ${activeUsers[0].firstname} and ${activeUsers[1].firstname} are waving`;
  } else if (userCount > 2) {
    displayMessage = `👋 ${activeUsers[0].firstname} and ${
      userCount - 1
    } others are waving`;
  }

  useEffect(() => {
    if (userCount === 0) return;
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
  }, [userCount, onHide, slideAnim]);

  if (userCount === 0) return null;

  return (
    <Animated.View
      style={[
        LiveClassSessionStyles.waveToast,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={LiveClassSessionStyles.waveText} numberOfLines={1}>
        {displayMessage}
      </Text>
    </Animated.View>
  );
};

export const SpeakerToast = ({ activeUsers, onHide }: GroupToastProps) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const userCount = activeUsers.length;
  let displayMessage = '';

  if (userCount === 1) {
    displayMessage = `${activeUsers[0].firstname} is speaking...`;
  } else if (userCount === 2) {
    displayMessage = `${activeUsers[0].firstname} & ${activeUsers[1].firstname} are speaking...`;
  } else if (userCount > 2) {
    displayMessage = `${activeUsers[0].firstname} and ${
      userCount - 1
    } others are speaking...`;
  }

  useEffect(() => {
    if (userCount === 0) return;

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
    }, 5000);

    return () => clearTimeout(timer);
  }, [userCount, onHide, slideAnim]);

  if (userCount === 0) return null;

  return (
    <Animated.View
      style={[
        LiveClassSessionStyles.speakerToast,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={LiveClassSessionStyles.liveIndicator} />
      <Text style={LiveClassSessionStyles.speakerText} numberOfLines={1}>
        {displayMessage}
      </Text>
    </Animated.View>
  );
};

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
    color: '#2222',
  });
  const [localStream, setLocalStream] = useState<any>(null);

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
      return (currentBuffer + cleanLine).slice(-200); // Keeps view frame limited to the last 200 chars
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
        setWavers(prev => {
          if (prev.find(w => w.uid === data.uid)) return prev;
          return [...prev, data];
        });
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

    return () => {
      socket.off('student_waved_received');
      socket.off('active_speaker_changed');
      socket.off('receive_message');
      socket.off('update_attendee_list');
      socket.off('transcription_update');
      socket.off('lecturer_started_sharing');
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
          setStreamStats(getQualityStatus(currentBitrate / 1000));
        }
      } catch (e) {
        console.log('Quality Stats Error:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lecture.isLive]);

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
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [
    lecture.isLive,
    localStream,
    isAudioOnlyFallback,
    handleAdaptiveStreamDegradation,
  ]);

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
  onLocalAudioDataAvailable(buffer => {
    sendAudioChunkToDeepgram(buffer);
  });

  const getQualityStatus = (bitrate: number) => {
    if (bitrate > 2500) return { label: 'Excellent (1080p)', color: '#4CAF50' };
    if (bitrate > 1000) return { label: 'Good (720p)', color: '#8BC34A' };
    if (bitrate > 500) return { label: 'Fair (480p)', color: '#FFC107' };
    return { label: 'Poor (Low Res)', color: '#F44336' };
  };

  return (
    <View style={LiveClassSessionStyles.mainContainer}>
      {/* Top Session Header Bar */}
      <View style={LiveClassSessionStyles.header}>
        <Text style={LiveClassSessionStyles.liveText}>● LIVE</Text>
        <TouchableOpacity
          onPress={() => setEndModalVisible(true)}
          style={LiveClassSessionStyles.endButton}
        >
          <Text style={LiveClassSessionStyles.endButtonText}>End Session</Text>
        </TouchableOpacity>
      </View>

      {/* Presentation / Screen Share Matrix */}
      <View
        style={[
          LiveClassSessionStyles.sharedScreen,
          isSharingScreen && LiveClassSessionStyles.sharingActive,
        ]}
      >
        {isAudioOnlyFallback ? (
          <View
            style={[
              LiveClassSessionStyles.sharingOverlay,
              { backgroundColor: '#1A1A24' },
            ]}
          >
            <MaterialIcons name="audiotrack" size={50} color={PRIMARY_COLOR} />
            <Text style={LiveClassSessionStyles.statusText}>
              Audio Optimization Active
            </Text>
            <Text style={LiveClassSessionStyles.hintText}>
              Video paused due to weak signal coverage. Retaining high-priority
              audio stream.
            </Text>
          </View>
        ) : isSharingScreen ? (
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
      <View style={LiveClassSessionStyles.monitoringSection}>
        {activeSpeaker || permittedSpeaker ? (
          <Text style={LiveClassSessionStyles.speakerNote}>
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
            <MaterialIcons name="speed" size={24} color={streamStats.color} />
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

      {/* Meta Profile Grid Info */}
      <View style={LiveClassSessionStyles.infoSection}>
        <View style={LiveClassSessionStyles.row}>
          <Text style={LiveClassSessionStyles.courseTitle}>
            {lecture.topicName || 'Untitled Session'}
          </Text>
          <View style={LiveClassSessionStyles.durationBox}>
            <Text style={LiveClassSessionStyles.durationText}>
              Duration: {elapsedTime}
            </Text>
          </View>
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
              style={LiveClassSessionStyles.attendeeCount}
              onPress={() => setAttendeeModalVisible(true)}
            >
              <Text style={LiveClassSessionStyles.attendeeCountText}>
                +{currentAttendees.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AI Live Transcription Output Box */}
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
            {transcription || 'Listening to classroom room audio tracks...'}
          </Text>
        </View>

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

      {/* Floating Control Modules */}
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

      {/* Chat Space Modal Portal */}
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
            ref={ref => ref?.scrollToEnd({ animated: true })}
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

      {/* Standardized Attendee List Bottom Sheet Modal */}
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
                  <UserAvatar
                    profilePic={student.profilePic}
                    firstName={student.firstname}
                    lastName={student.lastname}
                    username={student.username}
                    style={{ width: 45, height: 45, borderRadius: 22.5 }}
                  />
                  <View style={LiveClassSessionStyles.studentInfo}>
                    <UserIdentity
                      firstname={student.firstname!}
                      lastname={student.lastname}
                      username={student.username}
                      tier={student.tier || 'free'}
                      isVerified={student.isVerified}
                      showVerifyIcon={true}
                      size="small"
                    />
                  </View>
                  {wavers.find(w => w.uid === student.uid) && (
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

      {/* Disconnect Warning Modal */}
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
              This will stop the stream for all students and finalize attendance
              records.
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
      {wavers.length > 0 && (
        <WavingToast activeUsers={wavers} onHide={() => setWavers([])} />
      )}

      {/* Floating Speaker Toast */}
      {activeSpeakersList.length > 0 && (
        <SpeakerToast
          activeUsers={activeSpeakersList}
          onHide={() => setActiveSpeakersList([])}
        />
      )}
    </View>
  );
};
