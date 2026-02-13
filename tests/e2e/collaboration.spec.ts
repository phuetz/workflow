/**
 * E2E Tests: Collaboration Features
 * Tests for real-time collaboration, sharing, and team features
 */

import { test, expect, Page, Browser } from '@playwright/test';

const TEST_USERS = {
  owner: { email: 'owner@test.com', password: 'Owner123!' },
  collaborator: { email: 'collaborator@test.com', password: 'Collaborator123!' },
  viewer: { email: 'viewer@test.com', password: 'Viewer123!' }
};

test.describe('Real-time Collaboration', () => {
  test('should show real-time cursor movements', async ({ browser }) => {
    // Open two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 logs in and creates workflow
      await loginAsUser(page1, TEST_USERS.owner);
      await createWorkflow(page1, 'Collaboration Test Workflow');

      // Get workflow URL
      const workflowUrl = page1.url();

      // User 2 logs in and joins the workflow
      await loginAsUser(page2, TEST_USERS.collaborator);
      await page2.goto(workflowUrl);

      // Share workflow with collaborator
      await page1.click('[data-testid="share-workflow-button"]');
      await page1.fill('[data-testid="share-email-input"]', TEST_USERS.collaborator.email);
      await page1.selectOption('[data-testid="share-permission-select"]', 'EDIT');
      await page1.click('[data-testid="share-submit"]');

      // Wait for collaborator to be added
      await page1.waitForSelector(`[data-testid="collaborator-${TEST_USERS.collaborator.email}"]`);

      // User 2 should see active collaborators
      await page2.waitForSelector('[data-testid="active-collaborators"]');
      await expect(page2.locator('[data-testid="active-collaborators"]')).toContainText(TEST_USERS.owner.email.split('@')[0]);

      // Move mouse on page 1
      await page1.mouse.move(300, 200);

      // Page 2 should show cursor
      await page2.waitForSelector(`[data-testid="remote-cursor-${TEST_USERS.owner.email}"]`, { timeout: 5000 });

      // Verify cursor position is updated
      const cursor = page2.locator(`[data-testid="remote-cursor-${TEST_USERS.owner.email}"]`);
      await expect(cursor).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should synchronize node additions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await loginAsUser(page1, TEST_USERS.owner);
      await createWorkflow(page1, 'Sync Test Workflow');

      const workflowUrl = page1.url();

      // Share and open in second browser
      await shareWorkflow(page1, TEST_USERS.collaborator.email, 'EDIT');

      await loginAsUser(page2, TEST_USERS.collaborator);
      await page2.goto(workflowUrl);

      // User 1 adds a node
      await page1.click('[data-testid="node-palette-toggle"]');
      await page1.dragAndDrop(
        '[data-testid="node-palette-trigger-webhook"]',
        '[data-testid="workflow-canvas"]',
        { targetPosition: { x: 200, y: 200 } }
      );

      // User 2 should see the new node
      await page2.waitForSelector('[data-testid^="node-"]', { timeout: 5000 });
      const nodesOnPage2 = await page2.locator('[data-testid^="node-"]').count();
      expect(nodesOnPage2).toBeGreaterThan(0);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should show edit conflicts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await loginAsUser(page1, TEST_USERS.owner);
      await createWorkflow(page1, 'Conflict Test');

      const workflowUrl = page1.url();

      await shareWorkflow(page1, TEST_USERS.collaborator.email, 'EDIT');

      await loginAsUser(page2, TEST_USERS.collaborator);
      await page2.goto(workflowUrl);

      // Both users try to edit the same node
      await page1.click('[data-testid^="node-"]');
      await page1.waitForSelector('[data-testid="node-config-panel"]');

      await page2.click('[data-testid^="node-"]');

      // Page 2 should show conflict warning
      await expect(page2.locator('[data-testid="edit-conflict-warning"]')).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Workflow Sharing', () => {
  test('should share workflow with read permission', async ({ page, browser }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Read-Only Workflow');

    const workflowUrl = page.url();

    // Share with viewer
    await shareWorkflow(page, TEST_USERS.viewer.email, 'READ');

    // Login as viewer in new context
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    await loginAsUser(viewerPage, TEST_USERS.viewer);
    await viewerPage.goto(workflowUrl);

    // Should see read-only banner
    await expect(viewerPage.locator('[data-testid="readonly-banner"]')).toBeVisible();

    // Edit buttons should be disabled
    await expect(viewerPage.locator('[data-testid="edit-workflow-button"]')).toBeDisabled();

    // Cannot add nodes
    const nodeCount = await viewerPage.locator('[data-testid^="node-"]').count();
    await viewerPage.click('[data-testid="node-palette-toggle"]');

    // Drag should not work
    await viewerPage.dragAndDrop(
      '[data-testid="node-palette-trigger-webhook"]',
      '[data-testid="workflow-canvas"]'
    ).catch(() => {});

    const newNodeCount = await viewerPage.locator('[data-testid^="node-"]').count();
    expect(newNodeCount).toBe(nodeCount);

    await viewerContext.close();
  });

  test('should share workflow with edit permission', async ({ page, browser }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Editable Workflow');

    const workflowUrl = page.url();

    // Share with collaborator
    await shareWorkflow(page, TEST_USERS.collaborator.email, 'EDIT');

    // Login as collaborator
    const collabContext = await browser.newContext();
    const collabPage = await collabContext.newPage();

    await loginAsUser(collabPage, TEST_USERS.collaborator);
    await collabPage.goto(workflowUrl);

    // Should not see read-only banner
    await expect(collabPage.locator('[data-testid="readonly-banner"]')).not.toBeVisible();

    // Should be able to edit
    await collabPage.click('[data-testid="node-palette-toggle"]');
    await collabPage.dragAndDrop(
      '[data-testid="node-palette-action-email"]',
      '[data-testid="workflow-canvas"]'
    );

    // Verify node was added
    await expect(collabPage.locator('[data-testid^="node-"]')).toHaveCountGreaterThan(0);

    await collabContext.close();
  });

  test('should revoke workflow access', async ({ page, browser }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Revoke Access Test');

    const workflowUrl = page.url();

    // Share workflow
    await shareWorkflow(page, TEST_USERS.collaborator.email, 'READ');

    // Verify collaborator can access
    const collabContext = await browser.newContext();
    const collabPage = await collabContext.newPage();

    await loginAsUser(collabPage, TEST_USERS.collaborator);
    await collabPage.goto(workflowUrl);
    await expect(collabPage.locator('[data-testid="workflow-editor"]')).toBeVisible();

    await collabPage.close();

    // Revoke access
    await page.click('[data-testid="share-workflow-button"]');
    await page.click(`[data-testid="revoke-access-${TEST_USERS.collaborator.email}"]`);
    await page.click('[data-testid="confirm-revoke"]');

    // Collaborator should not be able to access anymore
    const collabPage2 = await collabContext.newPage();
    await collabPage2.goto(workflowUrl);
    await expect(collabPage2.locator('[data-testid="access-denied"]')).toBeVisible();

    await collabContext.close();
  });
});

test.describe('Comments and Annotations', () => {
  test('should add comment to workflow', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Comments Test');

    // Add a comment
    await page.click('[data-testid="comments-panel-toggle"]');
    await page.click('[data-testid="add-comment-button"]');

    await page.fill('[data-testid="comment-input"]', 'This is a test comment');
    await page.click('[data-testid="submit-comment"]');

    // Verify comment appears
    await expect(page.locator('[data-testid="comment-list"]')).toContainText('This is a test comment');
  });

  test('should reply to comments', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Reply Test');

    // Add initial comment
    await page.click('[data-testid="comments-panel-toggle"]');
    await page.click('[data-testid="add-comment-button"]');
    await page.fill('[data-testid="comment-input"]', 'Initial comment');
    await page.click('[data-testid="submit-comment"]');

    // Reply to comment
    await page.click('[data-testid^="reply-to-comment-"]');
    await page.fill('[data-testid="reply-input"]', 'This is a reply');
    await page.click('[data-testid="submit-reply"]');

    // Verify reply appears
    await expect(page.locator('[data-testid="comment-thread"]')).toContainText('This is a reply');
  });

  test('should mention user in comment', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Mention Test');

    // Share workflow first
    await shareWorkflow(page, TEST_USERS.collaborator.email, 'EDIT');

    // Add comment with mention
    await page.click('[data-testid="comments-panel-toggle"]');
    await page.click('[data-testid="add-comment-button"]');

    await page.fill('[data-testid="comment-input"]', `@${TEST_USERS.collaborator.email} Please review this`);
    await page.click('[data-testid="submit-comment"]');

    // Mention should be highlighted
    await expect(page.locator('[data-testid="user-mention"]')).toBeVisible();
  });
});

