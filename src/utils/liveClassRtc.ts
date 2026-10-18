// Shared WebRTC settings for live classes.
//
// Topology: the lecturer holds one RTCPeerConnection per student (mesh), and
// the Socket.IO server only relays offers/answers/ICE candidates between them.
// That keeps infrastructure free but caps a class at roughly 10-15 viewers,
// because the lecturer uploads one copy of the stream per viewer.
//
// STUN alone fails on symmetric NAT (common on mobile carriers). Add a TURN
// server here (e.g. coturn or a hosted TURN service) before relying on this
// outside a single Wi-Fi network:
//   { urls: 'turn:turn.example.com:3478', username: '...', credential: '...' }
export const LIVE_CLASS_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const createLiveClassPeerConnectionConfig = () => ({
  iceServers: LIVE_CLASS_ICE_SERVERS,
});

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
