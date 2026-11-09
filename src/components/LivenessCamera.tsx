import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  usePhotoOutput,
} from 'react-native-vision-camera';
import {
  CHALLENGE_TEXT,
  HINT_TEXT,
  LivenessFace,
  LivenessState,
  createLivenessState,
  stepLiveness,
} from '../utils/liveness';

export type LivenessResult = 'passed' | 'unavailable';

interface Props {
  /** Camera runs only while true. */
  isActive: boolean;
  /** The caller is processing a capture: freeze the challenge UI. */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Photo (filesystem path, no file://) taken after the checks pass. */
  onCaptured: (filePath: string, liveness: LivenessResult) => void;
  /** Too many failed attempts, or the camera failed. */
  onFailed: (message: string) => void;
}

// No frames from the detector within this time = treat it as unavailable.
const DETECTOR_STARTUP_MS = 8000;

/**
 * Lazily created so a binary without the face detector's native module
 * (or web, where it is stubbed) falls back to manual capture instead of
 * crashing the screen.
 */
const createDetectorOutput = (options: any) => {
  try {
    const { createFaceDetectorOutput } = require('react-native-vision-camera-face-detector');
    return createFaceDetectorOutput(options) ?? null;
  } catch (error) {
    console.warn('[LivenessCamera] Face detector unavailable:', error);
    return null;
  }
};

/**
 * Front camera with a liveness check: the student blinks and does one other
 * random action (turn head / smile) before the photo is taken automatically.
 * Defeats holding up a photo of someone else. See utils/liveness.ts.
 */
export const LivenessCamera = ({ isActive, busy = false, style, onCaptured, onFailed }: Props) => {
  const device = useCameraDevice('front');
  // Selfies are resized to 512px before upload, so HD is plenty and fast.
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.HD_4_3,
    qualityPrioritization: 'speed',
  });

  const stateRef = useRef<LivenessState>(createLivenessState(Date.now()));
  const [view, setView] = useState(() => toView(stateRef.current));
  const [detectorDown, setDetectorDown] = useState(false);
  const framesSeenRef = useRef(false);
  const capturingRef = useRef(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const callbacks = useRef({ onCaptured, onFailed });
  callbacks.current = { onCaptured, onFailed };

  const capture = useCallback(
    async (liveness: LivenessResult) => {
      if (capturingRef.current) return;
      capturingRef.current = true;
      try {
        const file = await photoOutput.capturePhotoToFile(
          { flashMode: 'off', enableShutterSound: false },
          {},
        );
        callbacks.current.onCaptured(file.filePath, liveness);
      } catch (error) {
        console.warn('[LivenessCamera] Capture failed:', error);
        callbacks.current.onFailed('Could not take the photo. Try again.');
      } finally {
        capturingRef.current = false;
      }
    },
    [photoOutput],
  );

  const onFaces = useCallback(
    (faces: LivenessFace[]) => {
      framesSeenRef.current = true;
      if (busyRef.current || capturingRef.current) return;
      const prev = stateRef.current;
      const next = stepLiveness(prev, faces, Date.now());
      stateRef.current = next;
      // Re-render only when something visible changed (not every frame).
      if (
        next.phase !== prev.phase ||
        next.index !== prev.index ||
        next.hint !== prev.hint ||
        next.challenges !== prev.challenges ||
        (next.holdSince === null) !== (prev.holdSince === null)
      ) {
        setView(toView(next));
      }
      if (next.phase === 'done' && prev.phase !== 'done') capture('passed');
      if (next.phase === 'failed' && prev.phase !== 'failed') {
        callbacks.current.onFailed(
          "We couldn't complete the check. Make sure your face is well lit and try again.",
        );
      }
    },
    [capture],
  );
  const onFacesRef = useRef(onFaces);
  onFacesRef.current = onFaces;

  const detectorOutput = useMemo(
    () =>
      createDetectorOutput({
        performanceMode: 'fast',
        runClassifications: true, // eye-open and smile probabilities
        trackingEnabled: true, // same face throughout
        minFaceSize: 0.15,
        cameraFacing: 'front',
        outputResolution: 'preview',
        onFacesDetected: (faces: LivenessFace[]) => onFacesRef.current(faces),
        onError: (error: Error) => {
          console.warn('[LivenessCamera] Detector error:', error);
          setDetectorDown(true);
        },
      }),
    [],
  );

  // A detector that never reports any frame is as good as missing.
  useEffect(() => {
    if (!isActive || !detectorOutput) return;
    const timer = setTimeout(() => {
      if (!framesSeenRef.current) setDetectorDown(true);
    }, DETECTOR_STARTUP_MS);
    return () => clearTimeout(timer);
  }, [isActive, detectorOutput]);

  const manualMode = !detectorOutput || detectorDown;
  const outputs = useMemo(
    () => (manualMode || !detectorOutput ? [photoOutput] : [photoOutput, detectorOutput]),
    [manualMode, detectorOutput, photoOutput],
  );

  if (!device) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Front camera unavailable.</Text>
      </View>
    );
  }

  const step = view.phase === 'challenge' ? view.challenges[view.index] : null;
  const instruction = manualMode
    ? 'Face the camera and tap the button'
    : view.phase === 'searching'
      ? 'Fit your face inside the oval'
      : view.phase === 'center' || view.phase === 'done'
        ? 'Great! Now look straight at the camera'
        : step
          ? CHALLENGE_TEXT[step]
          : '';
  const ovalColor =
    view.phase === 'center' || view.phase === 'done' ? '#2ecc71' : view.hint ? '#f5a623' : '#ffffff';

  return (
    <View style={[styles.container, style]}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isActive} outputs={outputs} />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.oval, { borderColor: ovalColor }]} pointerEvents="none" />

        <View style={styles.topPanel} pointerEvents="none">
          {!manualMode && (
            <View style={styles.dots}>
              {view.challenges.map((c, i) => (
                <View
                  key={`${c}-${i}`}
                  style={[
                    styles.dot,
                    (view.phase === 'center' || view.phase === 'done' || i < view.index) && styles.dotDone,
                    view.phase === 'challenge' && i === view.index && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
          <Text style={styles.instruction} accessibilityLiveRegion="polite">
            {instruction}
          </Text>
          {!manualMode && view.hint && <Text style={styles.hint}>{HINT_TEXT[view.hint]}</Text>}
          {!manualMode && view.phase === 'searching' && !view.hint && (
            <Text style={styles.sub}>A quick check that it's really you, live.</Text>
          )}
        </View>

        {busy ? (
          <View style={styles.busy} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : manualMode ? (
          <TouchableOpacity
            style={styles.shutter}
            onPress={() => capture('unavailable')}
            accessibilityRole="button"
            accessibilityLabel="Take selfie"
          >
            <MaterialIcons name="photo-camera" size={28} color="#222" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const toView = (s: LivenessState) => ({
  phase: s.phase,
  index: s.index,
  hint: s.hint,
  challenges: s.challenges,
});

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  oval: {
    width: '62%',
    aspectRatio: 0.78,
    borderRadius: 999,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  topPanel: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#ffffff' },
  dotDone: { backgroundColor: '#2ecc71' },
  instruction: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  hint: { color: '#ffd27a', fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, marginTop: 4, textAlign: 'center' },
  shutter: {
    position: 'absolute',
    bottom: 24,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  busy: {
    position: 'absolute',
    bottom: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 24,
  },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  fallbackText: { color: '#fff', fontSize: 15 },
});
