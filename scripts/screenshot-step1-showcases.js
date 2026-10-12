import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark'
  });
  const page = await context.newPage();

  // Pre-seed storage before first navigation
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.removeItem('demo_onboarding_completed');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('tutorial_completed');
    localStorage.removeItem('leave_planner_tutorial_completed_v1');
  });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // Click Launch Sandbox Planner if present
  const launchBtn = page.locator('button:has-text("Launch Sandbox Planner")');
  if (await launchBtn.count() > 0) {
    await launchBtn.click();
    await page.waitForTimeout(1500);
  }

  // Screenshot Onboarding Step 1
  await page.screenshot({ 
    path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/onboarding_step1_showcases_dark.png'
  });

  await browser.close();
  console.log('Dark mode screenshot captured.');
}

run().catch(console.error);
