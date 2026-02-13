/**
 * Entitlements Engine
 * 
 * Unified entitlements layer that combines plan limits, feature flags,
 * and onboarding state into a single query-able interface.
 * 
 * This is the single source of truth for "can this user do X?"
 */

import { TRPCError } from "@trpc/server";
import { getPlanLimits, PlanLimits, isWithinLimit, PlanId } from "./planLimits";
import { PRODUCTS } from "./products";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "./_core/logger";

// ─── Step Definitions ───────────────────────────────────────────────
export const ONBOARDING_STEPS = {
  PLAN: 1,
  BRAND: 2,
  CAMPAIGN: 3,
  PUBLISH: 4,
  OPTIMIZE: 5,
  COMPLETE: 6,
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  1: "Choose Your Plan",
  2: "Build Your Brand",
  3: "Create Campaign",
  4: "Publish & Track",
  5: "Optimize & Scale",
  6: "Growth Loop Complete",
};

export const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  1: "Select a plan that fits your needs",
  2: "Set up Brand Brain and create your first AI influencer",
  3: "Generate content with Video Scripts, Video Lab, or Campaign Factory",
  4: "Schedule and publish across social channels",
  5: "Analyze performance and run A/B tests",
  6: "You've completed the growth loop — keep iterating!",
};

// ─── Entitlements Interface ─────────────────────────────────────────
export interface UserEntitlements {
  plan: string;
  planStatus: string;
  onboardingStep: OnboardingStep;
  limits: PlanLimits;
  features: {
    brandBrain: boolean;
    analytics: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    videoGeneration: boolean;
    aaoStudio: boolean;
    abTesting: boolean;
    teamCollaboration: boolean;
    customDomains: boolean;
    aiProviders: boolean;
  };
  gates: {
    canCreateContent: boolean;
    canPublish: boolean;
    canOptimize: boolean;
    isPaid: boolean;
    isTrialing: boolean;
    isOnboarding: boolean;
  };
}

/**
 * Get full entitlements for a user
 */
export function getEntitlements(user: {
  plan: string;
  planStatus: string;
  onboardingStep: number;
}): UserEntitlements {
  const limits = getPlanLimits(user.plan);
  const isPaid = user.plan !== "free" && user.planStatus !== "none";
  const isTrialing = user.planStatus === "trial";
  const step = (user.onboardingStep || 1) as OnboardingStep;

  return {
    plan: user.plan,
    planStatus: user.planStatus,
    onboardingStep: step,
    limits,
    features: {
      brandBrain: limits.hasBrandBrain,
      analytics: limits.hasAnalytics,
      apiAccess: limits.hasApiAccess,
      whiteLabel: limits.hasWhiteLabel,
      videoGeneration: limits.maxVideosPerMonth > 0 || limits.maxVideosPerMonth === -1,
      aaoStudio: isPaid || isTrialing,
      abTesting: limits.hasAnalytics,
      teamCollaboration: limits.maxTeamMembers > 1 || limits.maxTeamMembers === -1,
      customDomains: limits.maxCustomDomains > 0 || limits.maxCustomDomains === -1,
      aiProviders: isPaid,
    },
    gates: {
      canCreateContent: step >= ONBOARDING_STEPS.CAMPAIGN || user.plan !== "free",
      canPublish: step >= ONBOARDING_STEPS.PUBLISH || user.plan !== "free",
      canOptimize: step >= ONBOARDING_STEPS.OPTIMIZE || user.plan !== "free",
      isPaid,
      isTrialing,
      isOnboarding: step < ONBOARDING_STEPS.COMPLETE,
    },
  };
}

/**
 * Assert that a user has a specific feature entitlement
 */
export function assertEntitlement(
  entitlements: UserEntitlements,
  feature: keyof UserEntitlements["features"],
  upgradeMessage?: string
): void {
  if (!entitlements.features[feature]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: upgradeMessage || `Your ${entitlements.plan} plan does not include ${formatFeatureName(feature)}. Upgrade to unlock this feature.`,
    });
  }
}

