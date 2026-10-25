import RNCalendarEvents from 'react-native-calendar-events';
import { Lecture } from '../types/firebase';
import { resolveLectureTime } from './lectureTime';

export const addLectureToCalendar = async (
  lecture: Lecture,
): Promise<'added' | 'exists'> => {
  let permission = await RNCalendarEvents.checkPermissions();
  if (permission !== 'authorized') {
    permission = await RNCalendarEvents.requestPermissions();
  }
  if (permission !== 'authorized') {
    throw new Error('Calendar access is needed to add this lecture.');
  }

  const start = resolveLectureTime(lecture, 'start');
  const end = resolveLectureTime(lecture, 'end');
  if (!start || !end || end <= start) {
    throw new Error(
      'This lecture has an invalid schedule and cannot be added.',
    );
  }

  const searchStart = new Date(start.getTime() - 60 * 60 * 1000);
  const searchEnd = new Date(start.getTime() + 60 * 60 * 1000);
  const existingEvents = await RNCalendarEvents.fetchAllEvents(
    searchStart.toISOString(),
    searchEnd.toISOString(),
  );
  const marker = `iCampus lecture:${lecture.id}`;
  const alreadyAdded = existingEvents.some(
    event =>
      event.title === lecture.topicName &&
      new Date(event.startDate).getTime() === start.getTime() &&
      (event.notes === marker || event.description === marker),
  );
  if (alreadyAdded) return 'exists';

  await RNCalendarEvents.saveEvent(lecture.topicName, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    location:
      lecture.lectureType === 'Physical'
        ? lecture.location || undefined
        : 'Online class on iCampus',
    notes: marker,
    description: marker,
  });
  return 'added';
};
