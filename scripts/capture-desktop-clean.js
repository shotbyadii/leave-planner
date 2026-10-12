import { chromium } from 'playwright';

async function run() {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  await p.addInitScript(() => {
    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.setItem('demo_user', JSON.stringify({ id: 'demo-1', email: 'alex@netflix.com', user_metadata: { full_name: 'Alex' } }));
    sessionStorage.setItem('demo_onboarding_completed', 'true');
    sessionStorage.setItem('demo_leaves', JSON.stringify([]));
    sessionStorage.setItem('demo_profile', JSON.stringify({ id: 'demo-1', name: 'Alex', email: 'alex@netflix.com', company_name: 'Netflix', quota_pl: 18, quota_el: 10, quota_rh: 2, quota_wfh: 12 }));
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('tutorial_completed', 'true');
    localStorage.setItem('notif_prompt_dismissed', 'true');
    localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
    sessionStorage.setItem('pwa_session_prompted', 'true');
    localStorage.setItem('wfh_prompt_hour', '99');
    sessionStorage.setItem('wfh_prompt_dismissed', 'true');
    localStorage.setItem('company_name', 'Netflix');
  });
  await p.goto('http://localhost:5173/?demo=true', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  const wfhInOffice = p.locator('button:has-text("In-Office")').first();
  if (await wfhInOffice.isVisible({ timeout: 1500 }).catch(() => false)) {
    await wfhInOffice.click();
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/desktop_sidebar_only.png' });
  console.log('✅ Captured desktop_sidebar_only.png');
  await b.close();
}

run();
