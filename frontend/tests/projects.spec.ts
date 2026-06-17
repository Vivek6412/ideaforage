import { test, expect } from '@playwright/test';

let testEmail = `test_ui_${Date.now()}@example.com`;
const testPassword = 'password123';
const geminiKey = 'process.env.TEST_GEMINI_KEY || ""';

test('Project Creation and Idea Refinement Flow', async ({ page }) => {
  test.setTimeout(90000); // 90 seconds timeout for AI generation

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`BROWSER ERROR: "${msg.text()}"`);
  });

  // 1. Setup: Register User (so it has an account to log into)
  await page.goto('http://localhost:3000/register');
  await page.fill('input[id="full_name"]', 'UI Test User');
  await page.fill('input[id="email"]', testEmail);
  await page.fill('input[id="password"]', testPassword);
  await page.click('button:has-text("Create account")');
  await expect(page.locator('h2')).toContainText('Account created!', { timeout: 15000 });

  // 2. Login to that account
  await page.waitForTimeout(500);
  await page.goto('http://localhost:3000/login');
  await page.fill('input[id="email"]', testEmail);
  await page.fill('input[id="password"]', testPassword);
  await page.waitForTimeout(500);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/dashboard');
  
  // 3. Add API Key (Required for AI to process idea)
  await page.waitForTimeout(500);
  await page.goto('http://localhost:3000/settings');
  await page.fill('input[placeholder="AIza…"]', geminiKey);
  const geminiSection = page.locator('.rounded-xl').filter({ hasText: 'Google Gemini' });
  await geminiSection.locator('button:has-text("Save")').click();
  await expect(geminiSection.locator('text=Key saved.')).toBeVisible({ timeout: 5000 });

  // 4. Navigate to the Dashboard
  await page.waitForTimeout(500);
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForTimeout(1000);

  // 5. Create a new project (UI Test Project)
  const newProjectBtn = page.locator('a:has-text("New Project")').first();
  await expect(newProjectBtn).toBeVisible();
  await newProjectBtn.click();
  
  await page.waitForURL('**/projects/new');
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="Fitness"]', 'UI Test Project');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Continue")');

  // 6. Add the idea ("A simple todo app for developers")
  await expect(page.locator('h2')).toContainText('Describe your idea');
  await page.waitForTimeout(500);
  await page.fill('textarea', 'A simple todo app for developers.');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Process Idea")');

  // 7. Wait for the AI to process the idea and show the "Refine" step
  // Setting a long timeout because Gemini processing takes ~20 seconds
  await page.waitForSelector('text=Refine your idea', { timeout: 60000 });
  await expect(page.locator('h2')).toContainText('Refine your idea');
  await page.waitForTimeout(1500);

  // 8. Log out
  await page.click(`button:has-text("${testEmail}")`);
  await expect(page.locator('text=Sign out')).toBeVisible();
  await page.waitForTimeout(500);
  await page.click('text=Sign out');
  await page.waitForURL('**/login');
  
  await page.waitForTimeout(1000);
});
