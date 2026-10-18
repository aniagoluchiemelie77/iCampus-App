import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import VIForegroundService from '@voximplant/react-native-foreground-service';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Socket } from 'socket.io-client';
import {
  mediaDevices,
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
} from 'react-native-webrtc';
import Toast from 'react-native-toast-message';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { useAppSelector } from '../hooks/hooks';
import { User, Lecture } from '../types/firebase';
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
  WavingToast,
  LiveControlButton,
} from './liveClassComponents';

interface LecturerLiveSessionProps {
  lecture: Lecture;
  socket: Socket | null;
  /** True once the server has admitted this socket to the lecture room. */
  joined: boolean;
}

const LOW_BANDWIDTH_KBPS = 150;
const RECOVERY_KBPS = 400;
const MAX_VISIBLE_AVATARS = 6;
const STATS_INTERVAL_MS = 5000;
// Stable identity: WavingToast restarts its hide timer whenever onHide changes.
const noop = () => {};

const getQualityLabel = (kbps: number, viewers: number) => {
  if (viewers === 0) return { label: 'No viewers yet', icon: 'hourglass-empty' };
  if (kbps > 600) return { label: 'Excellent', icon: 'signal-cellular-alt' };
  if (kbps > 300) return { label: 'Good', icon: 'signal-cellular-alt-2-bar' };
  if (kbps > LOW_BANDWIDTH_KBPS) return { label: 'Fair', icon: 'signal-cellular-alt-1-bar' };
  return { label: 'Poor', icon: 'signal-cellular-connected-no-internet-0-bar' };
};
const serializeCandidate = (c: any) =>
  typeof c?.toJSON === 'function'
    ? c.toJSON()
    : { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex };

