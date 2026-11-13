/**
 * Web stand-in for `react-native-agora` (wired up in metro.config.js). The
 * native SDK has no browser build; on web the media itself runs on Agora's
 * Web SDK in src/hooks/useAgoraClass.web.ts, which puts its video tracks in
 * the registry below. This module only provides what the screens import
 * from 'react-native-agora': the <RtcSurfaceView> that shows a track.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { ICameraVideoTrack, ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

type VideoTrack = ICameraVideoTrack | ILocalVideoTrack | IRemoteVideoTrack;

// uid -> video track. uid 0 is this device's own camera, as in the native SDK.
const tracks = new Map<number, VideoTrack>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const setAgoraVideoTrack = (uid: number, track: VideoTrack | null) => {
  if (track) tracks.set(uid, track);
  else tracks.delete(uid);
  emit();
};

const useVideoTrack = (uid: number) => {
  const [track, setTrack] = useState<VideoTrack | undefined>(() => tracks.get(uid));
  useEffect(() => {
    const update = () => setTrack(tracks.get(uid));
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, [uid]);
  return track;
};

/** Native render modes: 1 = Hidden (crop to fill), 2 = Fit (letterbox). */
export const RtcSurfaceView = ({
  canvas,
  style,
}: {
  canvas: { uid?: number; renderMode?: number };
  style?: any;
  zOrderMediaOverlay?: boolean;
}) => {
  const uid = canvas?.uid ?? 0;
  const fit = canvas?.renderMode === 2 ? 'contain' : 'cover';
  const track = useVideoTrack(uid);
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!track || !el) return;
    // A track plays in one element at a time; playing it here moves it.
    track.play(el, { fit, mirror: uid === 0 });
    return () => {
      // Only stop if a newer view hasn't taken the track over.
      if (el.contains(el.querySelector('video'))) {
        try {
          track.stop();
        } catch {
          // track already closed
        }
      }
    };
  }, [track, fit, uid]);

  return (
    <View style={style}>
      <View
        ref={(node: any) => {
          hostRef.current = node as HTMLElement | null;
        }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' }}
      />
    </View>
  );
};

export const RtcTextureView = RtcSurfaceView;

// Anything else from 'react-native-agora' is only used by the native hook.
export const createAgoraRtcEngine = () => {
  throw new Error('react-native-agora is native-only; use useAgoraClass.web.ts on web.');
};
