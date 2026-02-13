import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Create mock functions
const mockGetInfluencersByUserId = vi.fn();
const mockGetInfluencerById = vi.fn();
const mockGetPublicInfluencers = vi.fn();
const mockCreateInfluencer = vi.fn();
const mockDeleteInfluencer = vi.fn();
const mockGetChatMessages = vi.fn();
const mockAddChatMessage = vi.fn();
const mockGetScheduledPosts = vi.fn();
const mockCreateScheduledPost = vi.fn();
const mockDeleteScheduledPost = vi.fn();
const mockGetScheduledPostById = vi.fn();
const mockGetLatestAnalytics = vi.fn();
const mockGetContentTemplates = vi.fn();
const mockCreateContentTemplate = vi.fn();
const mockGetCampaigns = vi.fn();
const mockGetCampaignsByInfluencer = vi.fn();
const mockCreateCampaign = vi.fn();
const mockGetNotifications = vi.fn();
const mockGetUnreadNotificationCount = vi.fn();
const mockGetNotificationPreferences = vi.fn();
const mockUpsertNotificationPreferences = vi.fn();
const mockGetCollaborators = vi.fn();
const mockGetCollaboratorsByInfluencer = vi.fn();
const mockGetSharedInfluencers = vi.fn();

// Mock the database module
vi.mock("./db", () => ({
  getInfluencersByUserId: (...args: any[]) => mockGetInfluencersByUserId(...args),
  getInfluencerById: (...args: any[]) => mockGetInfluencerById(...args),
  getPublicInfluencers: (...args: any[]) => mockGetPublicInfluencers(...args),
  createInfluencer: (...args: any[]) => mockCreateInfluencer(...args),
  deleteInfluencer: (...args: any[]) => mockDeleteInfluencer(...args),
  getChatMessages: (...args: any[]) => mockGetChatMessages(...args),
  addChatMessage: (...args: any[]) => mockAddChatMessage(...args),
  getScheduledPosts: (...args: any[]) => mockGetScheduledPosts(...args),
  createScheduledPost: (...args: any[]) => mockCreateScheduledPost(...args),
  deleteScheduledPost: (...args: any[]) => mockDeleteScheduledPost(...args),
  getScheduledPostById: (...args: any[]) => mockGetScheduledPostById(...args),
  getLatestAnalytics: (...args: any[]) => mockGetLatestAnalytics(...args),
  getContentTemplates: (...args: any[]) => mockGetContentTemplates(...args),
  createContentTemplate: (...args: any[]) => mockCreateContentTemplate(...args),
  getCampaigns: (...args: any[]) => mockGetCampaigns(...args),
  getCampaignsByInfluencer: (...args: any[]) => mockGetCampaignsByInfluencer(...args),
  createCampaign: (...args: any[]) => mockCreateCampaign(...args),
  getNotifications: (...args: any[]) => mockGetNotifications(...args),
  getUnreadNotificationCount: (...args: any[]) => mockGetUnreadNotificationCount(...args),
  getNotificationPreferences: (...args: any[]) => mockGetNotificationPreferences(...args),
  upsertNotificationPreferences: (...args: any[]) => mockUpsertNotificationPreferences(...args),
  getCollaborators: (...args: any[]) => mockGetCollaborators(...args),
  getCollaboratorsByInfluencer: (...args: any[]) => mockGetCollaboratorsByInfluencer(...args),
  getSharedInfluencers: (...args: any[]) => mockGetSharedInfluencers(...args),
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

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Hello! How can I help you today?" } }],
  }),
}));

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

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
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
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