export const LecturerLiveClassSession = ({
  lecture,
  socket,
  joined,
}: LecturerLiveSessionProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();

  // One peer connection per viewer socket (mesh topology).
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingCandidatesRef = useRef(new Map<string, any[]>());
  const pendingViewersRef = useRef(new Set<string>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const bytesSentRef = useRef({ bytes: 0, at: Date.now() });
  const lowStatsCountRef = useRef(0);
  const attendeesRef = useRef<User[]>([]);
  const chatVisibleRef = useRef(false);
  const startedAtRef = useRef<number>(toMillis((lecture as any).startedAt) ?? Date.now());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isAudioOnlyFallback, setIsAudioOnlyFallback] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [quality, setQuality] = useState(getQualityLabel(0, 0));
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

  // ---- Peer connections ---------------------------------------------------
  const updateViewerCount = useCallback(() => {
    let connected = 0;
    peersRef.current.forEach(pc => {
      if ((pc as any).connectionState === 'connected') connected += 1;
    });
    setViewerCount(connected);
  }, []);

  const closePeer = useCallback(
    (viewerSocketId: string) => {
      peersRef.current.get(viewerSocketId)?.close();
      peersRef.current.delete(viewerSocketId);
      pendingCandidatesRef.current.delete(viewerSocketId);
      updateViewerCount();
    },
    [updateViewerCount],
  );

  const createPeerForViewer = useCallback(
    async (viewerSocketId: string) => {
      const stream = localStreamRef.current;
      if (!socket || !stream) {
        // Camera not ready yet; offer once it is.
        pendingViewersRef.current.add(viewerSocketId);
        return;
      }
      closePeer(viewerSocketId);
      const pc = new RTCPeerConnection(createLiveClassPeerConnectionConfig());
      peersRef.current.set(viewerSocketId, pc);

      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      const videoTrack = screenTrack || cameraTrackRef.current;
      if (videoTrack) pc.addTrack(videoTrack, stream);

      (pc as any).onicecandidate = (event: any) => {
        if (!event.candidate) return;
        socket.emit('webrtc_signal', {
          lectureId: lecture.id,
          targetSocketId: viewerSocketId,
          signal: { candidate: serializeCandidate(event.candidate) },
        });
      };
      (pc as any).onconnectionstatechange = () => {
        const state = (pc as any).connectionState;
        if (state === 'failed' || state === 'closed') {
          if (peersRef.current.get(viewerSocketId) === pc) closePeer(viewerSocketId);
        } else {
          updateViewerCount();
        }
      };

      try {
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_signal', {
          lectureId: lecture.id,
          targetSocketId: viewerSocketId,
          signal: { type: offer.type, sdp: offer.sdp },
        });
      } catch (err) {
        console.error('[LIVE_RTC] Offer failed for viewer', viewerSocketId, err);
        closePeer(viewerSocketId);
      }
    },
    [socket, lecture.id, closePeer, updateViewerCount],
  );

  const handleViewerSignal = useCallback(
    async ({ signal, senderId }: { signal: any; senderId: string }) => {
      const pc = peersRef.current.get(senderId);
      if (!pc) return;
      try {
        if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const queued = pendingCandidatesRef.current.get(senderId) || [];
          pendingCandidatesRef.current.delete(senderId);
          for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c));
        } else if (signal.candidate) {
          if (!(pc as any).remoteDescription) {
            // The answer is still being applied; hold candidates until it is.
            const queue = pendingCandidatesRef.current.get(senderId) || [];
            queue.push(signal.candidate);
            pendingCandidatesRef.current.set(senderId, queue);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('[LIVE_RTC] Failed to apply viewer signal:', err);
      }
    },
    [],
  );

  // Swap the outgoing video on every peer without renegotiating.
  const replaceOutgoingVideo = useCallback(async (track: any) => {
    const jobs: Promise<void>[] = [];
    peersRef.current.forEach(pc => {
      pc.getSenders().forEach(sender => {
        if (sender.track?.kind === 'video') jobs.push(sender.replaceTrack(track));
      });
    });
    await Promise.all(jobs);
  }, []);

  // ---- Local media ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Modest resolution: in a mesh the lecturer uploads once per viewer.
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: 640, height: 480, frameRate: 24 },
        } as any);
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
      } catch (err) {
        console.error('[LIVE_RTC] getUserMedia failed:', err);
        Toast.show({
          type: 'error',
          text1: 'Camera / Microphone Blocked',
          text2: 'Allow camera and microphone access to broadcast this class.',
        });
      }
    })();
    const peers = peersRef.current;
    return () => {
      cancelled = true;
      peers.forEach(pc => pc.close());
      peers.clear();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Go live once both the room and the camera are ready. After a reconnect the
  // old viewer socket ids are dead, so drop them; viewers re-request on
  // `live_stream_started`.
  useEffect(() => {
    if (!socket || !joined) {
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      updateViewerCount();
      return;
    }
    if (!localStream) return;
    socket.emit('stream_ready', { lectureId: lecture.id });
    const pending = Array.from(pendingViewersRef.current);
    pendingViewersRef.current.clear();
    pending.forEach(id => createPeerForViewer(id));
  }, [socket, joined, localStream, lecture.id, createPeerForViewer, updateViewerCount]);

  // ---- Socket events --------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const handlers: Record<string, (data: any) => void> = {
      webrtc_viewer_joined: ({ viewerSocketId }) => createPeerForViewer(viewerSocketId),
      webrtc_signal_received: handleViewerSignal,
      webrtc_viewer_left: ({ viewerSocketId }) => closePeer(viewerSocketId),
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
  }, [socket, user?.uid, createPeerForViewer, handleViewerSignal, closePeer, appendTranscriptionText]);

  // ---- Stream quality + adaptive fallback -----------------------------------
  useEffect(() => {
    const interval = setInterval(async () => {
      let bytes = 0;
      let connected = 0;
      for (const pc of peersRef.current.values()) {
        if ((pc as any).connectionState !== 'connected') continue;
        connected += 1;
        try {
          const stats: any = await pc.getStats();
          stats.forEach((report: any) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              bytes += report.bytesSent || 0;
            }
          });
        } catch {
          // A peer closing mid-poll is fine.
        }
      }
      const now = Date.now();
      const prev = bytesSentRef.current;
      const seconds = Math.max(1, (now - prev.at) / 1000);
      const kbpsPerViewer =
        connected > 0 && bytes >= prev.bytes
          ? ((bytes - prev.bytes) * 8) / seconds / 1000 / connected
          : 0;
      bytesSentRef.current = { bytes, at: now };
      setViewerCount(connected);
      setQuality(getQualityLabel(kbpsPerViewer, connected));

      const camera = cameraTrackRef.current;
      if (!camera || connected === 0 || screenStreamRef.current) return;
      if (kbpsPerViewer < LOW_BANDWIDTH_KBPS && !isAudioOnlyFallback && isCameraOn) {
        lowStatsCountRef.current += 1;
        if (lowStatsCountRef.current >= 2) {
          camera.enabled = false;
          setIsAudioOnlyFallback(true);
          socket?.emit('lecturer_network_fallback', { lectureId: lecture.id, mode: 'audio-only' });
          Toast.show({
            type: 'info',
            text1: 'Weak Connection',
            text2: 'Switched to audio-only so students stay connected.',
          });
        }
      } else if (kbpsPerViewer >= RECOVERY_KBPS && isAudioOnlyFallback) {
        lowStatsCountRef.current = 0;
        camera.enabled = isCameraOn;
        setIsAudioOnlyFallback(false);
        socket?.emit('lecturer_network_fallback', { lectureId: lecture.id, mode: 'full-stream' });
        Toast.show({ type: 'success', text1: 'Connection Recovered', text2: 'Video restored.' });
      } else if (kbpsPerViewer >= LOW_BANDWIDTH_KBPS) {
        lowStatsCountRef.current = 0;
      }
    }, STATS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [socket, lecture.id, isAudioOnlyFallback, isCameraOn]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(formatElapsed(startedAtRef.current)), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Mic + transcription --------------------------------------------------
  useEffect(() => {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = !isLocalMuted;
    if (joined) socket?.emit('toggle_lecturer_mic', { lectureId: lecture.id, isMuted: isLocalMuted });
  }, [isLocalMuted, localStream, joined, socket, lecture.id]);

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

  useEffect(() => {
    if (!joined || isLocalMuted) return;
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
  }, [joined, isLocalMuted, sendAudioChunkToDeepgram]);

  // ---- Controls --------------------------------------------------------------
  const toggleCamera = () => {
    const next = !isCameraOn;
    if (cameraTrackRef.current && !isAudioOnlyFallback) cameraTrackRef.current.enabled = next;
    setIsCameraOn(next);
    socket?.emit('toggle_lecturer_camera', { lectureId: lecture.id, isCameraOn: next });
  };

  const stopScreenShare = useCallback(async () => {
    const screen = screenStreamRef.current;
    screenStreamRef.current = null;
    setIsSharingScreen(false);
    await replaceOutgoingVideo(cameraTrackRef.current);
    screen?.getTracks().forEach(t => t.stop());
    if (Platform.OS === 'android') {
      VIForegroundService.getInstance().stopService().catch(() => {});
    }
    socket?.emit('lecturer_stopped_sharing', { lectureId: lecture.id });
  }, [replaceOutgoingVideo, socket, lecture.id]);

  const startScreenShare = async () => {
    try {
      if (Platform.OS === 'android') {
        // Android requires a foreground service for MediaProjection.
        const service = VIForegroundService.getInstance();
        await service.createNotificationChannel({
          id: 'liveness_channel',
          name: 'iCampus Live Session',
          description: 'Keeps the lecture alive while screen sharing',
          enableVibration: false,
          importance: 4,
        });
        await service.startService({
          channelId: 'liveness_channel',
          id: 1234,
          title: 'iCampus Live',
          text: `Sharing screen for ${lecture.topicName}`,
          icon: 'icampus_logo',
          priority: 2,
        });
      }
      const screen = await mediaDevices.getDisplayMedia({ video: true } as any);
      const screenTrack = screen.getVideoTracks()[0];
      if (!screenTrack) throw new Error('No screen track');
      screenStreamRef.current = screen;
      (screenTrack as any).addEventListener?.('ended', () => stopScreenShare());
      await replaceOutgoingVideo(screenTrack);
      setIsSharingScreen(true);
      socket?.emit('lecturer_started_sharing', { lectureId: lecture.id });
    } catch (e) {
      console.log('Screen capture denied or failed:', e);
      setIsSharingScreen(false);
      if (Platform.OS === 'android') {
        VIForegroundService.getInstance().stopService().catch(() => {});
      }
    }
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
  const showCameraPreview = !!localStream && isCameraOn && !isAudioOnlyFallback && !isSharingScreen;

  return (
    <SafeAreaView
      edges={['top']}
      style={[S.mainContainer, { backgroundColor: colors.background }]}
    >
      <View style={S.topBar}>
        <View style={[S.livePill, !joined && S.livePillWaiting]}>
          <View style={S.liveDot} />
          <Text style={S.livePillText}>{joined ? 'LIVE' : 'OFFLINE'}</Text>
        </View>
        <View style={S.topChip}>
          <MaterialIcons name="schedule" size={14} color={colors.primary} />
          <Text style={[S.topChipText, { color: colors.textDarker }]}>{elapsedTime}</Text>
        </View>
        <View style={S.topChip}>
          <MaterialIcons name="visibility" size={14} color={colors.primary} />
          <Text style={[S.topChipText, { color: colors.textDarker }]}>{viewerCount}</Text>
        </View>
        <TouchableOpacity style={S.topBarAction} onPress={() => setEndModalVisible(true)}>
          <MaterialIcons name="call-end" size={16} color="#fff" />
          <Text style={S.topBarActionText}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={S.stage}>
        {showCameraPreview && (
          <RTCView
            streamURL={localStream!.toURL()}
            style={S.stageVideo}
            objectFit="cover"
            mirror
          />
        )}
        {!showCameraPreview && (
          <View style={S.stageOverlay}>
            <MaterialIcons
              name={
                isSharingScreen
                  ? 'screen-share'
                  : isAudioOnlyFallback
                    ? 'graphic-eq'
                    : localStream
                      ? 'videocam-off'
                      : 'videocam'
              }
              size={46}
              color={colors.primary}
            />
            <Text style={S.stageTitle}>
              {isSharingScreen
                ? 'You are sharing your screen'
                : isAudioOnlyFallback
                  ? 'Audio-only mode'
                  : localStream
                    ? 'Your camera is off'
                    : 'Starting camera…'}
            </Text>
            <Text style={S.stageHint}>
              {isSharingScreen
                ? 'Students see your screen. You can switch apps to present.'
                : isAudioOnlyFallback
                  ? 'Video paused because of a weak connection. Students can still hear you.'
                  : localStream
                    ? 'Students can still hear you.'
                    : 'Allow camera and microphone access if prompted.'}
            </Text>
            {isSharingScreen && (
              <TouchableOpacity style={S.stageStopShare} onPress={stopScreenShare}>
                <Text style={S.stageStopShareText}>Stop Sharing</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={S.stageChipsRow}>
          <View style={S.stageChip}>
            <MaterialIcons name={quality.icon} size={13} color="#fff" />
            <Text style={S.stageChipText}>{quality.label}</Text>
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
          disabled={!localStream || isSharingScreen}
          onPress={toggleCamera}
        />
        <LiveControlButton
          icon={isSharingScreen ? 'stop-screen-share' : 'screen-share'}
          label={isSharingScreen ? 'Stop' : 'Share'}
          active={isSharingScreen}
          disabled={!localStream || Platform.OS !== 'android'}
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
            {' · '}
            {viewerCount} watching
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
