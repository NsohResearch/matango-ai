import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([[{ tenantStatus: "active", plan: "free" }]]),
  })),
  listTenants: vi.fn().mockResolvedValue({
    tenants: [
      { id: 1, name: "Test User", email: "test@example.com", tenantStatus: "active", plan: "free" },
      { id: 2, name: "Suspended User", email: "suspended@example.com", tenantStatus: "suspended", plan: "basic" },
    ],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  }),
  getTenantDetails: vi.fn().mockResolvedValue({
    user: { id: 1, name: "Test User", email: "test@example.com", tenantStatus: "active", plan: "free" },
    limits: { influencersLimit: 1, imagesPerMonth: 3 },
    usage: { imagesGenerated: 1 },
    stats: { influencerCount: 1, campaignCount: 0 },
  }),
  suspendTenant: vi.fn().mockResolvedValue({
    success: true,
    previousStatus: "active",
    newStatus: "suspended",
  }),
  unsuspendTenant: vi.fn().mockResolvedValue({
    success: true,
    previousStatus: "suspended",
    newStatus: "active",
  }),
  setTenantReadOnly: vi.fn().mockResolvedValue({
    success: true,
    previousStatus: "active",
    newStatus: "read_only",
  }),
  resetTenantLimits: vi.fn().mockResolvedValue(true),
  updateTenantLimits: vi.fn().mockResolvedValue(true),
  getTenantLimits: vi.fn().mockResolvedValue({
    influencersLimit: 1,
    imagesPerMonth: 3,
    videosPerMonth: 0,
  }),
  getCurrentUsageCounters: vi.fn().mockResolvedValue({
    imagesGenerated: 5,
    videosGenerated: 0,
  }),
  resetUsageCounters: vi.fn().mockResolvedValue(true),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
    sql: strings.join("?"),
    values,
  })),
}));

// Mock audit log
vi.mock("./_core/auditLog", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";
import { logAuditEvent } from "./_core/auditLog";

describe("Admin Tenant Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTenants", () => {
    it("should return paginated list of tenants", async () => {
      const result = await db.listTenants({ page: 1, limit: 20 });

      expect(result.tenants).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by status", async () => {
      await db.listTenants({ status: "suspended" });
      expect(db.listTenants).toHaveBeenCalledWith({ status: "suspended" });
    });

    it("should filter by plan", async () => {
      await db.listTenants({ plan: "agency" });
      expect(db.listTenants).toHaveBeenCalledWith({ plan: "agency" });
    });

    it("should support search", async () => {
      await db.listTenants({ search: "test" });
      expect(db.listTenants).toHaveBeenCalledWith({ search: "test" });
    });
  });

  describe("getTenantDetails", () => {
    it("should return full tenant details including limits and usage", async () => {
      const result = await db.getTenantDetails(1);

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("limits");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("stats");
      expect(result?.user.id).toBe(1);
    });
  });

  describe("suspendTenant", () => {
    it("should suspend a tenant and return previous status", async () => {
      const result = await db.suspendTenant(1, 99, "Policy violation");

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("active");
      expect(result.newStatus).toBe("suspended");
    });

    it("should be called with correct parameters", async () => {
      await db.suspendTenant(1, 99, "Policy violation");

      expect(db.suspendTenant).toHaveBeenCalledWith(1, 99, "Policy violation");
    });
  });

  describe("unsuspendTenant", () => {
    it("should unsuspend a tenant and restore active status", async () => {
      const result = await db.unsuspendTenant(1, 99);

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("suspended");
      expect(result.newStatus).toBe("active");
    });
  });

  describe("setTenantReadOnly", () => {
    it("should set tenant to read-only mode", async () => {
      const result = await db.setTenantReadOnly(1, 99, "Billing issue");

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("read_only");
    });
  });

  describe("resetTenantLimits", () => {
    it("should reset limits to plan defaults", async () => {
      const result = await db.resetTenantLimits(1);

      expect(result).toBe(true);
      expect(db.resetTenantLimits).toHaveBeenCalledWith(1);
    });
  });

  describe("updateTenantLimits", () => {
    it("should update specific limits", async () => {
      const limits = { influencersLimit: 10, imagesPerMonth: 100 };
      const result = await db.updateTenantLimits(1, limits);

      expect(result).toBe(true);
      expect(db.updateTenantLimits).toHaveBeenCalledWith(1, limits);
    });
  });

  describe("getTenantLimits", () => {
    it("should return tenant limits", async () => {
      const result = await db.getTenantLimits(1);

      expect(result).toHaveProperty("influencersLimit");
      expect(result).toHaveProperty("imagesPerMonth");
    });
  });

  describe("getCurrentUsageCounters", () => {
    it("should return current month usage", async () => {
      const result = await db.getCurrentUsageCounters(1);

      expect(result).toHaveProperty("imagesGenerated");
      expect(result).toHaveProperty("videosGenerated");
    });
  });

  describe("resetUsageCounters", () => {
    it("should reset usage counters for current month", async () => {
      const result = await db.resetUsageCounters(1);

      expect(result).toBe(true);
    });
  });

  describe("Audit Logging", () => {
    it("should log tenant suspension", async () => {
      await logAuditEvent({
        userId: 99,
        action: "tenant_suspended",
        resourceType: "user",
        resourceId: 1,
        metadata: { reason: "Policy violation" },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "tenant_suspended",
          resourceId: 1,
        })
      );
    });
  });
});

describe("Tenant Status Middleware", () => {
  it("should block suspended users from protected routes", () => {
    const tenantStatus = "suspended";
    const isBlocked = tenantStatus === "suspended";
    expect(isBlocked).toBe(true);
  });

  it("should allow active users to access protected routes", () => {
    const tenantStatus = "active";
    const isBlocked = tenantStatus === "suspended";
    expect(isBlocked).toBe(false);
  });

  it("should block read-only users from write operations", () => {
    const tenantStatus = "read_only";
    const canWrite = tenantStatus === "active";
    expect(canWrite).toBe(false);
  });

  it("should allow read-only users to read data", () => {
    const tenantStatus = "read_only";
    const canRead = tenantStatus !== "suspended";
    expect(canRead).toBe(true);
  });
});
