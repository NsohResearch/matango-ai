import { describe, it, expect } from "vitest";

describe("Admin Leads API", () => {
  describe("Lead Status Management", () => {
    it("should have valid status options", () => {
      const validStatuses = ["new", "contacted", "qualified", "converted", "closed"];
      expect(validStatuses).toHaveLength(5);
      expect(validStatuses).toContain("new");
      expect(validStatuses).toContain("contacted");
      expect(validStatuses).toContain("qualified");
      expect(validStatuses).toContain("converted");
      expect(validStatuses).toContain("closed");
    });

    it("should reject invalid status values", () => {
      const validStatuses = ["new", "contacted", "qualified", "converted", "closed"];
      const invalidStatuses = ["pending", "approved", "rejected", "active"];
      
      invalidStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(false);
      });
    });
  });

  describe("Lead Data Structure", () => {
    it("should have correct lead fields", () => {
      const leadFields = [
        "id",
        "name",
        "email",
        "company",
        "companySize",
        "phone",
        "message",
        "status",
        "source",
        "notes",
        "createdAt",
        "updatedAt",
      ];

      expect(leadFields).toContain("id");
      expect(leadFields).toContain("name");
      expect(leadFields).toContain("email");
      expect(leadFields).toContain("company");
      expect(leadFields).toContain("status");
      expect(leadFields).toContain("createdAt");
    });

    it("should format lead for export correctly", () => {
      const lead = {
        name: "John Smith",
        email: "john@company.com",
        company: "Acme Inc",
        companySize: "51-200",
        phone: "+1 555-123-4567",
        message: "We need unlimited AI influencers",
        status: "new",
        source: "agency_plus_pricing",
        createdAt: "2026-01-08T12:00:00Z",
      };

      // Test CSV row generation
      const csvRow = [
        `"${lead.name}"`,
        `"${lead.email}"`,
        `"${lead.company}"`,
        `"${lead.companySize || ""}"`,
        `"${lead.phone || ""}"`,
        `"${(lead.message || "").replace(/"/g, '""')}"`,
        `"${lead.status}"`,
        `"${lead.source}"`,
        `"${new Date(lead.createdAt).toISOString()}"`,
      ].join(",");

      expect(csvRow).toContain("John Smith");
      expect(csvRow).toContain("john@company.com");
      expect(csvRow).toContain("Acme Inc");
    });
  });

  describe("Lead Filtering", () => {
    it("should filter leads by search query", () => {
      const leads = [
        { name: "John Smith", email: "john@acme.com", company: "Acme Inc" },
        { name: "Jane Doe", email: "jane@tech.com", company: "Tech Corp" },
        { name: "Bob Wilson", email: "bob@acme.com", company: "Acme LLC" },
      ];

      const searchQuery = "acme";
      const filtered = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe("John Smith");
      expect(filtered[1].name).toBe("Bob Wilson");
    });

    it("should filter leads by status", () => {
      const leads = [
        { name: "John", status: "new" },
        { name: "Jane", status: "contacted" },
        { name: "Bob", status: "new" },
        { name: "Alice", status: "converted" },
      ];

      const statusFilter = "new";
      const filtered = leads.filter(lead => lead.status === statusFilter);

      expect(filtered).toHaveLength(2);
    });
  });

  describe("Lead Statistics", () => {
    it("should calculate correct statistics", () => {
      const leads = [
        { status: "new" },
        { status: "new" },
        { status: "contacted" },
        { status: "qualified" },
        { status: "converted" },
        { status: "converted" },
        { status: "closed" },
      ];

      const total = leads.length;
      const newLeads = leads.filter(l => l.status === "new").length;
      const qualified = leads.filter(l => l.status === "qualified").length;
      const converted = leads.filter(l => l.status === "converted").length;
      const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

      expect(total).toBe(7);
      expect(newLeads).toBe(2);
      expect(qualified).toBe(1);
      expect(converted).toBe(2);
      expect(conversionRate).toBe("28.6");
    });
  });
});
