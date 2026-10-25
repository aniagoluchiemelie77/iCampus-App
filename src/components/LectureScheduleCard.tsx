import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { Lecture } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import {
  dayLabel,
  formatClock,
  formatDuration,
  resolveLectureTime,
} from '../utils/lectureTime';

export const LectureDayHeader = ({
  dayKey,
  count,
}: {
  dayKey: string;
  count: number;
}) => {
  const { colors } = useTheme();
  const { title, subtitle } = dayLabel(dayKey);
  const isToday = title === 'Today';
  return (
    <View style={ui.dayHeader}>
      <View
        style={[
          ui.dayDot,
          { backgroundColor: isToday ? colors.primary : colors.border },
        ]}
      />
      <Text
        style={[
          ui.dayTitle,
          { color: isToday ? colors.primary : colors.textDarker },
        ]}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text style={[ui.daySubtitle, { color: colors.text }]}>{subtitle}</Text>
      )}
      <View style={[ui.dayLine, { backgroundColor: colors.border + '88' }]} />
      <Text style={[ui.dayCount, { color: colors.text }]}>
        {count} {count === 1 ? 'lecture' : 'lectures'}
      </Text>
    </View>
  );
};

interface LectureScheduleCardProps {
  lecture: Lecture;
  onPress?: () => void;
  /** Lecturer-only actions. */
  onEdit?: () => void;
  onDelete?: () => void;
  calendarAction?: () => void;
  /** Main call to action, e.g. "Start live class" or "Take attendance". */
  primaryAction?: {
    label: string;
    icon: string;
    onPress: () => void;
    highlight?: boolean;
  };
  secondaryAction?: { label: string; icon: string; onPress: () => void };
}

