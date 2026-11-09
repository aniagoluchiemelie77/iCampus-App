/**
 * Liveness check for identity selfies: the student must perform short random
 * actions (blink, plus one of turn-head / smile) on the live camera before
 * the photo is taken. A printed photo or a picture on another screen can't
 * blink or change expression, so it stalls here instead of reaching the
 * face match.
 *
 * Pure logic, fed one frame of detected faces at a time (from
 * LivenessCamera), so it can be unit tested without a camera.
 *
 * Limits: this raises the bar a lot, but a pre-recorded video of the student
 * doing the right actions in the right order could still pass. The random
 * order and per-step time limits make that harder; a server-side liveness
 * service is the next step up if that becomes a real problem.
 */

export type LivenessChallenge = 'blink' | 'turn' | 'smile';

export type LivenessPhase =
  | 'searching' // waiting for one face, roughly facing the camera
  | 'challenge' // performing challenges[index]
  | 'center' // all done: face the camera, eyes open, hold still
  | 'done' // ready to capture
  | 'failed'; // too many timeouts

export type LivenessHint =
  | 'noFace'
  | 'multipleFaces'
  | 'tooFar'
  | 'restarted'
  | 'timedOut'
  | null;

/** The subset of a detected face this module needs. */
export interface LivenessFace {
  yawAngle: number;
  pitchAngle: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  smilingProbability?: number;
  trackingId?: number;
  bounds: { width: number };
  frameWidth: number;
}

export interface LivenessState {
  phase: LivenessPhase;
  challenges: LivenessChallenge[];
  index: number;
  hint: LivenessHint;
  /** The face doing the challenges; another face resets progress. */
  trackingId?: number;
  lastFaceAt: number;
  stepStartedAt: number;
  /** Progress inside the current challenge. */
  sawOpen: boolean;
  sawClosed: boolean;
  sawTurn: boolean;
  sawNeutral: boolean;
  holdSince: number | null;
  timeouts: number;
}

// Tunables. Probabilities and angles come from ML Kit.
export const LIVENESS = {
  EYES_OPEN: 0.7,
  EYES_CLOSED: 0.25,
  TURN_DEG: 22,
  FRONTAL_DEG: 12,
  MAX_PITCH_DEG: 18,
  SMILE: 0.8,
  NEUTRAL: 0.35,
  /** Face width / frame width; smaller is too far away. */
  MIN_FACE_FRACTION: 0.22,
  /** Face missing this long resets progress. */
  LOST_FACE_MS: 1200,
  STEP_TIMEOUT_MS: 9000,
  HOLD_MS: 500,
  MAX_TIMEOUTS: 3,
} as const;

/** Blink is always included (the strongest test against a still photo). */
export const pickChallenges = (rng: () => number = Math.random): LivenessChallenge[] => {
  const second: LivenessChallenge = rng() < 0.5 ? 'turn' : 'smile';
  return rng() < 0.5 ? ['blink', second] : [second, 'blink'];
};

export const createLivenessState = (
  now: number,
  rng: () => number = Math.random,
): LivenessState => ({
  phase: 'searching',
  challenges: pickChallenges(rng),
  index: 0,
  hint: null,
  trackingId: undefined,
  lastFaceAt: now,
  stepStartedAt: now,
  sawOpen: false,
  sawClosed: false,
  sawTurn: false,
  sawNeutral: false,
  holdSince: null,
  timeouts: 0,
});

const clearStep = (state: LivenessState, now: number): LivenessState => ({
  ...state,
  sawOpen: false,
  sawClosed: false,
  sawTurn: false,
  sawNeutral: false,
  holdSince: null,
  stepStartedAt: now,
});

/** Back to the start (same challenges), e.g. the face left the frame. */
const restart = (state: LivenessState, now: number, hint: LivenessHint): LivenessState => ({
  ...clearStep(state, now),
  phase: 'searching',
  index: 0,
  trackingId: undefined,
  hint,
});

const isFrontal = (face: LivenessFace, maxYaw: number) =>
  Math.abs(Number(face.yawAngle) || 0) <= maxYaw &&
  Math.abs(Number(face.pitchAngle) || 0) <= LIVENESS.MAX_PITCH_DEG;

const eyes = (face: LivenessFace) => {
  const l = face.leftEyeOpenProbability;
  const r = face.rightEyeOpenProbability;
  if (typeof l !== 'number' || typeof r !== 'number') return null;
  return {
    open: Math.min(l, r) >= LIVENESS.EYES_OPEN,
    closed: Math.max(l, r) <= LIVENESS.EYES_CLOSED,
  };
};

