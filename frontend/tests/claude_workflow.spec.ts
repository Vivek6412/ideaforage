import { test, expect } from '@playwright/test';

const testEmail = 'test_ui_1779791495007@example.com';
const testPassword = 'password123';

test('Claude CLI Full Workflow with Navigation', async ({ page }) => {
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
  const projectName = `Claude Test ${timestamp}`;
  await page.fill('input[placeholder="e.g. Fitness Tracker Pro"]', projectName);
  await page.click('button:has-text("Continue →")');

  // 4. Enter Idea and Process
  const ideaText = "I want to build a simple habit tracker app for personal use. Core features: add habit, check off daily, view progress. Tech preferences: React and Node.js.";
  
  // Wait for the textarea to be visible
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.fill('textarea', ideaText); 
  await page.click('button:has-text("Process Idea →")');

  // 5. Wait for Refine Idea
  await page.waitForSelector('text=Refine your idea', { timeout: 90000 });

  // 6. Confirm Idea / Looks Good
  const looksGoodBtn = page.locator('button:has-text("Looks Good")').first();
  if (await looksGoodBtn.isVisible()) {
      await looksGoodBtn.click();
  } else {
      const confirmBtn = page.locator('button:has-text("Confirm")').first();
      if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
      }
  }

  // 7. Wait for Blueprint page to load, then go BACK to dashboard
  await page.waitForSelector('text=Blueprint Review', { timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(2000);

  // 8. Click "Continue" from Dashboard
  const continueBtn = page.locator('.group').filter({ hasText: projectName }).locator('a:has-text("Continue")');
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();
  
  // 9. Now on Blueprint Review -> Approve and Confirm
  await page.waitForSelector('text=Blueprint Review', { timeout: 90000 });
  await page.waitForTimeout(2000);
  
  const approveAllBlueprintBtn = page.locator('button:has-text("Approve All")');
  await expect(approveAllBlueprintBtn).toBeVisible();
  await approveAllBlueprintBtn.click();
  
  const confirmBlueprintBtn = page.locator('button:has-text("Confirm Blueprint →")');
  await expect(confirmBlueprintBtn).toBeVisible();
  await confirmBlueprintBtn.click();

  // 10. Wait for Prompts page to load, then go BACK to dashboard again
  await page.waitForSelector('text=Review Prompts', { timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(2000);

  // 11. Click "Overview" from Dashboard to check it
  const overviewBtn = page.locator('.group').filter({ hasText: projectName }).locator('a:has-text("Overview")');
  await expect(overviewBtn).toBeVisible();
  await overviewBtn.click();
  
  // 12. On Overview, verify project name
  await page.waitForURL('**/projects/*');
  await expect(page.locator('h1').first()).toContainText(projectName);
  await page.waitForTimeout(1000);

  // 13. Click "View" Blueprint and wait
  const viewBlueprintBtn = page.locator(`a[href$="/blueprint"]:has-text("View")`);
  await expect(viewBlueprintBtn).toBeVisible({ timeout: 15000 });
  await viewBlueprintBtn.click();
  await page.waitForURL('**/blueprint');
  await expect(page.locator('text=Blueprint Summary')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(3000); // stay there for a few seconds

  // Comeback to Dashboard -> Overview
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(1000);
  await page.locator('.group').filter({ hasText: projectName }).locator('a:has-text("Overview")').click();
  await page.waitForURL('**/projects/*');
  await page.waitForTimeout(1000);

  // 14. Click "View" Idea and wait
  const viewIdeaBtn = page.locator(`a[href$="/idea"]:has-text("View")`);
  await expect(viewIdeaBtn).toBeVisible({ timeout: 15000 });
  await viewIdeaBtn.click();
  await page.waitForURL('**/idea');
  await expect(page.locator('text=Idea Summary')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(3000); // stay there for a few seconds

  // Comeback to Dashboard -> Overview
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(1000);
  await page.locator('.group').filter({ hasText: projectName }).locator('a:has-text("Overview")').click();
  await page.waitForURL('**/projects/*');
  await page.waitForTimeout(1000);

  // 15. Click "Continue" where we left off
  const overviewContinueBtn = page.locator('a:has-text("Continue")').first();
  await expect(overviewContinueBtn).toBeVisible();
  await overviewContinueBtn.click();

  // 16. Now on Prompts -> Approve and Confirm
  await page.waitForSelector('text=Review Prompts', { timeout: 90000 });
  await page.waitForTimeout(2000);

  const approveAllPromptsBtn = page.locator('button:has-text("Approve All")');
  await expect(approveAllPromptsBtn).toBeVisible();
  await approveAllPromptsBtn.click();
  await page.waitForTimeout(1000);

  const confirmPromptsBtn = page.locator('button:has-text("Confirm Prompts")');
  await expect(confirmPromptsBtn).toBeVisible();
  await confirmPromptsBtn.click();

  // 17. Execution Stage
  await page.waitForURL('**/execution', { timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const startBtn = page.locator('button:has-text("Start Execution")').first();
  await expect(startBtn).toBeVisible({ timeout: 15000 });
  await startBtn.click();
  
  // 18. Verify the Claude CLI error message appears
  // Wait for the exact text "there is no claude cli in your system please download it."
  const errorMessage = page.locator('text=there is no claude cli in your system please download it.');
  await expect(errorMessage).toBeVisible({ timeout: 60000 });

  // 19. Log out
  await page.click(`button:has-text("${testEmail}")`);
  await expect(page.locator('text=Sign out')).toBeVisible();
  await page.waitForTimeout(500);
  await page.click('text=Sign out');
  await page.waitForURL('**/login');
  
  await page.waitForTimeout(1000);
});
