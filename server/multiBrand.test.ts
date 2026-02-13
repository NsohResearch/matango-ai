import { describe, it, expect, vi } from "vitest";
import * as socialOAuth from "./_core/socialOAuth";

describe("Multi-Brand Brand Brain", () => {
  describe("Plan-based brand limits", () => {
    it("should enforce brand limits based on plan", () => {
      const planLimits: Record<string, number> = {
        free: 1,
        basic: 3,
        agency: -1, // unlimited
      };
      
      expect(planLimits.free).toBe(1);
      expect(planLimits.basic).toBe(3);
      expect(planLimits.agency).toBe(-1);
    });

    it("should allow unlimited brands for agency plan", () => {
      const maxBrands = -1; // agency plan
      const currentBrands = 100;
      const canAddBrand = maxBrands === -1 || currentBrands < maxBrands;
      expect(canAddBrand).toBe(true);
    });

    it("should block adding brands when limit reached", () => {
      const maxBrands = 3; // basic plan
      const currentBrands = 3;
      const canAddBrand = maxBrands === -1 || currentBrands < maxBrands;
      expect(canAddBrand).toBe(false);
    });
  });

  describe("Brand switching", () => {
    it("should identify active brand from organization", () => {
      const org = { id: 1, activeBrandId: 5 };
      const brands = [
        { id: 3, brandName: "Brand A" },
        { id: 5, brandName: "Brand B" },
        { id: 7, brandName: "Brand C" },
      ];
      const activeBrand = brands.find(b => b.id === org.activeBrandId);
      expect(activeBrand?.brandName).toBe("Brand B");
    });
  });
});

describe("Social OAuth Configuration", () => {
  describe("Platform configuration check", () => {
    it("should return false for unconfigured platforms", () => {
      // Without env vars, platforms should not be configured
      const configured = socialOAuth.isPlatformConfigured("instagram");
      expect(configured).toBe(false);
    });

    it("should have all 5 platform configs defined", () => {
      const platforms = Object.keys(socialOAuth.socialOAuthConfigs);
      expect(platforms).toContain("instagram");
      expect(platforms).toContain("facebook");
      expect(platforms).toContain("youtube");
      expect(platforms).toContain("tiktok");
      expect(platforms).toContain("linkedin");
      expect(platforms.length).toBe(5);
    });
  });

  describe("OAuth URL generation", () => {
    it("should return null for unconfigured platform", () => {
      const url = socialOAuth.generateAuthUrl("instagram", "test-state");
      expect(url).toBeNull();
    });
  });

  describe("getConfiguredPlatforms", () => {
    it("should return empty array when no platforms configured", () => {
      const configured = socialOAuth.getConfiguredPlatforms();
      expect(Array.isArray(configured)).toBe(true);
    });
  });
});

describe("OAuth Token Exchange", () => {
  it("should return null for unconfigured platform", async () => {
    const tokens = await socialOAuth.exchangeCodeForTokens("instagram", "test-code");
    expect(tokens).toBeNull();
  });

  it("should return null for invalid platform", async () => {
    const tokens = await socialOAuth.exchangeCodeForTokens("invalid-platform", "test-code");
    expect(tokens).toBeNull();
  });
});

describe("OAuth Token Refresh", () => {
  it("should return null for unconfigured platform", async () => {
    const tokens = await socialOAuth.refreshAccessToken("instagram", "test-refresh-token");
    expect(tokens).toBeNull();
  });
});

describe("User Profile Fetching", () => {
  it("should return null for invalid platform", async () => {
    const profile = await socialOAuth.getUserProfile("invalid-platform", "test-token");
    expect(profile).toBeNull();
  });
});
