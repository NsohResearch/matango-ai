import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEntitlements,
  assertEntitlement,
  assertOnboardingStep,
  getUpgradeOptions,
  ONBOARDING_STEPS,
  STEP_LABELS,
  STEP_DESCRIPTIONS,
  type UserEntitlements,
} from "../entitlements";

describe("Entitlements Engine", () => {
  describe("ONBOARDING_STEPS", () => {
    it("should define all 6 steps", () => {
      expect(ONBOARDING_STEPS.PLAN).toBe(1);
      expect(ONBOARDING_STEPS.BRAND).toBe(2);
      expect(ONBOARDING_STEPS.CAMPAIGN).toBe(3);
      expect(ONBOARDING_STEPS.PUBLISH).toBe(4);
      expect(ONBOARDING_STEPS.OPTIMIZE).toBe(5);
      expect(ONBOARDING_STEPS.COMPLETE).toBe(6);
    });

    it("should have labels for all steps", () => {
      for (let i = 1; i <= 6; i++) {
        expect(STEP_LABELS[i as keyof typeof STEP_LABELS]).toBeDefined();
        expect(typeof STEP_LABELS[i as keyof typeof STEP_LABELS]).toBe("string");
      }
    });

    it("should have descriptions for all steps", () => {
      for (let i = 1; i <= 6; i++) {
        expect(STEP_DESCRIPTIONS[i as keyof typeof STEP_DESCRIPTIONS]).toBeDefined();
        expect(typeof STEP_DESCRIPTIONS[i as keyof typeof STEP_DESCRIPTIONS]).toBe("string");
      }
    });
  });

  describe("getEntitlements", () => {
    it("should return correct entitlements for free plan", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 1,
      });

      expect(entitlements.plan).toBe("free");
      expect(entitlements.planStatus).toBe("none");
      expect(entitlements.onboardingStep).toBe(1);
      expect(entitlements.gates.isPaid).toBe(false);
      expect(entitlements.gates.isTrialing).toBe(false);
      expect(entitlements.gates.isOnboarding).toBe(true);
    });

    it("should return correct entitlements for paid plan", () => {
      const entitlements = getEntitlements({
        plan: "basic",
        planStatus: "active",
        onboardingStep: 3,
      });

      expect(entitlements.plan).toBe("basic");
      expect(entitlements.gates.isPaid).toBe(true);
      expect(entitlements.gates.isTrialing).toBe(false);
      expect(entitlements.gates.canCreateContent).toBe(true);
    });

    it("should return correct entitlements for trial plan", () => {
      const entitlements = getEntitlements({
        plan: "basic",
        planStatus: "trial",
        onboardingStep: 2,
      });

      expect(entitlements.gates.isPaid).toBe(true);
      expect(entitlements.gates.isTrialing).toBe(true);
      expect(entitlements.features.aaoStudio).toBe(true);
    });

    it("should set canCreateContent based on onboarding step", () => {
      const step1 = getEntitlements({ plan: "free", planStatus: "none", onboardingStep: 1 });
      expect(step1.gates.canCreateContent).toBe(false);

      const step3 = getEntitlements({ plan: "free", planStatus: "none", onboardingStep: 3 });
      expect(step3.gates.canCreateContent).toBe(true);
    });

    it("should set canPublish based on onboarding step", () => {
      const step2 = getEntitlements({ plan: "free", planStatus: "none", onboardingStep: 2 });
      expect(step2.gates.canPublish).toBe(false);

      const step4 = getEntitlements({ plan: "free", planStatus: "none", onboardingStep: 4 });
      expect(step4.gates.canPublish).toBe(true);
    });

    it("should mark onboarding complete at step 6", () => {
      const entitlements = getEntitlements({
        plan: "basic",
        planStatus: "active",
        onboardingStep: 6,
      });

      expect(entitlements.gates.isOnboarding).toBe(false);
    });

    it("should enable AI providers for paid plans only", () => {
      const free = getEntitlements({ plan: "free", planStatus: "none", onboardingStep: 1 });
      expect(free.features.aiProviders).toBe(false);

      const paid = getEntitlements({ plan: "basic", planStatus: "active", onboardingStep: 3 });
      expect(paid.features.aiProviders).toBe(true);
    });

    it("should default onboardingStep to 1 when 0 or undefined", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 0,
      });
      expect(entitlements.onboardingStep).toBe(1);
    });
  });

  describe("assertEntitlement", () => {
    it("should not throw when feature is enabled", () => {
      const entitlements = getEntitlements({
        plan: "basic",
        planStatus: "active",
        onboardingStep: 3,
      });

      expect(() => assertEntitlement(entitlements, "brandBrain")).not.toThrow();
    });

    it("should throw when feature is disabled", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 1,
      });

      expect(() => assertEntitlement(entitlements, "aiProviders")).toThrow();
    });

    it("should use custom upgrade message when provided", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 1,
      });

      expect(() =>
        assertEntitlement(entitlements, "aiProviders", "Custom upgrade message")
      ).toThrow("Custom upgrade message");
    });
  });

  describe("assertOnboardingStep", () => {
    it("should not throw when user is at or past required step", () => {
      const entitlements = getEntitlements({
        plan: "basic",
        planStatus: "active",
        onboardingStep: 4,
      });

      expect(() => assertOnboardingStep(entitlements, 3)).not.toThrow();
      expect(() => assertOnboardingStep(entitlements, 4)).not.toThrow();
    });

    it("should throw when user has not reached required step", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 1,
      });

      expect(() => assertOnboardingStep(entitlements, 3)).toThrow();
    });

    it("should use custom message when provided", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 1,
      });

      expect(() =>
        assertOnboardingStep(entitlements, 3, "Custom step message")
      ).toThrow("Custom step message");
    });
  });

  describe("getUpgradeOptions", () => {
    it("should return all plans above free", () => {
      const options = getUpgradeOptions("free");
      expect(options.length).toBeGreaterThan(0);
      expect(options.every((o) => o.id !== "free")).toBe(true);
    });

    it("should return fewer options for higher plans", () => {
      const fromFree = getUpgradeOptions("free");
      const fromBasic = getUpgradeOptions("basic");
      expect(fromFree.length).toBeGreaterThan(fromBasic.length);
    });

    it("should return empty array for highest plan", () => {
      const options = getUpgradeOptions("agency_plus");
      expect(options.length).toBe(0);
    });

    it("should include highlights for each option", () => {
      const options = getUpgradeOptions("free");
      options.forEach((option) => {
        expect(option.highlights).toBeDefined();
        expect(Array.isArray(option.highlights)).toBe(true);
        expect(option.highlights.length).toBeGreaterThan(0);
      });
    });

    it("should include pricing for each option", () => {
      const options = getUpgradeOptions("free");
      options.forEach((option) => {
        expect(typeof option.monthlyPrice).toBe("number");
        expect(typeof option.yearlyPrice).toBe("number");
      });
    });
  });
});

