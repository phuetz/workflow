import { logger } from '../services/LoggingService';
/**
 * Visual Regression Tester
 * Detects visual changes by comparing screenshots
 */

export interface VisualSnapshot {
  id: string;
  name: string;
  screenshot: string; // base64 or URL
  dimensions: { width: number; height: number };
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface VisualDifference {
  x: number;
  y: number;
  width: number;
  height: number;
  severity: 'minor' | 'moderate' | 'major';
}

export interface VisualComparisonResult {
  passed: boolean;
  similarity: number; // 0-100
  pixelsDifferent: number;
  totalPixels: number;
  differences: VisualDifference[];
  diffImage?: string; // base64 highlighted diff image
  threshold: number;
}

export interface VisualRegressionReport {
  passed: boolean;
  comparisons: Array<{
    name: string;
    result: VisualComparisonResult;
  }>;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  timestamp: number;
}

export interface VisualTestOptions {
  threshold?: number; // 0-100, similarity threshold to pass
  ignoreRegions?: Array<{ x: number; y: number; width: number; height: number }>;
  captureViewport?: boolean;
  captureFullPage?: boolean;
  delay?: number; // delay before screenshot
  animations?: boolean; // wait for animations
}

export class VisualRegressionTester {
  private baselines: Map<string, VisualSnapshot> = new Map();
  private options: VisualTestOptions;

  constructor(options: VisualTestOptions = {}) {
    this.options = {
      threshold: options.threshold ?? 95, // 95% similarity required
      ignoreRegions: options.ignoreRegions ?? [],
      captureViewport: options.captureViewport ?? true,
      captureFullPage: options.captureFullPage ?? false,
      delay: options.delay ?? 0,
      animations: options.animations ?? true,
    };
  }

  /**
   * Capture a visual snapshot
   */
  async captureSnapshot(
    name: string,
    element?: HTMLElement
  ): Promise<VisualSnapshot> {
    // Wait for animations if enabled
    if (this.options.animations) {
      await this.waitForAnimations();
    }

    // Delay before capture
    if (this.options.delay! > 0) {
      await this.delay(this.options.delay!);
    }

    // Capture screenshot
    const screenshot = await this.captureScreenshot(element);
    const dimensions = this.getDimensions(element);

    const snapshot: VisualSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      screenshot,
      dimensions,
      timestamp: Date.now(),
    };

    return snapshot;
  }

  /**
   * Set baseline snapshot
   */
  setBaseline(name: string, snapshot: VisualSnapshot): void {
    this.baselines.set(name, snapshot);
    logger.debug(`[VisualRegressionTester] Baseline set for "${name}"`);
  }

  /**
   * Compare current state with baseline
   */
  async compareWithBaseline(
    name: string,
    element?: HTMLElement
  ): Promise<VisualComparisonResult> {
    const baseline = this.baselines.get(name);

    if (!baseline) {
      logger.warn(`[VisualRegressionTester] No baseline found for "${name}"`);
      // Capture and set as baseline
      const snapshot = await this.captureSnapshot(name, element);
      this.setBaseline(name, snapshot);
      return this.createPassResult();
    }

    // Capture current snapshot
    const current = await this.captureSnapshot(name, element);

    // Compare snapshots
    return this.compareSnapshots(baseline, current);
  }

  /**
   * Run visual regression tests
   */
  async runVisualTests(
    tests: Array<{ name: string; selector?: string }>
  ): Promise<VisualRegressionReport> {
    const comparisons: Array<{ name: string; result: VisualComparisonResult }> = [];

    for (const test of tests) {
      const element = test.selector ? document.querySelector(test.selector) as HTMLElement : undefined;
      const result = await this.compareWithBaseline(test.name, element);
      comparisons.push({ name: test.name, result });
    }

    const passedTests = comparisons.filter((c) => c.result.passed).length;
    const failedTests = comparisons.length - passedTests;

    return {
      passed: failedTests === 0,
      comparisons,
      totalTests: comparisons.length,
      passedTests,
      failedTests,
      timestamp: Date.now(),
    };
  }

