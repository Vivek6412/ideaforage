import { test, expect } from '@playwright/test';

const testEmail = 'test_ui_1779791495007@example.com';
const testPassword = 'password123';

test('Refine Idea to Blueprint Flow', async ({ page }) => {
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
  
  // 2. Click "Continue" on the project
  await page.waitForTimeout(1000);
  const continueBtn = page.locator('a:has-text("Continue")').first();
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();
  
  // Wait for the refine step to load
  await page.waitForSelector('h2:has-text("Refine your idea")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 3. Answer questions intelligently (concurrently)
  const questions = await page.locator('.rounded-xl.border.border-zinc-800.bg-zinc-900\\/60.p-4').all();
  const apiKey = 'REDACTED_GEMINI_KEY';
  
  await Promise.all(questions.map(async (q) => {
    const questionText = await q.locator('p').first().textContent();
    if (!questionText) return;
    
    // Call Gemini directly from the test using the API key
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are answering a product development question for a "simple todo app for developers". Keep the answer extremely concise, 1 short sentence. Question: ${questionText}` }] }]
      })
    });
    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "A standard best-practice approach.";
    
    // Some questions might be IDK chips, some might be textareas. We look for textarea first
    const textarea = q.locator('textarea');
    if (await textarea.count() > 0) {
      await textarea.fill(answer);
    }
  }));

  // 4. Click Submit Answers if needed
  if (questions.length > 0) {
    const submitBtn = page.locator('button:has-text("Submit Answers →")');
    if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
      await submitBtn.click();
      await expect(page.locator('button:has-text("Refining…")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("Refining…")')).toBeHidden({ timeout: 45000 });
    }
  }

  // 5. Click Confirm the idea
  const confirmBtn = page.locator('button:has-text("Looks Good — Proceed to Blueprint")');
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();
  
  // 6. Wait for blueprint generation step
  await page.waitForSelector('text=Blueprint Review', { timeout: 90000 });
  await expect(page.locator('h1')).toContainText('Blueprint Review');
  await page.waitForTimeout(1500);

  // 7. Log out
  await page.click(`button:has-text("${testEmail}")`);
  await expect(page.locator('text=Sign out')).toBeVisible();
  await page.waitForTimeout(500);
  await page.click('text=Sign out');
  await page.waitForURL('**/login');
  
  await page.waitForTimeout(1000);
});
