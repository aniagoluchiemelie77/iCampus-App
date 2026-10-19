import { useState, useEffect } from 'react';
import { fetchLiveRate, fetchRateByCurrency, currencyMap } from '../utils/UserTransactionsHelpers';

export const useConvertedPrice = (basePrice: number, sellerNationality: string, buyerNationality?: string) => {
  const [convertedValue, setConvertedValue] = useState<number>(basePrice);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const convert = async () => {
      const targetCountry = buyerNationality?.trim() || 'Nigeria';
      const sellerCountry = sellerNationality?.trim() || 'Nigeria';

      const sellerCurrencyInfo = currencyMap[sellerCountry] || currencyMap['Nigeria'];
      const buyerCurrencyInfo = currencyMap[targetCountry] || currencyMap['Nigeria'];
      if (sellerCurrencyInfo.code === buyerCurrencyInfo.code) {
        if (isMounted) {
          setConvertedValue(basePrice);
          setLoading(false);
        }
        return;
      }
      try {
        const sellerRateData = await fetchLiveRate(sellerCountry);
        const buyerRateData = await fetchLiveRate(targetCountry);

        const priceInUSD = basePrice / sellerRateData.rate;
        const converted = priceInUSD * buyerRateData.rate;

        if (isMounted) {
          setConvertedValue(Number(converted.toFixed(2)));
          setLoading(false);
        }
      } catch (err) {
        console.error('Conversion error:', err);
        if (isMounted) {
          setConvertedValue(basePrice); 
          setLoading(false);
        }
      }
    };

    convert();

    return () => {
      isMounted = false;
    };
  }, [basePrice, sellerNationality, buyerNationality]);

  return { convertedValue, loading };
};
export const useConvertedCurrency = (
  baseAmount: number,
  sourceCurrency: string, 
  viewerCountry?: string  
) => {
  const [convertedValue, setConvertedValue] = useState<number>(baseAmount);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const convert = async () => {
      const targetCountry = viewerCountry?.trim() || 'Nigeria';
      const buyerCurrencyInfo = currencyMap[targetCountry] || currencyMap['Nigeria'];
      const targetCurrencyCode = buyerCurrencyInfo.code.toUpperCase();
      const sourceCode = sourceCurrency?.toUpperCase() || 'NGN';

      if (sourceCode === targetCurrencyCode) {
        if (isMounted) {
          setConvertedValue(baseAmount);
          setLoading(false);
        }
        return;
      }

      try {
        // These are currency codes, not country names: fetchLiveRate('NGN')
        // fell back to Nigeria for both sides, so nothing was ever converted.
        const sourceRateData = await fetchRateByCurrency(sourceCode);
        const targetRateData = await fetchRateByCurrency(targetCurrencyCode);
        const amountInUSD = baseAmount / sourceRateData.rate;
        const converted = amountInUSD * targetRateData.rate;

        if (isMounted) {
          setConvertedValue(Number(converted.toFixed(2)));
          setLoading(false);
        }
      } catch (err) {
        console.error('Currency conversion error:', err);
        if (isMounted) {
          setConvertedValue(baseAmount); 
          setLoading(false);
        }
      }
    };

    convert();

    return () => {
      isMounted = false;
    };
  }, [baseAmount, sourceCurrency, viewerCountry]);

  return { convertedValue, loading };
};