describe("appRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock returns
    mockGetInfluencersByUserId.mockResolvedValue([]);
    mockGetInfluencerById.mockResolvedValue(null);
    mockGetPublicInfluencers.mockResolvedValue([]);
    mockCreateInfluencer.mockResolvedValue(1);
    mockDeleteInfluencer.mockResolvedValue(undefined);
    mockGetChatMessages.mockResolvedValue([]);
    mockAddChatMessage.mockResolvedValue(1);
    mockGetScheduledPosts.mockResolvedValue([]);
    mockCreateScheduledPost.mockResolvedValue(1);
    mockDeleteScheduledPost.mockResolvedValue(undefined);
    mockGetScheduledPostById.mockResolvedValue(null);
    mockGetLatestAnalytics.mockResolvedValue(null);
    mockGetContentTemplates.mockResolvedValue([]);
    mockCreateContentTemplate.mockResolvedValue(1);
    mockGetCampaigns.mockResolvedValue([]);
    mockCreateCampaign.mockResolvedValue(1);
    mockGetNotifications.mockResolvedValue([]);
    mockGetUnreadNotificationCount.mockResolvedValue(0);
    mockGetNotificationPreferences.mockResolvedValue({ emailEnabled: true, scheduledPostPublished: true, followerMilestones: true, weeklyReport: true, teamInvitations: true });
    mockUpsertNotificationPreferences.mockResolvedValue(undefined);
    mockGetCollaborators.mockResolvedValue([]);
    mockGetSharedInfluencers.mockResolvedValue([]);
  });

  describe("auth.logout", () => {
    it("clears the session cookie and reports success", async () => {
      const { ctx, clearedCookies } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(clearedCookies).toHaveLength(1);
      expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    });
  });

  describe("auth.me", () => {
    it("returns the authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.email).toBe("test@example.com");
      expect(result?.name).toBe("Test User");
    });

    it("returns null for unauthenticated users", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });

  describe("influencer.list", () => {
    it("returns influencers for authenticated user", async () => {
      const mockInfluencers = [{ id: 1, userId: 1, name: "Test Influencer" }];
      mockGetInfluencersByUserId.mockResolvedValue(mockInfluencers);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.influencer.list();

      expect(result).toEqual(mockInfluencers);
      expect(mockGetInfluencersByUserId).toHaveBeenCalledWith(1);
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.influencer.list()).rejects.toThrow();
    });
  });

  describe("influencer.get", () => {
    it("returns influencer by id", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test Influencer" };
      mockGetInfluencerById.mockResolvedValue(mockInfluencer);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.influencer.get({ id: 1 });

      expect(result).toEqual(mockInfluencer);
      expect(mockGetInfluencerById).toHaveBeenCalledWith(1);
    });
  });

  describe("influencer.getPublic", () => {
    it("returns public influencers", async () => {
      const mockInfluencers = [{ id: 1, userId: 1, name: "Public Influencer", isPublic: true }];
      mockGetPublicInfluencers.mockResolvedValue(mockInfluencers);

      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.influencer.getPublic();

      expect(result).toEqual(mockInfluencers);
    });
  });

  describe("influencer.create", () => {
    it("creates influencer for authenticated user", async () => {
      mockCreateInfluencer.mockResolvedValue(1);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.influencer.create({
        name: "New Influencer",
        bio: "Test bio",
      });

      expect(result).toEqual({ id: 1 });
      expect(mockCreateInfluencer).toHaveBeenCalled();
    });
  });

  describe("influencer.delete", () => {
    it("deletes influencer owned by user", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test Influencer" };
      mockGetInfluencerById.mockResolvedValue(mockInfluencer);
      mockDeleteInfluencer.mockResolvedValue(undefined);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.influencer.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      expect(mockDeleteInfluencer).toHaveBeenCalledWith(1);
    });

    it("throws error when deleting influencer not owned by user", async () => {
      const mockInfluencer = { id: 1, userId: 2, name: "Test Influencer" };
      mockGetInfluencerById.mockResolvedValue(mockInfluencer);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.influencer.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("chat.getMessages", () => {
    it("returns chat messages for an influencer", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test" };
      const mockMessages = [
        { id: 1, influencerId: 1, userId: 1, role: "user", content: "Hello", createdAt: new Date() },
        { id: 2, influencerId: 1, userId: 1, role: "assistant", content: "Hi!", createdAt: new Date() },
      ];

      mockGetInfluencerById.mockResolvedValue(mockInfluencer);
      mockGetChatMessages.mockResolvedValue(mockMessages);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.chat.getMessages({ influencerId: 1 });

      expect(result).toHaveLength(2);
      expect(mockGetChatMessages).toHaveBeenCalled();
    });

    it("throws error if influencer not owned by user", async () => {
      mockGetInfluencerById.mockResolvedValue({ id: 1, userId: 2, name: "Test" });

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.chat.getMessages({ influencerId: 1 })).rejects.toThrow();
    });
  });

  describe("chat.sendMessage", () => {
    it("sends a message and gets AI response", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test", personality: "friendly" };

      mockGetInfluencerById.mockResolvedValue(mockInfluencer);
      mockAddChatMessage.mockResolvedValue(1);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.chat.sendMessage({ influencerId: 1, message: "Hello!" });

      expect(result).toHaveProperty("response");
      expect(typeof result.response).toBe("string");
    });
  });

  describe("schedule.list", () => {
    it("returns scheduled posts for user", async () => {
      const mockPosts = [
        { id: 1, userId: 1, influencerId: 1, platform: "instagram", scheduledFor: new Date() },
      ];

      mockGetScheduledPosts.mockResolvedValue(mockPosts);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.schedule.list();

      expect(result).toEqual(mockPosts);
      expect(mockGetScheduledPosts).toHaveBeenCalledWith(1);
    });
  });

  describe("schedule.create", () => {
    it("creates a scheduled post", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test" };

      mockGetInfluencerById.mockResolvedValue(mockInfluencer);
      mockCreateScheduledPost.mockResolvedValue(1);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const result = await caller.schedule.create({
        influencerId: 1,
        platform: "instagram",
        caption: "Test caption",
        scheduledFor: futureDate.toISOString(),
      });

      expect(result).toHaveProperty("id");
      expect(mockCreateScheduledPost).toHaveBeenCalled();
    });
  });

  describe("schedule.delete", () => {
    it("deletes a scheduled post", async () => {
      const mockPost = { id: 1, userId: 1, influencerId: 1 };

      mockGetScheduledPostById.mockResolvedValue(mockPost);
      mockDeleteScheduledPost.mockResolvedValue(undefined);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.schedule.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      expect(mockDeleteScheduledPost).toHaveBeenCalledWith(1);
    });

    it("throws error if post not owned by user", async () => {
      mockGetScheduledPostById.mockResolvedValue({ id: 1, userId: 2 });

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.schedule.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("analytics.getOverview", () => {
    it("returns analytics overview for an influencer", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test", stats: { followers: 1000, likes: 500, posts: 10 } };
      const mockAnalytics = {
        followers: 1200,
        followersGain: 50,
        likes: 600,
        views: 10000,
        engagementRate: 500,
        postsCount: 12,
      };

      mockGetInfluencerById.mockResolvedValue(mockInfluencer);
      mockGetLatestAnalytics.mockResolvedValue(mockAnalytics);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getOverview({ influencerId: 1 });

      expect(result).toHaveProperty("followers");
      expect(result).toHaveProperty("engagementRate");
    });

    it("returns default values if no analytics data", async () => {
      const mockInfluencer = { id: 1, userId: 1, name: "Test", stats: { followers: 1000, likes: 500, posts: 10 } };

      mockGetInfluencerById.mockResolvedValue(mockInfluencer);
      mockGetLatestAnalytics.mockResolvedValue(null);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getOverview({ influencerId: 1 });

      expect(result.followers).toBe(1000);
      expect(result.likes).toBe(500);
    });
  });

  describe("analytics.getDashboard", () => {
    it("returns dashboard analytics for all influencers", async () => {
      const mockInfluencers = [
        { id: 1, userId: 1, name: "Test1", stats: { followers: 1000, likes: 500, posts: 10 } },
        { id: 2, userId: 1, name: "Test2", stats: { followers: 2000, likes: 800, posts: 20 } },
      ];

      mockGetInfluencersByUserId.mockResolvedValue(mockInfluencers);

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getDashboard();

      expect(result.totalInfluencers).toBe(2);
      expect(result.totalFollowers).toBe(3000);
      expect(result.totalLikes).toBe(1300);
      expect(result.totalPosts).toBe(30);
    });
  });
});

describe("templates routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContentTemplates.mockResolvedValue([]);
    mockCreateContentTemplate.mockResolvedValue(1);
  });

  it("lists templates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a custom template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.create({
      name: "My Template",
      category: "fashion",
      promptTemplate: "A photo of {{influencer}} wearing...",
      captionTemplate: "Check out my new look!",
    });

    expect(result).toHaveProperty("id");
  });
});

