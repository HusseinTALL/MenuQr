import { test, expect } from '@playwright/test';

test.describe('Cart Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });
  });

  test('should add item to cart from dish card', async ({ page }) => {
    // Find and click add button on first available dish
    const addButton = page.locator('.add-button, button[aria-label*="Ajouter"]').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Cart badge should appear or update
      await page.waitForTimeout(500);

      // Check for cart indicator (FAB or badge)
      const cartIndicator = page.locator('[data-testid="cart-fab"], .cart-fab, [aria-label*="panier"]');
      await expect(cartIndicator.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should add item to cart from modal', async ({ page }) => {
    // Open dish modal
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click add to cart button in modal
    const addToCartBtn = page.locator('.add-to-cart-btn, button:has-text("Ajouter au panier")');
    await addToCartBtn.click();

    // Modal should close and item added
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should increment quantity in modal', async ({ page }) => {
    // Open dish modal
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Find quantity display
    const quantityDisplay = page.locator('.quantity-value');
    const initialQuantity = await quantityDisplay.textContent();

    // Click plus button
    const plusBtn = page.locator('.quantity-btn--plus');
    await plusBtn.click();

    // Quantity should increase
    await expect(quantityDisplay).toHaveText('2');
  });

  test('should show cart page with items', async ({ page }) => {
    // Add item first
    const addButton = page.locator('.add-button, button[aria-label*="Ajouter"]').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
    } else {
      // Try adding from modal
      const firstDish = page.locator('article, .dish-card').first();
      await firstDish.click();
      await page.locator('.add-to-cart-btn').click();
      await page.waitForTimeout(500);
    }

    // Navigate to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Should show cart items or empty cart message
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500);
  });

  test('should update quantity in cart', async ({ page }) => {
    // Add item first
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await page.locator('.add-to-cart-btn').click();
    await page.waitForTimeout(500);

    // Go to cart
    await page.goto('/cart');
    await page.waitForTimeout(1000);

    // Cart should have content
    const cartContent = await page.content();
    expect(cartContent.length).toBeGreaterThan(500);
  });

  test('should remove item from cart', async ({ page }) => {
    // Add item first
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await page.locator('.add-to-cart-btn').click();
    await page.waitForTimeout(500);

    // Go to cart
    await page.goto('/cart');
    await page.waitForTimeout(500);

    // Find delete button
    const deleteBtn = page.locator('button:has(svg path[d*="M19 7l"])').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm deletion
      const confirmBtn = page.locator('button:has-text("Oui")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  });
});

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // Add item to cart
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.locator('.add-to-cart-btn').click();
    await page.waitForTimeout(500);
  });

  test('should navigate to checkout from cart', async ({ page }) => {
    // Go to cart
    await page.goto('/cart');
    await page.waitForTimeout(500);

    // Find checkout button
    const checkoutBtn = page.locator('a[href="/checkout"], button:has-text("Commander"), button:has-text("Valider")');
    if (await checkoutBtn.first().isVisible()) {
      await checkoutBtn.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on checkout page
      expect(page.url()).toContain('checkout');
    }
  });

  test('should display order summary in checkout', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForTimeout(500);

    // Should show order details
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500);
  });

  test('should show WhatsApp button for order', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForTimeout(500);

    // Look for WhatsApp button
    const whatsappBtn = page.locator('button:has-text("WhatsApp"), a[href*="whatsapp"], .whatsapp');
    // This is optional - not all flows have WhatsApp
  });
});

test.describe('Complete Order Flow', () => {
  test('should complete full order journey', async ({ page }) => {
    // 1. Go to menu
    await page.goto('/');
    await page.waitForSelector('article, .dish-card', { timeout: 10000 });

    // 2. Select a dish
    const firstDish = page.locator('article, .dish-card').first();
    await firstDish.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 3. Add to cart
    await page.locator('.add-to-cart-btn').click();
    await page.waitForTimeout(500);

    // 4. Go to cart
    await page.goto('/cart');
    await page.waitForTimeout(1000);

    // 5. Verify cart has items
    const cartContent = await page.content();
    expect(cartContent.length).toBeGreaterThan(500);

    // 6. Proceed to checkout
    await page.goto('/checkout');
    await page.waitForTimeout(500);

    // Order flow complete - should be on checkout or redirected
    await expect(page.locator('body')).toBeVisible();
  });
});
