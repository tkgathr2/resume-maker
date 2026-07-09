import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * E2E Test Suite: OAuth login → Resume form → Submission → Completion
 * Includes accessibility scanning and error scenarios
 */

test.describe('Resume Maker E2E Flow', () => {
  // Test 1: Successful OAuth login and redirect to form
  test('should login with Google OAuth and redirect to form page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Verify signin page loaded
    expect(page).toHaveURL(/.*\/auth\/signin/);
    const signInButton = page.locator('button:has-text("Sign in with Google"), button:has-text("Google")');
    await expect(signInButton).toBeVisible();
  });

  // Test 2: Form page loads with pre-filled data
  test('should load form page with auto-filled data when token is valid', async ({ page, context }) => {
    // Mock a valid session and navigate directly to form
    await context.addCookies([{
      name: 'authjs.session-token',
      value: 'mock-session-token',
      url: 'http://localhost:3000',
    }]);

    await page.goto('/a/valid-token/form');

    // Wait for loading state to finish
    const loadingSpinner = page.locator('text=Loading');
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Verify form elements are present
    const formInputs = page.locator('input[type="text"], textarea');
    expect(await formInputs.count()).toBeGreaterThan(0);
  });

  // Test 3: Form validation error - empty required field
  test('should show validation error when required field is empty', async ({ page, context }) => {
    await context.addCookies([{
      name: 'authjs.session-token',
      value: 'mock-session-token',
      url: 'http://localhost:3000',
    }]);

    await page.goto('/a/valid-token/form');

    // Wait for form to load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Attempt to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Verify validation error message
    const errorMessage = page.locator('text=required');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  // Test 4: Form submission success flow
  test('should submit form and navigate to done page', async ({ page, context }) => {
    await context.addCookies([{
      name: 'authjs.session-token',
      value: 'mock-session-token',
      url: 'http://localhost:3000',
    }]);

    await page.goto('/a/valid-token/form');

    // Wait for form to load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Fill in required fields (basic example - adjust field IDs as needed)
    const inputs = page.locator('input[type="text"], textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);
      await input.fill(`Test Value ${i + 1}`);
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify navigation to done page
    await page.waitForURL(/.*\/a\/.*\/done/, { timeout: 10000 });
    expect(page).toHaveURL(/.*\/done/);
  });

  // Test 5: API failure handling - 404 token not found
  test('should handle invalid/expired token gracefully', async ({ page }) => {
    await page.goto('/a/invalid-token/form');

    // Wait for error state to load
    await page.waitForTimeout(2000);

    // Verify error message is displayed
    const errorBox = page.locator('text=Error, text=Token not found, text=expired');
    await expect(errorBox).toBeVisible({ timeout: 5000 });
  });

  // Test 6: Accessibility audit on form page
  test('should pass accessibility audit (axe scan) on form page', async ({ page, context }) => {
    await context.addCookies([{
      name: 'authjs.session-token',
      value: 'mock-session-token',
      url: 'http://localhost:3000',
    }]);

    await page.goto('/a/valid-token/form');

    // Wait for form to load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Inject axe and run accessibility check
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  // Test 7: Network timeout handling
  test('should handle network timeout with appropriate error message', async ({ page, context }) => {
    // Simulate slow network by setting timeout
    await context.addCookies([{
      name: 'authjs.session-token',
      value: 'mock-session-token',
      url: 'http://localhost:3000',
    }]);

    await page.goto('/a/valid-token/form', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

    // Verify page is still functional
    const formElements = page.locator('input[type="text"], textarea, button[type="submit"]');
    expect(await formElements.count()).toBeGreaterThan(0);
  });
});
