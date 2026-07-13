import { useState } from 'react';

type PickerMode = 'date' | 'startTime' | 'endTime';

export const useDateTimePicker = () => {
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatTime = (date: Date) => date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const showPicker = (mode: PickerMode) => setPickerMode(mode);
  const hidePicker = () => setPickerMode(null);

  return {
    pickerMode,
    showPicker,
    hidePicker,
    formatDate,
    formatTime,
  };
};