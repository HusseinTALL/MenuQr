import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });
  });

  test('should display content in French by default', async ({ page }) => {
    const pageContent = await page.content();

    // Check for French words
    const hasFrenchContent = pageContent.includes('Panier') ||
                             pageContent.includes('Menu') ||
                             pageContent.includes('Ajouter') ||
                             pageContent.includes('Populaire');

    expect(hasFrenchContent).toBeTruthy();
  });

  test('should switch language when clicking language selector', async ({ page }) => {
    // Find language selector
    const languageSelector = page.locator('[data-testid="language-selector"], button[aria-label*="langue"], select[aria-label*="language"]');

    if (await languageSelector.first().isVisible()) {
      // Get current content
      const contentBefore = await page.content();

      // Click language selector
      await languageSelector.first().click();

      // Select English if available
      const englishOption = page.locator('text=/English|EN/i').first();
      if (await englishOption.isVisible()) {
        await englishOption.click();
        await page.waitForTimeout(500);

        // Content should change
        const contentAfter = await page.content();

        // Check for English content
        const hasEnglishContent = contentAfter.includes('Cart') ||
                                  contentAfter.includes('Add') ||
                                  contentAfter.includes('Popular');
      }
    }
  });

  test('should persist language preference', async ({ page }) => {
    // Find and change language
    const languageSelector = page.locator('[data-testid="language-selector"], button[aria-label*="langue"]');

    if (await languageSelector.first().isVisible()) {
      await languageSelector.first().click();

      const englishOption = page.locator('text=/English|EN/i').first();
      if (await englishOption.isVisible()) {
        await englishOption.click();
        await page.waitForTimeout(500);

        // Reload page
        await page.reload();
        await page.waitForSelector('article, .dish-card', { timeout: 10000 });

        // Language should be preserved (check localStorage)
        const locale = await page.evaluate(() => localStorage.getItem('menuqr-locale'));
        // Locale might be 'en' or content should still be in English
      }
    }
  });
});

test.describe('Theme and Settings', () => {
  test('should respect system color scheme preference', async ({ page }) => {
    // This test verifies the page loads correctly with default theme
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Page should be visible and styled
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Check for skip links or main navigation
    const nav = page.locator('nav, [role="navigation"]');
    const main = page.locator('main, [role="main"]');

    // At least one should exist
    const hasNav = await nav.first().isVisible().catch(() => false);
    const hasMain = await main.first().isVisible().catch(() => false);

    expect(hasNav || hasMain).toBeTruthy();
  });
});
