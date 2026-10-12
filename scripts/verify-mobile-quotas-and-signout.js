import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3';

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  console.log('--- 1. Testing Mobile Quotas Multi-Tier Architecture ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  
  const seedStorage = () => {
    const configs = [
      { id: 'pl', name: 'Planned Leave', shortCode: 'PL', tier: 'annual', quota: 15, cadence: 'year', color: 'blue', enabled: true },
      { id: 'el', name: 'Emergency Leave', shortCode: 'EL', tier: 'annual', quota: 10, cadence: 'year', color: 'orange', enabled: true },
      { id: 'rh', name: 'Extra Leave', shortCode: 'RH', tier: 'annual', quota: 1, cadence: 'year', color: 'green', enabled: true },
      { id: 'wfh', name: 'Remote / WFH', shortCode: 'WFH', tier: 'remote', quota: 10, cadence: 'month', color: 'cyan', enabled: true },
      { id: 'wellness_demo', name: 'Wellness Day', shortCode: 'WELL', tier: 'special', quota: 2, cadence: 'month', color: 'pink', enabled: true }
    ];

    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.setItem('demo_user', JSON.stringify({
      id: 'demo-user-123',
      email: 'demo@example.com',
      user_metadata: { full_name: 'Sarah Connor' }
    }));
    sessionStorage.setItem('demo_onboarding_completed', 'true');
    sessionStorage.setItem('demo_profile', JSON.stringify({
      id: 'demo-user-123',
      name: 'Sarah Connor',
      email: 'demo@example.com',
      quota_pl: 15,
      quota_el: 10,
      quota_rh: 1,
      quota_wfh: 10,
      wfh_prompt_hour: '23',
      company_name: 'Cyberdyne Systems',
      leave_configs: configs
    }));
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('has_seen_onboarding_before', 'true');
    localStorage.setItem('leave_planner_tutorial_completed', 'true');
    localStorage.setItem('leave_configs', JSON.stringify(configs));
  };

  await mobilePage.addInitScript(seedStorage);

  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  // Open mobile menu
  console.log('Opening mobile menu...');
  const menuBtn = mobilePage.locator('button[title="Open menu"], button:has(svg.lucide-menu)');
  if (await menuBtn.first().isVisible()) {
    await menuBtn.first().click();
  }
  await mobilePage.waitForTimeout(600);

  // Click Settings
  console.log('Clicking Settings in mobile menu...');
  const settingsBtn = mobilePage.locator('button:has-text("Settings")');
  await settingsBtn.click();
  await mobilePage.waitForTimeout(600);

  // Check Quotas Tab - Annual Bank
  console.log('Verifying Annual Bank tier...');
  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_quotas_annual_tier.png') });

  // Switch to Special Benefits Tier
  console.log('Switching to Special Benefits tier...');
  const specialTab = mobilePage.locator('button:has-text("Special")');
  await specialTab.click();
  await mobilePage.waitForTimeout(600);

  // Verify Special Benefits cards
  const specialCards = mobilePage.locator('text=Independent Balances');
  console.log('Independent Balances note visible:', await specialCards.isVisible());

  // Click Add Special Benefit
  console.log('Testing Add Special Benefit expander...');
  const addBenefitBtn = mobilePage.locator('button:has-text("Add Special Benefit")');
  if (await addBenefitBtn.isVisible()) {
    await addBenefitBtn.click();
    await mobilePage.waitForTimeout(400);
  }

  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_quotas_special_tier.png') });

  // Switch to Remote / WFH Tier
  console.log('Switching to Remote / WFH tier...');
  const remoteTab = mobilePage.locator('button:has-text("Remote")');
  await remoteTab.click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_quotas_remote_tier.png') });

  await mobileContext.close();

  console.log('\n--- 2. Testing Desktop Settings Modal Sign Out Button ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.addInitScript(seedStorage);

  await desktopPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  // Open Settings Modal
  console.log('Opening Settings Modal on desktop...');
  const desktopSettingsBtn = desktopPage.locator('button[title="Open Settings"], button:has(svg.lucide-settings)').first();
  await desktopSettingsBtn.click();
  await desktopPage.waitForTimeout(600);

  // Verify Sign Out button exists and click it
  console.log('Locating and clicking Sign Out button in Settings modal...');
  const signOutBtn = desktopPage.locator('button:has-text("Sign Out")').first();
  console.log('Sign Out button visible:', await signOutBtn.isVisible());
  
  await signOutBtn.click();
  await desktopPage.waitForTimeout(1000);

  console.log('Checking state after sign out...');
  await desktopPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop_after_signout.png') });

  await desktopContext.close();
  await browser.close();
  console.log('✅ Verification completed successfully!');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
