/**
 * Plan Limits Configuration
 * 
 * Centralized configuration for all plan-based limits.
 * This is the single source of truth for subscription gates.
 */

export type PlanId = "free" | "starter" | "pro" | "lifetime" | "basic" | "agency" | "agency_plus";

export interface PlanLimits {
  maxInfluencers: number;      // -1 = unlimited
  maxImagesPerMonth: number;   // -1 = unlimited
  maxVideosPerMonth: number;   // -1 = unlimited
  maxBrands: number;           // -1 = unlimited
  maxCustomDomains: number;    // -1 = unlimited
  maxTeamMembers: number;      // -1 = unlimited
  maxStorageGb: number;        // -1 = unlimited
  hasBrandBrain: boolean;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  hasWatermark: boolean;
}

/**
 * Plan limits configuration - single source of truth
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxInfluencers: 1,
    maxImagesPerMonth: 3,
    maxVideosPerMonth: 0,
    maxBrands: 1,
    maxCustomDomains: 0,
    maxTeamMembers: 1,
    maxStorageGb: 1,
    hasBrandBrain: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    hasWatermark: true,
  },
  starter: {
    maxInfluencers: 3,
    maxImagesPerMonth: 50,
    maxVideosPerMonth: 5,
    maxBrands: 1,
    maxCustomDomains: 1,
    maxTeamMembers: 1,
    maxStorageGb: 10,
    hasBrandBrain: true,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    hasWatermark: false,
  },
  pro: {
    maxInfluencers: 10,
    maxImagesPerMonth: 200,
    maxVideosPerMonth: 20,
    maxBrands: 3,
    maxCustomDomains: 3,
    maxTeamMembers: 3,
    maxStorageGb: 50,
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: false,
    hasWhiteLabel: false,
    hasWatermark: false,
  },
  lifetime: {
    maxInfluencers: -1,
    maxImagesPerMonth: -1,
    maxVideosPerMonth: 100,
    maxBrands: -1,
    maxCustomDomains: 10,
    maxTeamMembers: 5,
    maxStorageGb: 100,
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasWhiteLabel: true,
    hasWatermark: false,
  },
  basic: {
    maxInfluencers: 5,
    maxImagesPerMonth: 100,
    maxVideosPerMonth: 10,
    maxBrands: 3,
    maxCustomDomains: 3,
    maxTeamMembers: 1,
    maxStorageGb: 25,
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: false,
    hasWhiteLabel: false,
    hasWatermark: false,
  },
  agency: {
    maxInfluencers: -1,
    maxImagesPerMonth: 500,
    maxVideosPerMonth: 50,
    maxBrands: 20,
    maxCustomDomains: 20,
    maxTeamMembers: 5,
    maxStorageGb: 100,
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasWhiteLabel: true,
    hasWatermark: false,
  },
  agency_plus: {
    maxInfluencers: -1,      // unlimited
    maxImagesPerMonth: -1,   // unlimited
    maxVideosPerMonth: 200,
    maxBrands: -1,           // unlimited
    maxCustomDomains: -1,    // unlimited
    maxTeamMembers: -1,      // unlimited
    maxStorageGb: -1,        // unlimited
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasWhiteLabel: true,
    hasWatermark: false,
  },
};

/**
 * Get plan limits for a given plan
 */
export function getPlanLimits(plan: string): PlanLimits {
  const planId = plan as PlanId;
  return PLAN_LIMITS[planId] || PLAN_LIMITS.free;
}

/**
 * Check if a limit allows the action (handles -1 as unlimited)
 */
export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true; // unlimited
  return current < limit;
}

/**
 * Check if user can add a brand based on their plan
 */
export function canAddBrand(plan: string, currentBrandCount: number): boolean {
  const limits = getPlanLimits(plan);
  return isWithinLimit(currentBrandCount, limits.maxBrands);
}

/**
 * Check if user can create an influencer based on their plan
 */
export function canCreateInfluencer(plan: string, currentInfluencerCount: number): boolean {
  const limits = getPlanLimits(plan);
  return isWithinLimit(currentInfluencerCount, limits.maxInfluencers);
}

/**
 * Check if user can generate an image based on their plan and usage
 */
export function canGenerateImage(plan: string, currentMonthlyUsage: number): boolean {
  const limits = getPlanLimits(plan);
  return isWithinLimit(currentMonthlyUsage, limits.maxImagesPerMonth);
}

/**
 * Check if user can generate a video based on their plan and usage
 */
export function canGenerateVideo(plan: string, currentMonthlyUsage: number): boolean {
  const limits = getPlanLimits(plan);
  return isWithinLimit(currentMonthlyUsage, limits.maxVideosPerMonth);
}

/**
 * Check if user has access to a feature
 */
export function hasFeature(plan: string, feature: keyof Pick<PlanLimits, 'hasBrandBrain' | 'hasAnalytics' | 'hasApiAccess' | 'hasWhiteLabel'>): boolean {
  const limits = getPlanLimits(plan);
  return limits[feature];
}

/**
 * Get display text for a limit value
 */
export function formatLimit(limit: number): string {
  return limit === -1 ? "Unlimited" : limit.toString();
}

/**
 * Get upgrade suggestion based on current plan
 */
export function getUpgradeSuggestion(currentPlan: string, limitType: 'brands' | 'influencers' | 'images' | 'videos'): string {
  const planHierarchy: PlanId[] = ['free', 'starter', 'basic', 'pro', 'agency', 'agency_plus', 'lifetime'];
  const currentIndex = planHierarchy.indexOf(currentPlan as PlanId);
  
  if (currentIndex === -1 || currentIndex >= planHierarchy.length - 1) {
    return "Contact support for custom limits";
  }

  const nextPlan = planHierarchy[currentIndex + 1];
  const nextLimits = getPlanLimits(nextPlan);
  
  const limitMap = {
    brands: nextLimits.maxBrands,
    influencers: nextLimits.maxInfluencers,
    images: nextLimits.maxImagesPerMonth,
    videos: nextLimits.maxVideosPerMonth,
  };

  const limitValue = formatLimit(limitMap[limitType]);
  return `Upgrade to ${nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)} (${limitValue} ${limitType})`;
}
