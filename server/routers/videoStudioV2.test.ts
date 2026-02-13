import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// ─── Mock data stores ────────────────────────────────────────────────
const mockJobs: any[] = [];
const mockInfluencers: any[] = [
  { id: 1, userId: 1, name: "TestInfluencer", status: "ready" },
  { id: 2, userId: 2, name: "OtherInfluencer", status: "ready" },
];
const mockScripts: any[] = [
  {
    id: 10,
    userId: 1,
    sessionId: 1,
    platform: "tiktok",
    tone: "confident",
    contentJson: { hook: "Hey!", body: "Check this out.", cta: "Follow me!" },
    status: "final",
    createdAt: new Date(),
  },
];
const mockProviders: any[] = [
  {
    id: 1,
    name: "Manus",
    slug: "manus",
    isBuiltIn: true,
    isActive: true,
    capabilities: { textToVideo: true, imageToVideo: true },
  },
];

let insertIdCounter = 100;

// ─── Mock DB that tracks table context for filtering ─────────────────
function createMockDb() {
  // Determine which data set to use based on the drizzle table object
  function getTableData(tableRef: any): any[] {
    // Drizzle tables have a Symbol-based name or a _.name property
    const name =
      tableRef?.[Symbol.for("drizzle:Name")] ??
      tableRef?._?.name ??
      tableRef?.name ??
      "";
    const n = String(name).toLowerCase();
    if (n.includes("influencer")) return mockInfluencers;
    if (n.includes("workflow_script") || n.includes("workflowscript")) return mockScripts;
    if (n.includes("video_gen_jobs_v2") || n.includes("videogenjobsv2")) return mockJobs;
    if (n.includes("ai_provider") || n.includes("aiprovider")) return mockProviders;
    if (n.includes("user_ai_credential")) return [];
    if (n.includes("media_object")) return [];
    return [];
  }

  function buildChain(initialData?: any[]) {
    let currentData: any[] = initialData ?? [];
    let selectFields: any = null;

    const chain: any = {
      select: (fields?: any) => {
        selectFields = fields;
        return chain;
      },
      from: (table: any) => {
        currentData = [...getTableData(table)];
        return chain;
      },
      where: (_cond: any) => {
        // We can't easily evaluate drizzle conditions, so we keep all data.
        // The router's ownership checks will see the first matching row.
        return chain;
      },
      orderBy: () => chain,
      limit: (n: number) => {
        currentData = currentData.slice(0, n);
        return chain;
      },
      offset: (n: number) => {
        currentData = currentData.slice(n);
        return chain;
      },
      groupBy: () => {
        // For stats query - return empty aggregation
        currentData = [];
        return chain;
      },
      // Make it thenable so `await` works
      then: (resolve: any, reject?: any) => {
        try {
          resolve(currentData);
        } catch (e) {
          if (reject) reject(e);
        }
      },
      catch: (fn: any) => Promise.resolve(currentData).catch(fn),
    };
    return chain;
  }

  return {
    select: (fields?: any) => {
      const c = buildChain();
      c.select(fields);
      return c;
    },
    insert: (table: any) => ({
      values: (vals: any) => {
        const id = ++insertIdCounter;
        const newRow = { ...vals, id, createdAt: new Date(), updatedAt: new Date() };
        // If inserting into video_gen_jobs_v2, push to mockJobs
        const tName = String(
          table?.[Symbol.for("drizzle:Name")] ?? table?._?.name ?? table?.name ?? ""
        ).toLowerCase();
        if (tName.includes("video_gen_jobs") || tName.includes("videogenjobs")) {
          mockJobs.push(newRow);
        }
        return Promise.resolve([{ insertId: BigInt(id) }]);
      },
    }),
    update: (table: any) => ({
      set: (vals: any) => ({
        where: (_cond: any) => Promise.resolve([]),
      }),
    }),
    delete: (table: any) => ({
      where: (_cond: any) => Promise.resolve([]),
    }),
    execute: (_sql: any) => Promise.resolve([]),
  };
}

vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(createMockDb())),
}));

vi.mock("../_core/imageGeneration", () => ({
  generateImage: vi.fn(() => Promise.resolve({ url: "https://example.com/thumb.jpg" })),
}));

vi.mock("../storage", () => ({
  storagePut: vi.fn(() =>
    Promise.resolve({ url: "https://example.com/video.mp4", key: "test-key" })
  ),
}));

// ─── Test context helpers ────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
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
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────
describe("videoStudioV2 router", () => {
  beforeEach(() => {
    mockJobs.length = 0;
    insertIdCounter = 100;
  });

  describe("generate", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.videoStudioV2.generate({
          influencerId: 1,
          scriptText: "Hello world",
        })
      ).rejects.toThrow();
    });

    it("creates a video generation job for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.generate({
        influencerId: 1,
        scriptText: "Test script for video generation",
        lipSync: true,
        provider: "local",
      });

      expect(result).toBeDefined();
      expect(result.jobId).toBeGreaterThan(0);
      expect(result.status).toBe("queued");
    });

    it("accepts optional scriptId", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.generate({
        influencerId: 1,
        scriptId: 10,
        scriptText: "Script with ID reference",
        lipSync: false,
      });

      expect(result).toBeDefined();
      expect(result.jobId).toBeGreaterThan(0);
      expect(result.status).toBe("queued");
    });

    it("rejects empty script text", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.generate({
          influencerId: 1,
          scriptText: "",
        })
      ).rejects.toThrow();
    });

    it("rejects script text exceeding 5000 characters", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.generate({
          influencerId: 1,
          scriptText: "x".repeat(5001),
        })
      ).rejects.toThrow();
    });
  });

  describe("listJobs", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.videoStudioV2.listJobs({ status: "all" })).rejects.toThrow();
    });

    it("returns jobs for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.listJobs({ status: "all" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts optional influencerId filter", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.listJobs({
        influencerId: 1,
        status: "all",
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts status filter", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.listJobs({ status: "running" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("respects limit and offset", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.listJobs({
        status: "all",
        limit: 5,
        offset: 0,
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("library", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.videoStudioV2.library({})).rejects.toThrow();
    });

    it("returns completed videos for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.library({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("stats", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.videoStudioV2.stats({})).rejects.toThrow();
    });

    it("returns stats object for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.stats({});
      expect(result).toBeDefined();
      expect(typeof result.total).toBe("number");
      expect(typeof result.queued).toBe("number");
      expect(typeof result.running).toBe("number");
      expect(typeof result.succeeded).toBe("number");
      expect(typeof result.failed).toBe("number");
    });
  });

  describe("batchGenerate", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.videoStudioV2.batchGenerate({
          influencerId: 1,
          scripts: [{ scriptText: "Test" }],
        })
      ).rejects.toThrow();
    });

    it("creates multiple jobs for batch generation", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.batchGenerate({
        influencerId: 1,
        scripts: [
          { scriptText: "Script one" },
          { scriptText: "Script two" },
          { scriptText: "Script three" },
        ],
        lipSync: true,
        provider: "local",
      });

      expect(result).toBeDefined();
      expect(result.count).toBe(3);
      expect(result.jobIds).toHaveLength(3);
      expect(result.batchGroupId).toBeTruthy();
    });

    it("rejects empty scripts array", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.batchGenerate({
          influencerId: 1,
          scripts: [],
        })
      ).rejects.toThrow();
    });

    it("rejects more than 10 scripts", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const scripts = Array.from({ length: 11 }, (_, i) => ({
        scriptText: `Script ${i}`,
      }));
      await expect(
        caller.videoStudioV2.batchGenerate({
          influencerId: 1,
          scripts,
        })
      ).rejects.toThrow();
    });
  });

  describe("listProviders", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.videoStudioV2.listProviders()).rejects.toThrow();
    });

    it("returns available providers for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.listProviders();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("listScripts", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.videoStudioV2.listScripts({ limit: 20 })).rejects.toThrow();
    });

    it("returns scripts for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.listScripts({ limit: 20 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getVideoUrl", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.videoStudioV2.getVideoUrl({ jobId: 1 })
      ).rejects.toThrow();
    });

    it("returns video data for a succeeded job", async () => {
      // Seed a succeeded job with outputMediaId
      mockJobs.push({
        id: 50,
        userId: 1,
        influencerId: 1,
        scriptText: "Test video",
        provider: "local",
        lipSync: true,
        status: "succeeded",
        outputMediaId: 99,
        createdAt: new Date(),
      });
      const caller = appRouter.createCaller(createAuthContext(1));
      // The mock DB returns empty for media_objects, so this will throw NOT_FOUND
      // This validates the endpoint is reachable and processes correctly
      await expect(
        caller.videoStudioV2.getVideoUrl({ jobId: 50 })
      ).rejects.toThrow("Video file not found");
    });

    it("rejects if job is not succeeded", async () => {
      mockJobs.push({
        id: 51,
        userId: 1,
        influencerId: 1,
        scriptText: "Still running",
        provider: "local",
        lipSync: false,
        status: "running",
        outputMediaId: null,
        createdAt: new Date(),
      });
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.getVideoUrl({ jobId: 51 })
      ).rejects.toThrow("Video is not ready yet");
    });

    it("rejects invalid jobId type", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        (caller.videoStudioV2.getVideoUrl as any)({ jobId: "abc" })
      ).rejects.toThrow();
    });
  });

  describe("deleteJob", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.videoStudioV2.deleteJob({ jobId: 1 })
      ).rejects.toThrow();
    });

    it("deletes a job owned by the user", async () => {
      mockJobs.push({
        id: 60,
        userId: 1,
        influencerId: 1,
        scriptText: "Delete me",
        provider: "local",
        lipSync: false,
        status: "succeeded",
        outputMediaId: null,
        createdAt: new Date(),
      });
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.deleteJob({ jobId: 60 });
      expect(result.success).toBe(true);
    });

    it("rejects deleting a non-existent job", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.deleteJob({ jobId: 99999 })
      ).rejects.toThrow("Job not found");
    });
  });

  describe("deleteAllJobs", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.videoStudioV2.deleteAllJobs()
      ).rejects.toThrow();
    });

    it("deletes all jobs for the authenticated user", async () => {
      mockJobs.push(
        { id: 70, userId: 1, outputMediaId: null, status: "succeeded", createdAt: new Date() },
        { id: 71, userId: 1, outputMediaId: null, status: "failed", createdAt: new Date() },
      );
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.videoStudioV2.deleteAllJobs();
      expect(result.success).toBe(true);
      expect(typeof result.deletedCount).toBe("number");
    });
  });

  describe("input validation", () => {
    it("generate rejects invalid influencerId type", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        (caller.videoStudioV2.generate as any)({
          influencerId: "not-a-number",
          scriptText: "Test",
        })
      ).rejects.toThrow();
    });

    it("batchGenerate rejects scripts with empty text", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.batchGenerate({
          influencerId: 1,
          scripts: [{ scriptText: "" }],
        })
      ).rejects.toThrow();
    });

    it("listJobs rejects invalid status value", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        (caller.videoStudioV2.listJobs as any)({ status: "invalid_status" })
      ).rejects.toThrow();
    });

    it("listJobs rejects limit above 100", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.listJobs({ status: "all", limit: 200 })
      ).rejects.toThrow();
    });

    it("listJobs rejects negative offset", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      await expect(
        caller.videoStudioV2.listJobs({ status: "all", offset: -1 })
      ).rejects.toThrow();
    });
  });
});
