import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.setItem('demo_onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('tutorial_completed', 'true');
    localStorage.setItem('leave_planner_tutorial_completed_v1', 'true');
    sessionStorage.setItem('demo_user', JSON.stringify({
      id: 'demo-user-audit',
      email: 'elon@spacex.com',
      user_metadata: { full_name: 'Elon Musk' }
    }));
    sessionStorage.setItem('demo_profile', JSON.stringify({
      id: 'demo-user-audit',
      name: 'Elon Musk',
      company_name: 'SpaceX'
    }));
    localStorage.setItem('user_name', 'Elon Musk');
    localStorage.setItem('company_name', 'SpaceX');
  });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1200);

  // Take screenshot of the exact topbar region
  await page.screenshot({ 
    path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/header_optimized_topbar.png',
    clip: { x: 0, y: 0, width: 1440, height: 180 }
  });

  await browser.close();
  console.log('Topbar screenshot captured.');
}

run().catch(console.error);