/** Updates the challenge progress for one camera frame. Pure. */
export const stepLiveness = (
  state: LivenessState,
  faces: LivenessFace[],
  now: number,
  rng: () => number = Math.random,
): LivenessState => {
  if (state.phase === 'done' || state.phase === 'failed') return state;

  // Per-step time limit (not while just searching for a face).
  if (state.phase !== 'searching' && now - state.stepStartedAt > LIVENESS.STEP_TIMEOUT_MS) {
    const timeouts = state.timeouts + 1;
    if (timeouts >= LIVENESS.MAX_TIMEOUTS) return { ...state, phase: 'failed', timeouts, hint: 'timedOut' };
    // New random challenges, so a recording made for the old ones won't fit.
    return { ...restart(state, now, 'timedOut'), challenges: pickChallenges(rng), timeouts };
  }

  if (faces.length === 0) {
    if (state.phase !== 'searching' && now - state.lastFaceAt > LIVENESS.LOST_FACE_MS) {
      return restart(state, now, 'restarted');
    }
    return state.phase === 'searching' ? { ...state, hint: 'noFace' } : state;
  }
  if (faces.length > 1) {
    // Someone else in view could be the one doing the actions.
    return state.phase === 'searching'
      ? { ...state, hint: 'multipleFaces', lastFaceAt: now }
      : restart({ ...state, lastFaceAt: now }, now, 'multipleFaces');
  }

  const face = faces[0];
  let next: LivenessState = { ...state, lastFaceAt: now };

  if (
    next.phase !== 'searching' &&
    next.trackingId !== undefined &&
    face.trackingId !== undefined &&
    face.trackingId !== next.trackingId
  ) {
    return restart(next, now, 'restarted');
  }

  const fraction = face.frameWidth > 0 ? face.bounds.width / face.frameWidth : 1;
  if (fraction < LIVENESS.MIN_FACE_FRACTION) return { ...next, hint: 'tooFar' };

  if (next.phase === 'searching') {
    if (!isFrontal(face, 15)) return { ...next, hint: null };
    return {
      ...clearStep(next, now),
      phase: 'challenge',
      index: 0,
      trackingId: face.trackingId,
      hint: null,
    };
  }

  next = { ...next, hint: null };

  if (next.phase === 'center') {
    const e = eyes(face);
    const ready = isFrontal(face, LIVENESS.FRONTAL_DEG) && (e === null || e.open);
    if (!ready) return { ...next, holdSince: null };
    const holdSince = next.holdSince ?? now;
    return now - holdSince >= LIVENESS.HOLD_MS ? { ...next, phase: 'done' } : { ...next, holdSince };
  }

  // phase === 'challenge'
  const challenge = next.challenges[next.index];
  let completed = false;
  if (challenge === 'blink') {
    const e = eyes(face);
    if (e) {
      if (!next.sawOpen && e.open) next.sawOpen = true;
      else if (next.sawOpen && !next.sawClosed && e.closed) next.sawClosed = true;
      else if (next.sawClosed && e.open) completed = true;
    }
  } else if (challenge === 'turn') {
    const yaw = Math.abs(Number(face.yawAngle) || 0);
    if (!next.sawTurn && yaw >= LIVENESS.TURN_DEG) next.sawTurn = true;
    else if (next.sawTurn && yaw <= LIVENESS.FRONTAL_DEG) completed = true;
  } else if (challenge === 'smile') {
    const smile = face.smilingProbability;
    if (typeof smile === 'number') {
      if (!next.sawNeutral && smile <= LIVENESS.NEUTRAL) next.sawNeutral = true;
      else if (next.sawNeutral && smile >= LIVENESS.SMILE) completed = true;
    }
  }
  if (!completed) return next;

  const index = next.index + 1;
  return index >= next.challenges.length
    ? { ...clearStep(next, now), index, phase: 'center' }
    : { ...clearStep(next, now), index };
};

export const CHALLENGE_TEXT: Record<LivenessChallenge, string> = {
  blink: 'Blink slowly',
  turn: 'Turn your head to one side, then back',
  smile: 'Smile',
};

export const HINT_TEXT: Record<Exclude<LivenessHint, null>, string> = {
  noFace: "We can't see your face. Hold the phone at eye level.",
  multipleFaces: 'Only you should be in view.',
  tooFar: 'Move a little closer.',
  restarted: 'Keep your face in the oval. Starting again.',
  timedOut: "Let's try that again.",
};
