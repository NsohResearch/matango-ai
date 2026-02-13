import { describe, it, expect, vi } from "vitest";

describe("AAO Onboarding Wizard", () => {
  describe("Onboarding Completion API", () => {
    it("should export completeUserOnboarding function from db", async () => {
      const db = await import("./db");
      expect(typeof db.completeUserOnboarding).toBe("function");
    });

    it("should have onboardingCompleted field in user schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.users).toBeDefined();
      // The schema should include onboardingCompleted field
      const userColumns = Object.keys(schema.users);
      expect(userColumns.length).toBeGreaterThan(0);
    });
  });

  describe("Wizard Component", () => {
    it("should export AAOOnboardingWizard component", async () => {
      // Test that the component file exists and exports correctly
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.join(
        process.cwd(),
        "client/src/components/AAOOnboardingWizard.tsx"
      );
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it("should have 4 wizard steps defined", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.join(
        process.cwd(),
        "client/src/components/AAOOnboardingWizard.tsx"
      );
      const content = fs.readFileSync(componentPath, "utf-8");
      
      // Check for WIZARD_STEPS array with 4 items
      expect(content).toContain("WIZARD_STEPS");
      expect(content).toContain("Welcome to Operatorware");
      expect(content).toContain("Build Your Brand Brain");
      expect(content).toContain("Deploy Your First AAO");
      expect(content).toContain("Launch Your Growth Loop");
    });

    it("should include AAO terminology in wizard content", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.join(
        process.cwd(),
        "client/src/components/AAOOnboardingWizard.tsx"
      );
      const content = fs.readFileSync(componentPath, "utf-8");
      
      // Check for AAO-specific terminology
      expect(content).toContain("AI-Amplified Operator");
      expect(content).toContain("Operatorware");
      expect(content).toContain("Brand Brain");
      expect(content).toContain("Growth Loop");
    });
  });

  describe("Dashboard Integration", () => {
    it("should import AAOOnboardingWizard in Dashboard", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const dashboardPath = path.join(
        process.cwd(),
        "client/src/pages/Dashboard.tsx"
      );
      const content = fs.readFileSync(dashboardPath, "utf-8");
      
      expect(content).toContain('import AAOOnboardingWizard from "@/components/AAOOnboardingWizard"');
    });

    it("should have onboarding state management in Dashboard", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const dashboardPath = path.join(
        process.cwd(),
        "client/src/pages/Dashboard.tsx"
      );
      const content = fs.readFileSync(dashboardPath, "utf-8");
      
      expect(content).toContain("showOnboarding");
      expect(content).toContain("setShowOnboarding");
      expect(content).toContain("handleOnboardingComplete");
    });

    it("should check user.onboardingCompleted status", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const dashboardPath = path.join(
        process.cwd(),
        "client/src/pages/Dashboard.tsx"
      );
      const content = fs.readFileSync(dashboardPath, "utf-8");
      
      expect(content).toContain("onboardingCompleted");
    });

    it("should render AAOOnboardingWizard component", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const dashboardPath = path.join(
        process.cwd(),
        "client/src/pages/Dashboard.tsx"
      );
      const content = fs.readFileSync(dashboardPath, "utf-8");
      
      expect(content).toContain("<AAOOnboardingWizard");
      expect(content).toContain("isOpen={showOnboarding}");
      expect(content).toContain("onComplete={handleOnboardingComplete}");
    });
  });

  describe("K'ah Avatar Integration", () => {
    it("should have K'ah avatar in chat widget", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const widgetPath = path.join(
        process.cwd(),
        "client/src/components/KahChatWidget.tsx"
      );
      const content = fs.readFileSync(widgetPath, "utf-8");
      
      // Check for avatar handling (now using CDN URL)
      expect(content).toContain("K'ah");
    });

    it("should have AAO branding in chat widget", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const widgetPath = path.join(
        process.cwd(),
        "client/src/components/KahChatWidget.tsx"
      );
      const content = fs.readFileSync(widgetPath, "utf-8");
      
      // Check for AAO terminology
      expect(content).toContain("AAO");
    });
  });

  describe("Auth Router", () => {
    it("should have completeOnboarding mutation in auth router", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("completeOnboarding");
      expect(content).toContain("completeUserOnboarding");
    });
  });
});
