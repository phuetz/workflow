/**
 * E2E Tests: Workflow Creation
 * Complete end-to-end workflow creation and execution tests
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_WORKFLOW = {
  name: 'E2E Test Workflow',
  description: 'A workflow created during E2E testing'
};

const TEST_USERS = {
  admin: { email: 'admin@test.com', password: 'admin123' },
  user: { email: 'user@test.com', password: 'user123' },
  viewer: { email: 'viewer@test.com', password: 'viewer123' }
};

test.describe('Workflow Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the homepage', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Workflow Automation Platform/);
    
    // Check for main navigation elements
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    
    // Check for login/register buttons if not authenticated
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      await expect(loginButton).toBeEnabled();
    }
  });

  test('should login successfully', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Should show user name
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test Admin');
  });

  test('should create a new workflow', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    
    // Navigate to workflow creation
    await page.click('[data-testid="create-workflow-button"]');
    
    // Fill workflow details
    await page.fill('[data-testid="workflow-name-input"]', TEST_WORKFLOW.name);
    await page.fill('[data-testid="workflow-description-input"]', TEST_WORKFLOW.description);
    
    // Click create button
    await page.click('[data-testid="create-workflow-submit"]');
    
    // Should redirect to workflow editor
    await expect(page).toHaveURL(/\/workflows\/[a-z0-9]+\/edit/);
    
    // Should show the workflow editor
    await expect(page.locator('[data-testid="workflow-editor"]')).toBeVisible();
    
    // Should show the workflow name
    await expect(page.locator('[data-testid="workflow-title"]')).toContainText(TEST_WORKFLOW.name);
  });

  test('should add nodes to workflow', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    
    // Create workflow first
    await createBasicWorkflow(page, TEST_WORKFLOW);
    
    // Open node palette
    await page.click('[data-testid="node-palette-toggle"]');
    
    // Add a trigger node
    await page.dragAndDrop(
      '[data-testid="node-palette-trigger-webhook"]',
      '[data-testid="workflow-canvas"]'
    );
    
    // Should see the node on canvas
    await expect(page.locator('[data-testid^="node-"]').first()).toBeVisible();
    
    // Add an action node
    await page.dragAndDrop(
      '[data-testid="node-palette-action-email"]',
      '[data-testid="workflow-canvas"]'
    );
    
    // Should have two nodes
    await expect(page.locator('[data-testid^="node-"]')).toHaveCount(2);
  });

  test('should connect nodes', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createWorkflowWithNodes(page);
    
    // Connect nodes by dragging from output to input
    const sourceNode = page.locator('[data-testid^="node-"]').first();
    const targetNode = page.locator('[data-testid^="node-"]').last();
    
    const sourceHandle = sourceNode.locator('[data-testid="output-handle"]');
    const targetHandle = targetNode.locator('[data-testid="input-handle"]');
    
    await sourceHandle.dragTo(targetHandle);
    
    // Should see connection edge
    await expect(page.locator('[data-testid^="edge-"]')).toBeVisible();
  });

  test('should configure node settings', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createWorkflowWithNodes(page);
    
    // Click on a node to open config
    await page.locator('[data-testid^="node-"]').first().click();
    
    // Should open node configuration panel
    await expect(page.locator('[data-testid="node-config-panel"]')).toBeVisible();
    
    // Configure webhook node
    await page.fill('[data-testid="webhook-path-input"]', '/test-webhook');
    await page.selectOption('[data-testid="webhook-method-select"]', 'POST');
    
    // Save configuration
    await page.click('[data-testid="save-node-config"]');
    
    // Panel should close
    await expect(page.locator('[data-testid="node-config-panel"]')).not.toBeVisible();
  });

  test('should save workflow', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createCompleteWorkflow(page);
    
    // Save workflow
    await page.click('[data-testid="save-workflow-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Workflow saved');
    
    // Should update the saved status
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText('Saved');
  });

  test('should activate workflow', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createCompleteWorkflow(page);
    
    // Activate workflow
    await page.click('[data-testid="activate-workflow-button"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    
    // Confirm activation
    await page.click('[data-testid="confirm-activate"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Workflow activated');
    
    // Should update status
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText('Active');
  });

  test('should execute workflow manually', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createAndActivateWorkflow(page);
    
    // Execute workflow
    await page.click('[data-testid="execute-workflow-button"]');
    
    // Should show execution dialog
    await expect(page.locator('[data-testid="execution-dialog"]')).toBeVisible();
    
    // Provide test input
    await page.fill('[data-testid="execution-input"]', '{"test": true}');
    
    // Start execution
    await page.click('[data-testid="start-execution"]');
    
    // Should show execution in progress
    await expect(page.locator('[data-testid="execution-status"]')).toContainText('Running');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 30000 });
    
    // Should show success
    await expect(page.locator('[data-testid="execution-status"]')).toContainText('Success');
  });

  test('should view execution results', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createAndExecuteWorkflow(page);
    
    // Open execution history
    await page.click('[data-testid="execution-history-button"]');
    
    // Should show execution list
    await expect(page.locator('[data-testid="execution-list"]')).toBeVisible();
    
    // Should have at least one execution
    await expect(page.locator('[data-testid^="execution-item-"]')).toHaveCountGreaterThan(0);
    
    // Click on execution to see details
    await page.locator('[data-testid^="execution-item-"]').first().click();
    
    // Should show execution details
    await expect(page.locator('[data-testid="execution-details"]')).toBeVisible();
    
    // Should show node execution results
    await expect(page.locator('[data-testid="node-execution-results"]')).toBeVisible();
  });

  test('should handle workflow errors', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    
    // Create workflow with invalid configuration
    await createWorkflowWithError(page);
    
    // Try to activate
    await page.click('[data-testid="activate-workflow-button"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    
    // Should highlight problematic nodes
    await expect(page.locator('[data-testid="node-error"]')).toBeVisible();
  });

  test('should share workflow', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    await createCompleteWorkflow(page);
    
    // Open sharing dialog
    await page.click('[data-testid="share-workflow-button"]');
    
    // Should show sharing options
    await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
    
    // Add user to share with
    await page.fill('[data-testid="share-email-input"]', TEST_USERS.user.email);
    await page.selectOption('[data-testid="share-permission-select"]', 'READ');
    
    // Share workflow
    await page.click('[data-testid="share-workflow-submit"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Workflow shared');
  });

  test('should access shared workflow', async ({ page }) => {
    // First admin creates and shares workflow
    await loginAsUser(page, TEST_USERS.admin);
    await createAndShareWorkflow(page, TEST_USERS.user.email);
    
    // Logout admin
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Login as user
    await loginAsUser(page, TEST_USERS.user);
    
    // Should see shared workflow in dashboard
    await expect(page.locator('[data-testid="shared-workflows"]')).toBeVisible();
    await expect(page.locator('[data-testid^="shared-workflow-"]')).toHaveCountGreaterThan(0);
    
    // Open shared workflow
    await page.locator('[data-testid^="shared-workflow-"]').first().click();
    
    // Should open in read-only mode
    await expect(page.locator('[data-testid="readonly-banner"]')).toBeVisible();
    
    // Should not be able to edit
    await expect(page.locator('[data-testid="edit-workflow-button"]')).not.toBeVisible();
  });

  test('should search and filter workflows', async ({ page }) => {
    await loginAsUser(page, TEST_USERS.admin);
    
    // Create multiple workflows
    await createMultipleWorkflows(page);
    
    // Go to dashboard
    await page.goto('/dashboard');
    
    // Use search
    await page.fill('[data-testid="workflow-search"]', 'Test');
    
    // Should filter results
    await expect(page.locator('[data-testid^="workflow-card-"]')).toHaveCountGreaterThan(0);
    
    // Clear search
    await page.fill('[data-testid="workflow-search"]', '');
    
    // Use status filter
    await page.selectOption('[data-testid="status-filter"]', 'ACTIVE');
    
    // Should show only active workflows
    const activeWorkflows = page.locator('[data-testid^="workflow-card-"][data-status="ACTIVE"]');
    await expect(activeWorkflows).toHaveCountGreaterThan(0);
  });
});

// Helper functions
async function loginAsUser(page: Page, user: { email: string; password: string }) {
  // Click login button if present
  const loginButton = page.locator('[data-testid="login-button"]');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  } else {
    await page.goto('/login');
  }
  
  // Fill login form
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  
  // Submit login
  await page.click('[data-testid="login-submit"]');
  
  // Wait for redirect
  await page.waitForURL(/\/dashboard/);
}

async function createBasicWorkflow(page: Page, workflow: { name: string; description: string }) {
  await page.click('[data-testid="create-workflow-button"]');
  await page.fill('[data-testid="workflow-name-input"]', workflow.name);
  await page.fill('[data-testid="workflow-description-input"]', workflow.description);
  await page.click('[data-testid="create-workflow-submit"]');
  await page.waitForURL(/\/workflows\/[a-z0-9]+\/edit/);
}

async function createWorkflowWithNodes(page: Page) {
  await createBasicWorkflow(page, TEST_WORKFLOW);
  
  // Add nodes
  await page.click('[data-testid="node-palette-toggle"]');
  await page.dragAndDrop(
    '[data-testid="node-palette-trigger-webhook"]',
    '[data-testid="workflow-canvas"]'
  );
  await page.dragAndDrop(
    '[data-testid="node-palette-action-email"]',
    '[data-testid="workflow-canvas"]'
  );
}

async function createCompleteWorkflow(page: Page) {
  await createWorkflowWithNodes(page);
  
  // Connect nodes
  const sourceHandle = page.locator('[data-testid="output-handle"]').first();
  const targetHandle = page.locator('[data-testid="input-handle"]').last();
  await sourceHandle.dragTo(targetHandle);
  
  // Configure nodes
  await page.locator('[data-testid^="node-"]').first().click();
  await page.fill('[data-testid="webhook-path-input"]', '/test-webhook');
  await page.click('[data-testid="save-node-config"]');
  
  await page.locator('[data-testid^="node-"]').last().click();
  await page.fill('[data-testid="email-to-input"]', 'test@example.com');
  await page.fill('[data-testid="email-subject-input"]', 'Test Email');
  await page.click('[data-testid="save-node-config"]');
  
  // Save workflow
  await page.click('[data-testid="save-workflow-button"]');
  await page.waitForSelector('[data-testid="success-toast"]');
}

async function createAndActivateWorkflow(page: Page) {
  await createCompleteWorkflow(page);
  await page.click('[data-testid="activate-workflow-button"]');
  await page.click('[data-testid="confirm-activate"]');
  await page.waitForSelector('[data-testid="success-toast"]');
}

async function createAndExecuteWorkflow(page: Page) {
  await createAndActivateWorkflow(page);
  await page.click('[data-testid="execute-workflow-button"]');
  await page.fill('[data-testid="execution-input"]', '{"test": true}');
  await page.click('[data-testid="start-execution"]');
  await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 30000 });
}

async function createWorkflowWithError(page: Page) {
  await createWorkflowWithNodes(page);
  
  // Leave nodes unconfigured to create validation errors
  await page.click('[data-testid="save-workflow-button"]');
}

async function createAndShareWorkflow(page: Page, shareWithEmail: string) {
  await createCompleteWorkflow(page);
  await page.click('[data-testid="share-workflow-button"]');
  await page.fill('[data-testid="share-email-input"]', shareWithEmail);
  await page.selectOption('[data-testid="share-permission-select"]', 'READ');
  await page.click('[data-testid="share-workflow-submit"]');
  await page.waitForSelector('[data-testid="success-toast"]');
}

async function createMultipleWorkflows(page: Page) {
  const workflows = [
    { name: 'Test Workflow 1', description: 'First test workflow' },
    { name: 'Test Workflow 2', description: 'Second test workflow' },
    { name: 'Production Workflow', description: 'Production workflow' }
  ];
  
  for (const workflow of workflows) {
    await createBasicWorkflow(page, workflow);
    await page.goto('/dashboard');
  }
}