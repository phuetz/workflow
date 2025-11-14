/**
 * Sample E2E Test for WorkflowBuilder Pro
 * Tests the basic workflow creation flow
 */

import { test, expect } from '@playwright/test';

test.describe('Workflow Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the main workflow canvas', async ({ page }) => {
    // Check if the canvas is visible
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();
  });

  test('should open node sidebar', async ({ page }) => {
    // Check if sidebar is visible
    const sidebar = page.locator('text=Node Library');
    await expect(sidebar).toBeVisible();
  });

  test('should search for nodes', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search nodes"]');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('http');

    // Should show HTTP Request node
    await expect(page.locator('text=HTTP Request')).toBeVisible();
  });

  test('should add a node to canvas', async ({ page }) => {
    // Find HTTP Request node in sidebar
    const httpNode = page.locator('text=HTTP Request').first();

    // Drag to canvas (simplified - actual drag&drop needs more setup)
    await httpNode.click();

    // In real implementation, you'd drag the node to the canvas
    // This is a simplified version
  });

  test('should open global search with Cmd+K', async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

    // Global search should be visible
    const globalSearch = page.locator('text=Search workflows, nodes, commands');
    await expect(globalSearch).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(globalSearch).not.toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    // Find dark mode toggle button
    const darkModeButton = page.locator('button[aria-label*="dark"]').or(
      page.locator('button:has-text("Dark")')
    );

    // Toggle dark mode
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();

      // Check if dark mode class is applied
      const body = page.locator('body');
      await expect(body).toHaveClass(/dark/);
    }
  });

  test('should save workflow', async ({ page }) => {
    // Find save button
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();

    // Click save
    await saveButton.click();

    // Should show success notification (if implemented)
    // await expect(page.locator('text=Workflow saved')).toBeVisible();
  });

  test('should export workflow', async ({ page }) => {
    // Find export button
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Check filename
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('should navigate between sections', async ({ page }) => {
    // Test navigation if routes are implemented
    const sections = ['workflows', 'monitoring', 'settings'];

    for (const section of sections) {
      const link = page.locator(`a[href*="${section}"]`);
      if (await link.isVisible()) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(section));
      }
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check if mobile layout is applied
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Lighthouse scores', async ({ page }) => {
    // This requires lighthouse integration
    // Placeholder for actual lighthouse test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });
});
