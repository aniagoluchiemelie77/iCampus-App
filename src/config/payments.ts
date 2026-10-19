import { FLUTTERWAVE_PUBLIC_KEY } from '@env';

/**
 * Flutterwave public key (FLWPUBK-...). Safe to ship in the app; the secret
 * key and webhook hash live only in the backend's .env.
 * Empty until the key is added, in which case payments show "not set up".
 */
export const getFlutterwavePublicKey = (): string =>
  (FLUTTERWAVE_PUBLIC_KEY || '').trim();