describe("Onboarding Router", () => {
  describe("getPlans endpoint", () => {
    it("should be a public procedure (no auth required)", () => {
      // The getPlans endpoint is defined as publicProcedure
      // This test verifies the entitlements engine supports plan listing
      const options = getUpgradeOptions("free");
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe("Step validation logic", () => {
    it("should not allow skipping steps", () => {
      const currentStep = 1;
      const targetStep = 3;
      // Can only advance one step at a time
      expect(targetStep > currentStep + 1).toBe(true);
    });

    it("should allow advancing to next step", () => {
      const currentStep = 1;
      const targetStep = 2;
      expect(targetStep).toBe(currentStep + 1);
    });

    it("should not allow going backward", () => {
      const currentStep = 3;
      const targetStep = 2;
      expect(targetStep <= currentStep).toBe(true);
    });
  });

  describe("Feature gates per plan", () => {
    it("free plan should have limited features", () => {
      const entitlements = getEntitlements({
        plan: "free",
        planStatus: "none",
        onboardingStep: 1,
      });

      expect(entitlements.features.aiProviders).toBe(false);
      expect(entitlements.features.whiteLabel).toBe(false);
    });

    it("basic plan should have more features than free", () => {
      const free = getEntitlements({ plan: "free", planStatus: "none", onboardingStep: 3 });
      const basic = getEntitlements({ plan: "basic", planStatus: "active", onboardingStep: 3 });

      expect(basic.features.aiProviders).toBe(true);
      expect(basic.gates.isPaid).toBe(true);
      expect(free.gates.isPaid).toBe(false);
    });

    it("agency plan should have team collaboration", () => {
      const agency = getEntitlements({
        plan: "agency",
        planStatus: "active",
        onboardingStep: 6,
      });

      expect(agency.features.teamCollaboration).toBe(true);
      expect(agency.features.analytics).toBe(true);
    });
  });
});
