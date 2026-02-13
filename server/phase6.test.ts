import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module with correct function names
vi.mock("./db", () => ({
  // Social connections mocks
  getSocialConnectionsByUser: vi.fn(),
  createSocialConnection: vi.fn(),
  updateSocialConnection: vi.fn(),
  deleteSocialConnection: vi.fn(),
  getSocialPostsByUser: vi.fn(),
  createSocialPost: vi.fn(),
  
  // A/B testing mocks (correct camelCase names)
  getAbTestsByUser: vi.fn(),
  getAbTestById: vi.fn(),
  createAbTest: vi.fn(),
  updateAbTestStatus: vi.fn(),
  getAbTestVariants: vi.fn(),
  createAbTestVariant: vi.fn(),
  updateAbTestVariantMetrics: vi.fn(),
  setAbTestWinner: vi.fn(),
  
  // White label mocks (correct function names)
  getWhiteLabelSettingsByUser: vi.fn(),
  createWhiteLabelSettings: vi.fn(),
  updateWhiteLabelSettings: vi.fn(),
  getClientWorkspacesByWhiteLabel: vi.fn(),
  createClientWorkspace: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Social Connections Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getSocialConnectionsByUser as any).mockResolvedValue([]);
  });

  it("lists social connections for authenticated user", async () => {
    const mockConnections = [
      { id: 1, userId: 1, platform: "instagram", accountName: "@testuser", isActive: true },
      { id: 2, userId: 1, platform: "youtube", accountName: "Test Channel", isActive: true },
    ];
    (db.getSocialConnectionsByUser as any).mockResolvedValue(mockConnections);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.socialConnections.list();

    expect(result).toEqual(mockConnections);
    expect(db.getSocialConnectionsByUser).toHaveBeenCalledWith(1);
  });

  it("creates a new social connection", async () => {
    const mockConnection = {
      id: 1,
      userId: 1,
      platform: "facebook",
      accountName: "Test Page",
      accountId: "123456",
      isActive: true,
    };
    (db.createSocialConnection as any).mockResolvedValue(mockConnection);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.socialConnections.create({
      platform: "facebook",
      accountName: "Test Page",
      accountId: "123456",
    });

    expect(result).toEqual(mockConnection);
    expect(db.createSocialConnection).toHaveBeenCalled();
  });

  it("disconnects a social connection", async () => {
    (db.deleteSocialConnection as any).mockResolvedValue({ success: true });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.socialConnections.disconnect({ id: 1 });

    expect(result).toEqual({ success: true });
    // The function is called with both id and userId
    expect(db.deleteSocialConnection).toHaveBeenCalledWith(1, 1);
  });
});

describe("A/B Testing Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getAbTestsByUser as any).mockResolvedValue([]);
    (db.getAbTestVariants as any).mockResolvedValue([]);
  });

  it("lists A/B tests for authenticated user", async () => {
    const mockTests = [
      { id: 1, userId: 1, name: "Caption Test", status: "running", testType: "caption" },
      { id: 2, userId: 1, name: "Image Test", status: "draft", testType: "image" },
    ];
    (db.getAbTestsByUser as any).mockResolvedValue(mockTests);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.list();

    expect(result).toEqual(mockTests);
    expect(db.getAbTestsByUser).toHaveBeenCalledWith(1);
  });

  it("creates a new A/B test", async () => {
    const mockTest = {
      id: 1,
      userId: 1,
      name: "New Test",
      testType: "caption",
      targetMetric: "engagement",
      status: "draft",
    };
    (db.createAbTest as any).mockResolvedValue(mockTest);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.create({
      name: "New Test",
      testType: "caption",
      targetMetric: "engagement",
    });

    expect(result).toEqual(mockTest);
    expect(db.createAbTest).toHaveBeenCalled();
  });

  it("gets A/B test with variants", async () => {
    const mockTest = {
      id: 1,
      userId: 1,
      name: "Test",
      status: "running",
      testType: "caption",
    };
    const mockVariants = [
      { id: 1, abTestId: 1, name: "Control", isControl: true, impressions: 100 },
      { id: 2, abTestId: 1, name: "Variant B", isControl: false, impressions: 100 },
    ];
    (db.getAbTestById as any).mockResolvedValue(mockTest);
    (db.getAbTestVariants as any).mockResolvedValue(mockVariants);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.get({ id: 1 });

    expect(result.name).toBe("Test");
    expect(result.variants).toEqual(mockVariants);
  });

  it("adds a variant to an A/B test", async () => {
    const mockVariant = {
      id: 1,
      abTestId: 1,
      name: "Variant A",
      isControl: true,
      trafficPercentage: 50,
    };
    (db.getAbTestById as any).mockResolvedValue({ id: 1, userId: 1 });
    (db.createAbTestVariant as any).mockResolvedValue(mockVariant);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.addVariant({
      abTestId: 1,
      name: "Variant A",
      isControl: true,
      trafficPercentage: 50,
    });

    expect(result).toEqual(mockVariant);
  });

  it("starts an A/B test", async () => {
    (db.getAbTestById as any).mockResolvedValue({ id: 1, userId: 1, status: "draft" });
    (db.getAbTestVariants as any).mockResolvedValue([
      { id: 1, name: "Control" },
      { id: 2, name: "Variant B" },
    ]);
    (db.updateAbTestStatus as any).mockResolvedValue({ id: 1, status: "running" });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.start({ id: 1 });

    // The route returns { success: true } on successful start
    expect(result.success).toBe(true);
  });

  it("pauses an A/B test", async () => {
    (db.getAbTestById as any).mockResolvedValue({ id: 1, userId: 1, status: "running" });
    (db.updateAbTestStatus as any).mockResolvedValue({ id: 1, status: "paused" });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.pause({ id: 1 });

    // The route returns { success: true } on successful pause
    expect(result.success).toBe(true);
  });

  it("gets insights for an A/B test", async () => {
    const mockTest = {
      id: 1,
      userId: 1,
      name: "Test",
      status: "running",
      minSampleSize: 100,
    };
    const mockVariants = [
      { id: 1, name: "Control", isControl: true, impressions: 150, engagements: 15 },
      { id: 2, name: "Variant B", isControl: false, impressions: 150, engagements: 20 },
    ];
    (db.getAbTestById as any).mockResolvedValue(mockTest);
    (db.getAbTestVariants as any).mockResolvedValue(mockVariants);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.abTests.getInsights({ id: 1 });

    expect(result.leadingVariant).toBe("Variant B");
    expect(result.totalImpressions).toBe(300);
    expect(result.insights.length).toBeGreaterThan(0);
  });
});