export const LectureScheduleCard = ({
  lecture,
  onPress,
  onEdit,
  onDelete,
  calendarAction,
  primaryAction,
  secondaryAction,
}: LectureScheduleCardProps) => {
  const { colors } = useTheme();
  const start = resolveLectureTime(lecture, 'start');
  const end = resolveLectureTime(lecture, 'end');
  const now = Date.now();
  const isOnline = lecture.lectureType !== 'Physical';
  const typeColor = isOnline ? colors.primary : colors.success;

  const status = (() => {
    if ((lecture as any).attendanceOpen && lecture.status !== 'completed') {
      return { label: 'Attendance open', color: colors.success, live: true };
    }
    switch (lecture.status) {
      case 'ongoing':
        return { label: 'Live now', color: colors.primary, live: true };
      case 'completed':
        return { label: 'Completed', color: colors.success };
      case 'cancelled':
        return { label: 'Cancelled', color: colors.text };
      default:
        break;
    }
    if (end && end.getTime() < now)
      return { label: 'Ended', color: colors.text };
    if (start && start.getTime() <= now && (!end || end.getTime() >= now)) {
      return { label: 'Starting', color: colors.primary };
    }
    if (start && start.getTime() - now < 24 * 60 * 60 * 1000) {
      return {
        label: `Starts ${moment(start).fromNow()}`,
        color:
          lecture.status === 'postponed'
            ? colors.pendingDelivery
            : colors.primary,
      };
    }
    if (lecture.status === 'postponed')
      return { label: 'Rescheduled', color: colors.pendingDelivery };
    return null;
  })();

  const isPast =
    lecture.status === 'completed' ||
    lecture.status === 'cancelled' ||
    (!!end && end.getTime() < now && lecture.status !== 'ongoing');
  const hasActions = !!(
    onEdit ||
    onDelete ||
    calendarAction ||
    primaryAction ||
    secondaryAction
  );
  const duration = formatDuration(start, end);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? { color: colors.primary + '14' } : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${lecture.topicName}, ${lecture.lectureType}, ${formatClock(start)}${status ? `, ${status.label}` : ''}`}
      style={({ pressed }) => [
        ui.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor:
            lecture.status === 'ongoing' ? colors.primary : colors.border,
        },
        lecture.status === 'ongoing' && ui.cardLive,
        isPast && ui.cardPast,
        pressed && onPress && { opacity: 0.85 },
      ]}
    >
      {/* Time */}
      <View style={ui.timeCol}>
        <Text style={[ui.startClock, { color: colors.textDarker }]}>
          {formatClock(start)}
        </Text>
        {!!end && (
          <Text style={[ui.endClock, { color: colors.text }]}>
            {formatClock(end)}
          </Text>
        )}
        {!!duration && (
          <View
            style={[ui.durationPill, { backgroundColor: colors.background }]}
          >
            <Text style={[ui.durationText, { color: colors.text }]}>
              {duration}
            </Text>
          </View>
        )}
      </View>

      <View style={[ui.accent, { backgroundColor: typeColor }]} />

      {/* Details */}
      <View style={ui.body}>
        <Text
          style={[
            ui.topic,
            { color: colors.textDarker },
            lecture.status === 'cancelled' && ui.topicCancelled,
          ]}
          numberOfLines={2}
        >
          {lecture.topicName}
        </Text>

        <View style={ui.chipsRow}>
          <View style={[ui.chip, { backgroundColor: typeColor + '1A' }]}>
            <MaterialIcons
              name={isOnline ? 'videocam' : 'meeting-room'}
              size={12}
              color={typeColor}
            />
            <Text style={[ui.chipText, { color: typeColor }]}>
              {isOnline ? 'Online' : 'Physical'}
            </Text>
          </View>
          {!!status && (
            <View style={[ui.chip, { backgroundColor: status.color + '1A' }]}>
              {status.live && (
                <View style={[ui.liveDot, { backgroundColor: status.color }]} />
              )}
              <Text style={[ui.chipText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          )}
        </View>

        <View style={ui.metaRow}>
          <MaterialIcons
            name={isOnline ? 'language' : 'place'}
            size={14}
            color={colors.text}
          />
          <Text style={[ui.metaText, { color: colors.text }]} numberOfLines={2}>
            {isOnline
              ? 'iCampus live class'
              : lecture.location || 'Venue to be announced'}
          </Text>
        </View>

        {hasActions && (
          <View style={[ui.actions, { borderTopColor: colors.border + '66' }]}>
            {primaryAction && (
              <TouchableOpacity
                onPress={primaryAction.onPress}
                style={[
                  ui.primaryAction,
                  { backgroundColor: colors.btnColor },
                  primaryAction.highlight && ui.primaryActionHighlight,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${primaryAction.label}, ${lecture.topicName}`}
              >
                <MaterialIcons
                  name={primaryAction.icon}
                  size={16}
                  color={colors.btnTextColor}
                />
                <Text
                  style={[ui.primaryActionText, { color: colors.btnTextColor }]}
                >
                  {primaryAction.label}
                </Text>
              </TouchableOpacity>
            )}
            {secondaryAction && (
              <TouchableOpacity
                onPress={secondaryAction.onPress}
                style={[
                  ui.secondaryAction,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${secondaryAction.label}, ${lecture.topicName}`}
              >
                <MaterialIcons
                  name={secondaryAction.icon}
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[ui.secondaryActionText, { color: colors.primary }]}
                >
                  {secondaryAction.label}
                </Text>
              </TouchableOpacity>
            )}
            <View style={ui.actionsSpacer} />
            {calendarAction && (
              <TouchableOpacity
                onPress={calendarAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[ui.iconAction, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={`Add ${lecture.topicName} to calendar`}
              >
                <MaterialIcons
                  name="event-available"
                  size={17}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[ui.iconAction, { backgroundColor: colors.background }]}
                accessibilityLabel="Edit lecture"
              >
                <MaterialIcons name="edit" size={17} color={colors.text} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  ui.iconAction,
                  { backgroundColor: colors.primary + '14' },
                ]}
                accessibilityLabel="Delete lecture"
              >
                <MaterialIcons
                  name="delete-outline"
                  size={17}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const ui = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayTitle: { fontSize: 15, fontWeight: '800' },
  daySubtitle: { fontSize: 12.5, opacity: 0.7 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, marginHorizontal: 4 },
  dayCount: { fontSize: 11.5, fontWeight: '600', opacity: 0.7 },
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardLive: { borderWidth: 1.5 },
  cardPast: { opacity: 0.6 },
  timeCol: { width: 66, alignItems: 'flex-start' },
  startClock: { fontSize: 14.5, fontWeight: '800' },
  endClock: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  durationPill: {
    marginTop: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationText: { fontSize: 10.5, fontWeight: '700' },
  accent: { width: 3, borderRadius: 2, marginHorizontal: 10 },
  body: { flex: 1 },
  topic: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  topicCancelled: { textDecorationLine: 'line-through' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chipText: { fontSize: 11, fontWeight: '800' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 8,
  },
  metaText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionsSpacer: { flex: 1 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  primaryActionText: { fontSize: 12.5, fontWeight: '800' },
  primaryActionHighlight: { paddingVertical: 9, paddingHorizontal: 14 },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  secondaryActionText: { fontSize: 12, fontWeight: '700' },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