test.describe('Version Control', () => {
  test('should create version on save', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Version Control Test');

    // Make changes and save
    await page.click('[data-testid="node-palette-toggle"]');
    await page.dragAndDrop(
      '[data-testid="node-palette-action-email"]',
      '[data-testid="workflow-canvas"]'
    );

    await page.click('[data-testid="save-workflow-button"]');

    // Make more changes
    await page.dragAndDrop(
      '[data-testid="node-palette-action-slack"]',
      '[data-testid="workflow-canvas"]'
    );

    await page.click('[data-testid="save-workflow-button"]');

    // Open version history
    await page.click('[data-testid="version-history-button"]');

    // Should have multiple versions
    await expect(page.locator('[data-testid^="version-"]')).toHaveCountGreaterThan(1);
  });

  test('should restore previous version', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.owner);
    await createWorkflow(page, 'Restore Test');

    const initialNodeCount = await page.locator('[data-testid^="node-"]').count();

    // Add node and save
    await page.click('[data-testid="node-palette-toggle"]');
    await page.dragAndDrop(
      '[data-testid="node-palette-action-email"]',
      '[data-testid="workflow-canvas"]'
    );
    await page.click('[data-testid="save-workflow-button"]');

    const newNodeCount = await page.locator('[data-testid^="node-"]').count();
    expect(newNodeCount).toBeGreaterThan(initialNodeCount);

    // Restore previous version
    await page.click('[data-testid="version-history-button"]');
    await page.click('[data-testid="version-1"]'); // First version
    await page.click('[data-testid="restore-version"]');
    await page.click('[data-testid="confirm-restore"]');

    // Should have original node count
    const restoredNodeCount = await page.locator('[data-testid^="node-"]').count();
    expect(restoredNodeCount).toBe(initialNodeCount);
  });
});

// Helper functions
async function loginAsUser(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/dashboard/);
}

async function createWorkflow(page: Page, name: string) {
  await page.click('[data-testid="create-workflow-button"]');
  await page.fill('[data-testid="workflow-name-input"]', name);
  await page.click('[data-testid="create-workflow-submit"]');
  await page.waitForURL(/\/workflows\/[a-z0-9]+\/edit/);
}

async function shareWorkflow(page: Page, email: string, permission: string) {
  await page.click('[data-testid="share-workflow-button"]');
  await page.fill('[data-testid="share-email-input"]', email);
  await page.selectOption('[data-testid="share-permission-select"]', permission);
  await page.click('[data-testid="share-submit"]');
  await page.waitForSelector('[data-testid="success-toast"]');
}
