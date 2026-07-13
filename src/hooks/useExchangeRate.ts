import { useState, useEffect, useRef } from 'react';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';

export const useExchangeRate = (countryCode?: string) => {
  const [exchangeData, setExchangeData] = useState({ rate: 1, symbol: '$', code: 'USD' });
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (countryCode) {
      setLoading(true);
      fetchLiveRate(countryCode).then((data) => {
        if (isMounted.current && data) setExchangeData(data);
      });
      setLoading(false);
    }
  }, [countryCode]);

  return { exchangeData, loading };
};