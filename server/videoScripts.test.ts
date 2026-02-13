import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock functions
const mockGetVideoScripts = vi.fn();
const mockGetVideoScriptBySlug = vi.fn();
const mockGetVideoScriptById = vi.fn();
const mockGetUserVideoScripts = vi.fn();
const mockCreateVideoScript = vi.fn();
const mockUpdateVideoScript = vi.fn();
const mockGetSystemInfluencers = vi.fn();
const mockGetSystemInfluencerBySlug = vi.fn();
const mockGetBusinessDna = vi.fn();

// Mock the database module
vi.mock("./db", () => ({
  getVideoScripts: (...args: any[]) => mockGetVideoScripts(...args),
  getVideoScriptBySlug: (...args: any[]) => mockGetVideoScriptBySlug(...args),
  getVideoScriptById: (...args: any[]) => mockGetVideoScriptById(...args),
  getUserVideoScripts: (...args: any[]) => mockGetUserVideoScripts(...args),
  createVideoScript: (...args: any[]) => mockCreateVideoScript(...args),
  updateVideoScript: (...args: any[]) => mockUpdateVideoScript(...args),
  getSystemInfluencers: (...args: any[]) => mockGetSystemInfluencers(...args),
  getSystemInfluencerBySlug: (...args: any[]) => mockGetSystemInfluencerBySlug(...args),
  getBusinessDna: (...args: any[]) => mockGetBusinessDna(...args),
  // Other required mocks
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

// Mock LLM for script generation
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          name: "Generated Script",
          durationSeconds: 30,
          scenes: [
            { sceneNumber: 1, title: "Hook", dialogue: "Test dialogue" }
          ],
          fullScript: "Test dialogue",
          deliveryNotes: { pacing: "Fast", tone: "Confident" }
        })
      }
    }]
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

