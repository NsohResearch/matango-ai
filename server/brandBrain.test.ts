import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock functions for brandBrain
const mockGetBusinessDna = vi.fn();
const mockUpsertBusinessDna = vi.fn();

// Mock the database module
vi.mock("./db", () => ({
  getBusinessDna: (...args: any[]) => mockGetBusinessDna(...args),
  upsertBusinessDna: (...args: any[]) => mockUpsertBusinessDna(...args),
  getInfluencersByUserId: vi.fn().mockResolvedValue([]),
  getInfluencerById: vi.fn().mockResolvedValue(null),
  getPublicInfluencers: vi.fn().mockResolvedValue([]),
  createInfluencer: vi.fn().mockResolvedValue(1),
  deleteInfluencer: vi.fn().mockResolvedValue(undefined),
  getChatMessages: vi.fn().mockResolvedValue([]),
  addChatMessage: vi.fn().mockResolvedValue(1),
  getScheduledPosts: vi.fn().mockResolvedValue([]),
  createScheduledPost: vi.fn().mockResolvedValue(1),
  deleteScheduledPost: vi.fn().mockResolvedValue(undefined),
  getScheduledPostById: vi.fn().mockResolvedValue(null),
  getLatestAnalytics: vi.fn().mockResolvedValue(null),
  getContentTemplates: vi.fn().mockResolvedValue([]),
  createContentTemplate: vi.fn().mockResolvedValue(1),
  getCampaigns: vi.fn().mockResolvedValue([]),
  getCampaignsByInfluencer: vi.fn().mockResolvedValue([]),
  createCampaign: vi.fn().mockResolvedValue(1),
  getNotifications: vi.fn().mockResolvedValue([]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  getNotificationPreferences: vi.fn().mockResolvedValue({ emailEnabled: true }),
  upsertNotificationPreferences: vi.fn().mockResolvedValue(undefined),
  getCollaborators: vi.fn().mockResolvedValue([]),
  getCollaboratorsByInfluencer: vi.fn().mockResolvedValue([]),
  getSharedInfluencers: vi.fn().mockResolvedValue([]),
  updateInfluencer: vi.fn(),
  addInfluencerContent: vi.fn(),
  getInfluencerContent: vi.fn(),
  getScheduledPostsByInfluencer: vi.fn(),
  updateScheduledPost: vi.fn(),
  getAnalyticsData: vi.fn(),
  addAnalyticsData: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  createCollaborator: vi.fn().mockResolvedValue(1),
  getCampaignById: vi.fn(),
  deleteCampaign: vi.fn(),
}));

// Mock image generation
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/image.png" }),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://s3.example.com/image.png" }),
}));

// Mock LLM for enrichFromWebsite and importFromLinkedIn
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(({ messages }) => {
    // Check if this is a LinkedIn import request
    if (messages[0]?.content?.includes("LinkedIn")) {
      return Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              productName: "Test Company",
              tagline: "Building the future",
              category: "Technology",
              websiteUrl: "https://testcompany.com"
            })
          }
        }]
      });
    }
    // Website enrichment request
    return Promise.resolve({
      choices: [{
        message: {
          content: JSON.stringify({
            tagline: "Innovative solutions for modern businesses",
            keyOutcomes: ["Save time", "Increase revenue", "Reduce costs"],
            differentiators: ["AI-powered", "Easy to use", "Enterprise ready"]
          })
        }
      }]
    });
  }),
}));

function createAuthContext(): { ctx: TrpcContext } {
  const user = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
    credits: 100,
    plan: "pro",
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {
        origin: "https://test.example.com",
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("brandBrain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBusinessDna.mockResolvedValue(null);
    mockUpsertBusinessDna.mockResolvedValue(undefined);
  });

  describe("brandBrain.get", () => {
    it("returns brand brain for authenticated user", async () => {
      const mockBrandBrain = {
        id: 1,
        userId: 1,
        productName: "Test Product",
        websiteUrl: "https://test.com",
        tagline: "Test tagline",
      };
      mockGetBusinessDna.mockResolvedValue(mockBrandBrain);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.get();

      expect(result).toEqual(mockBrandBrain);
      expect(mockGetBusinessDna).toHaveBeenCalledWith(1);
    });

    it("returns null when no brand brain exists", async () => {
      mockGetBusinessDna.mockResolvedValue(null);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.get();

      expect(result).toBeNull();
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.brandBrain.get()).rejects.toThrow();
    });
  });

  describe("brandBrain.save", () => {
    it("saves brand brain with required fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.save({
        productName: "My Product",
      });

      expect(result.success).toBe(true);
      expect(result.completionScore).toBeGreaterThanOrEqual(10);
      expect(mockUpsertBusinessDna).toHaveBeenCalled();
    });

    it("saves brand brain with all fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.save({
        productName: "My Product",
        websiteUrl: "https://myproduct.com",
        category: "SaaS",
        tagline: "The best product ever",
        brandTone: "professional",
        icpPersonas: [{
          name: "Startup Steve",
          role: "Founder",
          pains: ["No time"],
          goals: ["Grow fast"],
        }],
        keyOutcomes: ["Save time", "Make money"],
        differentiators: ["AI-powered", "Easy to use"],
        voiceRules: ["Be concise"],
        forbiddenPhrases: ["Revolutionary"],
      });

      expect(result.success).toBe(true);
      expect(result.completionScore).toBeGreaterThan(50);
    });

    it("auto-adds https:// to website URL without protocol", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.brandBrain.save({
        productName: "My Product",
        websiteUrl: "myproduct.com",
      });

      // Check that upsertBusinessDna was called with https:// prefix
      expect(mockUpsertBusinessDna).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          websiteUrl: "https://myproduct.com",
        })
      );
    });

    it("preserves existing https:// in website URL", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.brandBrain.save({
        productName: "My Product",
        websiteUrl: "https://myproduct.com",
      });

      expect(mockUpsertBusinessDna).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          websiteUrl: "https://myproduct.com",
        })
      );
    });

    it("allows empty website URL", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.save({
        productName: "My Product",
        websiteUrl: "",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("brandBrain.enrichFromWebsite", () => {
    it("enriches brand brain from website URL", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.enrichFromWebsite({
        websiteUrl: "https://example.com",
      });

      expect(result.tagline).toBeDefined();
      expect(result.keyOutcomes).toBeInstanceOf(Array);
      expect(result.differentiators).toBeInstanceOf(Array);
    });

    it("auto-adds https:// to URL without protocol", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.enrichFromWebsite({
        websiteUrl: "example.com",
      });

      expect(result.tagline).toBeDefined();
    });
  });

  describe("brandBrain.importFromLinkedIn", () => {
    it("imports company info from LinkedIn URL", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.brandBrain.importFromLinkedIn({
        linkedInUrl: "https://linkedin.com/company/test-company",
      });

      expect(result.productName).toBe("Test Company");
      expect(result.tagline).toBe("Building the future");
      expect(result.category).toBe("Technology");
      expect(result.websiteUrl).toBe("https://testcompany.com");
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.brandBrain.importFromLinkedIn({
          linkedInUrl: "https://linkedin.com/company/test",
        })
      ).rejects.toThrow();
    });
  });
});
