import { PRO_BADGE_COLOR, PREMIUM_BADGE_COLOR, ENTERPRISE_BADGE_COLOR } from '../assets/styles/colors';
import { Product } from '../types/firebase';

type ItemCategory = Product['type'];

export const USD_SUBSCRIPTION_PRICES = {
  Pro: 1.11,
  Premium: 3.69,
  Free: 0,
} as const;
export const TRANSACTION_TAX_RATE = 0.15 as const;
export const WATERMARK_TEXT = 'iCampus' as const;
export const DELIVERY_FEES = {
  free: {
    home_delivery: 0.08, 
    drop_off: 0.05,      
  },
  pro: {
    home_delivery: 0.06, 
    drop_off: 0.04,      
  },
  premium: {
    home_delivery: 0.03, 
    drop_off: 0.02,      
  },
} as const;
export const TIER_COLORS: Record<string, string> = {
  pro: PRO_BADGE_COLOR,     
  premium: PREMIUM_BADGE_COLOR, 
  enterprise: ENTERPRISE_BADGE_COLOR 
} as const;
export const CATEGORY_MAX_PRICES: Record<ItemCategory, number> = {
  physical: 1000000,
} as const;

export type SubscriptionTier = keyof typeof USD_SUBSCRIPTION_PRICES;