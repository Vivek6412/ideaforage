import { test, expect } from '@playwright/test';

let testEmail = `test_ui_${Date.now()}@example.com`;
const testPassword = 'password123';

test.describe.serial('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log errors to console
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: "${msg.text()}"`);
    });
  });

  test('TC1.1 & TC1.2: Register and Login', async ({ page }) => {
    // Step 1: Registration
    await page.goto('http://localhost:3000/register');
    await expect(page.locator('h1')).toContainText('Create an account');
    
    await page.fill('input[id="full_name"]', 'UI Test User');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    
    // Slow down slightly for visibility
    await page.waitForTimeout(500); 
    await page.click('button:has-text("Create account")');
    await expect(page.locator('h2')).toContainText('Account created!', { timeout: 15000 });
    
    await page.waitForTimeout(1000); // Pause so user can see it
    
    // Step 2: Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    
    await page.waitForTimeout(500);
    await page.click('button:has-text("Sign in")');
    
    // Verify Dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await page.waitForTimeout(1000);
  });

  test('TC1.3: Logout, Refresh, and Re-Authenticate', async ({ page }) => {
    // 1. Initial Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');

    // 2. Open profile dropdown and Sign Out
    await page.waitForTimeout(500);
    await page.click(`button:has-text("${testEmail}")`);
    await expect(page.locator('text=Sign out')).toBeVisible();
    await page.waitForTimeout(500);
    await page.click('text=Sign out');
    await page.waitForURL('**/login');

    // 3. Refresh page
    await page.waitForTimeout(500);
    await page.reload();

    // 4. Register a new user
    const newUserEmail = `test_ui_new_${Date.now()}@example.com`;
    await page.goto('http://localhost:3000/register');
    await page.fill('input[id="full_name"]', 'New UI Test User');
    await page.fill('input[id="email"]', newUserEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.waitForTimeout(500);
    await page.click('button:has-text("Create account")');
    await expect(page.locator('h2')).toContainText('Account created!', { timeout: 15000 });

    // 5. Login with the new user
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="email"]', newUserEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.waitForTimeout(500);
    await page.click('button:has-text("Sign in")');
    
    // Verify successful login
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Final pause for visibility
    await page.waitForTimeout(1500);
  });
});
