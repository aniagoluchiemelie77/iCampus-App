import { PRO_BADGE_COLOR, PREMIUM_BADGE_COLOR, ENTERPRISE_BADGE_COLOR } from '../assets/styles/colors';
import {
  Product,
  AdminRole
} from '../types/firebase';

type ItemCategory = Product['type'];

export const USD_SUBSCRIPTION_PRICES = {
  Pro: 1.11,
  Premium: 3.69,
  Free: 0,
} as const;
export const EXCEPTION_COST_IN_ICASH = 0.5 as const;
export const USD_EQUIVALENCE_OF_1_ICASH = 0.74 as const;
export const TRANSACTION_TAX_RATE = 0.02 as const;
export const WITHDRAWAL_FEE_PERCENT = 0.01 as const;
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
export const EXCEPTION_ACCOUNT_LIMITS = {
  free: 1,
  pro: 2,
  premium: 3,
} as const;
export const TIER_COLORS: Record<string, string> = {
  pro: PRO_BADGE_COLOR,     
  premium: PREMIUM_BADGE_COLOR, 
  enterprise: ENTERPRISE_BADGE_COLOR 
} as const;
export const CATEGORY_MAX_PRICES: Record<ItemCategory, number> = {
  file: 100,
  course: 500,
  physical: 1000,
} as const;
export const ICASH_PIN_MAX_ATTEMPTS = 5 as const ;
export const ITAG_PRESET_COLORS = [
  '#672a0e',
  '#14335f',
  '#80800d',
  '#8a0c0c',
  '#7b0859',
  '#0b8049',
] as const;

export const CATEGORY_ACCESS: Record<string, readonly AdminRole[]> = {
  'Overview': ['super_admin', 'finance', 'support', 'moderator', 'analyst'],
  'Tickets': ['super_admin', 'support'],
  'Security Alerts': ['super_admin'],
  'Financial': ['super_admin', 'finance'],
  'User Operations': ['support', 'moderator'],
  'Admin Actions': ['super_admin'],
  'Subscriptions': ['super_admin'],
  'Store': ['super_admin', 'finance'],
  'Access Control': ['super_admin', 'finance', 'support', 'moderator', 'analyst']
} as const;

export const TAB_TO_CATEGORY = {
  'Security Alerts': 'security',
  'Financial Events': 'finance',
  'User Operations': 'social',
  'Admin Actions': 'profile',
  'Subscriptions': 'subscription',
  'Store': 'store',
} as const;

export type TabName = keyof typeof TAB_TO_CATEGORY;

export type SubscriptionTier = keyof typeof USD_SUBSCRIPTION_PRICES;
export type CategoryKey = keyof typeof CATEGORY_ACCESS;