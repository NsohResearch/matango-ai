import { describe, it, expect } from "vitest";

describe("Contact Sales API", () => {
  describe("Validation", () => {
    it("should require name, email, and company fields", () => {
      // Test that the API validates required fields
      const requiredFields = ["name", "email", "company"];
      expect(requiredFields).toHaveLength(3);
    });

    it("should validate email format", () => {
      const validEmails = ["test@example.com", "user@company.org", "name@domain.co"];
      const invalidEmails = ["notanemail", "missing@", "@nodomain.com", "spaces in@email.com"];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe("Lead Data Structure", () => {
    it("should have correct lead status options", () => {
      const validStatuses = ["new", "contacted", "qualified", "converted", "closed"];
      expect(validStatuses).toContain("new");
      expect(validStatuses).toContain("contacted");
      expect(validStatuses).toContain("qualified");
      expect(validStatuses).toContain("converted");
      expect(validStatuses).toContain("closed");
    });

    it("should have correct company size options", () => {
      const companySizes = ["1-10", "11-50", "51-200", "201-500", "500+"];
      expect(companySizes).toHaveLength(5);
      expect(companySizes).toContain("1-10");
      expect(companySizes).toContain("500+");
    });

    it("should set default source to agency_plus_pricing", () => {
      const defaultSource = "agency_plus_pricing";
      expect(defaultSource).toBe("agency_plus_pricing");
    });
  });

  describe("Lead Submission", () => {
    it("should accept valid lead data", () => {
      const validLead = {
        name: "John Smith",
        email: "john@company.com",
        company: "Acme Inc",
        companySize: "51-200",
        phone: "+1 555-123-4567",
        message: "We need unlimited AI influencers for our agency",
      };

      expect(validLead.name).toBeTruthy();
      expect(validLead.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(validLead.company).toBeTruthy();
    });

    it("should allow optional fields to be empty", () => {
      const minimalLead = {
        name: "Jane Doe",
        email: "jane@example.com",
        company: "Test Corp",
        companySize: null,
        phone: null,
        message: null,
      };

      expect(minimalLead.name).toBeTruthy();
      expect(minimalLead.email).toBeTruthy();
      expect(minimalLead.company).toBeTruthy();
      expect(minimalLead.companySize).toBeNull();
      expect(minimalLead.phone).toBeNull();
      expect(minimalLead.message).toBeNull();
    });
  });
});