describe("videoScripts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVideoScripts.mockResolvedValue([]);
    mockGetVideoScriptBySlug.mockResolvedValue(null);
    mockGetVideoScriptById.mockResolvedValue(null);
    mockGetUserVideoScripts.mockResolvedValue([]);
    mockCreateVideoScript.mockResolvedValue({ id: 1 });
    mockUpdateVideoScript.mockResolvedValue({ success: true });
    mockGetSystemInfluencers.mockResolvedValue([]);
    mockGetSystemInfluencerBySlug.mockResolvedValue(null);
    mockGetBusinessDna.mockResolvedValue(null);
  });

  describe("videoScripts.listSystem", () => {
    it("returns system video scripts (public)", async () => {
      const mockScripts = [
        { id: 1, name: "Master Script", scriptType: "master", isSystemScript: true },
        { id: 2, name: "TikTok Script", scriptType: "tiktok", isSystemScript: true },
      ];
      mockGetVideoScripts.mockResolvedValue(mockScripts);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.listSystem();

      expect(result).toEqual(mockScripts);
      expect(mockGetVideoScripts).toHaveBeenCalled();
    });
  });

  describe("videoScripts.getBySlug", () => {
    it("returns script by slug (public)", async () => {
      const mockScript = {
        id: 1,
        name: "Master Script",
        slug: "master-launch",
        scriptType: "master",
        scenes: [{ sceneNumber: 1, title: "Hook", dialogue: "Test" }],
      };
      mockGetVideoScriptBySlug.mockResolvedValue(mockScript);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.getBySlug({ slug: "master-launch" });

      expect(result).toEqual(mockScript);
      expect(mockGetVideoScriptBySlug).toHaveBeenCalledWith("master-launch");
    });
  });

  describe("videoScripts.get", () => {
    it("returns script by id (public)", async () => {
      const mockScript = {
        id: 1,
        name: "Master Script",
        scriptType: "master",
      };
      mockGetVideoScriptById.mockResolvedValue(mockScript);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.get({ id: 1 });

      expect(result).toEqual(mockScript);
      expect(mockGetVideoScriptById).toHaveBeenCalledWith(1);
    });
  });

  describe("videoScripts.listMine", () => {
    it("returns user's custom scripts", async () => {
      const mockScripts = [
        { id: 10, name: "My Custom Script", scriptType: "custom", userId: 1 },
      ];
      mockGetUserVideoScripts.mockResolvedValue(mockScripts);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.listMine();

      expect(result).toEqual(mockScripts);
      expect(mockGetUserVideoScripts).toHaveBeenCalledWith(1);
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.videoScripts.listMine()).rejects.toThrow();
    });
  });

  describe("videoScripts.create", () => {
    it("creates a custom script", async () => {
      mockCreateVideoScript.mockResolvedValue({ id: 5 });

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.create({
        name: "My New Script",
        scriptType: "tiktok",
        durationSeconds: 25,
        fullScript: "Test script content",
      });

      expect(result).toEqual({ id: 5 });
      expect(mockCreateVideoScript).toHaveBeenCalledWith(expect.objectContaining({
        userId: 1,
        name: "My New Script",
        scriptType: "tiktok",
        isPublished: true,
        isSystemScript: false,
      }));
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.videoScripts.create({
        name: "Test",
        scriptType: "tiktok",
      })).rejects.toThrow();
    });
  });

  describe("videoScripts.update", () => {
    it("updates a custom script", async () => {
      mockUpdateVideoScript.mockResolvedValue({ success: true });

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.update({
        id: 5,
        name: "Updated Script Name",
        fullScript: "Updated content",
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateVideoScript).toHaveBeenCalledWith(5, 1, expect.objectContaining({
        name: "Updated Script Name",
        fullScript: "Updated content",
      }));
    });
  });

  describe("videoScripts.generate", () => {
    it("generates a script using AI", async () => {
      mockCreateVideoScript.mockResolvedValue({ id: 10 });

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videoScripts.generate({
        scriptType: "tiktok",
        topic: "Why marketing fragmentation is killing your growth",
        targetAudience: "AI entrepreneurs",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("script");
      expect(mockCreateVideoScript).toHaveBeenCalled();
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.videoScripts.generate({
        scriptType: "tiktok",
        topic: "Test topic",
      })).rejects.toThrow();
    });
  });
});

describe("systemInfluencers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSystemInfluencers.mockResolvedValue([]);
    mockGetSystemInfluencerBySlug.mockResolvedValue(null);
  });

  describe("systemInfluencers.list", () => {
    it("returns all system influencers (public)", async () => {
      const mockInfluencers = [
        { id: 1, name: "Matango", slug: "matango-official", isActive: true },
      ];
      mockGetSystemInfluencers.mockResolvedValue(mockInfluencers);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.systemInfluencers.list();

      expect(result).toEqual(mockInfluencers);
      expect(mockGetSystemInfluencers).toHaveBeenCalled();
    });
  });

  describe("systemInfluencers.getBySlug", () => {
    it("returns system influencer by slug (public)", async () => {
      const mockInfluencer = {
        id: 1,
        name: "Matango",
        slug: "matango-official",
        genderPresentation: "Female",
        ageAppearance: "28-35",
        ethnicity: "Global-neutral",
        personaDescription: "Founder-level authority",
        voiceTraits: ["Calm", "Confident"],
        behavioralConstraints: ["Short sentences"],
        cameraRules: { framing: "Chest-up" },
      };
      mockGetSystemInfluencerBySlug.mockResolvedValue(mockInfluencer);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.systemInfluencers.getBySlug({ slug: "matango-official" });

      expect(result).toEqual(mockInfluencer);
      expect(mockGetSystemInfluencerBySlug).toHaveBeenCalledWith("matango-official");
    });

    it("returns null for non-existent slug", async () => {
      mockGetSystemInfluencerBySlug.mockResolvedValue(null);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.systemInfluencers.getBySlug({ slug: "non-existent" });

      expect(result).toBeNull();
    });
  });
});
