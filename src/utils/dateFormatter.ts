export const formatEventDate = (dateString: string | undefined) => {
  if (!dateString) return { month: '---', day: '--', time: '--:--' };

  const date = new Date(dateString);

  // Check if date is valid to avoid "Invalid Date" showing in UI
  if (isNaN(date.getTime())) {
    return { month: 'ERR', day: '!!', time: '!!:!!' };
  }

  return {
    // "short" gives you "Jan", "Feb", etc.
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(),
    // "numeric" gives you the day number
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
    // Standard time format
    time: new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }).format(date)
  };
};