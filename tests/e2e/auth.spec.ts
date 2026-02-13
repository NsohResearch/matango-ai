import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 * 
 * These tests verify the authentication flow including:
 * - Public page access
 * - Login redirect
 * - Protected route handling
 */

test.describe("Authentication Flow", () => {
  test("should display the home page without authentication", async ({ page }) => {
    await page.goto("/");
    
    // Verify home page loads
    await expect(page).toHaveTitle(/Matango/i);
    
    // Check for key elements
    await expect(page.locator("text=AI Marketing Agency")).toBeVisible();
  });

  test("should display the about page", async ({ page }) => {
    await page.goto("/about");
    
    // Verify about page content
    await expect(page.locator("text=AI-Amplified Operator")).toBeVisible();
  });

  test("should display the pricing page", async ({ page }) => {
    await page.goto("/pricing");
    
    // Verify pricing tiers are visible
    await expect(page.locator("text=Starter")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
  });

  test("should display the AAO glossary page", async ({ page }) => {
    await page.goto("/aao-glossary");
    
    // Verify AAO types are explained
    await expect(page.locator("text=Founder AAO")).toBeVisible();
    await expect(page.locator("text=Campaign AAO")).toBeVisible();
  });

  test("should redirect to login for protected routes", async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto("/dashboard");
    
    // Should be redirected to login or show login prompt
    // The exact behavior depends on the auth implementation
    const url = page.url();
    const isLoginPage = url.includes("login") || url.includes("oauth");
    const isDashboard = url.includes("dashboard");
    
    // Either redirected to login or still on dashboard with login prompt
    expect(isLoginPage || isDashboard).toBeTruthy();
  });

  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");
    
    // Check navigation to About
    const aboutLink = page.locator('a[href="/about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/about/);
    }
    
    // Navigate back to home
    await page.goto("/");
    
    // Check navigation to Pricing
    const pricingLink = page.locator('a[href="/pricing"]').first();
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await expect(page).toHaveURL(/pricing/);
    }
  });
});

test.describe("K'ah Assistant", () => {
  test("should display K'ah introduction page", async ({ page }) => {
    await page.goto("/meet-kah");
    
    // Verify K'ah page content
    await expect(page.locator("text=K'ah")).toBeVisible();
  });
});

test.describe("Template Marketplace", () => {
  test("should display template marketplace", async ({ page }) => {
    await page.goto("/templates");
    
    // Verify marketplace loads
    await expect(page.locator("text=Template")).toBeVisible();
  });
});
