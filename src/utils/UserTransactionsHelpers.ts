import axios from 'axios';
import CryptoJS from 'crypto-js';
import { EXCHANGERATE_API_KEY, VERVE_SEARCH_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'EXCHANGE_RATE_CACHE';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const API_KEY = EXCHANGERATE_API_KEY;
const EXCHANGERATE_API_BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

export const fetchLiveRate = async (country: string) => {
  const currencyMap: Record<string, { code: string; symbol: string }> = {
    'Nigeria': { code: 'NGN', symbol: '₦' },
    'Ghana': { code: 'GHS', symbol: 'GH₵' },
    'USA': { code: 'USD', symbol: '$' },
    'Brazil': { code: 'BRL', symbol: 'R$' },
    'Mexico': { code: 'MXN', symbol: '$' },
    'Argentina': { code: 'ARS', symbol: '$' },
    'Russia': { code: 'RUB', symbol: '₽' },
    'South Korea': { code: 'KRW', symbol: '₩' },
    'Indonesia': { code: 'IDR', symbol: 'Rp' },
    'Turkey': { code: 'TRY', symbol: '₺' },
    'Saudi Arabia': { code: 'SAR', symbol: '﷼' },
    'Switzerland': { code: 'CHF', symbol: 'CHF' },
    'Sweden': { code: 'SEK', symbol: 'kr' },
    'Norway': { code: 'NOK', symbol: 'kr' },
    'Poland': { code: 'PLN', symbol: 'zł' },
    'Singapore': { code: 'SGD', symbol: 'S$' },
    'Malaysia': { code: 'MYR', symbol: 'RM' },
    'Thailand': { code: 'THB', symbol: '฿' },
    'Philippines': { code: 'PHP', symbol: '₱' },
    'New Zealand': { code: 'NZD', symbol: 'NZ$' },
    'Pakistan': { code: 'PKR', symbol: '₨' },
    'Bangladesh': { code: 'BDT', symbol: '৳' },
    'Vietnam': { code: 'VND', symbol: '₫' },
    'Netherlands': { code: 'EUR', symbol: '€' },
    'Spain': { code: 'EUR', symbol: '€' },
    'Italy': { code: 'EUR', symbol: '€' },
  };

  const { code, symbol } = currencyMap[country] || currencyMap['USA'];

  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { rates, timestamp } = JSON.parse(cachedData);
      const isExpired = Date.now() - timestamp > CACHE_DURATION;

      if (!isExpired && rates[code]) {
        return { rate: rates[code], symbol, code };
      }
    }
    const response = await axios.get(EXCHANGERATE_API_BASE_URL);
    const allRates = response.data.conversion_rates;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      rates: allRates,
      timestamp: Date.now()
    }));

    return { rate: allRates[code] || 1, symbol, code };
  } catch (error) {
    console.error("Rate fetch failed", error);
    return { rate: 1, symbol, code }; 
  }
};
export const encryptCardDetails = (key: string, text: string): string => {
  const cipher = CryptoJS.TripleDES.encrypt(
    text,
    CryptoJS.enc.Utf8.parse(key),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  return cipher.toString();
};
export const formatCardNumber = (input: string): string => {
  const cleaned = input.replace(/\D/g, '');
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};
export const fetchCardInfo = async (bin: string) => {
    try {
      let cardData = null;
      // Try BinList first
      const binlistResponse = await fetch(`https://lookup.binlist.net/${bin}`);
      if (binlistResponse.ok) {
        cardData = await binlistResponse.json();
        console.log('BinList:', cardData);
        return cardData;
      }

      // Fallback to APIVerve
      const apiverveResponse = await fetch(
        `https://api.apiverve.com/v1/binlookup?bin=${bin}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': VERVE_SEARCH_API_KEY, // Replace with your actual key
          },
        },
      );

      if (apiverveResponse.ok) {
        cardData = await apiverveResponse.json();
        console.log('APIVerve:', cardData);
        return cardData;
      }
      return null;
    } catch (err) {
      console.error('BIN lookup error:', err);
      return null;
    }
  };
export const validateExpiryMonth = (month: string): string | null => {
  const num = Number(month);
  return /^\d{2}$/.test(month) && num >= 1 && num <= 12
    ? null
    : 'Enter a valid month (01–12)';
};
export const validateExpiryYear = (year: string): string | null => {
  const currentYear = new Date().getFullYear() % 100; 
  const num = Number(year);
  return /^\d{2}$/.test(year) && num >= currentYear
    ? null
    : `Enter a valid year (≥ ${currentYear})`;
};

export const formatDatePretty = (dateString: string): string => {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' }); // e.g., "Nov"
  const year = date.getFullYear();

  const getOrdinal = (n: number): string => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  return `${day}${getOrdinal(day)} ${month} ${year}`;
};
export const validateCVV = (cvv: string): string | null => {
  return /^\d{3,4}$/.test(cvv) ? null : 'Enter a valid CVV (3–4 digits)';
};
export const getBin = (cardNumber: string): string => {
  return cardNumber.replace(/\D/g, '').slice(0, 6);
};
export const getP2PPrivileges = (plan: 'free' | 'pro' | 'premium') => {
  return {
    canSend: true, // Everyone can send
    canReceive: plan !== 'free',
    hasQRScanner: true, // Everyone gets the scanner
    hasQRGenerator: plan === 'pro' || plan === 'premium',
    hasITags: plan === 'pro' || plan === 'premium',
    hasNFC: plan === 'premium',
  };
};