describe("White Label Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getWhiteLabelSettingsByUser as any).mockResolvedValue(null);
    (db.getClientWorkspacesByWhiteLabel as any).mockResolvedValue([]);
  });

  it("gets white label settings for authenticated user", async () => {
    const mockSettings = {
      id: 1,
      userId: 1,
      brandName: "My Agency",
      primaryColor: "#FF0000",
      isActive: true,
    };
    (db.getWhiteLabelSettingsByUser as any).mockResolvedValue(mockSettings);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whiteLabel.get();

    expect(result).toEqual(mockSettings);
    expect(db.getWhiteLabelSettingsByUser).toHaveBeenCalledWith(1);
  });

  it("creates white label settings", async () => {
    const mockSettings = {
      id: 1,
      userId: 1,
      brandName: "New Agency",
      primaryColor: "#CCFF00",
      isActive: true,
    };
    (db.createWhiteLabelSettings as any).mockResolvedValue(mockSettings);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whiteLabel.create({
      brandName: "New Agency",
      primaryColor: "#CCFF00",
    });

    expect(result).toEqual(mockSettings);
    expect(db.createWhiteLabelSettings).toHaveBeenCalled();
  });

  it("updates white label settings", async () => {
    (db.getWhiteLabelSettingsByUser as any).mockResolvedValue({ id: 1, userId: 1 });
    (db.updateWhiteLabelSettings as any).mockResolvedValue({ success: true });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whiteLabel.update({
      id: 1,
      brandName: "Updated Agency",
      primaryColor: "#00FF00",
    });

    // The route returns { success: true } on successful update
    expect(result.success).toBe(true);
  });

  it("lists client workspaces", async () => {
    const mockClients = [
      { id: 1, whiteLabelId: 1, clientName: "Client A", isActive: true },
      { id: 2, whiteLabelId: 1, clientName: "Client B", isActive: true },
    ];
    (db.getWhiteLabelSettingsByUser as any).mockResolvedValue({ id: 1, userId: 1 });
    (db.getClientWorkspacesByWhiteLabel as any).mockResolvedValue(mockClients);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whiteLabel.listClients({ whiteLabelId: 1 });

    expect(result).toEqual(mockClients);
    expect(db.getClientWorkspacesByWhiteLabel).toHaveBeenCalledWith(1);
  });

  it("creates a client workspace", async () => {
    const mockClient = {
      id: 1,
      whiteLabelId: 1,
      clientName: "New Client",
      clientEmail: "client@example.com",
      isActive: true,
    };
    (db.getWhiteLabelSettingsByUser as any).mockResolvedValue({ id: 1, userId: 1 });
    (db.createClientWorkspace as any).mockResolvedValue(mockClient);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whiteLabel.createClient({
      whiteLabelId: 1,
      clientName: "New Client",
      clientEmail: "client@example.com",
    });

    expect(result).toEqual(mockClient);
  });
});
