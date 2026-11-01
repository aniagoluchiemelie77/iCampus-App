const calendarEvents = {
  checkPermissions: async () => 'denied',
  requestPermissions: async () => 'denied',
  fetchAllEvents: async () => [],
  saveEvent: async () => {
    throw new Error('Calendar integration is not available on web.');
  },
};

export default calendarEvents;
