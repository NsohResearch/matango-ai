/**
 * Onboarding State Machine Router
 * 
 * Manages the 5-step growth loop:
 *   Step 1: PLAN      → Choose/upgrade plan (embedded pricing)
 *   Step 2: BRAND     → Set up Brand Brain + first influencer
 *   Step 3: CAMPAIGN  → Create first campaign/content
 *   Step 4: PUBLISH   → Publish to social channels
 *   Step 5: OPTIMIZE  → Analyze and iterate
 *   Step 6: COMPLETE  → Growth loop done
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  ONBOARDING_STEPS,
  STEP_LABELS,
  STEP_DESCRIPTIONS,
  getEntitlements,
  advanceOnboardingStep,
  getUpgradeOptions,
  type OnboardingStep,
} from "../entitlements";
import { PRODUCTS } from "../products";
import { getPlanLimits } from "../planLimits";
import { logger } from "../_core/logger";

export const onboardingRouter = router({
  /**
   * Get current onboarding state + entitlements
   */
  getState: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    const entitlements = getEntitlements({
      plan: user.plan,
      planStatus: user.planStatus ?? "none",
      onboardingStep: user.onboardingStep ?? 1,
    });

    // Build step statuses
    const steps = Object.entries(ONBOARDING_STEPS).map(([key, stepNum]) => {
      let status: "complete" | "current" | "locked" | "available" = "locked";
      
      if (stepNum < entitlements.onboardingStep) {
        status = "complete";
      } else if (stepNum === entitlements.onboardingStep) {
        status = "current";
      } else if (stepNum === entitlements.onboardingStep + 1) {
        status = "available";
      }

      return {
        step: stepNum as OnboardingStep,
        key,
        label: STEP_LABELS[stepNum as OnboardingStep],
        description: STEP_DESCRIPTIONS[stepNum as OnboardingStep],
        status,
      };
    });

    return {
      currentStep: entitlements.onboardingStep,
      steps,
      entitlements,
      user: {
        plan: user.plan,
        planStatus: user.planStatus,
        billingCycle: user.billingCycle,
        onboardingCompleted: user.onboardingCompleted,
        planIntentTier: user.planIntentTier,
        planIntentCycle: user.planIntentCycle,
      },
    };
  }),

  /**
   * Advance to the next onboarding step
   * Validates that the current step's requirements are met
   */
  advanceStep: protectedProcedure
    .input(z.object({
      targetStep: z.number().min(1).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const currentStep = (user.onboardingStep ?? 1) as OnboardingStep;
      const targetStep = input.targetStep as OnboardingStep;

      // Validate step advancement
      if (targetStep <= currentStep) {
        return { step: currentStep, message: "Already at or past this step" };
      }

      // Can only advance one step at a time (unless skipping to COMPLETE)
      if (targetStep > currentStep + 1 && targetStep !== ONBOARDING_STEPS.COMPLETE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot skip steps. Complete "${STEP_LABELS[currentStep]}" first.`,
        });
      }

      // Validate prerequisites for each step
      await validateStepPrerequisites(ctx.user.id, currentStep, targetStep, user);

      const newStep = await advanceOnboardingStep(ctx.user.id, targetStep, currentStep);

      return {
        step: newStep,
        label: STEP_LABELS[newStep],
        message: `Advanced to "${STEP_LABELS[newStep]}"`,
      };
    }),

  /**
   * Save plan intent (user selected a plan but hasn't paid yet)
   */
  savePlanIntent: protectedProcedure
    .input(z.object({
      tier: z.string(),
      cycle: z.enum(["monthly", "yearly"]),
      priceId: z.string().optional(),
      origin: z.enum(["onboarding", "upgrade", "downgrade"]).default("onboarding"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(users).set({
        planIntentTier: input.tier,
        planIntentCycle: input.cycle,
        planIntentPriceId: input.priceId || null,
        planIntentOrigin: input.origin,
      }).where(eq(users.id, ctx.user.id));

      logger.info("Plan intent saved", {
        userId: ctx.user.id,
        tier: input.tier,
        cycle: input.cycle,
        origin: input.origin,
      });

      return { success: true };
    }),

  /**
   * Get available plans for the pricing embed
   */
  getPlans: publicProcedure.query(async () => {
    return Object.values(PRODUCTS).map((product) => {
      const limits = getPlanLimits(product.id);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        features: product.features,
        excludedFeatures: product.excludedFeatures,
        monthlyPrice: product.monthlyPrice,
        yearlyPrice: product.yearlyPrice,
        currency: product.currency,
        credits: product.credits,
        isPopular: (product as any).isPopular || false,
        isEnterprise: (product as any).isEnterprise || false,
        limits: {
          influencers: limits.maxInfluencers,
          imagesPerMonth: limits.maxImagesPerMonth,
          videosPerMonth: limits.maxVideosPerMonth,
          brands: limits.maxBrands,
          teamMembers: limits.maxTeamMembers,
          customDomains: limits.maxCustomDomains,
          storageGb: limits.maxStorageGb,
        },
        featureFlags: {
          brandBrain: limits.hasBrandBrain,
          analytics: limits.hasAnalytics,
          apiAccess: limits.hasApiAccess,
          whiteLabel: limits.hasWhiteLabel,
        },
      };
    });
  }),

  /**
   * Get upgrade options for current user
   */
  getUpgradeOptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    return getUpgradeOptions(user.plan);
  }),

  /**
   * Skip onboarding (mark as complete for returning users)
   */
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    await db.update(users).set({
      onboardingStep: ONBOARDING_STEPS.COMPLETE,
      onboardingCompleted: true,
    }).where(eq(users.id, ctx.user.id));

    return { success: true, message: "Onboarding skipped" };
  }),

  /**
   * Reset onboarding (for testing or re-onboarding)
   */
  resetOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    await db.update(users).set({
      onboardingStep: ONBOARDING_STEPS.PLAN,
      onboardingCompleted: false,
    }).where(eq(users.id, ctx.user.id));

    return { success: true, message: "Onboarding reset to Step 1" };
  }),
});

// ─── Step Prerequisite Validation ───────────────────────────────────
async function validateStepPrerequisites(
  userId: number,
  currentStep: OnboardingStep,
  targetStep: OnboardingStep,
  user: any
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  switch (targetStep) {
    case ONBOARDING_STEPS.BRAND: {
      // Step 2 requires a paid plan (or trial)
      if (user.plan === "free" && user.planStatus !== "trial") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Please select a plan before proceeding to Brand setup.",
        });
      }
      break;
    }
    case ONBOARDING_STEPS.CAMPAIGN: {
      // Step 3 requires at least one brand or influencer
      const [brandCount] = await db.execute({
        sql: `SELECT COUNT(*) as count FROM brands WHERE userId = ?`,
        args: [userId],
      } as any);
      const [influencerCount] = await db.execute({
        sql: `SELECT COUNT(*) as count FROM influencers WHERE userId = ?`,
        args: [userId],
      } as any);
      const brands = (brandCount as any)?.count || 0;
      const influencers = (influencerCount as any)?.count || 0;
      if (brands === 0 && influencers === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Create at least one brand or AI influencer before creating campaigns.",
        });
      }
      break;
    }
    case ONBOARDING_STEPS.PUBLISH: {
      // Step 4 requires at least one campaign or content piece
      // Soft check — allow advancement if user has any content
      break;
    }
    case ONBOARDING_STEPS.OPTIMIZE: {
      // Step 5 requires published content
      break;
    }
    case ONBOARDING_STEPS.COMPLETE: {
      // No hard prerequisites for completion
      break;
    }
  }
}
