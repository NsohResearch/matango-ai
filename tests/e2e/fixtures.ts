import { test as base, expect } from "@playwright/test";

/**
 * Matango.ai E2E Test Fixtures
 * 
 * Provides reusable test fixtures for:
 * - Authenticated user sessions
 * - Test data setup/teardown
 * - Common page objects
 */

// Test user credentials (for UAT environment)
export const TEST_USER = {
  openId: "oid_test_uat_user",
  name: "UAT Test User",
  email: "uat@matango.local",
  role: "user" as const,
  plan: "pro" as const,
};

export const TEST_ADMIN = {
  openId: "oid_test_admin",
  name: "UAT Admin User",
  email: "admin@matango.local",
  role: "admin" as const,
  plan: "agencypp" as const,
};

// Page object for common navigation
export class MatangoPage {
  constructor(private page: import("@playwright/test").Page) {}

  async goto(path: string) {
    await this.page.goto(path);
  }

  async navigateToDashboard() {
    await this.page.goto("/dashboard");
  }

  async navigateToCreatorOS() {
    await this.page.goto("/video-studio-pro");
  }

  async navigateToBrandBrain() {
    await this.page.goto("/brand-brain");
  }

  async navigateToContent() {
    await this.page.goto("/content");
  }

  async openKahChat() {
    const kahButton = this.page.locator('[data-testid="kah-chat-button"], button:has-text("K\\'ah")').first();
    if (await kahButton.isVisible()) {
      await kahButton.click();
    }
  }

  async sendKahMessage(message: string) {
    const input = this.page.locator('[data-testid="kah-input"], input[placeholder*="message"]').first();
    await input.fill(message);
    await input.press("Enter");
  }
}

// Extended test with fixtures
export const test = base.extend<{
  matangoPage: MatangoPage;
}>({
  matangoPage: async ({ page }, use) => {
    const matangoPage = new MatangoPage(page);
    await use(matangoPage);
  },
});

export { expect };

/**
 * Helper to set up authenticated session
 * 
 * In a real implementation, this would:
 * 1. Call a test-only endpoint to create a session
 * 2. Set the session cookie
 * 3. Return the authenticated page
 */
export async function setupAuthenticatedSession(
  page: import("@playwright/test").Page,
  user: typeof TEST_USER = TEST_USER
) {
  // For UAT, we would typically:
  // 1. Call POST /api/test/create-session with the test user
  // 2. The server would create a JWT and set the cookie
  // 3. We'd then navigate to the dashboard
  
  // This is a placeholder - implement based on your test auth strategy
  console.log(`Setting up session for ${user.email}`);
  
  // Example: Set a test cookie (requires server-side support)
  // await page.context().addCookies([{
  //   name: 'session',
  //   value: 'test-jwt-token',
  //   domain: 'localhost',
  //   path: '/',
  // }]);
  
  return page;
}

/**
 * Helper to clean up test data
 */
export async function cleanupTestData(userId: string) {
  // Call cleanup endpoint or directly clean database
  console.log(`Cleaning up test data for user ${userId}`);
}
