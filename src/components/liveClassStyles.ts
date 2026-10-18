import { StyleSheet } from 'react-native';
import { PRIMARY_COLOR } from '../assets/styles/colors';

export const LIVE_RED = '#E53935';
const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

// Shared by LecturerLiveClassSession and StudentLiveClassSession.
export const LiveClassSessionStyles = StyleSheet.create({
  mainContainer: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LIVE_RED,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  livePillWaiting: { backgroundColor: 'rgba(120,120,120,0.55)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  livePillText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  topChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(245,75,2,0.10)',
  },
  topChipText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  topBarAction: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LIVE_RED,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  topBarActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Video stage
  stage: {
    marginHorizontal: 16,
    height: 230,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0d0d0f',
    elevation: 6,
  },
  stageVideo: { ...FILL },
  stageOverlay: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  stageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  stageHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  stageChipsRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stageStopShare: {
    marginTop: 16,
    backgroundColor: LIVE_RED,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
  },
  stageStopShareText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Control dock
  controlDock: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 3,
  },

  // Cards
  scrollBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 18, padding: 16 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  topicText: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  subtleText: { fontSize: 13, opacity: 0.75 },
  linkText: { fontSize: 13, fontWeight: '800', color: PRIMARY_COLOR },

  attendeeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  attendeeCircle: { marginRight: -8, borderWidth: 2, borderColor: '#fff' },
  attendeeCount: {
    marginLeft: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(245,75,2,0.12)',
  },
  attendeeCountText: { fontSize: 12, fontWeight: '800', color: PRIMARY_COLOR },

  handRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  handName: { flex: 1, fontSize: 14, fontWeight: '700' },
  handAllowBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  handAllowText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  speakerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(245,75,2,0.10)',
  },
  speakerBannerText: { flex: 1, fontSize: 13, fontWeight: '700' },

  transcriptionText: { fontSize: 14, lineHeight: 21 },
});
