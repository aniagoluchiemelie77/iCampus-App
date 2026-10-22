import moment from 'moment';
import { safeParseDate } from './dateFormatter';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Local "YYYY-MM-DD" a lecture is scheduled on. */
export const lectureDayKey = (lecture: any): string => {
  const raw = lecture?.date;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = safeParseDate(raw);
  return d ? d.toISOString().slice(0, 10) : 'Undated';
};

/**
 * Mirrors the server's resolveLectureTime. startTime/endTime have been stored
 * as ISO instants (repeat weeks kept week 1's instant), as bare "HH:mm"
 * (older edits), and now also as startAt/endAt.
 */
export const resolveLectureTime = (lecture: any, which: 'start' | 'end'): Date | null => {
  const explicit = safeParseDate(which === 'start' ? lecture?.startAt : lecture?.endAt);
  if (explicit) return explicit;

  const raw = which === 'start' ? lecture?.startTime : lecture?.endTime;
  const dayKey = lectureDayKey(lecture);
  const hasDay = dayKey !== 'Undated';

  if (typeof raw === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(raw.trim())) {
    if (!hasDay) return null;
    const m = moment(`${dayKey} ${raw.trim()}`, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss']);
    return m.isValid() ? m.toDate() : null;
  }

  const instant = safeParseDate(raw);
  if (!instant || !hasDay) return instant;
  const [y, mo, d] = dayKey.split('-').map(Number);
  const weeks = Math.round((Date.UTC(y, mo - 1, d) - instant.getTime()) / WEEK_MS);
  return new Date(instant.getTime() + weeks * WEEK_MS);
};

export const formatClock = (date: Date | null) => (date ? moment(date).format('h:mm A') : '--:--');

/** "1h 30m", "45m", "2h". */
export const formatDuration = (start: Date | null, end: Date | null) => {
  if (!start || !end || end <= start) return '';
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

/** Section title: "Today", "Tomorrow", "Yesterday" or "Mon, Oct 19". */
export const dayLabel = (dayKey: string) => {
  if (dayKey === 'Undated') return { title: 'Undated', subtitle: '' };
  const day = moment(dayKey, 'YYYY-MM-DD');
  const diff = day.clone().startOf('day').diff(moment().startOf('day'), 'days');
  const named = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : null;
  const full = day.format(day.isSame(moment(), 'year') ? 'ddd, MMM D' : 'ddd, MMM D, YYYY');
  return named ? { title: named, subtitle: full } : { title: full, subtitle: '' };
};

export const todayKey = () => moment().format('YYYY-MM-DD');
