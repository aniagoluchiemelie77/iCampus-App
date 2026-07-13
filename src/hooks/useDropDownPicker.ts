import { useState } from 'react';

export const usePicker = (initialValue: string = 'Full-time') => {
  const [value, setValue] = useState(initialValue);
  const [isVisible, setIsVisible] = useState(false);

  const togglePicker = () => setIsVisible(!isVisible);
  
  const selectType = (type: string) => {
    setValue(type);
    setIsVisible(false);
  };

  return { value, isVisible, togglePicker, selectType };
};