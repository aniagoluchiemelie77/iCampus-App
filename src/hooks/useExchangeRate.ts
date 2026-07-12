import { useState, useEffect, useRef } from 'react';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';

export const useExchangeRate = (countryCode?: string) => {
  const [exchangeData, setExchangeData] = useState({ rate: 1, symbol: '$', code: 'USD' });
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (countryCode) {
      fetchLiveRate(countryCode).then((data) => {
        if (isMounted.current && data) setExchangeData(data);
      });
    }
  }, [countryCode]);

  return exchangeData;
};