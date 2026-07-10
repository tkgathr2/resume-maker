import { test, expect, type Page } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * E2E Test Suite: OAuth login → Resume form → Submission → Completion.
 *
 * The applicant flow (`/a/[token]/*`) reads/writes through Next.js API routes
 * backed by Postgres (see `app/api/a/[token]/*`, `frontend/prisma/schema.prisma`).
 * CI has no live database, so these tests intercept those same-origin API
 * calls with `page.route()` and serve deterministic fixtures — the Next.js
 * route handlers (and Prisma) never execute, keeping the suite fast and
 * independent of any external service.
 */

const VALID_TOKEN = 'e2e-valid-token-000000000000000000';
const EXPIRED_TOKEN = 'e2e-expired-token-00000000000000000';

const APPLICANT_FIXTURE = {
  status: 'opened',
  locale: 'ja',
  ocrStatus: 'done',
  confidence: {},
  prefill: {
    fullName: '',
    furigana: '',
    birthDate: '',
    gender: '',
    nationality: '',
    address: '',
    phone: '',
    email: '',
    visaStatus: '',
    visaExpiry: '',
    education: '',
    workHistory: '',
    qualifications: '',
    motivation: '',
  },
  submitted: false,
};

interface MockOptions {
  getStatus?: number;
  getBody?: unknown;
  submitStatus?: number;
  submitBody?: unknown;
}

/** Mock `/api/a/[token]` (GET), `/draft` (PUT), `/submit` (POST), `/card` (POST). */
async function mockApplicantApi(page: Page, opts: MockOptions = {}): Promise<void> {
  const {
    getStatus = 200,
    getBody = APPLICANT_FIXTURE,
    submitStatus = 200,
    submitBody = { ok: true },
  } = opts;

  await page.route('**/api/a/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST' && url.endsWith('/submit')) {
      await route.fulfill({
        status: submitStatus,
        contentType: 'application/json',
        body: JSON.stringify(submitBody),
      });
      return;
    }
    if (method === 'PUT' && url.endsWith('/draft')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    if (method === 'POST' && url.endsWith('/card')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({
        status: getStatus,
        contentType: 'application/json',
        body: JSON.stringify(getBody),
      });
      return;
    }
    await route.continue();
  });
}

async function fillRequiredFields(page: Page): Promise<void> {
  await page.fill('#fullName', 'Nguyen Van A');
  await page.fill('#birthDate', '2000-01-01');
  await page.fill('#nationality', 'Vietnam');
}

test.describe('Resume Maker E2E Flow', () => {
  // Main flow, step 1: OAuth sign-in entry point.
  test('should show the Google OAuth sign-in button on the signin page', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('button:has-text("Google")')).toBeVisible();
  });

  // Main flow, steps 2-4: form loads pre-filled → applicant submits → done page.
  test('main flow: applicant fills the form, submits, and reaches the done page', async ({ page }) => {
    await mockApplicantApi(page);
    await page.goto(`/a/${VALID_TOKEN}/form`);

    const fullNameInput = page.locator('#fullName');
    await expect(fullNameInput).toBeVisible({ timeout: 10000 });

    await fillRequiredFields(page);
    await page.click('button[type="submit"]');

    await page.waitForURL(new RegExp(`/a/${VALID_TOKEN}/done`), { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`/a/${VALID_TOKEN}/done`));
  });

  // Error scenario 1/3: token expired.
  test('error scenario: expired token shows an error instead of the form', async ({ page }) => {
    await mockApplicantApi(page, { getStatus: 410, getBody: { error: 'token_expired' } });
    await page.goto(`/a/${EXPIRED_TOKEN}/form`);

    await expect(page.getByText(/token_expired|expired/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]')).toHaveCount(0);
  });

  // Error scenario 2/3: client-side validation error.
  test('error scenario: submitting with empty required fields shows a validation error', async ({ page }) => {
    await mockApplicantApi(page);
    await page.goto(`/a/${VALID_TOKEN}/form`);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();

    await expect(page.getByText(/required/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(new RegExp(`/a/${VALID_TOKEN}/form`));
  });

  // Error scenario 3/3: backend returns a server error on submit.
  test('error scenario: server error on submit keeps the applicant on the form with an error message', async ({ page }) => {
    await mockApplicantApi(page, { submitStatus: 500, submitBody: { error: 'server_error' } });
    await page.goto(`/a/${VALID_TOKEN}/form`);

    await expect(page.locator('#fullName')).toBeVisible({ timeout: 10000 });
    await fillRequiredFields(page);
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Error: server_error/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(new RegExp(`/a/${VALID_TOKEN}/form`));
  });

  // Accessibility audit (axe scan) on the form page.
  test('should pass accessibility audit (axe scan) on the form page', async ({ page }) => {
    await mockApplicantApi(page);
    await page.goto(`/a/${VALID_TOKEN}/form`);

    await expect(page.locator('#fullName')).toBeVisible({ timeout: 10000 });

    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });
});
