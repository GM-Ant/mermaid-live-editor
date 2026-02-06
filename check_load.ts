import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(5000);
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Body text length:', content.length);
  } catch (e) {
    console.error('FAILED TO LOAD:', e);
  } finally {
    await browser.close();
  }
})();
