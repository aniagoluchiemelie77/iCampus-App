import {
  createLivenessState,
  stepLiveness,
  pickChallenges,
  LIVENESS,
  LivenessFace,
  LivenessState,
} from '../src/utils/liveness';

const face = (over: Partial<LivenessFace> = {}): LivenessFace => ({
  yawAngle: 0,
  pitchAngle: 0,
  leftEyeOpenProbability: 0.95,
  rightEyeOpenProbability: 0.95,
  smilingProbability: 0.1,
  trackingId: 7,
  bounds: { width: 400 },
  frameWidth: 1000,
  ...over,
});
const OPEN = { leftEyeOpenProbability: 0.95, rightEyeOpenProbability: 0.95 };
const CLOSED = { leftEyeOpenProbability: 0.05, rightEyeOpenProbability: 0.08 };

/** Feeds frames 100ms apart and returns the final state. */
const run = (state: LivenessState, frames: Partial<LivenessFace>[][], start = 0) =>
  frames.reduce(
    (s, faces, i) => stepLiveness(s, faces.map(f => face(f)), start + (i + 1) * 100),
    state,
  );

const withChallenges = (challenges: LivenessState['challenges']) => ({
  ...createLivenessState(0),
  challenges,
});

describe('pickChallenges', () => {
  it('always includes a blink plus one other challenge', () => {
    for (const seed of [0, 0.3, 0.6, 0.99]) {
      const picked = pickChallenges(() => seed);
      expect(picked).toHaveLength(2);
      expect(picked).toContain('blink');
      expect(['turn', 'smile']).toContain(picked.find(c => c !== 'blink'));
    }
  });
});

describe('stepLiveness', () => {
  it('passes a real face that blinks, turns and then looks at the camera', () => {
    let s = withChallenges(['blink', 'turn']);
    s = run(s, [
      [OPEN], // locks onto the face
      [OPEN], // blink: eyes open
      [CLOSED], // closed
      [OPEN], // open again -> blink done
      [{ yawAngle: 30 }], // turn
      [{ yawAngle: 2 }], // back -> turn done
      [{}], // center: start holding
    ]);
    expect(s.phase).toBe('center');
    s = stepLiveness(s, [face()], 700 + LIVENESS.HOLD_MS + 50);
    expect(s.phase).toBe('done');
  });

  it('never passes a still photo (eyes always open, head never moves)', () => {
    let s = withChallenges(['blink', 'smile']);
    const frames = Array.from({ length: 80 }, () => [{}]);
    s = run(s, frames);
    expect(s.phase).not.toBe('done');
    expect(s.phase).not.toBe('center');
  });

  it('times out a stalled step, re-picks challenges, and fails after repeated timeouts', () => {
    let s = withChallenges(['blink', 'turn']);
    s = stepLiveness(s, [face()], 100); // challenge starts at t=100
    s = stepLiveness(s, [face()], 100 + LIVENESS.STEP_TIMEOUT_MS + 1);
    expect(s.phase).toBe('searching');
    expect(s.hint).toBe('timedOut');
    expect(s.timeouts).toBe(1);

    let t = 100 + LIVENESS.STEP_TIMEOUT_MS + 1;
    for (let i = 0; i < LIVENESS.MAX_TIMEOUTS; i++) {
      t += 100;
      s = stepLiveness(s, [face()], t); // back into the challenge
      t += LIVENESS.STEP_TIMEOUT_MS + 1;
      s = stepLiveness(s, [face()], t); // stall
    }
    expect(s.phase).toBe('failed');
  });

  it('restarts when a different face takes over mid-challenge', () => {
    let s = withChallenges(['blink', 'turn']);
    s = run(s, [[OPEN], [OPEN], [CLOSED], [OPEN]]); // blink done, on 'turn'
    expect(s.index).toBe(1);
    s = stepLiveness(s, [face({ trackingId: 99 })], 600);
    expect(s.phase).toBe('searching');
    expect(s.index).toBe(0);
    expect(s.hint).toBe('restarted');
  });

  it('restarts when a second person appears during the challenges', () => {
    let s = withChallenges(['blink', 'turn']);
    s = run(s, [[OPEN], [OPEN]]);
    s = stepLiveness(s, [face(), face({ trackingId: 8 })], 300);
    expect(s.phase).toBe('searching');
    expect(s.hint).toBe('multipleFaces');
  });

  it('restarts only after the face has been missing for a while', () => {
    let s = withChallenges(['blink', 'turn']);
    s = run(s, [[OPEN], [OPEN]]); // in challenge, last face at t=200
    s = stepLiveness(s, [], 400); // brief dropout
    expect(s.phase).toBe('challenge');
    s = stepLiveness(s, [], 200 + LIVENESS.LOST_FACE_MS + 1);
    expect(s.phase).toBe('searching');
  });

  it('asks a small (far away) face to come closer without progressing', () => {
    const s = stepLiveness(withChallenges(['blink', 'turn']), [face({ bounds: { width: 100 } })], 100);
    expect(s.phase).toBe('searching');
    expect(s.hint).toBe('tooFar');
  });

  it('requires a neutral face before the smile counts', () => {
    let s = withChallenges(['smile', 'blink']);
    s = run(s, [[{ smilingProbability: 0.95 }], [{ smilingProbability: 0.95 }]]);
    expect(s.index).toBe(0); // a permanently smiling photo doesn't pass
    s = run(s, [[{ smilingProbability: 0.1 }], [{ smilingProbability: 0.9 }]], 200);
    expect(s.index).toBe(1);
  });
});
