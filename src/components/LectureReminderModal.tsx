import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useAppSelector } from '../hooks/hooks';
import { dayLabel, formatClock } from '../utils/lectureTime';
import { LectureReminderInfo } from '../utils/notificationNavigation';
import { openLecturerAttendance } from '../utils/lectureAttendance';
import moment from 'moment';

type Phase = 'upcoming' | 'live' | 'ended';

const phaseAt = (info: LectureReminderInfo, now: number): Phase => {
  if (info.start && now < info.start.getTime()) return 'upcoming';
  if (info.end && now > info.end.getTime()) return 'ended';
  return 'live';
};

/** "2h 5m", "12m 30s", "45s". */
const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
};

/**
 * Lecture reminder opened from a notification. An online class shows a live
 * countdown and only enables "Join" once the start time arrives.
 */
export const LectureReminderModal = ({
  info,
  navigation,
  onClose,
}: {
  info: LectureReminderInfo | null;
  navigation: any;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const usertype = useAppSelector(state => state.user?.usertype);
  const [now, setNow] = useState(Date.now());
  const pulse = useRef(new Animated.Value(0)).current;
  const visible = !!info;

  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    pulse.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [pulse, visible]);

  if (!info) return null;

  const isOnline = info.lectureType === 'Online';
  const phase = phaseAt(info, now);
  const accent =
    phase === 'live' ? colors.success : phase === 'ended' ? colors.text : colors.primary;
  const day = info.start ? dayLabel(moment(info.start).format('YYYY-MM-DD')) : null;
  const timeRange = info.start
    ? `${formatClock(info.start)}${info.end ? ` – ${formatClock(info.end)}` : ''}`
    : 'Time not set';

  const status =
    phase === 'upcoming'
      ? {
          icon: 'hourglass-top',
          title: `Starts in ${formatCountdown(info.start!.getTime() - now)}`,
          hint: isOnline
            ? "Please wait. The Join button opens once the class starts."
            : 'Please get to the venue before the class begins.',
        }
      : phase === 'live'
        ? {
            icon: 'sensors',
            title: 'Class is in session',
            hint: isOnline ? 'You can join the class now.' : 'The class is happening now.',
          }
        : {
            icon: 'event-busy',
            title: 'This class has ended',
            hint: 'Check the lecture schedule for the next one.',
          };

  const go = (fn: () => void) => {
    onClose();
    fn();
  };
  const openSchedule = () =>
    go(() =>
      navigation.navigate('CourseSubPage', {
        title: 'View Lecture Schedule',
        userRole: usertype,
      }),
    );

  // Primary action for this lecture, its phase, and who is looking.
  let primary: { label: string; icon: string; onPress: () => void; disabled?: boolean } | null;
  if (phase === 'ended') {
    primary = { label: 'View schedule', icon: 'calendar-month', onPress: openSchedule };
  } else if (isOnline) {
    primary = {
      label:
        phase === 'upcoming'
          ? `Join at ${formatClock(info.start)}`
          : info.isLecturer
            ? 'Start class'
            : 'Join class',
      icon: phase === 'upcoming' ? 'lock-clock' : 'videocam',
      disabled: phase === 'upcoming',
      onPress: () =>
        go(() =>
          navigation.navigate('LiveClassSessions', {
            lectureId: info.lectureId,
            courseId: info.courseId,
          }),
        ),
    };
  } else if (info.isLecturer) {
    primary = {
      label: 'Start attendance',
      icon: 'how-to-reg',
      onPress: () => go(() => void openLecturerAttendance(navigation, info.lecture)),
    };
  } else {
    primary = null;
  }

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          ]}
          accessibilityViewIsModal
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            {phase !== 'ended' && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    borderColor: accent,
                    opacity: ringOpacity,
                    transform: [{ scale: ringScale }],
                  },
                ]}
              />
            )}
            <View style={[styles.iconCircle, { backgroundColor: accent + '1F' }]}>
              <MaterialIcons
                name={isOnline ? 'videocam' : 'school'}
                size={30}
                color={accent}
              />
            </View>
          </View>

          <Text style={[styles.kicker, { color: colors.primary }]}>
            {isOnline ? 'ONLINE LECTURE' : 'PHYSICAL LECTURE'}
            {info.courseCode ? ` · ${info.courseCode}` : ''}
          </Text>
          <Text style={[styles.title, { color: colors.textDarker }]} numberOfLines={3}>
            {info.topicName}
          </Text>

          <View style={[styles.details, { borderColor: colors.border }]}>
            <View style={styles.detailRow}>
              <MaterialIcons name="event" size={18} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {day ? [day.title, day.subtitle].filter(Boolean).join(', ') : 'Date not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={18} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.text }]}>{timeRange}</Text>
            </View>
            {!isOnline && !!info.location && (
              <View style={styles.detailRow}>
                <MaterialIcons name="place" size={18} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={2}>
                  {info.location}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.status, { backgroundColor: accent + '14' }]}>
            <MaterialIcons name={status.icon} size={22} color={accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: colors.textDarker }]}>
                {status.title}
              </Text>
              <Text style={[styles.statusHint, { color: colors.text }]}>{status.hint}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>
                {primary ? 'Later' : 'Got it'}
              </Text>
            </TouchableOpacity>
            {primary && (
              <TouchableOpacity
                onPress={primary.onPress}
                disabled={primary.disabled}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.btnColor },
                  primary.disabled && styles.primaryDisabled,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!primary.disabled }}
              >
                <MaterialIcons name={primary.icon} size={18} color={colors.btnTextColor} />
                <Text
                  style={[styles.primaryText, { color: colors.btnTextColor }]}
                  numberOfLines={1}
                >
                  {primary.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 6, zIndex: 2 },
  iconWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, marginTop: 14 },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 25,
  },
  details: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 14.5, fontWeight: '600', flex: 1 },
  status: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
  },
  statusTitle: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statusHint: { fontSize: 13, marginTop: 2, lineHeight: 18, opacity: 0.85 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  secondaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flex: 1.6,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
});
