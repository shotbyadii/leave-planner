import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark'
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.removeItem('demo_onboarding_completed');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('tutorial_completed');
    localStorage.removeItem('leave_planner_tutorial_completed_v1');
  });
  await desktopPage.goto('http://localhost:5173/');
  await desktopPage.waitForTimeout(1000);
  const launchBtnDesk = desktopPage.locator('button:has-text("Launch Sandbox Planner")');
  if (await launchBtnDesk.count() > 0) {
    await launchBtnDesk.click();
    await desktopPage.waitForTimeout(1200);
  }
  await desktopPage.screenshot({ 
    path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/step1_desktop_top_aligned.png'
  });
  console.log('Desktop screenshot saved.');
  await desktopContext.close();

  // 2. Mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.removeItem('demo_onboarding_completed');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('tutorial_completed');
    localStorage.removeItem('leave_planner_tutorial_completed_v1');
  });
  await mobilePage.goto('http://localhost:5173/');
  await mobilePage.waitForTimeout(1000);
  const launchBtnMob = mobilePage.locator('button:has-text("Launch Sandbox Planner")');
  if (await launchBtnMob.count() > 0) {
    await launchBtnMob.click();
    await mobilePage.waitForTimeout(1200);
  }
  await mobilePage.screenshot({ 
    path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/step1_mobile_2features_no_scroll.png'
  });
  console.log('Mobile screenshot saved.');
  await mobileContext.close();

  await browser.close();
}

run().catch(console.error);
