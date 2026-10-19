import { useState, useEffect } from 'react';
import { fetchLiveRate, currencyMap } from '../utils/UserTransactionsHelpers';

/**
 * USD -> the country's currency. Until the live rate arrives (or if it can't
 * be loaded) `ready` is false and prices should not be shown as final.
 */
export const useExchangeRate = (country?: string) => {
  const local = currencyMap[country || ''] || currencyMap.Nigeria;
  const [exchangeData, setExchangeData] = useState({ rate: 1, symbol: local.symbol, code: local.code });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(local.code === 'USD');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLiveRate(country || 'Nigeria').then(data => {
      if (!active) return;
      setExchangeData({ rate: data.rate, symbol: data.symbol, code: data.code });
      setReady(data.ok);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [country]);

  return { exchangeData, loading, ready };
};
