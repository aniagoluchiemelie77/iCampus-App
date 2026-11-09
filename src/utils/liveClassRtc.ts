// Time helpers for live classes. (Live video runs on Agora; the old
// WebRTC mesh config that lived here was removed with react-native-webrtc.)

/** Accepts Firestore Timestamps (serialized or live), ISO strings and Dates. */
export const toMillis = (value: any): number | null => {
  if (!value) return null;
  if (typeof value === 'object' && '_seconds' in value) return value._seconds * 1000;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** "m:ss", or "h:mm:ss" past an hour. */
export const formatElapsed = (startMs: number) => {
  const total = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60).toString().padStart(h ? 2 : 1, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
};