describe("campaigns routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCampaigns.mockResolvedValue([]);
    mockGetCampaignsByInfluencer.mockResolvedValue([]);
    mockCreateCampaign.mockResolvedValue(1);
    mockGetInfluencerById.mockResolvedValue({ id: 1, userId: 1, name: "Test" });
  });

  it("lists campaigns for an influencer", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.list({ influencerId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a campaign", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.create({
      influencerId: 1,
      name: "Summer Campaign",
      description: "Beach photos",
    });

    expect(result).toHaveProperty("id");
  });

  it("throws error for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.campaigns.list({ influencerId: 1 })).rejects.toThrow();
  });
});

describe("notifications routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotifications.mockResolvedValue([]);
    mockGetUnreadNotificationCount.mockResolvedValue(0);
    mockGetNotificationPreferences.mockResolvedValue({ 
      emailEnabled: true, 
      scheduledPostPublished: true, 
      followerMilestones: true, 
      weeklyReport: true, 
      teamInvitations: true 
    });
  });

  it("lists notifications", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.list({ limit: 10 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("gets unread count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.unreadCount();

    expect(typeof result).toBe("number");
  });

  it("gets preferences", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.getPreferences();

    expect(result).toHaveProperty("emailEnabled");
  });

  it("updates preferences", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.updatePreferences({ emailEnabled: false });

    expect(result).toEqual({ success: true });
  });
});

describe("collaborators routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCollaborators.mockResolvedValue([]);
    mockGetCollaboratorsByInfluencer.mockResolvedValue([]);
    mockGetSharedInfluencers.mockResolvedValue([]);
    mockGetInfluencerById.mockResolvedValue({ id: 1, userId: 1, name: "Test" });
  });

  it("lists collaborators for an influencer", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.collaborators.list({ influencerId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("gets shared influencers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.collaborators.getSharedInfluencers();

    expect(Array.isArray(result)).toBe(true);
  });

  it("throws error for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.collaborators.list({ influencerId: 1 })).rejects.toThrow();
  });
});
