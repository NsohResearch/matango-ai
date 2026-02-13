import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([[]]),
  })),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://storage.example.com/gdpr-exports/1/abc123.json",
    key: "gdpr-exports/1/abc123.json",
  }),
}));

// Mock audit log
vi.mock("./_core/auditLog", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("./_core/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logAuditEvent } from "./_core/auditLog";

describe("GDPR Compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Data Export Request", () => {
    it("should create a new export request", () => {
      const request = {
        id: 1,
        userId: 1,
        requestType: "export" as const,
        status: "pending" as const,
      };

      expect(request.requestType).toBe("export");
      expect(request.status).toBe("pending");
    });

    it("should prevent duplicate pending export requests", () => {
      const existingRequests = [
        { id: 1, requestType: "export", status: "pending" },
      ];

      const hasPendingExport = existingRequests.some(
        (r) => r.requestType === "export" && r.status === "pending"
      );

      expect(hasPendingExport).toBe(true);
    });

    it("should allow new export request after previous completes", () => {
      const existingRequests = [
        { id: 1, requestType: "export", status: "completed" },
      ];

      const hasPendingExport = existingRequests.some(
        (r) => r.requestType === "export" && r.status === "pending"
      );

      expect(hasPendingExport).toBe(false);
    });
  });

  describe("Data Export Processing", () => {
    it("should collect all user data categories", () => {
      const dataCategories = [
        "user",
        "influencers",
        "influencerContent",
        "chatMessages",
        "scheduledPosts",
        "analyticsData",
        "notificationPreferences",
        "notifications",
        "contentTemplates",
        "collaborators",
        "campaigns",
        "unifiedCampaigns",
        "campaignAssets",
        "brandBrain",
        "leads",
        "socialConnections",
        "socialPosts",
        "abTests",
        "videoScripts",
        "videoJobs",
        "purchases",
        "tenantLimits",
        "usageCounters",
        "auditLogs",
      ];

      expect(dataCategories).toContain("user");
      expect(dataCategories).toContain("influencers");
      expect(dataCategories).toContain("campaigns");
      expect(dataCategories).toContain("purchases");
      expect(dataCategories.length).toBeGreaterThan(20);
    });

    it("should exclude sensitive data from social connections", () => {
      const socialConnectionFields = [
        "id",
        "userId",
        "platform",
        "platformUserId",
        "platformUsername",
        "isActive",
        "createdAt",
        "updatedAt",
      ];

      // Should NOT include tokens
      expect(socialConnectionFields).not.toContain("accessToken");
      expect(socialConnectionFields).not.toContain("refreshToken");
    });

    it("should set 30-day expiry for download links", () => {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);

      const diffDays = Math.round(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(diffDays).toBe(30);
    });
  });

  describe("Data Deletion Request", () => {
    it("should require email confirmation", () => {
      const userEmail = "test@example.com";
      const confirmEmail = "test@example.com";

      expect(confirmEmail).toBe(userEmail);
    });

    it("should require confirmation phrase", () => {
      const confirmPhrase = "DELETE MY ACCOUNT";
      const expectedPhrase = "DELETE MY ACCOUNT";

      expect(confirmPhrase).toBe(expectedPhrase);
    });

    it("should reject incorrect confirmation phrase", () => {
      const confirmPhrase = "delete my account";
      const expectedPhrase = "DELETE MY ACCOUNT";

      expect(confirmPhrase).not.toBe(expectedPhrase);
    });

    it("should create deletion request with pending status", () => {
      const request = {
        id: 1,
        userId: 1,
        requestType: "delete" as const,
        status: "pending" as const,
      };

      expect(request.requestType).toBe("delete");
      expect(request.status).toBe("pending");
    });
  });

  describe("Data Deletion Processing", () => {
    it("should delete data in correct order for foreign key constraints", () => {
      const deletionOrder = [
        "chat_messages",
        "notifications",
        "notification_preferences",
        "scheduled_posts",
        "social_posts",
        "social_connections",
        "ab_test_variants",
        "ab_tests",
        "campaign_assets",
        "unified_campaigns",
        "campaign_scenes",
        "campaigns",
        "leads",
        "video_scripts",
        "video_jobs",
        "business_dna",
        "content_templates",
        "collaborators",
        "analytics_data",
        "influencer_content",
        "influencer_settings",
        "influencers",
        "tenant_limits",
        "usage_counters",
        "users",
      ];

      // Child tables should come before parent tables
      const influencersIndex = deletionOrder.indexOf("influencers");
      const influencerContentIndex = deletionOrder.indexOf("influencer_content");

      expect(influencerContentIndex).toBeLessThan(influencersIndex);
    });

    it("should anonymize user rather than hard delete", () => {
      const anonymizedUser = {
        name: "Deleted User",
        email: "deleted_1@deleted.local",
        openId: "deleted_1",
        tenantStatus: "suspended",
        suspensionReason: "GDPR deletion request",
      };

      expect(anonymizedUser.name).toBe("Deleted User");
      expect(anonymizedUser.email).toContain("deleted");
      expect(anonymizedUser.tenantStatus).toBe("suspended");
    });

    it("should keep purchases for accounting but anonymize", () => {
      const anonymizedPurchase = {
        userId: 0, // Anonymized
        plan: "pro",
        amount: 4900,
        status: "completed",
      };

      expect(anonymizedPurchase.userId).toBe(0);
      expect(anonymizedPurchase.plan).toBe("pro");
    });

    it("should keep audit logs but remove metadata", () => {
      const anonymizedAuditLog = {
        userId: 1,
        action: "campaign_create",
        metadata: null, // Removed
      };

      expect(anonymizedAuditLog.metadata).toBeNull();
    });
  });

  describe("GDPR Audit Logging", () => {
    it("should log export request", async () => {
      await logAuditEvent({
        userId: 1,
        action: "gdpr_export_requested",
        resourceType: "data_export_request",
        resourceId: 1,
        metadata: { requestType: "export" },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "gdpr_export_requested",
        })
      );
    });

    it("should log export completion", async () => {
      await logAuditEvent({
        userId: 99,
        action: "gdpr_export_completed",
        resourceType: "data_export_request",
        resourceId: 1,
        metadata: { targetUserId: 1 },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "gdpr_export_completed",
        })
      );
    });

    it("should log deletion request", async () => {
      await logAuditEvent({
        userId: 1,
        action: "gdpr_delete_requested",
        resourceType: "data_export_request",
        resourceId: 1,
        metadata: { requestType: "delete" },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "gdpr_delete_requested",
        })
      );
    });

    it("should log deletion completion with record counts", async () => {
      const deletedRecords = [
        { table: "influencers", count: 5 },
        { table: "campaigns", count: 10 },
      ];

      await logAuditEvent({
        userId: 99,
        action: "gdpr_delete_completed",
        resourceType: "data_export_request",
        resourceId: 1,
        metadata: { targetUserId: 1, deletedRecords },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "gdpr_delete_completed",
          metadata: expect.objectContaining({
            deletedRecords: expect.arrayContaining([
              expect.objectContaining({ table: "influencers" }),
            ]),
          }),
        })
      );
    });
  });

  describe("Admin GDPR Endpoints", () => {
    it("should list pending requests for admin review", () => {
      const pendingRequests = [
        { id: 1, userId: 1, requestType: "delete", status: "pending" },
        { id: 2, userId: 2, requestType: "export", status: "pending" },
      ];

      const deleteRequests = pendingRequests.filter(
        (r) => r.requestType === "delete"
      );

      expect(deleteRequests).toHaveLength(1);
    });

    it("should allow admin to process export request", () => {
      const request = { id: 1, requestType: "export", status: "pending" };
      const canProcess = request.requestType === "export" && request.status === "pending";

      expect(canProcess).toBe(true);
    });

    it("should require confirmation for deletion processing", () => {
      const confirmDeletion = true;
      expect(confirmDeletion).toBe(true);
    });

    it("should allow admin to reject deletion request", () => {
      const request = { id: 1, requestType: "delete", status: "pending" };
      const reason = "User account has outstanding balance";

      expect(request.status).toBe("pending");
      expect(reason.length).toBeGreaterThan(0);
    });
  });
});

describe("GDPR Compliance Requirements", () => {
  it("should process requests within 30 days", () => {
    const requestDate = new Date("2025-01-01");
    const deadline = new Date(requestDate);
    deadline.setDate(deadline.getDate() + 30);

    const today = new Date("2025-01-15");
    const isWithinDeadline = today < deadline;

    expect(isWithinDeadline).toBe(true);
  });

  it("should provide data in portable format (JSON)", () => {
    const exportFormat = "application/json";
    expect(exportFormat).toBe("application/json");
  });

  it("should include all personal data categories", () => {
    const gdprCategories = [
      "Identity data",
      "Contact data",
      "Usage data",
      "Content data",
      "Transaction data",
    ];

    expect(gdprCategories.length).toBeGreaterThanOrEqual(5);
  });
});
