import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  // Navigate to dev server
  await page.goto('http://localhost:5173/');

  // Seed demo mode
  await page.evaluate(() => {
    sessionStorage.setItem('is_demo_mode', 'true');
    sessionStorage.setItem('demo_user', JSON.stringify({
      id: 'demo-user-1',
      email: 'demo@example.com',
      user_metadata: { full_name: 'Demo User' }
    }));
    sessionStorage.setItem('demo_onboarding_completed', 'true');
    sessionStorage.setItem('demo_profile', JSON.stringify({
      id: 'demo-user-1',
      name: 'Demo User',
      email: 'demo@example.com',
      quota_pl: 15,
      quota_el: 10,
      quota_rh: 1,
      quota_wfh: 10,
      company_name: 'Spotify'
    }));
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('tutorial_completed', 'true');
    localStorage.setItem('leave_planner_tutorial_completed_v1', 'true');
    localStorage.setItem('gemini_api_key', 'test-api-key');
  });

  await page.reload();
  await page.waitForTimeout(1500);

  // Click on the bottom nav Assistant tab to open mobile assistant
  console.log('Opening mobile assistant...');
  const assistantNavBtn = page.locator('button:has-text("Assistant")');
  await assistantNavBtn.click();
  await page.waitForTimeout(500);

  // Take screenshot of mobile assistant
  await page.screenshot({ path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/mobile_assistant_opened.png' });

  // Let's inject a message with a bridge to test clicking "Apply Bridge to Calendar"
  console.log('Injecting assistant response with bridge card...');
  await page.evaluate(() => {
    // We can simulate an assistant message in state or type query
    const input = document.querySelector('input[placeholder*="Ask"]');
    if (input) {
      input.value = 'plan oct bridge';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Submit via send button
  const sendBtn = page.locator('button[type="submit"]');
  if (await sendBtn.count() > 0) {
    await sendBtn.click();
  }

  // Wait for response or fallback response
  await page.waitForTimeout(2500);

  // Check if bridge or action button exists
  const applyBtn = page.locator('button:has-text("Apply Bridge to Calendar"), button:has-text("Confirm & Book"), button:has-text("Save Itinerary")');
  const count = await applyBtn.count();
  console.log('Action buttons found:', count);

  if (count > 0) {
    console.log('Clicking action button...');
    await applyBtn.first().click();

    // Look for AppleBalanceTicker or ticker animation immediately
    await page.waitForTimeout(300);
    const tickerCount = await page.locator('.tabular-nums, [class*="AppleBalanceTicker"], text="DEDUCTED"').count();
    console.log('Ticker elements visible:', tickerCount);

    await page.screenshot({ path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/mobile_assistant_ticker_anim.png' });

    // Wait for ticker animation to complete (duration is ~1.8s)
    await page.waitForTimeout(2500);

    // Assert it now says "Applied to Calendar" or similar locked state
    const appliedCount = await page.locator('text="Applied to Calendar", text="Applied"').count();
    console.log('Applied state count:', appliedCount);

    await page.screenshot({ path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/mobile_assistant_applied_state.png' });
  }

  // Close assistant and go to Leave Tracker
  console.log('Closing assistant and navigating to Tracker...');
  const closeBtn = page.locator('button[title="Close Assistant"]');
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  }
  await page.waitForTimeout(500);

  // Click on Tracker tab
  const trackerBtn = page.locator('button:has-text("Tracker")');
  await trackerBtn.click();
  await page.waitForTimeout(1000);

  // Screenshot Leave Tracker
  await page.screenshot({ path: 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/mobile_leave_tracker_plans.png', fullPage: true });

  // Check plan count and ensure no 0-leave duplicate ghost cards
  const planCards = await page.locator('#tutorial-step-leave-plans > div').count();
  console.log('Total leave plan cards displayed in Leave Tracker:', planCards);

  await browser.close();
  console.log('Verification script completed.');
}

run().catch(console.error);
