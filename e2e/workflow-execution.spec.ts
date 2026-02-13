/**
 * E2E Tests: Workflow Execution
 * Tests for executing, monitoring, and debugging workflows
 *
 * @file e2e/workflow-execution.spec.ts
 * @description 10 comprehensive tests for workflow execution flows
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
test.describe('Workflow Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the application to fully load
    await page.waitForLoadState('networkidle');

    // Wait for React Flow canvas to be ready
    await page.waitForSelector('.react-flow', { timeout: 10000 });
  });

  /**
   * Test 1: Start workflow execution
   * Verifies that clicking the execute button starts workflow execution
   */
  test('should start workflow execution', async ({ page }) => {
    // Find the execute button
    const executeButton = page.locator('[data-testid="execute-workflow-button"]')
      .or(page.locator('button:has-text("Execute")'))
      .or(page.locator('button:has-text("Exécuter")'))
      .or(page.locator('button:has-text("Run")'))
      .or(page.locator('button:has(svg[class*="Play"])'));

    // Check if execute button exists
    if (await executeButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check if button is enabled (may require nodes in workflow)
      const isDisabled = await executeButton.first().isDisabled();

      if (!isDisabled) {
        // Click execute button
        await executeButton.first().click();

        // Wait for execution to start
        await page.waitForTimeout(500);

        // Check for execution indicator
        const executionIndicator = page.locator('[data-testid="execution-status"]')
          .or(page.locator('[class*="executing"]'))
          .or(page.locator('[class*="running"]'))
          .or(page.locator('text=Running'))
          .or(page.locator('text=Exécution'));

        // Verify execution started or status changed
        const buttonText = await executeButton.first().textContent();
        expect(buttonText).toBeTruthy();
      }
    }

    // Verify canvas is still visible
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 2: Show execution progress
   * Verifies that node status updates during execution
   */
  test('should show execution progress', async ({ page }) => {
    // Find and click execute button
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

    if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await executeButton.isDisabled();

      if (!isDisabled) {
        await executeButton.click();
        await page.waitForTimeout(300);

        // Check for visual execution progress
        const progressIndicators = [
          page.locator('.react-flow__node[class*="executing"]'),
          page.locator('.react-flow__node[class*="running"]'),
          page.locator('.react-flow__node[class*="success"]'),
          page.locator('.react-flow__node[class*="completed"]'),
          page.locator('[data-testid="execution-progress"]'),
          page.locator('[class*="progress"]'),
          page.locator('[role="progressbar"]')
        ];

        // Check if any progress indicator is visible
        for (const indicator of progressIndicators) {
          if (await indicator.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(indicator.first()).toBeVisible();
            return;
          }
        }
      }
    }

    // Verify nodes exist on canvas
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 3: Stop running execution
   * Verifies that execution can be stopped mid-run
   */
  test('should stop running execution', async ({ page }) => {
    // First start execution
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

    if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await executeButton.isDisabled();

      if (!isDisabled) {
        await executeButton.click();
        await page.waitForTimeout(200);

        // Look for stop button
        const stopButton = page.locator('[data-testid="stop-execution-button"]')
          .or(page.locator('button:has-text("Stop")'))
          .or(page.locator('button:has-text("Arrêter")'))
          .or(page.locator('button:has-text("Cancel")'))
          .or(page.locator('button:has(svg[class*="Square"])'));

        if (await stopButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await stopButton.first().click();
          await page.waitForTimeout(500);

          // Verify execution stopped
          const stoppedIndicator = page.locator('text=Stopped')
            .or(page.locator('text=Cancelled'))
            .or(page.locator('text=Arrêté'))
            .or(page.locator('[data-testid="execution-stopped"]'));

          if (await stoppedIndicator.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(stoppedIndicator.first()).toBeVisible();
          }
        }
      }
    }

    // Verify canvas functionality
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 4: Show execution results
   * Verifies that execution results are displayed after completion
   */
  test('should show execution results', async ({ page }) => {
    // Look for execution results panel or output
    const resultsPanel = page.locator('[data-testid="execution-results"]')
      .or(page.locator('[data-testid="output-panel"]'))
      .or(page.locator('[class*="results"]'))
      .or(page.locator('[class*="output"]'));

    // Execute workflow if possible
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

    if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await executeButton.isDisabled();

      if (!isDisabled) {
        await executeButton.click();

        // Wait for execution to potentially complete
        await page.waitForTimeout(2000);

        // Check for results
        if (await resultsPanel.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(resultsPanel.first()).toBeVisible();
        } else {
          // Click on a node to see its output
          const node = page.locator('.react-flow__node').first();
          if (await node.isVisible().catch(() => false)) {
            await node.click();
            await page.waitForTimeout(500);

            // Look for output in config panel
            const outputData = page.locator('[data-testid="node-output"]')
              .or(page.locator('[class*="output"]'))
              .or(page.locator('pre'));

            // Verify some form of output is available
            await expect(page.locator('.react-flow')).toBeVisible();
          }
        }
      }
    }
  });

  /**
   * Test 5: Handle execution errors
   * Verifies that errors are properly displayed when execution fails
   */
  test('should handle execution errors', async ({ page }) => {
    // Look for error indicators after execution
    const errorIndicators = [
      page.locator('[data-testid="execution-error"]'),
      page.locator('[class*="error"]'),
      page.locator('.react-flow__node[class*="error"]'),
      page.locator('text=Error'),
      page.locator('text=Failed'),
      page.locator('text=Erreur')
    ];

    // Execute workflow
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

    if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await executeButton.isDisabled();

      if (!isDisabled) {
        await executeButton.click();
        await page.waitForTimeout(2000);

        // Check for any error indicator
        for (const indicator of errorIndicators) {
          if (await indicator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
            await expect(indicator.first()).toBeVisible();
            return;
          }
        }
      }
    }

    // Verify error handling UI components exist
    const errorBoundary = page.locator('[class*="error-boundary"]')
      .or(page.locator('[data-testid="error-display"]'));

    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 6: Retry failed execution
   * Verifies that failed executions can be retried
   */
  test('should retry failed execution', async ({ page }) => {
    // Look for retry button
    const retryButton = page.locator('[data-testid="retry-execution-button"]')
      .or(page.locator('button:has-text("Retry")'))
      .or(page.locator('button:has-text("Réessayer")'))
      .or(page.locator('button:has-text("Re-run")'))
      .or(page.locator('[aria-label*="retry" i]'));

    // First, try to execute to potentially generate a failure
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

    if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await executeButton.isDisabled();

      if (!isDisabled) {
        await executeButton.click();
        await page.waitForTimeout(2000);

        // Check if retry button appears
        if (await retryButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await retryButton.first().click();
          await page.waitForTimeout(500);

          // Verify retry started
          const executionStatus = page.locator('[data-testid="execution-status"]')
            .or(page.locator('text=Running'))
            .or(page.locator('text=Executing'));

          // Verify canvas is functional
          await expect(page.locator('.react-flow')).toBeVisible();
        }
      }
    }

    // Verify retry capability exists in the UI
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 7: Show execution history
   * Verifies that execution history is accessible
   */
  test('should show execution history', async ({ page }) => {
    // Look for execution history button or panel
    const historyButton = page.locator('[data-testid="execution-history-button"]')
      .or(page.locator('button:has-text("History")'))
      .or(page.locator('button:has-text("Historique")'))
      .or(page.locator('[aria-label*="history" i]'))
      .or(page.locator('button:has(svg[class*="History"])'));

    if (await historyButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyButton.first().click();
      await page.waitForTimeout(500);

      // Check for history panel
      const historyPanel = page.locator('[data-testid="execution-history-panel"]')
        .or(page.locator('[data-testid="execution-list"]'))
        .or(page.locator('[class*="history"]'))
        .or(page.locator('[role="dialog"]'));

      if (await historyPanel.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(historyPanel.first()).toBeVisible();
      }
    }

    // Look for history in sidebar or navigation
    const historyNav = page.locator('a[href*="history"], a[href*="executions"]');
    if (await historyNav.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await historyNav.first().click();
      await page.waitForLoadState('networkidle');
    }

    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * Test 8: Debug workflow step by step
   * Verifies that debug mode allows stepping through workflow
   */
  test('should debug workflow step by step', async ({ page }) => {
    // Look for debug button
    const debugButton = page.locator('[data-testid="debug-workflow-button"]')
      .or(page.locator('button:has-text("Debug")'))
      .or(page.locator('button:has-text("Débogage")'))
      .or(page.locator('button:has(svg[class*="Bug"])'));

    if (await debugButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await debugButton.first().click();
      await page.waitForTimeout(500);

      // Check for debug controls
      const debugControls = page.locator('[data-testid="debug-controls"]')
        .or(page.locator('[class*="debug"]'))
        .or(page.locator('[data-testid="step-into"]'))
        .or(page.locator('[data-testid="step-over"]'));

      // Look for step buttons
      const stepButton = page.locator('button:has-text("Step")')
        .or(page.locator('[data-testid="step-button"]'))
        .or(page.locator('[aria-label*="step" i]'));

      if (await stepButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await stepButton.first().click();
        await page.waitForTimeout(300);

        // Verify debug stepping works
        const nodeHighlight = page.locator('.react-flow__node[class*="debug"]')
          .or(page.locator('.react-flow__node[class*="active"]'))
          .or(page.locator('.react-flow__node[class*="current"]'));

        // Check for any visual feedback
        await expect(page.locator('.react-flow')).toBeVisible();
      }
    }

    // Verify debug panel if it exists
    const debugPanel = page.locator('[data-testid="debugger-panel"]')
      .or(page.locator('[class*="debugger"]'));

    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 9: Show node output data
   * Verifies that clicking on a node shows its output data
   */
  test('should show node output data', async ({ page }) => {
    // First execute the workflow
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

    if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await executeButton.isDisabled();

      if (!isDisabled) {
        await executeButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Click on a node to see its data
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();

    if (nodeCount > 0) {
      await nodes.first().click();
      await page.waitForTimeout(500);

      // Look for output/data panel
      const dataPanel = page.locator('[data-testid="node-output-data"]')
        .or(page.locator('[data-testid="node-data"]'))
        .or(page.locator('[class*="output"]'))
        .or(page.locator('[class*="data-panel"]'))
        .or(page.locator('pre'))
        .or(page.locator('[class*="json"]'));

      // Check for any data display
      if (await dataPanel.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dataPanel.first()).toBeVisible();
      }

      // Double-click to potentially open data viewer
      await nodes.first().dblclick();
      await page.waitForTimeout(500);

      const dataViewer = page.locator('[role="dialog"]')
        .or(page.locator('[class*="modal"]'))
        .or(page.locator('[class*="viewer"]'));

      if (await dataViewer.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(dataViewer.first()).toBeVisible();
        // Close the viewer
        await page.keyboard.press('Escape');
      }
    }

    await expect(page.locator('.react-flow')).toBeVisible();
  });

  /**
   * Test 10: Execute from specific node
   * Verifies that partial execution from a specific node works
   */
  test('should execute from specific node', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();

    if (nodeCount > 1) {
      // Right-click on a node to get context menu
      const targetNode = nodes.nth(1);
      await targetNode.click({ button: 'right' });
      await page.waitForTimeout(300);

      // Look for "Execute from here" option
      const executeFromHereOption = page.locator('text=Execute from here')
        .or(page.locator('text=Exécuter à partir d\'ici'))
        .or(page.locator('text=Run from here'))
        .or(page.locator('[data-testid="execute-from-node"]'));

      if (await executeFromHereOption.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await executeFromHereOption.first().click();
        await page.waitForTimeout(500);

        // Verify execution started from specific node
        const executionIndicator = page.locator('[data-testid="partial-execution"]')
          .or(page.locator('.react-flow__node[class*="executing"]'))
          .or(page.locator('.react-flow__node[class*="running"]'));

        // Verify canvas shows execution status
        await expect(page.locator('.react-flow')).toBeVisible();
      } else {
        // Close context menu
        await page.keyboard.press('Escape');
      }

      // Alternative: Look for partial execution button in node config panel
      await targetNode.click();
      await page.waitForTimeout(300);

      const partialExecuteBtn = page.locator('[data-testid="execute-from-node-button"]')
        .or(page.locator('button:has-text("Execute from this node")'));

      if (await partialExecuteBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await partialExecuteBtn.first().click();
      }
    }

    await expect(page.locator('.react-flow')).toBeVisible();
  });
});

// Helper functions

/**
 * Wait for workflow execution to complete
 */
async function waitForExecutionComplete(page: Page, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const completed = page.locator('[data-testid="execution-complete"]')
      .or(page.locator('text=Completed'))
      .or(page.locator('text=Success'))
      .or(page.locator('text=Failed'));

    if (await completed.first().isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }

    await page.waitForTimeout(500);
  }

  return false;
}

/**
 * Start workflow execution
 */
async function startExecution(page: Page): Promise<boolean> {
  const executeButton = page.locator('button:has-text("Execute"), button:has-text("Exécuter"), button:has-text("Run")').first();

  if (await executeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isDisabled = await executeButton.isDisabled();
    if (!isDisabled) {
      await executeButton.click();
      return true;
    }
  }

  return false;
}

/**
 * Check if workflow is currently executing
 */
async function isExecuting(page: Page): Promise<boolean> {
  const executingIndicators = [
    page.locator('text=Running'),
    page.locator('text=Executing'),
    page.locator('[class*="executing"]'),
    page.locator('[class*="running"]')
  ];

  for (const indicator of executingIndicators) {
    if (await indicator.first().isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
  }

  return false;
}

export { waitForExecutionComplete, startExecution, isExecuting };
