import { useState, useEffect } from 'react';

export const useFormHydration = <T>(initialData: T, sourceData: T | undefined) => {
  const [data, setData] = useState<T>(initialData);
  
  useEffect(() => {
    if (sourceData) {
      setData(sourceData);
    }
  }, [sourceData]);
  
  return [data, setData] as const;
};