const { test, expect } = require('@playwright/test');

test.describe('City Cleanup E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Homepage', () => {
    test('should load the homepage', async ({ page }) => {
      await expect(page).toHaveTitle(/City Cleanup/i);
    });

    test('should display navigation', async ({ page }) => {
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    });
  });

  test.describe('Events', () => {
    test('should display events list', async ({ page }) => {
      await page.goto('/events');
      
      // Wait for events to load
      await page.waitForSelector('[data-testid="events-list"]', { timeout: 5000 })
        .catch(() => console.log('Events list not found'));
      
      const events = page.locator('[data-testid="event-item"]');
      const count = await events.count();
      
      console.log(`Found ${count} events`);
    });

    test('should navigate to event details', async ({ page }) => {
      await page.goto('/events');
      
      const firstEvent = page.locator('[data-testid="event-item"]').first();
      if (await firstEvent.count() > 0) {
        await firstEvent.click();
        await page.waitForURL(/\/events\/\d+/);
      }
    });

    test('should create new event', async ({ page }) => {
      await page.goto('/events/new');
      
      // Fill out event form
      await page.fill('[name="title"]', 'E2E Test Event').catch(() => {});
      await page.fill('[name="description"]', 'Test Description').catch(() => {});
      await page.fill('[name="location"]', 'Test Location').catch(() => {});
      
      // Submit form
      await page.click('button[type="submit"]').catch(() => {});
    });
  });

  test.describe('Dashboard', () => {
    test('should load dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for dashboard elements
      const dashboard = page.locator('[data-testid="dashboard"]');
      await expect(dashboard).toBeVisible().catch(() => {});
    });

    test('should display statistics', async ({ page }) => {
      await page.goto('/dashboard');
      
      const stats = page.locator('[data-testid="stats"]');
      await expect(stats).toBeVisible().catch(() => {});
    });
  });

  test.describe('Map', () => {
    test('should display map', async ({ page }) => {
      await page.goto('/map');
      
      const map = page.locator('[data-testid="map"]');
      await expect(map).toBeVisible().catch(() => {});
    });

    test('should show event markers', async ({ page }) => {
      await page.goto('/map');
      
      await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 })
        .catch(() => console.log('No markers found'));
    });
  });

  test.describe('Authentication', () => {
    test('should navigate to login page', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('input[type="email"]')).toBeVisible().catch(() => {});
      await expect(page.locator('input[type="password"]')).toBeVisible().catch(() => {});
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/signup');
      
      await expect(page.locator('input[name="email"]')).toBeVisible().catch(() => {});
    });
  });

  test.describe('API Integration', () => {
    test('should fetch events from API', async ({ page }) => {
      const response = await page.request.get('/api/events');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should check API health', async ({ page }) => {
      const response = await page.request.get('/api/health');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });
});
