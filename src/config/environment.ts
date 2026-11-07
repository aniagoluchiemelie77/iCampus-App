/**
 * The one place the app reads `.env`.
 *
 * react-native-dotenv copies these values into the bundle at build time, so
 * after editing `.env` you must restart Metro with a clean cache
 * (`npx react-native start --reset-cache`) or the app keeps the old values.
 *
 * Every key is checked when this file loads. If any key is missing or blank,
 * the app stops with ONE error that lists them all, so you can fix them in a
 * single pass instead of finding them one crash at a time.
 */
import {
  APIKEY as RAW_APIKEY,
  APP_ID as RAW_APP_ID,
  AUTH_DOMAIN as RAW_AUTH_DOMAIN,
  BACKEND_URL as RAW_BACKEND_URL,
  CLOUDINARY_CLOUD_NAME as RAW_CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET as RAW_CLOUDINARY_UPLOAD_PRESET,
  EXCHANGERATE_API_KEY as RAW_EXCHANGERATE_API_KEY,
  FLUTTERWAVE_PUBLIC_KEY as RAW_FLUTTERWAVE_PUBLIC_KEY,
  GEMINI_API_KEY as RAW_GEMINI_API_KEY,
  GITHUB_CLIENT_ID as RAW_GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET as RAW_GITHUB_CLIENT_SECRET,
  ICAMPUS_APPLE_ID as RAW_ICAMPUS_APPLE_ID,
  INBOUND_SUPPORT_URL as RAW_INBOUND_SUPPORT_URL,
  MEASUREMENT_ID as RAW_MEASUREMENT_ID,
  MESSAGING_SENDER_ID as RAW_MESSAGING_SENDER_ID,
  PROJECT_ID as RAW_PROJECT_ID,
  SERVICE_UUID as RAW_SERVICE_UUID,
  STORAGE_BUCKET as RAW_STORAGE_BUCKET,
  VERVE_SEARCH_API_KEY as RAW_VERVE_SEARCH_API_KEY,
  WEB_CLIENT_ID as RAW_WEB_CLIENT_ID,
} from '@env';

const missing: string[] = [];

/** Trims the value and strips quotes that `.env` files sometimes carry. */
const read = (name: string, value: unknown): string => {
  const clean =
    typeof value === 'string'
      ? value.trim().replace(/^(['"])(.*)\1$/, '$2').trim()
      : '';
  if (!clean) missing.push(name);
  return clean;
};

// Backend
export const BACKEND_URL = read('BACKEND_URL', RAW_BACKEND_URL).replace(
  /\/+$/,
  '',
);

// Firebase (web SDK config)
export const APIKEY = read('APIKEY', RAW_APIKEY);
export const AUTH_DOMAIN = read('AUTH_DOMAIN', RAW_AUTH_DOMAIN);
export const PROJECT_ID = read('PROJECT_ID', RAW_PROJECT_ID);
export const STORAGE_BUCKET = read('STORAGE_BUCKET', RAW_STORAGE_BUCKET);
export const MESSAGING_SENDER_ID = read(
  'MESSAGING_SENDER_ID',
  RAW_MESSAGING_SENDER_ID,
);
export const APP_ID = read('APP_ID', RAW_APP_ID);
export const MEASUREMENT_ID = read('MEASUREMENT_ID', RAW_MEASUREMENT_ID);

// Sign-in
export const WEB_CLIENT_ID = read('WEB_CLIENT_ID', RAW_WEB_CLIENT_ID);
export const GITHUB_CLIENT_ID = read('GITHUB_CLIENT_ID', RAW_GITHUB_CLIENT_ID);
export const GITHUB_CLIENT_SECRET = read(
  'GITHUB_CLIENT_SECRET',
  RAW_GITHUB_CLIENT_SECRET,
);

// Payments & money
export const FLUTTERWAVE_PUBLIC_KEY = read(
  'FLUTTERWAVE_PUBLIC_KEY',
  RAW_FLUTTERWAVE_PUBLIC_KEY,
);
export const EXCHANGERATE_API_KEY = read(
  'EXCHANGERATE_API_KEY',
  RAW_EXCHANGERATE_API_KEY,
);
export const VERVE_SEARCH_API_KEY = read(
  'VERVE_SEARCH_API_KEY',
  RAW_VERVE_SEARCH_API_KEY,
);

// Media, AI, attendance, store links
export const CLOUDINARY_CLOUD_NAME = read(
  'CLOUDINARY_CLOUD_NAME',
  RAW_CLOUDINARY_CLOUD_NAME,
);
export const CLOUDINARY_UPLOAD_PRESET = read(
  'CLOUDINARY_UPLOAD_PRESET',
  RAW_CLOUDINARY_UPLOAD_PRESET,
);
export const GEMINI_API_KEY = read('GEMINI_API_KEY', RAW_GEMINI_API_KEY);
export const SERVICE_UUID = read('SERVICE_UUID', RAW_SERVICE_UUID);
export const ICAMPUS_APPLE_ID = read('ICAMPUS_APPLE_ID', RAW_ICAMPUS_APPLE_ID);
export const INBOUND_SUPPORT_URL = read(
  'INBOUND_SUPPORT_URL',
  RAW_INBOUND_SUPPORT_URL,
);

if (missing.length > 0) {
  throw new Error(
    `Missing or empty environment variable(s): ${missing.join(', ')}. ` +
      'Add them to .env, then restart Metro with --reset-cache.',
  );
}
