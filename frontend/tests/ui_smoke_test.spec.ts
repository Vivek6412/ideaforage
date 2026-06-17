
import { test, expect } from '@playwright/test';

let testEmail = `test_ui_${Date.now()}@example.com`;
const testPassword = 'password123';

test.describe.serial('IdeaForge UI Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`BROWSER ERROR: "${msg.text()}"`);
      }
    });
    page.on('requestfailed', request => {
      console.log(`NETWORK FAILURE: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Authentication Flow: Register and Login', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    // Test Register Page UI
    await expect(page.locator('h1')).toContainText('Create an account');
    await page.fill('input[id="full_name"]', 'UI Test User');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Create account")');

    // Wait for redirect or success state
    await expect(page.locator('h2')).toContainText('Account created!', { timeout: 15000 });
    
    // Test Login Page UI
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Sign in")');

    // Redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Dashboard and Project Creation', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    const newProjectBtn = page.locator('a:has-text("New Project")').first();
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    await page.waitForURL('**/projects/new');
    await page.fill('input[placeholder*="Fitness"]', 'UI Test Project');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('h2')).toContainText('Describe your idea');
    await page.fill('textarea', 'A simple todo app for developers.');
    await page.click('button:has-text("Process Idea")');

    await page.waitForSelector('text=Refine your idea', { timeout: 60000 });
  });

  test('Settings Page and Tabs', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('h1')).toContainText('Settings');

    await page.click('button:has-text("Integrations")');
    await expect(page.getByText('GitHub', { exact: true }).first()).toBeVisible();
    
    await page.click('button:has-text("Profile")');
    await expect(page.getByText('Plan Tier')).toBeVisible();
    
    await page.click('button:has-text("API Keys")');
    await expect(page.locator('text=Anthropic')).toBeVisible();
  });

  test('Navbar Dropdown and Logout', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    await page.click(`button:has-text("${testEmail}")`);
    await expect(page.locator('text=Sign out')).toBeVisible();

    await page.click('text=Sign out');
    await page.waitForURL('**/login');
  });
});
