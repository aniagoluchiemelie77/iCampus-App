export const safeParseDate = (input: any): Date | null => {
  try {
    if (input == null || input === '') return null;
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    if (typeof input?.toDate === 'function') {
      const d = input.toDate();
      return d && !isNaN(d.getTime()) ? d : null;
    }
    if (
      typeof input === 'object' &&
      (input.seconds != null || input._seconds != null)
    ) {
      const seconds = Number(input.seconds ?? input._seconds);
      if (isNaN(seconds)) return null;
      return new Date(seconds * 1000);
    }
    if (typeof input === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(input.trim())) {
      // bare time string like "14:30" — not a full date, caller should combine with date
      return null;
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};
export const formatEventDate = (dateString: string | undefined) => {
  if (!dateString) return { month: '---', day: '--', time: '--:--' };

  const date = safeParseDate(dateString);
  if (!date) {
    return { month: '---', day: '--', time: '--:--' };
  }

  return {
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }).format(date)
  };
};
export const formatDateWithSuffix = (dateString: string) => {
  const parsed = safeParseDate(dateString);
  if (!parsed) return '—';
  const date = parsed;
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
      ? 'rd'
      : 'th';

  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  return `${month} ${day}${suffix} ${year}`;
};
export const formatDate = (input: any) => {
  try {
    const date = safeParseDate(input);
    if (!date) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};
export const safeFormatDate = (input: any, fallback = '—'): string => {
  const d = safeParseDate(input);
  if (!d) return fallback;
  return formatDate(d);
};
export const getDateKey = (input: any): string => {
  const d = safeParseDate(input);
  if (!d) {
    if (typeof input === 'string' && input.trim()) return input.trim().split('T')[0];
    return 'Undated';
  }
  try {
    return d.toISOString().split('T')[0];
  } catch {
    return 'Undated';
  }
};
export const safeToISOString = (input: any): string | null => {
  const d = safeParseDate(input);
  if (!d) return null;
  try {
    return d.toISOString();
  } catch {
    return null;
  }
};
export const formatPostDate = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = safeParseDate(timestamp);
  if (!date) return '';
  try {
    return date.toISOString();
  } catch {
    return '';
  }
};
export const parseFirestoreDate = (timestamp: any): Date => {
  try {
    if (timestamp == null || timestamp === '') return new Date();
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date() : timestamp;
    }
    if (typeof timestamp?.toDate === 'function') {
      const d = timestamp.toDate();
      return d && !isNaN(d.getTime()) ? d : new Date();
    }
    const seconds = timestamp?.seconds ?? timestamp?._seconds;
    if (seconds != null && !isNaN(Number(seconds))) {
      return new Date(Number(seconds) * 1000);
    }
    if (typeof timestamp === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timestamp.trim())) {
      // bare "HH:mm" time — anchor to today so new Date() doesn't go Invalid
      const [h, m] = timestamp.trim().split(':').map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    }
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};