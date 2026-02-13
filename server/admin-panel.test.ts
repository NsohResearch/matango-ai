import { describe, it, expect } from "vitest";

describe("Admin Panel Modules", () => {
  describe("Admin Overview", () => {
    it("should have admin overview page component", async () => {
      const module = await import("../client/src/pages/admin/AdminOverview");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Tenants", () => {
    it("should have admin tenants page component", async () => {
      const module = await import("../client/src/pages/admin/AdminTenants");
      expect(module.default).toBeDefined();
    });

    it("should have admin tenant detail page component", async () => {
      const module = await import("../client/src/pages/admin/AdminTenantDetail");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Billing", () => {
    it("should have admin billing page component", async () => {
      const module = await import("../client/src/pages/admin/AdminBilling");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Feature Flags", () => {
    it("should have admin feature flags page component", async () => {
      const module = await import("../client/src/pages/admin/AdminFeatureFlags");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Audit Log", () => {
    it("should have admin audit log page component", async () => {
      const module = await import("../client/src/pages/admin/AdminAuditLog");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Integrations", () => {
    it("should have admin integrations page component", async () => {
      const module = await import("../client/src/pages/admin/AdminIntegrations");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin System Health", () => {
    it("should have admin system health page component", async () => {
      const module = await import("../client/src/pages/admin/AdminSystemHealth");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Moderation", () => {
    it("should have admin moderation page component", async () => {
      const module = await import("../client/src/pages/admin/AdminModeration");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Compliance", () => {
    it("should have admin compliance page component", async () => {
      const module = await import("../client/src/pages/admin/AdminCompliance");
      expect(module.default).toBeDefined();
    });
  });

  describe("Admin Layout", () => {
    it("should have admin layout component", async () => {
      const module = await import("../client/src/components/AdminLayout");
      expect(module.default).toBeDefined();
    });
  });
});

describe("Admin Database Schema", () => {
  it("should have audit logs table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.adminAuditLog).toBeDefined();
  });

  it("should have feature flags table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.featureFlags).toBeDefined();
  });

  it("should have moderation queue table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.moderationQueue).toBeDefined();
  });

  it("should have data export requests table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.dataExportRequests).toBeDefined();
  });

  it("should have webhook events table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.webhookEvents).toBeDefined();
  });
});

describe("Admin Routes Configuration", () => {
  it("should have all admin routes configured in App", async () => {
    // Verify the App.tsx imports all admin pages
    const fs = await import("fs");
    const appContent = fs.readFileSync("/home/ubuntu/influencer-saas/client/src/App.tsx", "utf-8");
    
    expect(appContent).toContain("AdminOverview");
    expect(appContent).toContain("AdminTenants");
    expect(appContent).toContain("AdminTenantDetail");
    expect(appContent).toContain("AdminBilling");
    expect(appContent).toContain("AdminFeatureFlags");
    expect(appContent).toContain("AdminAuditLog");
    expect(appContent).toContain("AdminIntegrations");
    expect(appContent).toContain("AdminSystemHealth");
    expect(appContent).toContain("AdminModeration");
    expect(appContent).toContain("AdminCompliance");
    expect(appContent).toContain("AdminLeads");
  });

  it("should have correct route paths", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync("/home/ubuntu/influencer-saas/client/src/App.tsx", "utf-8");
    
    expect(appContent).toContain('path="/admin"');
    expect(appContent).toContain('path="/admin/tenants"');
    expect(appContent).toContain('path="/admin/billing"');
    expect(appContent).toContain('path="/admin/feature-flags"');
    expect(appContent).toContain('path="/admin/audit-log"');
    expect(appContent).toContain('path="/admin/integrations"');
    expect(appContent).toContain('path="/admin/system-health"');
    expect(appContent).toContain('path="/admin/moderation"');
    expect(appContent).toContain('path="/admin/compliance"');
    expect(appContent).toContain('path="/admin/leads"');
  });
});
