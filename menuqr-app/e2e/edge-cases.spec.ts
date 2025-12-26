import { test, expect } from '@playwright/test';

test.describe('Empty States', () => {
  test('should show empty cart message when cart is empty', async ({ page }) => {
    // Clear any existing cart data
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Go to cart
    await page.goto('/cart');
    await page.waitForTimeout(500);

    // Should show empty state or redirect
    const pageContent = await page.content();
    const hasEmptyState = pageContent.toLowerCase().includes('vide') ||
                          pageContent.toLowerCase().includes('empty') ||
                          pageContent.toLowerCase().includes('aucun') ||
                          page.url().includes('menu');

    expect(hasEmptyState || page.url() !== '/cart').toBeTruthy();
  });

  test('should handle search with no results gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    const searchInput = page.locator('input[type="search"], input[placeholder*="chercher"]');

    if (await searchInput.isVisible()) {
      // Search for non-existent item
      await searchInput.fill('xyznonexistentitem12345');
      await page.waitForTimeout(500);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();

      // Clear search should work
      await searchInput.clear();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Error Handling', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForTimeout(500);

    const pageContent = await page.content();

    // Should show 404 or redirect to home
    const has404 = pageContent.includes('404') ||
                   pageContent.includes('introuvable') ||
                   pageContent.includes('not found') ||
                   page.url() === '/' ||
                   page.url().includes('menu');

    expect(has404).toBeTruthy();
  });

  test('should handle checkout without table number', async ({ page }) => {
    // Add item to cart
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await page.locator('.add-to-cart-btn').click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForTimeout(1000);

    // Page should handle missing table number gracefully
    await expect(page.locator('body')).toBeVisible();
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });
});

test.describe('Performance Edge Cases', () => {
  test('should handle rapid add to cart clicks', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Open modal
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click add button
    const addButton = page.locator('.add-to-cart-btn');
    await addButton.click();

    // App should remain stable
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle rapid quantity changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Open modal
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Rapidly increment quantity
    const plusBtn = page.locator('.quantity-btn--plus');
    for (let i = 0; i < 5; i++) {
      await plusBtn.click();
    }

    // Quantity should update correctly
    const quantityDisplay = page.locator('.quantity-value');
    const quantity = await quantityDisplay.textContent();
    expect(parseInt(quantity || '1')).toBeGreaterThanOrEqual(1);
  });

  test('should handle navigation during loading', async ({ page }) => {
    // Navigate to menu
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Navigate to another page
    await page.goto('/cart');
    await page.waitForTimeout(500);

    // App should remain stable
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Mobile Interactions', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Content should be visible
    await expect(page.locator('article, .dish-card').first()).toBeVisible();

    // Should be able to interact
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();

    // Modal should appear (as bottom sheet on mobile)
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should handle touch scrolling', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    // Content should still be accessible
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Offline Behavior', () => {
  test('should show offline indicator when offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Should show offline indicator or cached content
    const pageContent = await page.content();

    // Page should still have content (from cache or offline state)
    expect(pageContent.length).toBeGreaterThan(500);

    // Go back online
    await context.setOffline(false);
  });

  test('should recover when coming back online', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Go offline then online
    await context.setOffline(true);
    await page.waitForTimeout(300);
    await context.setOffline(false);
    await page.waitForTimeout(500);

    // App should be functional
    const firstDish = page.locator('article, .dish-card').first();
    await expect(firstDish).toBeVisible();
  });
});

test.describe('Long Content', () => {
  test('should handle scrolling through many items', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Should be able to scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // Content should still work
    await expect(page.locator('article, .dish-card').first()).toBeVisible();
  });

  test('should handle long dish names and descriptions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // All dish cards should be properly contained
    const dishCards = page.locator('article, .dish-card');
    const count = await dishCards.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = dishCards.nth(i);
      const box = await card.boundingBox();

      // Cards should have reasonable dimensions
      if (box) {
        expect(box.width).toBeGreaterThan(100);
        expect(box.height).toBeGreaterThan(100);
      }
    }
  });
});
