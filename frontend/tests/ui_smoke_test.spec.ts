
import { test, expect } from '@playwright/test';

test.describe('IdeaForge UI Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`BROWSER ERROR: "${msg.text()}"`);
      }
    });

    // Listen for failed network requests
    page.on('requestfailed', request => {
      console.log(`NETWORK FAILURE: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Authentication Flow: Register and Login', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    // Test Register Page UI
    await expect(page.locator('h1')).toContainText('Create an account');
    await page.fill('input[id="full_name"]', 'UI Test User');
    await page.fill('input[id="email"]', `test_ui_${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Create account")');

    // Wait for redirect or success state
    await expect(page.locator('h2')).toContainText('Account created!', { timeout: 15000 });
    
    // Test Login Page UI
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', 'test@test.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button:has-text("Sign in")');

    // Redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Dashboard and Project Creation', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', 'test@test.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    // Test Dashboard Components
    const newProjectBtn = page.locator('a:has-text("New Project")').first();
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // Project Wizard - Step 1
    await page.waitForURL('**/projects/new');
    await page.fill('input[placeholder*="SaaS"]', 'UI Test Project');
    await page.click('button:has-text("Continue")');

    // Step 2 - Idea Input
    await expect(page.locator('h2')).toContainText('Describe your idea');
    await page.fill('textarea', 'A simple todo app for developers.');
    await page.click('button:has-text("Process Idea")');

    // Step 3 - Refine
    await page.waitForSelector('text=Refine your idea', { timeout: 60000 });
  });

  test('Settings Page and Tabs', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', 'test@test.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('h1')).toContainText('Settings');

    // Test Tabs
    await page.click('button:has-text("Integrations")');
    await expect(page.getByText('GitHub', { exact: true }).first()).toBeVisible();
    
    await page.click('button:has-text("Profile")');
    await expect(page.getByText('Plan Tier')).toBeVisible();
    
    await page.click('button:has-text("API Keys")');
    await expect(page.locator('text=Anthropic')).toBeVisible();
  });

  test('Navbar Dropdown and Logout', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', 'test@test.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    // Open Profile Dropdown
    await page.click('button:has-text("test@test.com")');
    await expect(page.locator('text=Sign out')).toBeVisible();

    // Logout
    await page.click('text=Sign out');
    await page.waitForURL('**/login');
  });
});
