import axios from 'axios';
import CryptoJS from 'crypto-js';
import { EXCHANGERATE_API_KEY, VERVE_SEARCH_API_KEY } from '@env';

const API_KEY = EXCHANGERATE_API_KEY;
const EXCHANGERATE_API_BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

export const fetchLiveRate = async (country: string) => {
  const currencyMap: Record<string, { code: string; symbol: string }> = {
  // --- African Countries ---
  Nigeria: { code: 'NGN', symbol: '₦' },
  Ghana: { code: 'GHS', symbol: 'GH₵' },
  Kenya: { code: 'KES', symbol: 'KSh' },
  'South Africa': { code: 'ZAR', symbol: 'R' },
  Egypt: { code: 'EGP', symbol: 'E£' },
  Ethiopia: { code: 'ETB', symbol: 'Br' },
  Rwanda: { code: 'RWF', symbol: 'FRw' },
  Tanzania: { code: 'TZS', symbol: 'TSh' },
  Uganda: { code: 'UGX', symbol: 'USh' },
  Morocco: { code: 'MAD', symbol: 'DH' },

  // --- Popular Worldwide ---
  USA: { code: 'USD', symbol: '$' },
  'United Kingdom': { code: 'GBP', symbol: '£' },
  Canada: { code: 'CAD', symbol: 'CA$' },
  Australia: { code: 'AUD', symbol: 'A$' },
  Germany: { code: 'EUR', symbol: '€' }, // Eurozone
  France: { code: 'EUR', symbol: '€' },
  China: { code: 'CNY', symbol: '¥' },
  Japan: { code: 'JPY', symbol: '¥' },
  India: { code: 'INR', symbol: '₹' },
  'United Arab Emirates': { code: 'AED', symbol: 'د.إ' },
};

  const { code, symbol } = currencyMap[country] || currencyMap['Nigeria'];

  try {
    const response = await axios.get(EXCHANGERATE_API_BASE_URL);
    const rate = response.data.conversion_rates[code];
    
    return {
      rate: rate || 1550, 
      symbol,
      code
    };
  } catch (error) {
    console.error("Rate fetch failed", error);
    return { rate: 1550, symbol, code }; // Default fallback
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
