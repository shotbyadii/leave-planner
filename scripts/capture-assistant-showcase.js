import { chromium, devices } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3';

function seedUser({ brandName, email }) {
  const configs = [
    { id: 'pl', name: 'Planned Leave', shortCode: 'PL', tier: 'annual', quota: 18, cadence: 'year', color: 'blue', enabled: true },
    { id: 'el', name: 'Emergency Leave', shortCode: 'EL', tier: 'annual', quota: 10, cadence: 'year', color: 'orange', enabled: true },
    { id: 'rh', name: 'Extra Leave', shortCode: 'RH', tier: 'annual', quota: 2, cadence: 'year', color: 'green', enabled: true },
    { id: 'wfh', name: 'Remote / WFH', shortCode: 'WFH', tier: 'remote', quota: 12, cadence: 'month', color: 'cyan', enabled: true }
  ];

  sessionStorage.setItem('is_demo_mode', 'true');
  sessionStorage.setItem('demo_user', JSON.stringify({
    id: 'demo-user-1',
    email: email,
    user_metadata: { full_name: 'Alex Reed' }
  }));
  sessionStorage.setItem('demo_onboarding_completed', 'true');
  sessionStorage.setItem('demo_leaves', JSON.stringify([]));
  sessionStorage.setItem('demo_profile', JSON.stringify({
    id: 'demo-user-1',
    name: 'Alex Reed',
    email: email,
    quota_pl: 18,
    quota_el: 10,
    quota_rh: 2,
    quota_wfh: 12,
    wfh_prompt_hour: '23',
    company_name: brandName,
    leave_configs: configs
  }));

  localStorage.setItem('onboarding_completed', 'true');
  localStorage.setItem('tutorial_completed', 'true');
  localStorage.setItem('leave_planner_tutorial_completed_v1', 'true');
  localStorage.setItem('notif_prompt_dismissed', 'true');
  localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
  sessionStorage.setItem('pwa_session_prompted', 'true');
  localStorage.setItem('company_name', brandName);
  localStorage.setItem('leave_configs', JSON.stringify(configs));
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile Pixel 7 Viewport with Netflix Brand
  const mobileContext = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 393, height: 851 }
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.addInitScript(seedUser, { brandName: 'Netflix', email: 'alex@netflix.com' });
  await mobilePage.goto('http://localhost:5173/?demo=true', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);

  // Click AI tab on mobile dock
  const mobileAiTab = mobilePage.locator('[data-testid="mobile-nav-ai"]').first();
  await mobileAiTab.waitFor({ state: 'visible', timeout: 5000 });
  await mobileAiTab.click();
  await mobilePage.waitForTimeout(800);

  // Capture Mobile Compact Mode (ambient bottom chatbar, live calendar visible above)
  await mobilePage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'mobile_assistant_compact_ambient.png'),
    fullPage: false
  });
  console.log('✅ Captured mobile_assistant_compact_ambient.png');

  // Submit query in compact mode: "When is the next long weekend?"
  const mobileInput = mobilePage.locator('input[type="text"]').last();
  if (await mobileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mobileInput.fill('When is the next long weekend?');
    await mobileInput.press('Enter');
    await mobilePage.waitForTimeout(2500);
  }

  // Capture Mobile Compact Mode with Bridge Strip card visible while calendar is visible behind
  await mobilePage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'mobile_assistant_compact_response.png'),
    fullPage: false
  });
  console.log('✅ Captured mobile_assistant_compact_response.png');

  // Toggle expand button
  const expandBtn = mobilePage.locator('button[aria-label="Expand to full conversation"]').first();
  if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expandBtn.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({
      path: path.join(ARTIFACTS_DIR, 'mobile_assistant_expanded.png'),
      fullPage: false
    });
    console.log('✅ Captured mobile_assistant_expanded.png');
  }

  await mobileContext.close();

  // 2. Desktop Chrome Viewport with Spotify Brand
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.addInitScript(seedUser, { brandName: 'Spotify', email: 'sarah@spotify.com' });
  await desktopPage.goto('http://localhost:5173/?demo=true', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1500);

  // Click Desktop Assistant Expand Modal Button
  const desktopAiBtn = desktopPage.locator('[data-testid="desktop-ai-expand-modal-btn"]').first();
  await desktopAiBtn.waitFor({ state: 'visible', timeout: 5000 });
  await desktopAiBtn.click();
  await desktopPage.waitForTimeout(800);

  // Click Starter Prompt inside modal
  const desktopPromptChip = desktopPage.locator('div.fixed button:has-text("Upcoming long weekend"), button:has-text("Upcoming long weekend")').last();
  if (await desktopPromptChip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await desktopPromptChip.click();
    await desktopPage.waitForTimeout(2200);
  }

  await desktopPage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'desktop_assistant_spotify_branded.png'),
    fullPage: false
  });
  console.log('✅ Captured desktop_assistant_spotify_branded.png');

  // Ask for balances to show Quota balance card
  const chatInput = desktopPage.locator('div.fixed input[type="text"]').last();
  if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chatInput.fill('Check my leave balances');
    await chatInput.press('Enter');
    await desktopPage.waitForTimeout(2200);

    await desktopPage.screenshot({
      path: path.join(ARTIFACTS_DIR, 'desktop_assistant_quota_cards.png'),
      fullPage: false
    });
    console.log('✅ Captured desktop_assistant_quota_cards.png');
  }

  await desktopContext.close();
  await browser.close();
  console.log('🎉 All assistant showcase screenshots captured successfully!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
