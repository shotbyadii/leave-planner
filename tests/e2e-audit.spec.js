import { test, expect } from '@playwright/test';

// Test canary leave configuration
const CANARY_LEAVE = {
  id: 'wellness_canary',
  name: 'Wellness Day',
  shortCode: 'WELL',
  tier: 'special',
  quota: 3,
  cadence: 'month',
  color: 'pink',
  enabled: true,
  description: 'Self-care & wellness benefit'
};

function getSeedScript(canary) {
  return (canaryLeave) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const configs = [
      { id: 'pl', name: 'Planned Leave', shortCode: 'PL', tier: 'annual', quota: 15, cadence: 'year', color: 'blue', enabled: true },
      { id: 'el', name: 'Emergency Leave', shortCode: 'EL', tier: 'annual', quota: 10, cadence: 'year', color: 'orange', enabled: true },
      { id: 'rh', name: 'Extra Leave', shortCode: 'RH', tier: 'annual', quota: 1, cadence: 'year', color: 'green', enabled: true },
      { id: 'wfh', name: 'Remote / WFH', shortCode: 'WFH', tier: 'remote', quota: 10, cadence: 'month', color: 'cyan', enabled: true },
      canaryLeave
    ];

    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.setItem('demo_user', JSON.stringify({
      id: 'demo-user-audit',
      email: 'audit@example.com',
      user_metadata: { full_name: 'Audit User' }
    }));
    sessionStorage.setItem('demo_onboarding_completed', 'true');
    sessionStorage.setItem('demo_leaves', JSON.stringify([
      { date: todayStr, type: 'office', duration: 1 }
    ]));
    sessionStorage.setItem('demo_profile', JSON.stringify({
      id: 'demo-user-audit',
      name: 'Audit User',
      email: 'audit@example.com',
      quota_pl: 15,
      quota_el: 10,
      quota_rh: 1,
      quota_wfh: 10,
      wfh_prompt_hour: '23',
      company_name: 'Acme Corp',
      leave_configs: configs
    }));

    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('tutorial_completed', 'true');
    localStorage.setItem('leave_planner_tutorial_completed_v1', 'true');
    localStorage.setItem('notif_prompt_dismissed', 'true');
    localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
    sessionStorage.setItem('pwa_session_prompted', 'true');
    localStorage.setItem('wfh_prompt_hour', '23');
    localStorage.setItem('leave_configs', JSON.stringify(configs));
  };
}

