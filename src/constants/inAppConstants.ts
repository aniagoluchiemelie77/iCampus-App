import { PRO_BADGE_COLOR, PREMIUM_BADGE_COLOR, ENTERPRISE_BADGE_COLOR } from 'assets/styles/colors';
export const USD_SUBSCRIPTION_PRICES = {
  Pro: 1.11,
  Premium: 3.69,
  Free: 0,
} as const;

export const EXCEPTION_COST_IN_ICASH = 0.5;
export const USD_EQUIVALENCE_OF_1_ICASH = 0.74;
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

export type SubscriptionTier = keyof typeof USD_SUBSCRIPTION_PRICES;