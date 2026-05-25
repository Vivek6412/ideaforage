# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\ui_smoke_test.spec.ts >> IdeaForge UI Smoke Test >> Settings Page and Tabs
- Location: tests\ui_smoke_test.spec.ts:70:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Plan Tier')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Plan Tier')

```

```yaml
- navigation:
  - link "IF IdeaForge":
    - /url: /
  - link "Dashboard":
    - /url: /dashboard
  - link "Settings":
    - /url: /settings
  - button "T test@test.com":
    - text: T test@test.com
    - img
- main:
  - heading "Settings" [level=1]
  - paragraph: Manage your API keys, integrations, and profile.
  - button "API Keys"
  - button "Integrations"
  - button "Profile"
  - text: T
  - paragraph: —
  - text: free plan Full name — Email test@test.com
  - paragraph: Contact support to change your name or email.
- alert
```

# Test source

```ts
  1   | 
  2   | import { test, expect } from '@playwright/test';
  3   | 
  4   | test.describe('IdeaForge UI Smoke Test', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // Listen for console errors
  7   |     page.on('console', msg => {
  8   |       if (msg.type() === 'error') {
  9   |         console.log(`BROWSER ERROR: "${msg.text()}"`);
  10  |       }
  11  |     });
  12  | 
  13  |     // Listen for failed network requests
  14  |     page.on('requestfailed', request => {
  15  |       console.log(`NETWORK FAILURE: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  16  |     });
  17  |   });
  18  | 
  19  |   test('Authentication Flow: Register and Login', async ({ page }) => {
  20  |     await page.goto('http://localhost:3000/register');
  21  | 
  22  |     // Test Register Page UI
  23  |     await expect(page.locator('h1')).toContainText('Create an account');
  24  |     await page.fill('input[id="full_name"]', 'UI Test User');
  25  |     await page.fill('input[id="email"]', `test_ui_${Date.now()}@example.com`);
  26  |     await page.fill('input[id="password"]', 'password123');
  27  |     await page.click('button:has-text("Create account")');
  28  | 
  29  |     // Wait for redirect or success state
  30  |     await expect(page.locator('h2')).toContainText('Account created!', { timeout: 15000 });
  31  |     
  32  |     // Test Login Page UI
  33  |     await page.goto('http://localhost:3000/login');
  34  |     await page.fill('input[id="email"]', 'test@test.com');
  35  |     await page.fill('input[id="password"]', 'testpass123');
  36  |     await page.click('button:has-text("Sign in")');
  37  | 
  38  |     // Redirect to dashboard
  39  |     await page.waitForURL('**/dashboard');
  40  |     await expect(page.locator('h1')).toContainText('Dashboard');
  41  |   });
  42  | 
  43  |   test('Dashboard and Project Creation', async ({ page }) => {
  44  |     // Login first
  45  |     await page.goto('http://localhost:3000/login');
  46  |     await page.fill('input[id="email"]', 'test@test.com');
  47  |     await page.fill('input[id="password"]', 'testpass123');
  48  |     await page.click('button:has-text("Sign in")');
  49  |     await page.waitForURL('**/dashboard');
  50  | 
  51  |     // Test Dashboard Components
  52  |     const newProjectBtn = page.locator('a:has-text("New Project")').first();
  53  |     await expect(newProjectBtn).toBeVisible();
  54  |     await newProjectBtn.click();
  55  | 
  56  |     // Project Wizard - Step 1
  57  |     await page.waitForURL('**/projects/new');
  58  |     await page.fill('input[placeholder*="SaaS"]', 'UI Test Project');
  59  |     await page.click('button:has-text("Continue")');
  60  | 
  61  |     // Step 2 - Idea Input
  62  |     await expect(page.locator('h2')).toContainText('Describe your idea');
  63  |     await page.fill('textarea', 'A simple todo app for developers.');
  64  |     await page.click('button:has-text("Process Idea")');
  65  | 
  66  |     // Step 3 - Refine
  67  |     await page.waitForSelector('text=Refine your idea', { timeout: 60000 });
  68  |   });
  69  | 
  70  |   test('Settings Page and Tabs', async ({ page }) => {
  71  |     // Login
  72  |     await page.goto('http://localhost:3000/login');
  73  |     await page.fill('input[id="email"]', 'test@test.com');
  74  |     await page.fill('input[id="password"]', 'testpass123');
  75  |     await page.click('button:has-text("Sign in")');
  76  |     await page.waitForURL('**/dashboard');
  77  | 
  78  |     await page.goto('http://localhost:3000/settings');
  79  |     await expect(page.locator('h1')).toContainText('Settings');
  80  | 
  81  |     // Test Tabs
  82  |     await page.click('button:has-text("Integrations")');
  83  |     await expect(page.getByText('GitHub', { exact: true }).first()).toBeVisible();
  84  |     
  85  |     await page.click('button:has-text("Profile")');
> 86  |     await expect(page.getByText('Plan Tier')).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  87  |     
  88  |     await page.click('button:has-text("API Keys")');
  89  |     await expect(page.locator('text=Anthropic')).toBeVisible();
  90  |   });
  91  | 
  92  |   test('Navbar Dropdown and Logout', async ({ page }) => {
  93  |     // Login
  94  |     await page.goto('http://localhost:3000/login');
  95  |     await page.fill('input[id="email"]', 'test@test.com');
  96  |     await page.fill('input[id="password"]', 'testpass123');
  97  |     await page.click('button:has-text("Sign in")');
  98  |     await page.waitForURL('**/dashboard');
  99  | 
  100 |     // Open Profile Dropdown
  101 |     await page.click('button:has-text("test@test.com")');
  102 |     await expect(page.locator('text=Sign out')).toBeVisible();
  103 | 
  104 |     // Logout
  105 |     await page.click('text=Sign out');
  106 |     await page.waitForURL('**/login');
  107 |   });
  108 | });
  109 | 
```