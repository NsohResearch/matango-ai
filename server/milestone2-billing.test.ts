/**
 * Milestone 2: Tenant Ops + Billing Tests
 * 
 * Tests for:
 * - Stripe subscription management (cancel, pause, resume, extend trial)
 * - Entitlements editor for plan limits
 * - Usage counters display
 * - AdminTenantDetail wired to real API
 * - AccountSettings subscription management UI
 */
import { describe, it, expect } from "vitest";

describe("Milestone 2: Tenant Ops + Billing", () => {
  describe("Stripe Subscription Management Backend", () => {
    it("should export accountLifecycleRouter with subscription endpoints", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter).toBeDefined();
    });

    it("should have pauseBilling procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.pauseBilling).toBeDefined();
    });

    it("should have resumeBilling procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.resumeBilling).toBeDefined();
    });

    it("should have getSubscriptionDetails procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.getSubscriptionDetails).toBeDefined();
    });

    it("should have getMyUsageAndLimits procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.getMyUsageAndLimits).toBeDefined();
    });

    it("should have extendTrial admin procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.extendTrial).toBeDefined();
    });

    it("should have cancelSubscription admin procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.cancelSubscription).toBeDefined();
    });

    it("should have downgrade procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.downgrade).toBeDefined();
    });

    it("should have deactivate procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.deactivate).toBeDefined();
    });

    it("should have reactivate procedure", async () => {
      const mod = await import("./routers/accountLifecycle");
      expect(mod.accountLifecycleRouter._def.procedures.reactivate).toBeDefined();
    });
  });

  describe("Stripe Webhook Subscription Lifecycle", () => {
    it("should export handleStripeWebhook function", async () => {
      const mod = await import("./stripe-webhook");
      expect(mod.handleStripeWebhook).toBeDefined();
      expect(typeof mod.handleStripeWebhook).toBe("function");
    });

    it("should handle subscription lifecycle events in webhook", async () => {
      // Verify the webhook file contains handlers for subscription events
      const fs = await import("fs");
      const content = fs.readFileSync("server/stripe-webhook.ts", "utf-8");
      expect(content).toContain("customer.subscription.deleted");
      expect(content).toContain("customer.subscription.paused");
      expect(content).toContain("customer.subscription.resumed");
      expect(content).toContain("invoice.payment_failed");
    });
  });

  describe("Admin Tenant Management", () => {
    it("should export adminRouter with tenant management procedures", async () => {
      const mod = await import("./adminRouter");
      expect(mod.adminRouter).toBeDefined();
    });

    it("should have getTenantDetails admin procedure", async () => {
      const mod = await import("./adminRouter");
      expect(mod.adminRouter._def.procedures.getTenantDetails).toBeDefined();
    });

    it("should have getTenantUsage admin procedure", async () => {
      const mod = await import("./adminRouter");
      expect(mod.adminRouter._def.procedures.getTenantUsage).toBeDefined();
    });

    it("should have updateTenantLimits admin procedure", async () => {
      const mod = await import("./adminRouter");
      expect(mod.adminRouter._def.procedures.updateTenantLimits).toBeDefined();
    });

    it("should have resetTenantUsage admin procedure", async () => {
      const mod = await import("./adminRouter");
      expect(mod.adminRouter._def.procedures.resetTenantUsage).toBeDefined();
    });

    it("should have changeTenantPlan admin procedure", async () => {
      const mod = await import("./adminRouter");
      expect(mod.adminRouter._def.procedures.changeTenantPlan).toBeDefined();
    });
  });

  describe("Plan Limits & Entitlements", () => {
    it("should export getPlanLimits function", async () => {
      const mod = await import("./planLimits");
      expect(mod.getPlanLimits).toBeDefined();
      expect(typeof mod.getPlanLimits).toBe("function");
    });

    it("should return correct limits for free plan", async () => {
      const mod = await import("./planLimits");
      const limits = mod.getPlanLimits("free");
      expect(limits).toBeDefined();
      expect(limits.maxInfluencers).toBeDefined();
      expect(limits.maxImagesPerMonth).toBeDefined();
      expect(limits.maxVideosPerMonth).toBeDefined();
    });

    it("should return higher limits for paid plans", async () => {
      const mod = await import("./planLimits");
      const freeLimits = mod.getPlanLimits("free");
      const proLimits = mod.getPlanLimits("pro");
      // Pro should have higher or equal limits than free
      expect(proLimits.maxInfluencers).toBeGreaterThanOrEqual(freeLimits.maxInfluencers);
      expect(proLimits.maxImagesPerMonth).toBeGreaterThanOrEqual(freeLimits.maxImagesPerMonth);
    });

    it("should export isWithinLimit function", async () => {
      const mod = await import("./planLimits");
      expect(mod.isWithinLimit).toBeDefined();
      expect(typeof mod.isWithinLimit).toBe("function");
    });

    it("should export hasFeature function", async () => {
      const mod = await import("./planLimits");
      expect(mod.hasFeature).toBeDefined();
      expect(typeof mod.hasFeature).toBe("function");
    });
  });

  describe("Database Helpers for Tenant Ops", () => {
    it("should export getTenantDetails function", async () => {
      const mod = await import("./db");
      expect(mod.getTenantDetails).toBeDefined();
      expect(typeof mod.getTenantDetails).toBe("function");
    });

    it("should export getCurrentUsageCounters function", async () => {
      const mod = await import("./db");
      expect(mod.getCurrentUsageCounters).toBeDefined();
      expect(typeof mod.getCurrentUsageCounters).toBe("function");
    });

    it("should export getTenantLimits function", async () => {
      const mod = await import("./db");
      expect(mod.getTenantLimits).toBeDefined();
      expect(typeof mod.getTenantLimits).toBe("function");
    });
  });

  describe("Admin Tenant Detail UI", () => {
    it("should export AdminTenantDetail component", async () => {
      const mod = await import("../client/src/pages/admin/AdminTenantDetail");
      expect(mod.default).toBeDefined();
    });
  });

  describe("Account Settings UI - Subscription Management", () => {
    it("should export AccountSettings component", async () => {
      const mod = await import("../client/src/pages/AccountSettings");
      expect(mod.default).toBeDefined();
    });

    it("should have subscription management features in AccountSettings", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/AccountSettings.tsx", "utf-8");
      // Verify subscription management UI elements
      expect(content).toContain("pauseBilling");
      expect(content).toContain("resumeBilling");
      expect(content).toContain("getSubscriptionDetails");
      expect(content).toContain("getMyUsageAndLimits");
      expect(content).toContain("Pause Billing");
      expect(content).toContain("Resume Billing");
      expect(content).toContain("Downgrade");
      expect(content).toContain("Deactivate");
    });

    it("should have usage counters display in AccountSettings", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/AccountSettings.tsx", "utf-8");
      expect(content).toContain("Usage This Month");
      expect(content).toContain("Images Generated");
      expect(content).toContain("Videos Generated");
      expect(content).toContain("Plan Limits");
      expect(content).toContain("getUsagePercentage");
    });
  });

  describe("Admin Tenant Detail UI - Entitlements Editor", () => {
    it("should have entitlements editor in AdminTenantDetail", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/admin/AdminTenantDetail.tsx", "utf-8");
      // Verify entitlements editor UI elements
      expect(content).toContain("updateTenantLimits");
      expect(content).toContain("Entitlements");
      expect(content).toContain("getTenantDetails");
      expect(content).toContain("getTenantUsage");
    });

    it("should have usage counters in AdminTenantDetail", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/admin/AdminTenantDetail.tsx", "utf-8");
      expect(content).toContain("Usage");
      expect(content).toContain("imagesGenerated");
      expect(content).toContain("videosGenerated");
    });

    it("should have Stripe subscription management in AdminTenantDetail", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/admin/AdminTenantDetail.tsx", "utf-8");
      expect(content).toContain("Billing");
      expect(content).toContain("changeTenantPlan");
      expect(content).toContain("suspendTenant");
    });
  });
});
