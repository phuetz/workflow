/**
 * Test Playback Engine
 * Plays back recorded tests and generates Playwright code
 */

import type { RecordedTest, RecordedAction } from './VisualTestRecorder';
import { logger } from '../services/LoggingService';

export interface PlaybackOptions {
  speed?: number; // 1.0 = normal speed, 2.0 = 2x speed
  pauseBetweenActions?: number; // milliseconds
  highlightElements?: boolean;
  showProgress?: boolean;
}

export interface PlaybackResult {
  success: boolean;
  actionsExecuted: number;
  totalActions: number;
  errors: Array<{ actionId: string; error: string }>;
  duration: number;
}

export class TestPlayback {
  private isPlaying = false;
  private currentActionIndex = 0;
  private playbackSpeed = 1.0;
  private abortController: AbortController | null = null;

  /**
   * Play back a recorded test
   */
  async playback(
    test: RecordedTest,
    options: PlaybackOptions = {}
  ): Promise<PlaybackResult> {
    if (this.isPlaying) {
      throw new Error('Playback is already in progress');
    }

    this.isPlaying = true;
    this.currentActionIndex = 0;
    this.playbackSpeed = options.speed ?? 1.0;
    this.abortController = new AbortController();

    const result: PlaybackResult = {
      success: true,
      actionsExecuted: 0,
      totalActions: test.actions.length,
      errors: [],
      duration: 0,
    };

    const startTime = Date.now();

    try {
      for (let i = 0; i < test.actions.length; i++) {
        if (this.abortController.signal.aborted) {
          break;
        }

        this.currentActionIndex = i;
        const action = test.actions[i];

        try {
          await this.executeAction(action, options);
          result.actionsExecuted++;

          // Pause between actions
          const pauseDuration = (options.pauseBetweenActions ?? 100) / this.playbackSpeed;
          await this.delay(pauseDuration);
        } catch (error) {
          result.success = false;
          result.errors.push({
            actionId: action.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      this.isPlaying = false;
      this.abortController = null;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Stop the current playback
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isPlaying = false;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: RecordedAction,
    options: PlaybackOptions
  ): Promise<void> {
    const element = this.findElement(action.selector);

    if (!element && action.type !== 'navigate' && action.type !== 'scroll' && action.type !== 'wait') {
      throw new Error(`Element not found: ${action.selector}`);
    }

    if (options.highlightElements && element) {
      this.highlightElement(element);
    }

    switch (action.type) {
      case 'click':
        if (element) {
          element.click();
        }
        break;

      case 'input':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = action.value ?? '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;

      case 'select':
        if (element instanceof HTMLSelectElement) {
          element.value = action.value ?? '';
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = action.value === 'true';
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        break;

      case 'hover':
        if (element) {
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
        break;

      case 'scroll':
        if (action.value) {
          const { x, y } = JSON.parse(action.value);
          window.scrollTo(x, y);
        }
        break;

      case 'navigate':
        if (action.value && action.value !== window.location.href) {
          window.location.href = action.value;
          await this.waitForNavigation();
        }
        break;

      case 'wait':
        const waitTime = parseInt(action.value ?? '1000', 10);
        await this.delay(waitTime);
        break;

      case 'assert':
        // Assertions would be handled differently in actual test execution
        break;
    }
  }

  /**
   * Find element by selector
   */
  private findElement(selector: string): HTMLElement | null {
    try {
      // Handle Playwright-style text selectors
      if (selector.includes(':has-text(')) {
        const match = selector.match(/^(\w+):has-text\("([^"]+)"\)$/);
        if (match) {
          const [, tag, text] = match;
          const elements = document.querySelectorAll(tag);
          for (const el of Array.from(elements)) {
            if (el.textContent?.includes(text)) {
              return el as HTMLElement;
            }
          }
        }
      }

      // Standard CSS selector
      return document.querySelector(selector) as HTMLElement | null;
    } catch (error) {
      logger.warn(`Invalid selector: ${selector}`, error);
      return null;
    }
  }

  /**
   * Highlight element during playback
   */
  private highlightElement(element: HTMLElement): void {
    const originalOutline = element.style.outline;
    const originalBackgroundColor = element.style.backgroundColor;

    element.style.outline = '3px solid #ff6b6b';
    element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.backgroundColor = originalBackgroundColor;
    }, 500 / this.playbackSpeed);
  }

  /**
   * Wait for navigation to complete
   */
  private async waitForNavigation(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate Playwright test code from recorded test
   */
  generatePlaywrightCode(test: RecordedTest): string {
    const lines: string[] = [];

    // Import statement
    lines.push("import { test, expect } from '@playwright/test';");
    lines.push('');

    // Test description
    lines.push(`test.describe('${test.name}', () => {`);
    lines.push(`  test('${test.description || test.name}', async ({ page }) => {`);

    // Navigate to initial URL
    lines.push(`    // Navigate to ${test.metadata.url}`);
    lines.push(`    await page.goto('${test.metadata.url}');`);
    lines.push('');

    // Group actions by type for better organization
    let lastActionType = '';

    test.actions.forEach((action, index) => {
      if (action.type !== lastActionType && index > 0) {
        lines.push('');
      }
      lastActionType = action.type;

      const playwrightAction = this.convertActionToPlaywright(action);
      if (playwrightAction) {
        lines.push(`    ${playwrightAction}`);
      }
    });

    // Close test
    lines.push('  });');
    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Convert a recorded action to Playwright code
   */
  private convertActionToPlaywright(action: RecordedAction): string | null {
    const selector = this.convertSelectorToPlaywright(action.selector);

    switch (action.type) {
      case 'click':
        return `await page.locator('${selector}').click();`;

      case 'input':
        return `await page.locator('${selector}').fill('${this.escapeString(action.value ?? '')}');`;

      case 'select':
        if (action.target?.tagName === 'SELECT') {
          return `await page.locator('${selector}').selectOption('${this.escapeString(action.value ?? '')}');`;
        } else if (action.target?.attributes?.type === 'checkbox') {
          return action.value === 'true'
            ? `await page.locator('${selector}').check();`
            : `await page.locator('${selector}').uncheck();`;
        }
        return null;

      case 'hover':
        return `await page.locator('${selector}').hover();`;

      case 'scroll':
        if (action.value) {
          const { x, y } = JSON.parse(action.value);
          return `await page.evaluate(() => window.scrollTo(${x}, ${y}));`;
        }
        return null;

      case 'navigate':
        return `await page.goto('${action.value}');`;

      case 'wait':
        const waitTime = parseInt(action.value ?? '1000', 10);
        return `await page.waitForTimeout(${waitTime});`;

      case 'assert':
        return `await expect(page.locator('${selector}')).toBeVisible();`;

      default:
        return `// Unknown action type: ${action.type}`;
    }
  }

  /**
   * Convert selector to Playwright format
   */
  private convertSelectorToPlaywright(selector: string): string {
    // Already in good format
    if (
      selector.startsWith('[data-testid=') ||
      selector.startsWith('#') ||
      selector.includes(':has-text(')
    ) {
      return selector;
    }

    // Convert other selectors as needed
    return selector;
  }

  /**
   * Escape string for code generation
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  /**
   * Get current playback status
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current action index
   */
  getCurrentActionIndex(): number {
    return this.currentActionIndex;
  }
}

export default TestPlayback;
