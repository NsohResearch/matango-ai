/**
 * Entitlement Guard Middleware
 * 
 * tRPC middleware that injects entitlements into context and provides
 * reusable procedure builders for feature-gated endpoints.
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getEntitlements,
  assertEntitlement,
  assertOnboardingStep,
  type UserEntitlements,
  type OnboardingStep,
  ONBOARDING_STEPS,
} from "../entitlements";

/**
 * Middleware that loads entitlements into context
 */
const withEntitlements = protectedProcedure.use(async ({ ctx, next }) => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

  const entitlements = getEntitlements({
    plan: user.plan,
    planStatus: user.planStatus ?? "none",
    onboardingStep: user.onboardingStep ?? 1,
  });

  return next({
    ctx: {
      ...ctx,
      entitlements,
      userPlan: user.plan,
    },
  });
});

/**
 * Procedure that requires a specific feature entitlement
 */
export function requireFeature(feature: keyof UserEntitlements["features"], upgradeMessage?: string) {
  return withEntitlements.use(async ({ ctx, next }) => {
    assertEntitlement(ctx.entitlements, feature, upgradeMessage);
    return next({ ctx });
  });
}

/**
 * Procedure that requires a minimum onboarding step
 */
export function requireOnboardingStep(step: OnboardingStep, message?: string) {
  return withEntitlements.use(async ({ ctx, next }) => {
    assertOnboardingStep(ctx.entitlements, step, message);
    return next({ ctx });
  });
}

/**
 * Procedure that requires a paid plan (any tier above free)
 */
export const requirePaidPlan = withEntitlements.use(async ({ ctx, next }) => {
  if (!ctx.entitlements.gates.isPaid && !ctx.entitlements.gates.isTrialing) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires a paid plan. Upgrade to unlock it.",
    });
  }
  return next({ ctx });
});

/**
 * Procedure with entitlements loaded (no specific requirement)
 */
export const entitledProcedure = withEntitlements;

export { withEntitlements };