/**
 * Assert that a user has completed at least a given onboarding step
 */
export function assertOnboardingStep(
  entitlements: UserEntitlements,
  requiredStep: OnboardingStep,
  message?: string
): void {
  if (entitlements.onboardingStep < requiredStep) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: message || `Please complete "${STEP_LABELS[requiredStep]}" first.`,
    });
  }
}

/**
 * Advance onboarding step for a user (only forward, never backward)
 */
export async function advanceOnboardingStep(
  userId: number,
  newStep: OnboardingStep,
  currentStep: OnboardingStep
): Promise<OnboardingStep> {
  // Only advance forward
  if (newStep <= currentStep) {
    return currentStep;
  }

  const db = await getDb();
  if (!db) {
    logger.error("Database not available for onboarding step advance");
    return currentStep;
  }

  const updateData: Record<string, any> = {
    onboardingStep: newStep,
  };

  // Mark onboarding as completed when reaching COMPLETE
  if (newStep >= ONBOARDING_STEPS.COMPLETE) {
    updateData.onboardingCompleted = true;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  logger.info("Onboarding step advanced", {
    userId,
    from: currentStep,
    to: newStep,
    label: STEP_LABELS[newStep],
  });

  return newStep;
}

/**
 * Reconcile plan after Stripe checkout completes
 * Called from webhook to update user plan and advance onboarding
 */
export async function reconcilePlanAfterCheckout(
  userId: number,
  plan: string,
  billingCycle: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    logger.error("Database not available for plan reconciliation");
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    logger.error("User not found for plan reconciliation", { userId });
    return;
  }

  const updateData: Record<string, any> = {
    plan,
    planStatus: "active",
    billingCycle: billingCycle || "monthly",
    // Clear intent fields after successful checkout
    planIntentTier: null,
    planIntentCycle: null,
    planIntentPriceId: null,
    planIntentOrigin: null,
  };

  if (stripeCustomerId) {
    updateData.stripeCustomerId = stripeCustomerId;
  }
  if (stripeSubscriptionId) {
    updateData.stripeSubscriptionId = stripeSubscriptionId;
  }

  // Auto-advance onboarding from PLAN to BRAND if still on step 1
  if (user.onboardingStep <= ONBOARDING_STEPS.PLAN) {
    updateData.onboardingStep = ONBOARDING_STEPS.BRAND;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  logger.info("Plan reconciled after checkout", {
    userId,
    plan,
    billingCycle,
    previousPlan: user.plan,
    newOnboardingStep: updateData.onboardingStep || user.onboardingStep,
  });
}

/**
 * Get upgrade options for a user's current plan
 */
export function getUpgradeOptions(currentPlan: string): Array<{
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  highlights: string[];
}> {
  const planHierarchy: string[] = ["free", "basic", "agency", "agency_plus"];
  const currentIndex = planHierarchy.indexOf(currentPlan.toLowerCase());

  return Object.values(PRODUCTS)
    .filter((product) => {
      const productIndex = planHierarchy.indexOf(product.id.toLowerCase());
      return productIndex > currentIndex;
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      monthlyPrice: product.monthlyPrice,
      yearlyPrice: product.yearlyPrice,
      highlights: product.features.slice(0, 5),
    }));
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatFeatureName(feature: string): string {
  const names: Record<string, string> = {
    brandBrain: "Brand Brain",
    analytics: "Analytics Dashboard",
    apiAccess: "API Access",
    whiteLabel: "White Label",
    videoGeneration: "Video Generation",
    aaoStudio: "AAO Studio",
    abTesting: "A/B Testing",
    teamCollaboration: "Team Collaboration",
    customDomains: "Custom Domains",
    aiProviders: "AI Provider Integration",
  };
  return names[feature] || feature;
}
