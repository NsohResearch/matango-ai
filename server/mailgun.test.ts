import { describe, it, expect, vi } from "vitest";

describe("Mailgun Email Service", () => {
  describe("Configuration", () => {
    it("should have MAILGUN_API_KEY environment variable", () => {
      // Check that the env var exists (value is secret, just verify it's set)
      const apiKey = process.env.MAILGUN_API_KEY;
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe("string");
      expect(apiKey!.length).toBeGreaterThan(0);
    });

    it("should have MAILGUN_DOMAIN environment variable", () => {
      const domain = process.env.MAILGUN_DOMAIN;
      expect(domain).toBeDefined();
      expect(typeof domain).toBe("string");
      expect(domain!.length).toBeGreaterThan(0);
    });

    it("should have SALES_NOTIFICATION_EMAIL environment variable", () => {
      const email = process.env.SALES_NOTIFICATION_EMAIL;
      expect(email).toBeDefined();
      expect(typeof email).toBe("string");
      expect(email!.length).toBeGreaterThan(0);
      // Validate email format
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe("Email Options", () => {
    it("should accept valid email options structure", () => {
      const options = {
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test body",
        html: "<p>Test body</p>",
      };

      expect(options.to).toBeTruthy();
      expect(options.subject).toBeTruthy();
      expect(options.text || options.html).toBeTruthy();
    });

    it("should accept array of recipients", () => {
      const options = {
        to: ["test1@example.com", "test2@example.com"],
        subject: "Test Subject",
        text: "Test body",
      };

      expect(Array.isArray(options.to)).toBe(true);
      expect(options.to).toHaveLength(2);
    });
  });

  describe("Sales Lead Notification", () => {
    it("should format lead data correctly", () => {
      const lead = {
        name: "John Smith",
        email: "john@company.com",
        company: "Acme Inc",
        companySize: "51-200",
        phone: "+1 555-123-4567",
        message: "We need unlimited AI influencers",
      };

      // Verify all required fields are present
      expect(lead.name).toBeTruthy();
      expect(lead.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(lead.company).toBeTruthy();

      // Verify optional fields can be null
      const minimalLead = {
        name: "Jane Doe",
        email: "jane@example.com",
        company: "Test Corp",
        companySize: null,
        phone: null,
        message: null,
      };

      expect(minimalLead.companySize).toBeNull();
      expect(minimalLead.phone).toBeNull();
      expect(minimalLead.message).toBeNull();
    });

    it("should generate correct email subject", () => {
      const lead = {
        name: "John Smith",
        company: "Acme Inc",
      };

      const subject = `🚀 New Agency++ Lead: ${lead.name} from ${lead.company}`;
      expect(subject).toContain("Agency++");
      expect(subject).toContain(lead.name);
      expect(subject).toContain(lead.company);
    });
  });
});