  /**
   * Compare two snapshots
   */
  private async compareSnapshots(
    baseline: VisualSnapshot,
    current: VisualSnapshot
  ): Promise<VisualComparisonResult> {
    // In a real implementation, this would use a library like pixelmatch
    // or compare images pixel by pixel
    // For now, this is a simplified version

    const differences = await this.detectDifferences(baseline.screenshot, current.screenshot);
    const similarity = this.calculateSimilarity(differences, baseline.dimensions);
    const pixelsDifferent = differences.reduce((sum, diff) => sum + diff.width * diff.height, 0);
    const totalPixels = baseline.dimensions.width * baseline.dimensions.height;

    return {
      passed: similarity >= this.options.threshold!,
      similarity,
      pixelsDifferent,
      totalPixels,
      differences,
      threshold: this.options.threshold!,
    };
  }

  /**
   * Detect differences between two images
   */
  private async detectDifferences(
    baseline: string,
    current: string
  ): Promise<VisualDifference[]> {
    // Simplified implementation
    // In a real scenario, you would:
    // 1. Convert base64 to ImageData
    // 2. Compare pixel by pixel
    // 3. Group different pixels into regions
    // 4. Calculate severity based on cluster size and color difference

    // For demonstration, return mock differences
    if (baseline === current) {
      return [];
    }

    // Mock some differences
    return [
      {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        severity: 'minor',
      },
    ];
  }

  /**
   * Calculate similarity percentage
   */
  private calculateSimilarity(
    differences: VisualDifference[],
    dimensions: { width: number; height: number }
  ): number {
    if (differences.length === 0) return 100;

    const totalPixels = dimensions.width * dimensions.height;
    const differentPixels = differences.reduce(
      (sum, diff) => sum + diff.width * diff.height,
      0
    );

    return Math.max(0, ((totalPixels - differentPixels) / totalPixels) * 100);
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(element?: HTMLElement): Promise<string> {
    // In a browser environment, you would use html2canvas or similar
    // For Node.js/Playwright, you would use page.screenshot()

    // This is a placeholder implementation
    // In a real scenario, use a library like html2canvas:
    /*
    if (typeof window !== 'undefined' && window.html2canvas) {
      const canvas = await html2canvas(element || document.body);
      return canvas.toDataURL();
    }
    */

    // For now, return a placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  /**
   * Get element dimensions
   */
  private getDimensions(element?: HTMLElement): { width: number; height: number } {
    if (element) {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Wait for animations to complete
   */
  private async waitForAnimations(): Promise<void> {
    // Wait for CSS animations and transitions
    await this.delay(500);

    // In a more sophisticated implementation, you would:
    // 1. Query all elements with transitions/animations
    // 2. Listen for transitionend/animationend events
    // 3. Wait until all complete
  }

  /**
   * Create a passing result for new baseline
   */
  private createPassResult(): VisualComparisonResult {
    return {
      passed: true,
      similarity: 100,
      pixelsDifferent: 0,
      totalPixels: 0,
      differences: [],
      threshold: this.options.threshold!,
    };
  }

  /**
   * Load baselines from storage
   */
  loadBaselines(baselines: VisualSnapshot[]): void {
    baselines.forEach((baseline) => {
      this.baselines.set(baseline.name, baseline);
    });
    logger.debug(`[VisualRegressionTester] Loaded ${baselines.length} baselines`);
  }

  /**
   * Export baselines for storage
   */
  exportBaselines(): VisualSnapshot[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Get baseline snapshot
   */
  getBaseline(name: string): VisualSnapshot | undefined {
    return this.baselines.get(name);
  }

  /**
   * Delete baseline
   */
  deleteBaseline(name: string): boolean {
    return this.baselines.delete(name);
  }

  /**
   * Clear all baselines
   */
  clearBaselines(): void {
    this.baselines.clear();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate diff image highlighting differences
   */
  async generateDiffImage(
    baseline: VisualSnapshot,
    current: VisualSnapshot,
    differences: VisualDifference[]
  ): Promise<string> {
    // In a real implementation, this would:
    // 1. Create a canvas with the baseline image
    // 2. Overlay the differences in a highlight color (e.g., red)
    // 3. Return as base64

    // Placeholder implementation
    return baseline.screenshot;
  }
}

export default VisualRegressionTester;
