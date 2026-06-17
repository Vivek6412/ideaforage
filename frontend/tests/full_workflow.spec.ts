import { test, expect } from '@playwright/test';

const testEmail = 'test_ui_1779791495007@example.com';
const testPassword = 'password123';

test('Full Workflow Test from Scratch', async ({ page }) => {
  test.setTimeout(400000); // 6.5 minutes timeout

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`BROWSER ERROR: "${msg.text()}"`);
  });

  // 1. Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[id="email"]', testEmail);
  await page.fill('input[id="password"]', testPassword);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/dashboard');
  
  // 2. Click "New Project"
  await page.goto('http://localhost:3000/projects/new');
  await page.waitForURL('**/projects/new');
  await expect(page.locator('h1')).toContainText('New Project');

  // 3. Name the project
  const timestamp = new Date().getTime();
  await page.fill('input[placeholder="e.g. Fitness Tracker Pro"]', `Workflow Test ${timestamp}`);
  await page.click('button:has-text("Continue →")');

  // 4. Enter Idea and Process
  const ideaText = "I want to build an expense tracker app. It should allow users to add expenses with amount and category. It should show a pie chart of expenses by category. Target users are personal finance beginners. Core features: add expense, view dashboard, categorize expenses. Tech preferences: React and Node.js. Constraints: No specific constraints.";
  
  // Wait for the textarea to be visible
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.fill('textarea', ideaText); 
  await page.click('button:has-text("Process Idea →")');

  // 5. Wait for Refine Idea
  await page.waitForSelector('text=Refine your idea', { timeout: 90000 });

  // 6. Confirm Idea / Looks Good
  // We click "Looks Good" or whatever button confirms the idea
  const looksGoodBtn = page.locator('button:has-text("Looks Good")').first();
  if (await looksGoodBtn.isVisible()) {
      await looksGoodBtn.click();
  } else {
      const confirmBtn = page.locator('button:has-text("Confirm")').first();
      if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
      }
  }

  // 7. Review and approve Blueprint
  await page.waitForSelector('text=Blueprint Review', { timeout: 90000 });
  await expect(page.locator('h1')).toContainText('Blueprint Review');
  await page.waitForTimeout(1000);
  const approveAllBlueprintBtn = page.locator('button:has-text("Approve All")');
  await expect(approveAllBlueprintBtn).toBeVisible();
  await approveAllBlueprintBtn.click();
  
  const confirmBlueprintBtn = page.locator('button:has-text("Confirm Blueprint →")');
  await expect(confirmBlueprintBtn).toBeVisible();
  await confirmBlueprintBtn.click();

  // 8. Review and approve Prompts
  await page.waitForSelector('text=Review Prompts', { timeout: 90000 });
  await expect(page.locator('h1')).toContainText('Review Prompts');
  await page.waitForTimeout(2000);

  const approveAllPromptsBtn = page.locator('button:has-text("Approve All")');
  await expect(approveAllPromptsBtn).toBeVisible();
  await approveAllPromptsBtn.click();
  await page.waitForTimeout(1000);

  const confirmPromptsBtn = page.locator('button:has-text("Confirm & Start Execution")');
  await expect(confirmPromptsBtn).toBeVisible();
  await confirmPromptsBtn.click();

  // 9. Wait for Execution page to load
  await page.waitForSelector('text=Ready to execute', { timeout: 15000 });
  await expect(page.locator('h1')).toContainText('Execution');
  
  // 10. Click Start Execution
  const startBtn = page.locator('button:has-text("Start Execution")').first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // 11. Wait for backend to spawn execution task
  await page.waitForTimeout(10000);

  // 12. Log out
  await page.click(`button:has-text("${testEmail}")`);
  await expect(page.locator('text=Sign out')).toBeVisible();
  await page.waitForTimeout(500);
  await page.click('text=Sign out');
  await page.waitForURL('**/login');
  
  await page.waitForTimeout(1000);
});
