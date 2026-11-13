/**
 * Browser version of useAgoraClass.ts (metro picks this file for web), on
 * Agora's Web SDK. Same inputs and return value, so the live class screens
 * don't change. react-native-agora has no web build: in the browser it was a
 * no-op stub, so joinChannel never answered and the class sat on
 * "Connecting…" forever.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { fetchAgoraToken } from '../api/localGetApis';
import { setAgoraVideoTrack } from '../web/agora.web';

export type AgoraClassStatus = 'idle' | 'connecting' | 'joined' | 'reconnecting' | 'failed';

AgoraRTC.setLogLevel(3); // warnings and errors only

// Browsers block sound until the page has been clicked; resume on the next click.
AgoraRTC.onAutoplayFailed = () => {
  const resume = () => {
    document.querySelectorAll('audio').forEach(a => a.play().catch(() => {}));
    window.removeEventListener('click', resume);
  };
  window.addEventListener('click', resume);
};

const SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = 1600; // 100 ms, as the native hook delivers

const describeMediaError = (e: any) => {
  const code = e?.code || e?.name;
  if (code === 'PERMISSION_DENIED' || code === 'NotAllowedError') {
    return 'Allow camera and microphone access in your browser to broadcast this class.';
  }
  if (code === 'DEVICE_NOT_FOUND' || code === 'NotFoundError') {
    return 'No camera or microphone was found on this computer.';
  }
  return e?.message || 'Could not join the live class.';
};

export const useAgoraClass = ({
  lectureId,
  role,
  enabled,
  onMicAudio,
  micAudioActive = false,
  onScreenShareEnded,
}: {
  lectureId: string;
  role: 'host' | 'audience';
  enabled: boolean;
  onMicAudio?: (pcm: ArrayBuffer) => void;
  micAudioActive?: boolean;
  /** The browser's own "Stop sharing" ended the screen share. */
  onScreenShareEnded?: () => void;
}) => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const cameraRef = useRef<ICameraVideoTrack | null>(null);
  const screenRef = useRef<ILocalVideoTrack | null>(null);
  const hostUidRef = useRef<number | null>(null);
  const onMicAudioRef = useRef(onMicAudio);
  onMicAudioRef.current = onMicAudio;
  const onScreenShareEndedRef = useRef(onScreenShareEnded);
  onScreenShareEndedRef.current = onScreenShareEnded;

  const [status, setStatus] = useState<AgoraClassStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hostUid, setHostUid] = useState<number | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [hostVideoOn, setHostVideoOn] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // Bumped when the microphone track changes, so the transcription tap
  // re-attaches to the new one.
  const [micVersion, setMicVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !lectureId) return;
    let cancelled = false;
    setStatus('connecting');
    setError(null);

    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    clientRef.current = client;
    const remotes = new Set<number>();
    const refreshRemotes = () => setRemoteCount(remotes.size);

    client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
      const uid = Number(user.uid);
      remotes.add(uid);
      refreshRemotes();
      if (uid === hostUidRef.current) setHostPresent(true);
    });
    client.on('user-left', (user: IAgoraRTCRemoteUser) => {
      const uid = Number(user.uid);
      remotes.delete(uid);
      refreshRemotes();
      setAgoraVideoTrack(uid, null);
      if (uid === hostUidRef.current) {
        setHostPresent(false);
        setHostVideoOn(false);
      }
    });
    client.on('user-published', async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
      } catch (e) {
        console.warn('[AGORA web] subscribe failed', e);
        return;
      }
      const uid = Number(user.uid);
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      } else if (user.videoTrack) {
        setAgoraVideoTrack(uid, user.videoTrack);
        if (uid === hostUidRef.current) {
          setHostPresent(true);
          setHostVideoOn(true);
          // Poor networks drop to the low-res stream, then to audio only.
          client.setStreamFallbackOption(uid, 2 as any).catch(() => {});
        }
      }
    });
    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType !== 'video') return;
      const uid = Number(user.uid);
      setAgoraVideoTrack(uid, null);
      if (uid === hostUidRef.current) setHostVideoOn(false);
    });
    client.on('connection-state-change', (state: string) => {
      if (cancelled) return;
      if (state === 'RECONNECTING') setStatus('reconnecting');
      else if (state === 'CONNECTED') setStatus('joined');
    });
    // Tokens last a few hours; renew before they lapse mid-class.
    client.on('token-privilege-will-expire', async () => {
      const res = await fetchAgoraToken(lectureId);
      if (res.success) client.renewToken(res.data.token).catch(() => {});
    });

    (async () => {
      try {
        const res = await fetchAgoraToken(lectureId);
        if (!res.success) throw new Error(res.message);
        if (cancelled) return;
        const { appId, token, channel, uid, hostAgoraUid } = res.data;
        hostUidRef.current = hostAgoraUid;
        setHostUid(hostAgoraUid);

        if (role === 'host') {
          await client.setClientRole('host');
        } else {
          await client.setClientRole('audience', { level: 1 }); // low latency
        }
        await client.join(appId, channel, token || null, uid);
        if (cancelled) return;

        if (role === 'host') {
          const [mic, camera] = await AgoraRTC.createMicrophoneAndCameraTracks(
            { AEC: true, ANS: true },
            { encoderConfig: { width: 640, height: 360, frameRate: 15 } },
          );
          if (cancelled) {
            mic.close();
            camera.close();
            return;
          }
          micRef.current = mic;
          cameraRef.current = camera;
          setMicVersion(v => v + 1);
          setAgoraVideoTrack(0, camera);
          await client.enableDualStream().catch(() => {});
          await client.publish([mic, camera]);
        }
        if (!cancelled) setStatus('joined');
      } catch (e: any) {
        if (cancelled) return;
        console.warn('[AGORA web] join failed', e);
        setStatus('failed');
        setError(describeMediaError(e));
      }
    })();

    return () => {
      cancelled = true;
      clientRef.current = null;
      [micRef, cameraRef, screenRef].forEach(ref => {
        ref.current?.close();
        ref.current = null;
      });
      setAgoraVideoTrack(0, null);
      remotes.forEach(uid => setAgoraVideoTrack(uid, null));
      client.removeAllListeners();
      client.leave().catch(() => {});
      setHostPresent(false);
      setHostVideoOn(false);
      setIsScreenSharing(false);
      setRemoteCount(0);
    };
  }, [enabled, lectureId, role, attempt]);

  // Feed the microphone to live transcription as 16 kHz mono 16-bit PCM.
  useEffect(() => {
    const mic = micRef.current;
    if (!mic || status !== 'joined' || !micAudioActive) return;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = new AudioCtx({ sampleRate: SAMPLE_RATE });
    const source = ctx.createMediaStreamSource(new MediaStream([mic.getMediaStreamTrack()]));
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    let pending = new Int16Array(0);
    processor.onaudioprocess = event => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(pending.length + input.length);
      pcm.set(pending);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[pending.length + i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      let offset = 0;
      while (pcm.length - offset >= CHUNK_SAMPLES) {
        onMicAudioRef.current?.(pcm.slice(offset, offset + CHUNK_SAMPLES).buffer);
        offset += CHUNK_SAMPLES;
      }
      pending = pcm.slice(offset);
    };
    source.connect(processor);
    // A processor only runs while connected to an output; it writes silence.
    processor.connect(ctx.destination);
    return () => {
      processor.disconnect();
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [status, micAudioActive, micVersion]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  const setMicMuted = useCallback((muted: boolean) => {
    micRef.current?.setMuted(muted).catch(() => {});
  }, []);

  const setCameraOn = useCallback((on: boolean) => {
    cameraRef.current?.setEnabled(on).catch(() => {});
  }, []);

  const switchCamera = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera) return;
    try {
      const cameras = await AgoraRTC.getCameras();
      if (cameras.length < 2) return;
      const currentLabel = camera.getTrackLabel();
      const index = cameras.findIndex(c => c.label === currentLabel);
      await camera.setDevice(cameras[(index + 1) % cameras.length].deviceId);
    } catch (e) {
      console.warn('[AGORA web] switch camera failed', e);
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    const screen = screenRef.current;
    screenRef.current = null;
    setIsScreenSharing(false);
    if (!client || !screen) return;
    await client.unpublish(screen).catch(() => {});
    screen.close();
    const camera = cameraRef.current;
    if (camera) {
      setAgoraVideoTrack(0, camera);
      await client.publish(camera).catch(() => {});
    }
  }, []);

  /** Replaces the camera with a screen, window or tab for everyone. */
  const startScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return false;
    let screen: ILocalVideoTrack;
    try {
      const created = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: { width: 1280, height: 720, frameRate: 10 } },
        'disable',
      );
      screen = Array.isArray(created) ? created[0] : created;
    } catch {
      return false; // picker dismissed or not allowed
    }
    const camera = cameraRef.current;
    try {
      if (camera) await client.unpublish(camera);
      await client.publish(screen);
    } catch {
      screen.close();
      if (camera) await client.publish(camera).catch(() => {});
      return false;
    }
    screenRef.current = screen;
    setIsScreenSharing(true);
    // The browser's own "Stop sharing" bar.
    screen.on('track-ended', () => {
      stopScreenShare();
      onScreenShareEndedRef.current?.();
    });
    return true;
  }, [stopScreenShare]);

  /** Student given the floor: publish (or stop publishing) their microphone. */
  const setSpeaking = useCallback(async (speaking: boolean) => {
    const client = clientRef.current;
    if (!client) return false;
    try {
      if (speaking) {
        await client.setClientRole('host');
        const mic = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true });
        micRef.current = mic;
        setMicVersion(v => v + 1);
        await client.publish(mic);
      } else {
        const mic = micRef.current;
        micRef.current = null;
        if (mic) {
          await client.unpublish(mic).catch(() => {});
          mic.close();
        }
        await client.setClientRole('audience', { level: 1 });
      }
      return true;
    } catch (e) {
      console.warn('[AGORA web] speaking toggle failed', e);
      return false;
    }
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