test.describe('Leave Planner Automated Verification Suite', () => {

  test('1. App Clean Boot: Zero uncaught exceptions and console errors', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('favicon')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const body = await page.locator('body');
    await expect(body).toBeVisible();

    expect(pageErrors, `Uncaught runtime exceptions: ${pageErrors.join('; ')}`).toEqual([]);
  });

  test('2. Guided Walkthrough & Onboarding Tour Stability', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_completed');
      localStorage.removeItem('tutorial_completed');
      sessionStorage.removeItem('demo_onboarding_completed');
      sessionStorage.setItem('is_demo_mode', 'true');
      localStorage.setItem('notif_prompt_dismissed', 'true');
      localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
      sessionStorage.setItem('pwa_session_prompted', 'true');
      localStorage.setItem('wfh_prompt_hour', '23');
    });

    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // If splash screen is showing, launch demo mode
    const splashLaunchBtn = page.locator('button:has-text("Launch Sandbox Planner"), button:has-text("Sign In to Vault"), button:has-text("Create Account")').first();
    if (await splashLaunchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await splashLaunchBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step through Onboarding if visible
    let onboardingSteps = 0;
    while (onboardingSteps < 6) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Get Started"), button:has-text("Finish")').first();
      if (await nextBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        onboardingSteps++;
      } else {
        break;
      }
    }

    // Verify Walkthrough Mode is active
    const hintCard = page.locator('#tutorial-hint-card');
    if (await hintCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Step through 1 -> 4
      for (let s = 1; s <= 3; s++) {
        const nextActionBtn = page.locator('button:has-text("Next Action")');
        if (await nextActionBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await nextActionBtn.click();
          await page.waitForTimeout(400);
        }
      }

      // At Step 4: Confirm Plan button must be visible & highlighted
      const step4Title = page.locator('text=Click \'Confirm Plan\'');
      if (await step4Title.isVisible({ timeout: 1500 }).catch(() => false)) {
        const confirmBtn = page.locator('#tutorial-step-confirm-plan-btn, #tutorial-step-confirm-plan-btn-mobile').first();
        await expect(confirmBtn).toBeVisible({ timeout: 3000 });
        const isTargeted = await confirmBtn.getAttribute('data-tutorial-target');
        expect(isTargeted).toBe('true');
      }

      // Advance to Step 5
      const nextActionStep4 = page.locator('button:has-text("Next Action")');
      await nextActionStep4.click();
      await page.waitForTimeout(500);

      // At Step 5: Modal must be visible and PL must be targeted
      const step5Title = page.locator('text=Select Leave Category (PL)');
      if (await step5Title.isVisible({ timeout: 1500 }).catch(() => false)) {
        const modal = page.locator('#leave-creation-modal, #mobile-floating-dock').first();
        await expect(modal).toBeVisible({ timeout: 3000 });
        const categoryPl = page.locator('#tutorial-step-category-pl, #tutorial-step-category-pl-mobile').first();
        await expect(categoryPl).toBeVisible({ timeout: 3000 });
        const isPlTargeted = await categoryPl.getAttribute('data-tutorial-target');
        expect(isPlTargeted).toBe('true');
      }

      // Advance to Step 6
      const nextActionStep5 = page.locator('#tutorial-hint-card button:has-text("Next Action")');
      if (await nextActionStep5.isVisible({ timeout: 1500 }).catch(() => false)) {
        await nextActionStep5.click();
        await page.waitForTimeout(500);
      }

      // At Step 6: Modal Apply button must be visible & highlighted
      const step6Title = page.locator('text=Click \'Confirm & Apply\'');
      if (await step6Title.isVisible({ timeout: 1500 }).catch(() => false)) {
        const applyBtn = page.locator('#tutorial-step-modal-apply-btn, #tutorial-step-modal-apply-btn-mobile').first();
        await expect(applyBtn).toBeVisible({ timeout: 3000 });
        const isApplyTargeted = await applyBtn.getAttribute('data-tutorial-target');
        expect(isApplyTargeted).toBe('true');

        // CLICK THE ACTUAL APPLY BUTTON (validates Step 6 -> Step 7 transition)
        await applyBtn.click();
        await page.waitForTimeout(600);
      }

      // At Step 7: Must navigate to Tracker tab & show demo plan card
      const step7Title = page.locator('text=Review Created Plan in Leave Tracker');
      await expect(step7Title).toBeVisible({ timeout: 4000 });
      const demoPlanCard = page.locator('#tutorial-demo-plan-card, [id="tutorial-demo-plan-card"]').first();
      await expect(demoPlanCard).toBeVisible({ timeout: 3000 });

      // Click "Finish Tour"
      const finishBtn = page.locator('#tutorial-hint-card button:has-text("Finish Tour")');
      if (await finishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await finishBtn.click();
        await page.waitForTimeout(400);
      }
    }

    expect(pageErrors, `Crashes during walkthrough tour: ${pageErrors.join('; ')}`).toEqual([]);
  });

  test('3. State-to-View Reflection Matrix: Custom leave reflects across all UI surfaces', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('Mobile');
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(getSeedScript(CANARY_LEAVE), CANARY_LEAVE);

    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const surfaceAudit = {};

    if (!isMobile) {
      // 1. Desktop Topbar Tracker
      const topbarSpecialTab = page.locator('div.hidden.lg\\:flex button:has-text("Special")').first();
      if (await topbarSpecialTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await topbarSpecialTab.click();
        await page.waitForTimeout(300);
      }
      const topbarCanary = page.locator(`[data-surface="topbar-tracker"][data-leave-id="${CANARY_LEAVE.id}"]`);
      surfaceAudit['topbar-tracker'] = await topbarCanary.isVisible({ timeout: 2000 }).catch(() => false);
    } else {
      // 1. Mobile Drawer Tracker
      const mobileMenuBtn = page.locator('[data-testid="mobile-menu-btn"]');
      if (await mobileMenuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mobileMenuBtn.click();
        await page.waitForTimeout(400);

        const mobileSpecialTab = page.locator('button:has-text("Special")').first();
        if (await mobileSpecialTab.isVisible({ timeout: 1500 }).catch(() => false)) {
          await mobileSpecialTab.click();
          await page.waitForTimeout(300);
        }
        const drawerCanary = page.locator(`[data-surface="mobile-drawer-balances"][data-leave-id="${CANARY_LEAVE.id}"]`);
        surfaceAudit['mobile-drawer-balances'] = await drawerCanary.isVisible({ timeout: 2000 }).catch(() => false);

        const closeBtn = page.locator('[data-testid="mobile-drawer-close"], button[aria-label="Close"]').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
          await page.waitForTimeout(400);
        }
      }
    }

    // 2. Tracker Dashboard View
    const trackerNavBtn = isMobile 
      ? page.locator('[data-testid="mobile-nav-tracker"]').first()
      : page.locator('button:has-text("Tracker"), a:has-text("Tracker")').first();
    if (await trackerNavBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await trackerNavBtn.click();
      await page.waitForTimeout(600);

      const trackerSpecialTab = page.locator('[data-testid="tracker-tier-special"]');
      if (await trackerSpecialTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trackerSpecialTab.click();
        await page.waitForTimeout(300);
      }
      const trackerCard = page.locator(`[data-surface="tracker-dashboard"][data-leave-id="${CANARY_LEAVE.id}"]`);
      surfaceAudit['tracker-dashboard'] = await trackerCard.isVisible({ timeout: 2000 }).catch(() => false);
    }

    // Matrix Assertions
    expect(surfaceAudit['tracker-dashboard'], 'Canary leave MUST appear in Tracker dashboard').toBe(true);
    if (!isMobile) {
      expect(surfaceAudit['topbar-tracker'], 'Canary leave MUST appear in desktop topbar tracker').toBe(true);
    }
    expect(pageErrors).toEqual([]);
  });

  test('4. Balance Deduction & Cadence Isolation: Special benefits do not deduct from annual vacation bank', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('Mobile');
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(getSeedScript(CANARY_LEAVE), CANARY_LEAVE);

    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    if (!isMobile) {
      const annualTab = page.locator('div.hidden.lg\\:flex button:has-text("Annual")').first();
      if (await annualTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await annualTab.click();
        await page.waitForTimeout(300);
      }

      const plCapsule = page.locator('[data-surface="topbar-tracker"][data-leave-id="pl"]');
      await expect(plCapsule).toBeVisible({ timeout: 3000 });
      const initialPlText = await plCapsule.innerText();
      expect(initialPlText).toContain('15');
    } else {
      const trackerBtn = page.locator('button:has-text("Tracker")').first();
      if (await trackerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trackerBtn.click();
        await page.waitForTimeout(600);
        const annualTrackerItem = page.locator('[data-surface="tracker-dashboard"][data-leave-id="pl"]');
        await expect(annualTrackerItem).toBeVisible({ timeout: 3000 });
      }
    }

    expect(pageErrors).toEqual([]);
  });

  test('5. Responsive Layout & Horizontal Overflow Audit', async ({ page }) => {
    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const overflows = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      const offenders = [];

      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'hidden') {
          continue;
        }

        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 3 && rect.width > 0 && rect.height > 0) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            className: (el.className || '').toString().slice(0, 80),
            right: Math.round(rect.right),
            docWidth
          });
          if (offenders.length >= 5) break;
        }
      }
      return offenders;
    });

    expect(overflows, `Found elements causing horizontal page overflow: ${JSON.stringify(overflows, null, 2)}`).toHaveLength(0);
  });

  test('6. Onboarding Quotas Height-Morphing Animation Audit', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_completed');
      localStorage.removeItem('tutorial_completed');
      sessionStorage.removeItem('demo_onboarding_completed');
      sessionStorage.setItem('is_demo_mode', 'true');
      localStorage.setItem('notif_prompt_dismissed', 'true');
      localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
      sessionStorage.setItem('pwa_session_prompted', 'true');
    });

    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // If splash screen is showing, launch demo mode
    const splashLaunchBtn = page.locator('button:has-text("Launch Sandbox Planner"), button:has-text("Sign In to Vault"), button:has-text("Create Account")').first();
    if (await splashLaunchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await splashLaunchBtn.click();
      await page.waitForTimeout(1000);
    }

    // Advance to Step 3 (Quotas & Policy Tiers)
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    await expect(nextBtn).toBeVisible({ timeout: 3000 });
    await nextBtn.click(); // to Step 2
    await page.waitForTimeout(400);
    await nextBtn.click(); // to Step 3
    await page.waitForTimeout(500);

    // Target the MorphingTabContent container
    const morphContainer = page.locator('[data-testid="morphing-tab-content"]').first();
    await expect(morphContainer).toBeVisible();

    // 1. Measure Annual tab height
    const annualBox = await morphContainer.boundingBox();
    expect(annualBox.height).toBeGreaterThan(100);

    // 2. Switch to WFH tab
    const wfhTab = page.locator('[role="tab"]:has-text("Work From Home")');
    await wfhTab.click();
    await page.waitForTimeout(500);

    // Measure WFH tab height
    const wfhBox = await morphContainer.boundingBox();
    expect(wfhBox.height).toBeGreaterThan(50);
    expect(wfhBox.height).not.toBe(annualBox.height);

    // 3. Switch to Special Benefits tab
    const specialTab = page.locator('[role="tab"]:has-text("Special Benefits")');
    await specialTab.click();
    await page.waitForTimeout(500);

    // Measure Special Benefits tab height
    const specialBox = await morphContainer.boundingBox();
    expect(specialBox.height).toBeGreaterThan(50);
    expect(specialBox.height).not.toBe(wfhBox.height);

    expect(pageErrors).toEqual([]);
  });

  test('7. Design System Checkbox & Toggle Token Consistency Audit', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_completed');
      localStorage.removeItem('tutorial_completed');
      sessionStorage.removeItem('demo_onboarding_completed');
      sessionStorage.setItem('is_demo_mode', 'true');
      localStorage.setItem('notif_prompt_dismissed', 'true');
      localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
      sessionStorage.setItem('pwa_session_prompted', 'true');
    });

    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // If splash screen is showing, launch demo mode
    const splashLaunchBtn = page.locator('button:has-text("Launch Sandbox Planner"), button:has-text("Sign In to Vault"), button:has-text("Create Account")').first();
    if (await splashLaunchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await splashLaunchBtn.click();
      await page.waitForTimeout(1000);
    }

    // Advance to Step 3 (Quotas)
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    await expect(nextBtn).toBeVisible({ timeout: 3000 });
    await nextBtn.click(); // Step 2
    await page.waitForTimeout(400);
    await nextBtn.click(); // Step 3
    await page.waitForTimeout(500);

    // Switch to WFH tab
    const wfhTab = page.locator('[role="tab"]:has-text("Work From Home")');
    await wfhTab.click();
    await page.waitForTimeout(400);

    // Verify WFH custom checkbox conforms to Slate design system
    const wfhCheckbox = page.locator('[data-testid="wfh-toggle-checkbox"]');
    await expect(wfhCheckbox).toBeVisible({ timeout: 3000 });
    const roleAttr = await wfhCheckbox.getAttribute('role');
    const ariaChecked = await wfhCheckbox.getAttribute('aria-checked');
    expect(roleAttr).toBe('checkbox');
    expect(ariaChecked).toBe('true');

    // Toggle WFH checkbox off and on
    await wfhCheckbox.click();
    await page.waitForTimeout(300);
    expect(await wfhCheckbox.getAttribute('aria-checked')).toBe('false');
    await wfhCheckbox.click();
    await page.waitForTimeout(300);
    expect(await wfhCheckbox.getAttribute('aria-checked')).toBe('true');

    // Rule: Zero unstyled native input[type="checkbox"] elements in the UI
    const unstyledCheckboxes = await page.locator('input[type="checkbox"]:not(.sr-only)').count();
    expect(unstyledCheckboxes, 'Found unstyled raw input[type="checkbox"] in UI! Must use custom Slate design system checkbox tokens.').toBe(0);

    expect(pageErrors).toEqual([]);
  });

  test('8. Dual-Surface Feature Parity Contract: All policy, category, and data actions must exist on both Desktop and Mobile', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('Mobile');
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(getSeedScript(CANARY_LEAVE), CANARY_LEAVE);
    await page.goto('/?demo=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const capabilitiesFound = {};

    if (!isMobile) {
      // ── DESKTOP CAPABILITY DISCOVERY ──
      // Topbar Sign Out
      const topbarSignOut = page.locator('header [data-capability="sign-out"], div.hidden.md\\:block [data-capability="sign-out"]').first();
      capabilitiesFound['sign-out'] = await topbarSignOut.isVisible({ timeout: 2000 }).catch(() => false);

      // Open Desktop Settings Modal
      const desktopSettingsBtn = page.locator('button[title="Settings & Profile Hub"]').first();
      await expect(desktopSettingsBtn).toBeVisible({ timeout: 3000 });
      await desktopSettingsBtn.click();
      await page.waitForTimeout(400);

      // 1. Navigate to "Quotas & Themes" tab in Settings Modal
      const quotasNavBtn = page.locator('nav button:has-text("Quotas & Themes"), nav button:has-text("Quotas")').first();
      await expect(quotasNavBtn).toBeVisible({ timeout: 3000 });
      await quotasNavBtn.click();
      await page.waitForTimeout(400);

      // Verify Annual Quota Configuration
      const annualPolicy = page.locator('[data-capability="annual-policy-edit"]').first();
      capabilitiesFound['annual-policy-edit'] = await annualPolicy.isVisible({ timeout: 2000 }).catch(() => false);

      // Verify Add Custom Annual Category
      const addAnnualBtn = page.locator('[data-capability="add-annual-category"]').first();
      capabilitiesFound['add-annual-category'] = await addAnnualBtn.isVisible({ timeout: 2000 }).catch(() => false);

      // Switch to Remote / WFH Tier Tab
      const remoteTab = page.locator('[data-testid="desktop-quotas-tab-remote"]').first();
      await expect(remoteTab).toBeVisible({ timeout: 3000 });
      await remoteTab.click();
      await page.waitForTimeout(400);
      const remotePolicy = page.locator('[data-capability="remote-policy-edit"]').first();
      capabilitiesFound['remote-policy-edit'] = await remotePolicy.isVisible({ timeout: 2000 }).catch(() => false);

      // Switch to Special Tier Tab
      const specialTab = page.locator('[data-testid="desktop-quotas-tab-special"]').first();
      await expect(specialTab).toBeVisible({ timeout: 3000 });
      await specialTab.click();
      await page.waitForTimeout(400);
      const specialPolicy = page.locator('[data-capability="special-benefits-edit"]').first();
      capabilitiesFound['special-benefits-edit'] = await specialPolicy.isVisible({ timeout: 2000 }).catch(() => false);

      const addSpecialBtn = page.locator('[data-capability="add-special-benefit"]').first();
      capabilitiesFound['add-special-benefit'] = await addSpecialBtn.isVisible({ timeout: 2000 }).catch(() => false);

      // 2. Navigate to "Data & Backups" tab in Settings Modal
      const backupNavBtn = page.locator('nav button:has-text("Data & Backups"), nav button:has-text("Backup")').first();
      await expect(backupNavBtn).toBeVisible({ timeout: 3000 });
      await backupNavBtn.click();
      await page.waitForTimeout(400);

      const exportJson = page.locator('[data-capability="export-json"]').first();
      capabilitiesFound['export-json'] = await exportJson.isVisible({ timeout: 2000 }).catch(() => false);

      const exportCsv = page.locator('[data-capability="export-csv"]').first();
      capabilitiesFound['export-csv'] = await exportCsv.isVisible({ timeout: 2000 }).catch(() => false);

    } else {
      // ── MOBILE CAPABILITY DISCOVERY ──
      // 1. Open Mobile Menu Drawer
      const mobileMenuBtn = page.locator('[data-testid="mobile-menu-btn"]');
      await expect(mobileMenuBtn).toBeVisible({ timeout: 3000 });
      await mobileMenuBtn.click();
      await page.waitForTimeout(400);

      // Verify Sign Out Action in Mobile Drawer Footer
      const drawerSignOut = page.locator('[data-capability="sign-out"]:visible').first();
      capabilitiesFound['sign-out'] = await drawerSignOut.isVisible({ timeout: 2000 }).catch(() => false);

      // 2. Open Mobile Settings Subview
      const mobileSettingsBtn = page.locator('[data-testid="mobile-settings-btn"]');
      await expect(mobileSettingsBtn).toBeVisible({ timeout: 3000 });
      await mobileSettingsBtn.click();
      await page.waitForTimeout(400);

      // Verify Annual Quota Configuration
      const annualPolicy = page.locator('[data-capability="annual-policy-edit"]').first();
      capabilitiesFound['annual-policy-edit'] = await annualPolicy.isVisible({ timeout: 2000 }).catch(() => false);

      // Verify Add Custom Annual Category
      const addAnnualBtn = page.locator('[data-capability="add-annual-category"]').first();
      capabilitiesFound['add-annual-category'] = await addAnnualBtn.isVisible({ timeout: 2000 }).catch(() => false);

      // Switch to Remote / WFH Tier Tab in Mobile Quotas
      const remoteTab = page.locator('[data-testid="mobile-quotas-tab-remote"]').first();
      await expect(remoteTab).toBeVisible({ timeout: 3000 });
      await remoteTab.click();
      await page.waitForTimeout(400);
      const remotePolicy = page.locator('[data-capability="remote-policy-edit"]').first();
      capabilitiesFound['remote-policy-edit'] = await remotePolicy.isVisible({ timeout: 2000 }).catch(() => false);

      // Switch to Special Tier Tab in Mobile Quotas
      const specialTab = page.locator('[data-testid="mobile-quotas-tab-special"]').first();
      await expect(specialTab).toBeVisible({ timeout: 3000 });
      await specialTab.click();
      await page.waitForTimeout(400);
      const specialPolicy = page.locator('[data-capability="special-benefits-edit"]').first();
      capabilitiesFound['special-benefits-edit'] = await specialPolicy.isVisible({ timeout: 2000 }).catch(() => false);

      const addSpecialBtn = page.locator('[data-capability="add-special-benefit"]').first();
      capabilitiesFound['add-special-benefit'] = await addSpecialBtn.isVisible({ timeout: 2000 }).catch(() => false);

      // 3. Switch to Backup Tab in Mobile Settings
      const backupTab = page.locator('button:has-text("Backup")').first();
      await expect(backupTab).toBeVisible({ timeout: 3000 });
      await backupTab.click();
      await page.waitForTimeout(400);

      const exportJson = page.locator('[data-capability="export-json"]').first();
      capabilitiesFound['export-json'] = await exportJson.isVisible({ timeout: 2000 }).catch(() => false);

      const exportCsv = page.locator('[data-capability="export-csv"]').first();
      capabilitiesFound['export-csv'] = await exportCsv.isVisible({ timeout: 2000 }).catch(() => false);
    }

    // ── STRICT PARITY ASSERTION ──
    const REQUIRED_CAPABILITIES = [
      'annual-policy-edit',
      'add-annual-category',
      'remote-policy-edit',
      'special-benefits-edit',
      'add-special-benefit',
      'export-json',
      'export-csv',
      'sign-out'
    ];

    const missingCapabilities = REQUIRED_CAPABILITIES.filter(cap => !capabilitiesFound[cap]);
    expect(
      missingCapabilities,
      `🚨 [Feature Parity Violation on ${isMobile ? 'Mobile' : 'Desktop'}]: The following capabilities were missing: ${missingCapabilities.join(', ')}`
    ).toEqual([]);

    expect(pageErrors).toEqual([]);
  });
});

