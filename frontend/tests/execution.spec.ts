import { test, expect } from '@playwright/test';

const testEmail = 'test_ui_1779791495007@example.com';
const testPassword = 'password123';

test('Execution Flow and Claude CLI Test', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes timeout

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`BROWSER ERROR: "${msg.text()}"`);
  });

  // 1. Login to the existing account
  await page.goto('http://localhost:3000/login');
  await page.fill('input[id="email"]', testEmail);
  await page.fill('input[id="password"]', testPassword);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/dashboard');
  
  // 2. Click "Overview" (the card link) to go to project details
  await page.waitForTimeout(1000);
  const overviewBtn = page.locator('.group').filter({ hasText: 'UI Test Project' }).locator('a:has-text("Overview")');
  await overviewBtn.click();
  await page.waitForURL('**/projects/*');
  await expect(page.locator('h1').first()).toContainText('UI Test Project');
  await page.waitForTimeout(3000); // Wait to check what is shown
  
  // 3. Come back to dashboard
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForURL('**/dashboard');

  // 4. Click "Continue" on the project
  await page.waitForTimeout(1000);
  const continueBtn = page.locator('a:has-text("Continue")').first();
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();
  
  // 5. Review and approve Blueprint
  await page.waitForSelector('text=Blueprint Review', { timeout: 90000 });
  await expect(page.locator('h1')).toContainText('Blueprint Review');
  await page.waitForTimeout(1000);
  const approveAllBlueprintBtn = page.locator('button:has-text("Approve All")');
  await expect(approveAllBlueprintBtn).toBeVisible();
  await approveAllBlueprintBtn.click();
  
  const confirmBlueprintBtn = page.locator('button:has-text("Confirm Blueprint →")');
  await expect(confirmBlueprintBtn).toBeVisible();
  await confirmBlueprintBtn.click();

  // 6. Review and approve Prompts
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

  // 7. Wait for Execution page to load
  await page.waitForSelector('text=Ready to execute', { timeout: 15000 });
  await expect(page.locator('h1')).toContainText('Execution');
  
  // 8. Click Start Execution
  const startBtn = page.locator('button:has-text("Start Execution")').first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // 9. Wait a bit for the backend to spawn Claude CLI and throw the error
  await page.waitForTimeout(10000);

  // 10. Log out
  await page.click(`button:has-text("${testEmail}")`);
  await expect(page.locator('text=Sign out')).toBeVisible();
  await page.waitForTimeout(500);
  await page.click('text=Sign out');
  await page.waitForURL('**/login');
  
  await page.waitForTimeout(1000);
});
