/**
 * Instant on-device check of a selfie before it is uploaded for face
 * matching (ML Kit, no network, no API key).
 *
 * It can only REJECT a photo early (no face, extra people, looking away);
 * it never approves one. The identity match is always decided on the
 * server, so tampering with this check gains nothing.
 *
 * Fails open: if the native module is missing (web, or an app binary built
 * before it was added) or detection throws, the photo goes to the server.
 */
import { Platform } from 'react-native';

export type FacePrecheckIssue =
  | 'noFace'
  | 'multipleFaces'
  | 'lookingAway'
  | 'eyesClosed';

export type FacePrecheckResult =
  | { ok: true; faceCount: number | null; skipped?: boolean }
  | { ok: false; issue: FacePrecheckIssue; faceCount: number; message: string };

// Head turned more than this (degrees) counts as looking away.
const MAX_YAW_DEG = 30;
const MAX_PITCH_DEG = 25;
// Both eyes below this "open" probability counts as eyes closed.
const EYES_CLOSED_BELOW = 0.2;

const DETECTOR_OPTIONS = {
  performanceMode: 'fast' as const,
  runClassifications: true, // eye-open probabilities
  // Head must be at least 15% of the photo's width, so small faces far in
  // the background (e.g. classmates across the room) aren't counted.
  minFaceSize: 0.15,
};

const MESSAGES: Record<FacePrecheckIssue, string> = {
  noFace: "We couldn't see your face. Hold the phone at eye level in good light.",
  multipleFaces: 'Only you should be in the photo. Ask others to step out of view.',
  lookingAway: 'Face the camera directly and look at the screen.',
  eyesClosed: 'Keep your eyes open and look at the screen.',
};

let detector: { detectFaces: (uri: string) => any[] } | null | undefined;

const getDetector = () => {
  if (detector !== undefined) return detector;
  try {
    if (Platform.OS === 'web') throw new Error('Not available on web');
    // Lazy so a missing native module can't crash the screen on import.
    const {
      createImageFaceDetector,
    } = require('react-native-vision-camera-face-detector');
    detector = createImageFaceDetector(DETECTOR_OPTIONS);
  } catch (error) {
    console.warn('[facePrecheck] Face detector unavailable, skipping:', error);
    detector = null;
  }
  return detector;
};

const toFileUri = (pathOrUri: string) =>
  /^[a-z]+:\/\//i.test(pathOrUri) ? pathOrUri : `file://${pathOrUri}`;

/** Checks a captured photo (file path or file:// URI). */
export const precheckSelfie = (pathOrUri: string): FacePrecheckResult => {
  const faceDetector = getDetector();
  if (!faceDetector) return { ok: true, faceCount: null, skipped: true };

  let faces: any[];
  try {
    faces = faceDetector.detectFaces(toFileUri(pathOrUri)) || [];
  } catch (error) {
    console.warn('[facePrecheck] Detection failed, skipping:', error);
    return { ok: true, faceCount: null, skipped: true };
  }

  const fail = (issue: FacePrecheckIssue): FacePrecheckResult => ({
    ok: false,
    issue,
    faceCount: faces.length,
    message: MESSAGES[issue],
  });

  if (faces.length === 0) return fail('noFace');
  if (faces.length > 1) return fail('multipleFaces');

  const face = faces[0];
  if (
    Math.abs(Number(face.yawAngle) || 0) > MAX_YAW_DEG ||
    Math.abs(Number(face.pitchAngle) || 0) > MAX_PITCH_DEG
  ) {
    return fail('lookingAway');
  }
  const left = face.leftEyeOpenProbability;
  const right = face.rightEyeOpenProbability;
  if (
    typeof left === 'number' &&
    typeof right === 'number' &&
    left < EYES_CLOSED_BELOW &&
    right < EYES_CLOSED_BELOW
  ) {
    return fail('eyesClosed');
  }
  return { ok: true, faceCount: 1 };
};
