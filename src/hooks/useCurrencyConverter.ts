import { useState, useEffect } from 'react';
import { fetchLiveRate, currencyMap } from '../utils/UserTransactionsHelpers';

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