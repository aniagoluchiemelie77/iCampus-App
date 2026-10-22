import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  AudienceLatencyLevelType,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  RawAudioFrameOpModeType,
  RemoteVideoState,
  StreamFallbackOptions,
} from 'react-native-agora';
import { fetchAgoraToken } from '../api/localGetApis';

export type AgoraClassStatus = 'idle' | 'connecting' | 'joined' | 'reconnecting' | 'failed';

/**
 * Live class media over Agora (replaces the WebRTC mesh, where the lecturer's
 * phone uploaded one copy of the video per student).
 *
 *  - Lecturer: joins as broadcaster publishing camera + mic (dual stream, so
 *    weak viewers get a low-res copy) and can share the screen on Android.
 *  - Student: joins as audience with automatic audio-only fallback on poor
 *    networks; `setSpeaking(true)` publishes their mic when given the floor.
 *
 * Signalling for chat, hands, attendees etc. stays on Socket.IO.
 */
export const useAgoraClass = ({
  lectureId,
  role,
  enabled,
  onMicAudio,
  micAudioActive = false,
}: {
  lectureId: string;
  role: 'host' | 'audience';
  enabled: boolean;
  /**
   * 16 kHz mono 16-bit PCM from the microphone Agora is already capturing
   * (for live transcription). A second recorder on the same mic would fight
   * Agora for it on Android.
   */
  onMicAudio?: (pcm: ArrayBuffer) => void;
  micAudioActive?: boolean;
}) => {
  const engineRef = useRef<IRtcEngine | null>(null);
  const onMicAudioRef = useRef(onMicAudio);
  onMicAudioRef.current = onMicAudio;
  const hostUidRef = useRef<number | null>(null);
  const [status, setStatus] = useState<AgoraClassStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hostUid, setHostUid] = useState<number | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [hostVideoOn, setHostVideoOn] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !lectureId) return;
    let cancelled = false;
    const remotes = new Set<number>();
    setStatus('connecting');
    setError(null);

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => !cancelled && setStatus('joined'),
      onUserJoined: (_conn, uid) => {
        remotes.add(uid);
        setRemoteCount(remotes.size);
        if (uid === hostUidRef.current) setHostPresent(true);
      },
      onUserOffline: (_conn, uid) => {
        remotes.delete(uid);
        setRemoteCount(remotes.size);
        if (uid === hostUidRef.current) {
          setHostPresent(false);
          setHostVideoOn(false);
        }
      },
      onRemoteVideoStateChanged: (_conn, uid, state) => {
        if (uid !== hostUidRef.current) return;
        setHostVideoOn(
          state === RemoteVideoState.RemoteVideoStateDecoding ||
            state === RemoteVideoState.RemoteVideoStateStarting,
        );
      },
      onConnectionStateChanged: (_conn, state) => {
        if (cancelled) return;
        if (state === ConnectionStateType.ConnectionStateReconnecting) setStatus('reconnecting');
        else if (state === ConnectionStateType.ConnectionStateConnected) setStatus('joined');
        else if (state === ConnectionStateType.ConnectionStateFailed) {
          setStatus('failed');
          setError('Lost connection to the live class.');
        }
      },
      // Tokens last a few hours; renew before they lapse mid-class.
      onTokenPrivilegeWillExpire: async () => {
        const res = await fetchAgoraToken(lectureId);
        if (res.success) engineRef.current?.renewToken(res.data.token);
      },
      onError: (code, msg) => console.warn('[AGORA]', code, msg),
    };

    (async () => {
      try {
        if (Platform.OS === 'android') {
          const wanted =
            role === 'host'
              ? [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
              : [];
          if (wanted.length) {
            const result = await PermissionsAndroid.requestMultiple(wanted);
            const denied = wanted.some(p => result[p] !== PermissionsAndroid.RESULTS.GRANTED);
            if (denied) throw new Error('Allow camera and microphone access to broadcast this class.');
          }
        }
        const res = await fetchAgoraToken(lectureId);
        if (!res.success) throw new Error(res.message);
        if (cancelled) return;
        const { appId, token, channel, uid, hostAgoraUid } = res.data;
        hostUidRef.current = hostAgoraUid;
        setHostUid(hostAgoraUid);

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({
          appId,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });
        engine.registerEventHandler(handler);
        engine.enableVideo();

        if (role === 'host') {
          // Modest default; Agora adapts it to each viewer's network.
          engine.setVideoEncoderConfiguration({
            dimensions: { width: 640, height: 360 },
            frameRate: 15,
          });
          engine.enableDualStreamMode(true);
          engine.startPreview();
        } else {
          // Poor networks drop to the low-res stream, then to audio only.
          engine.setRemoteSubscribeFallbackOption(
            StreamFallbackOptions.StreamFallbackOptionAudioOnly,
          );
        }

        engine.joinChannel(token, channel, uid, {
          clientRoleType:
            role === 'host'
              ? ClientRoleType.ClientRoleBroadcaster
              : ClientRoleType.ClientRoleAudience,
          audienceLatencyLevel: AudienceLatencyLevelType.AudienceLatencyLevelLowLatency,
          publishCameraTrack: role === 'host',
          publishMicrophoneTrack: role === 'host',
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      } catch (e: any) {
        if (cancelled) return;
        setStatus('failed');
        setError(e?.message || 'Could not join the live class.');
      }
    })();

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine) {
        engine.unregisterEventHandler(handler);
        try {
          engine.stopScreenCapture();
        } catch {
          // not sharing
        }
        engine.leaveChannel();
        engine.release();
      }
      setHostPresent(false);
      setHostVideoOn(false);
      setIsScreenSharing(false);
      setRemoteCount(0);
    };
  }, [enabled, lectureId, role, attempt]);

  // Tap the captured mic audio for transcription while it's wanted.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || status !== 'joined' || !micAudioActive) return;
    // 100 ms of 16 kHz mono per callback.
    engine.setRecordingAudioFrameParameters(
      16000,
      1,
      RawAudioFrameOpModeType.RawAudioFrameOpModeReadOnly,
      1600,
    );
    const observer = {
      onRecordAudioFrame: (_channelId: string, frame: any) => {
        const buf: Uint8Array | undefined = frame?.buffer;
        if (!buf?.byteLength) return;
        onMicAudioRef.current?.(
          buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
        );
      },
    };
    const mediaEngine = engine.getMediaEngine();
    mediaEngine.registerAudioFrameObserver(observer);
    return () => {
      try {
        mediaEngine.unregisterAudioFrameObserver(observer);
      } catch {
        // engine already released
      }
    };
  }, [status, micAudioActive]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  const setMicMuted = useCallback((muted: boolean) => {
    engineRef.current?.muteLocalAudioStream(muted);
  }, []);

  const setCameraOn = useCallback((on: boolean) => {
    engineRef.current?.enableLocalVideo(on);
  }, []);

  const switchCamera = useCallback(() => {
    engineRef.current?.switchCamera();
  }, []);

  /** Android only: replaces the camera with the screen for everyone. */
  const startScreenShare = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return false;
    const rc = engine.startScreenCapture({
      captureVideo: true,
      captureAudio: false,
      videoParams: { dimensions: { width: 1280, height: 720 }, frameRate: 10, bitrate: 0 },
    } as any);
    if (rc < 0) return false;
    engine.updateChannelMediaOptions({
      publishCameraTrack: false,
      publishScreenCaptureVideo: true,
    });
    setIsScreenSharing(true);
    return true;
  }, []);

  const stopScreenShare = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.stopScreenCapture();
    engine.updateChannelMediaOptions({
      publishCameraTrack: true,
      publishScreenCaptureVideo: false,
    });
    setIsScreenSharing(false);
  }, []);

  /** Student given the floor: publish (or stop publishing) their microphone. */
  const setSpeaking = useCallback(async (speaking: boolean) => {
    const engine = engineRef.current;
    if (!engine) return false;
    if (speaking && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }
    engine.updateChannelMediaOptions({
      clientRoleType: speaking ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
      publishMicrophoneTrack: speaking,
      publishCameraTrack: false,
    });
    return true;
  }, []);

  return {
    status,
    error,
    hostUid,
    hostPresent,
    hostVideoOn,
    remoteCount,
    isScreenSharing,
    retry,
    setMicMuted,
    setCameraOn,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    setSpeaking,
  };
};
