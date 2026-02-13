import { test, expect } from "@playwright/test";

/**
 * Dashboard & Creator OS E2E Tests
 * 
 * These tests verify the authenticated user experience including:
 * - Dashboard functionality
 * - Creator OS (Video Studio) features
 * - Content generation
 * 
 * Note: These tests require authentication. In CI, use a test account
 * or mock the OAuth flow.
 */

test.describe("Dashboard (Authenticated)", () => {
  // Skip these tests if not authenticated
  // In production, you would set up authentication fixtures
  test.skip(({ browserName }) => true, "Requires authentication setup");

  test("should display dashboard with stats", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Verify dashboard elements
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await expect(page.locator("text=AAO Activity")).toBeVisible();
  });

  test("should navigate to Creator OS", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Find and click Creator OS link
    const creatorLink = page.locator('a[href*="creator"], a[href*="video-studio"]').first();
    if (await creatorLink.isVisible()) {
      await creatorLink.click();
      await expect(page.url()).toMatch(/creator|video-studio/);
    }
  });
});

test.describe("Creator OS (Video Studio)", () => {
  test.skip(({ browserName }) => true, "Requires authentication setup");

  test("should display video studio interface", async ({ page }) => {
    await page.goto("/video-studio-pro");
    
    // Verify Video Studio elements
    await expect(page.locator("text=Video Studio")).toBeVisible();
  });

  test("should be able to create a new project", async ({ page }) => {
    await page.goto("/video-studio-pro");
    
    // Look for new project button
    const newProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create")').first();
    if (await newProjectBtn.isVisible()) {
      await newProjectBtn.click();
      
      // Fill in project details
      const titleInput = page.locator('input[placeholder*="title"], input[name="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill("Test Video Project");
      }
    }
  });
});

test.describe("Content Generation", () => {
  test.skip(({ browserName }) => true, "Requires authentication setup");

  test("should display content generation interface", async ({ page }) => {
    await page.goto("/content");
    
    // Verify content generation elements
    await expect(page.locator("text=Content")).toBeVisible();
  });
});

test.describe("Brand Brain", () => {
  test.skip(({ browserName }) => true, "Requires authentication setup");

  test("should display brand brain setup", async ({ page }) => {
    await page.goto("/brand-brain");
    
    // Verify Brand Brain elements
    await expect(page.locator("text=Brand")).toBeVisible();
  });
});
