import { describe, it, expect, vi, beforeEach } from "vitest";

// Resolve queue for sequential awaits
let resolveQueue: any[] = [];

// Build a chainable mock where every method returns a NEW thenable chain
// The key: the db object itself must NOT be thenable (so `await getDb()` works),
// but the result of calling any method IS thenable (so `await db.select().from()...` works).
function makeChainDb() {
  function makeThenable(): any {
    const obj: any = {};
    const methods = [
      "select", "from", "where", "orderBy", "limit", "offset",
      "groupBy", "insert", "values", "update", "set", "delete",
    ];
    for (const m of methods) {
      obj[m] = vi.fn(() => makeThenable());
    }
    // Make this thenable so `await` pops from queue
    obj.then = function (resolve: any, reject?: any) {
      const val = resolveQueue.shift();
      return Promise.resolve(val).then(resolve, reject);
    };
    return obj;
  }

  // The db object itself is NOT thenable (no .then), but its methods return thenables
  const db: any = {};
  const methods = [
    "select", "from", "where", "orderBy", "limit", "offset",
    "groupBy", "insert", "values", "update", "set", "delete",
  ];
  for (const m of methods) {
    db[m] = vi.fn(() => makeThenable());
  }
  return db;
}

let chainDb: ReturnType<typeof makeChainDb>;

vi.mock("../db", () => ({
  getDb: vi.fn(async () => chainDb),
}));

vi.mock("../../drizzle/schema", () => ({
  leads: {
    id: "id",
    organizationId: "organizationId",
    email: "email",
    name: "name",
    company: "company",
    role: "role",
    source: "source",
    stage: "stage",
    notes: "notes",
    utmSource: "utmSource",
    utmMedium: "utmMedium",
    utmCampaign: "utmCampaign",
    lastContactedAt: "lastContactedAt",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
  desc: vi.fn((...args: any[]) => ({ type: "desc", args })),
  like: vi.fn((...args: any[]) => ({ type: "like", args })),
  or: vi.fn((...args: any[]) => ({ type: "or", args })),
  count: vi.fn(() => "count"),
}));

import { leadsRouter } from "./leads";
import { getDb } from "../db";

function createCaller(userId = 30001) {
  const ctx = {
    user: { id: userId, name: "Test User", email: "test@example.com", role: "user" },
    req: { headers: {} } as any,
    res: {} as any,
  };
  return (leadsRouter as any).createCaller(ctx);
}

function createUnauthCaller() {
  const ctx = {
    user: null,
    req: { headers: {} } as any,
    res: {} as any,
  };
  return (leadsRouter as any).createCaller(ctx);
}

describe("leadsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveQueue = [];
    chainDb = makeChainDb();
    (getDb as any).mockImplementation(async () => chainDb);
  });

  describe("list", () => {
    it("returns leads for authenticated user", async () => {
      const mockLeads = [
        { id: 1, email: "lead1@test.com", name: "Lead 1", stage: "new", organizationId: 30001, createdAt: new Date() },
        { id: 2, email: "lead2@test.com", name: "Lead 2", stage: "qualified", organizationId: 30001, createdAt: new Date() },
      ];

      // First await (rows), second await (count)
      resolveQueue = [mockLeads, [{ total: 2 }]];

      const caller = createCaller();
      const result = await caller.list({});

      expect(result.leads).toEqual(mockLeads);
      expect(result.total).toBe(2);
    });

    it("returns empty when db is unavailable", async () => {
      (getDb as any).mockResolvedValueOnce(null);

      const caller = createCaller();
      const result = await caller.list({});

      expect(result.leads).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createUnauthCaller();
      await expect(caller.list({})).rejects.toThrow();
    });

    it("supports search filter", async () => {
      resolveQueue = [[], [{ total: 0 }]];

      const caller = createCaller();
      const result = await caller.list({ search: "test" });

      expect(result.leads).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("supports stage filter", async () => {
      resolveQueue = [[], [{ total: 0 }]];

      const caller = createCaller();
      const result = await caller.list({ stage: "qualified" });

      expect(result.leads).toEqual([]);
    });
  });

  describe("stats", () => {
    it("returns aggregated stats", async () => {
      resolveQueue = [
        [{ total: 10 }],
        [
          { stage: "new", cnt: 3 },
          { stage: "qualified", cnt: 4 },
          { stage: "won", cnt: 2 },
          { stage: "lost", cnt: 1 },
        ],
      ];

      const caller = createCaller();
      const result = await caller.stats();

      expect(result.total).toBe(10);
      expect(result.new).toBe(3);
      expect(result.qualified).toBe(4);
      expect(result.won).toBe(2);
      expect(result.lost).toBe(1);
      expect(result.conversionRate).toBe(20);
    });

    it("returns zeros when db is unavailable", async () => {
      (getDb as any).mockResolvedValueOnce(null);

      const caller = createCaller();
      const result = await caller.stats();

      expect(result.total).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  describe("create", () => {
    it("creates a new lead", async () => {
      resolveQueue = [[{ insertId: 1 }]];

      const caller = createCaller();
      const result = await caller.create({
        email: "newlead@test.com",
        name: "New Lead",
        company: "Test Corp",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe(1);
    });

    it("rejects invalid email", async () => {
      const caller = createCaller();
      await expect(caller.create({ email: "not-an-email" })).rejects.toThrow();
    });

    it("rejects unauthenticated users", async () => {
      const caller = createUnauthCaller();
      await expect(caller.create({ email: "test@test.com" })).rejects.toThrow();
    });
  });

  describe("updateStage", () => {
    it("updates lead stage for owned lead", async () => {
      resolveQueue = [
        [{ id: 1, organizationId: 30001, stage: "new" }],
        [],
      ];

      const caller = createCaller();
      const result = await caller.updateStage({ id: 1, stage: "contacted" });

      expect(result.success).toBe(true);
    });

    it("rejects update for non-existent lead", async () => {
      resolveQueue = [[]];

      const caller = createCaller();
      await expect(caller.updateStage({ id: 999, stage: "contacted" })).rejects.toThrow("Lead not found");
    });

    it("rejects invalid stage", async () => {
      const caller = createCaller();
      await expect(caller.updateStage({ id: 1, stage: "invalid" as any })).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates lead fields for owned lead", async () => {
      resolveQueue = [
        [{ id: 1, organizationId: 30001 }],
        [],
      ];

      const caller = createCaller();
      const result = await caller.update({ id: 1, name: "Updated Name", company: "New Corp" });

      expect(result.success).toBe(true);
    });

    it("rejects update for non-existent lead", async () => {
      resolveQueue = [[]];

      const caller = createCaller();
      await expect(caller.update({ id: 999, name: "Test" })).rejects.toThrow("Lead not found");
    });
  });

  describe("delete", () => {
    it("deletes an owned lead", async () => {
      resolveQueue = [
        [{ id: 1, organizationId: 30001 }],
        [],
      ];

      const caller = createCaller();
      const result = await caller.delete({ id: 1 });

      expect(result.success).toBe(true);
    });

    it("rejects delete for non-existent lead", async () => {
      resolveQueue = [[]];

      const caller = createCaller();
      await expect(caller.delete({ id: 999 })).rejects.toThrow("Lead not found");
    });

    it("rejects unauthenticated delete", async () => {
      const caller = createUnauthCaller();
      await expect(caller.delete({ id: 1 })).rejects.toThrow();
    });
  });
});
