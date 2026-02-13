import { logger } from '../services/SimpleLogger';
/**
 * Visual Test Recorder
 * Records user interactions and generates Playwright test code
 */

export interface RecordedAction {
  id: string;
  type: 'click' | 'input' | 'select' | 'hover' | 'scroll' | 'navigate' | 'wait' | 'assert';
  timestamp: number;
  selector: string;
  value?: string;
  target?: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    attributes: Record<string, string>;
  };
  viewport?: { width: number; height: number };
  screenshot?: string;
}

export interface RecordedTest {
  id: string;
  name: string;
  description: string;
  actions: RecordedAction[];
  startTime: number;
  endTime?: number;
  metadata: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
  };
}

export interface RecorderOptions {
  captureScreenshots?: boolean;
  generateSmartSelectors?: boolean;
  recordMouseMovements?: boolean;
  recordScrolls?: boolean;
  maxActionsPerTest?: number;
}

export class VisualTestRecorder {
  private isRecording = false;
  private currentTest: RecordedTest | null = null;
  private actions: RecordedAction[] = [];
  private eventListeners: Map<string, EventListener> = new Map();
  private options: RecorderOptions;
  private actionCounter = 0;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      captureScreenshots: options.captureScreenshots ?? true,
      generateSmartSelectors: options.generateSmartSelectors ?? true,
      recordMouseMovements: options.recordMouseMovements ?? false,
      recordScrolls: options.recordScrolls ?? true,
      maxActionsPerTest: options.maxActionsPerTest ?? 100,
    };
  }

  /**
   * Start recording user interactions
   */
  startRecording(testName: string, description: string = ''): void {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    this.isRecording = true;
    this.actions = [];
    this.actionCounter = 0;

    this.currentTest = {
      id: `test_${Date.now()}`,
      name: testName,
      description,
      actions: [],
      startTime: Date.now(),
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    };

    this.attachEventListeners();
    logger.debug(`[VisualTestRecorder] Started recording: ${testName}`);
  }

  /**
   * Stop recording and return the recorded test
   */
  stopRecording(): RecordedTest | null {
    if (!this.isRecording || !this.currentTest) {
      logger.warn('[VisualTestRecorder] No recording in progress');
      return null;
    }

    this.isRecording = false;
    this.detachEventListeners();

    this.currentTest.endTime = Date.now();
    this.currentTest.actions = this.actions;

    const test = this.currentTest;
    this.currentTest = null;
    this.actions = [];

    logger.debug(`[VisualTestRecorder] Stopped recording. Captured ${test.actions.length} actions`);
    return test;
  }

  /**
   * Pause recording temporarily
   */
  pauseRecording(): void {
    if (!this.isRecording) return;
    this.detachEventListeners();
    logger.debug('[VisualTestRecorder] Recording paused');
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (!this.isRecording) return;
    this.attachEventListeners();
    logger.debug('[VisualTestRecorder] Recording resumed');
  }

  /**
   * Add a custom action (for assertions, waits, etc.)
   */
  addCustomAction(action: Omit<RecordedAction, 'id' | 'timestamp'>): void {
    if (!this.isRecording) return;

    const recordedAction: RecordedAction = {
      ...action,
      id: `action_${this.actionCounter++}`,
      timestamp: Date.now(),
    };

    this.actions.push(recordedAction);
  }

  /**
   * Attach event listeners to capture user interactions
   */
  private attachEventListeners(): void {
    // Click events
    const clickHandler = (e: Event) => this.handleClick(e as MouseEvent);
    document.addEventListener('click', clickHandler, true);
    this.eventListeners.set('click', clickHandler);

    // Input events
    const inputHandler = (e: Event) => this.handleInput(e as InputEvent);
    document.addEventListener('input', inputHandler, true);
    this.eventListeners.set('input', inputHandler);

    // Change events (for selects, checkboxes, radios)
    const changeHandler = (e: Event) => this.handleChange(e as Event);
    document.addEventListener('change', changeHandler, true);
    this.eventListeners.set('change', changeHandler);

    // Navigation events
    const navigateHandler = () => this.handleNavigation();
    window.addEventListener('popstate', navigateHandler);
    this.eventListeners.set('popstate', navigateHandler);

    // Scroll events (if enabled)
    if (this.options.recordScrolls) {
      const scrollHandler = () => this.handleScroll();
      document.addEventListener('scroll', scrollHandler, { passive: true });
      this.eventListeners.set('scroll', scrollHandler);
    }

    // Mouse movements (if enabled)
    if (this.options.recordMouseMovements) {
      const hoverHandler = (e: Event) => this.handleHover(e as MouseEvent);
      document.addEventListener('mouseover', hoverHandler, true);
      this.eventListeners.set('mouseover', hoverHandler);
    }
  }

  /**
   * Detach all event listeners
   */
  private detachEventListeners(): void {
    this.eventListeners.forEach((listener, eventType) => {
      if (eventType === 'popstate') {
        window.removeEventListener(eventType, listener as EventListener);
      } else {
        document.removeEventListener(eventType, listener as EventListener, true);
      }
    });
    this.eventListeners.clear();
  }

  /**
   * Handle click events
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target || this.shouldIgnoreElement(target)) return;

    const action: RecordedAction = {
      id: `action_${this.actionCounter++}`,
      type: 'click',
      timestamp: Date.now(),
      selector: this.generateSelector(target),
      target: this.captureTargetInfo(target),
    };

    this.actions.push(action);
    this.captureScreenshotIfEnabled(action);
  }

  /**
   * Handle input events
   */
  private handleInput(e: InputEvent): void {
    const target = e.target as HTMLInputElement;
    if (!target || this.shouldIgnoreElement(target)) return;

    // Debounce rapid input events
    const lastAction = this.actions[this.actions.length - 1];
    if (
      lastAction &&
      lastAction.type === 'input' &&
      lastAction.selector === this.generateSelector(target) &&
      Date.now() - lastAction.timestamp < 500
    ) {
      // Update the last action instead of creating a new one
      lastAction.value = target.value;
      lastAction.timestamp = Date.now();
      return;
    }

    const action: RecordedAction = {
      id: `action_${this.actionCounter++}`,
      type: 'input',
      timestamp: Date.now(),
      selector: this.generateSelector(target),
      value: target.value,
      target: this.captureTargetInfo(target),
    };

    this.actions.push(action);
  }

  /**
   * Handle change events (selects, checkboxes, radios)
   */
  private handleChange(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (!target || this.shouldIgnoreElement(target)) return;

    const value = target.type === 'checkbox' || target.type === 'radio'
      ? (target as HTMLInputElement).checked.toString()
      : target.value;

    const action: RecordedAction = {
      id: `action_${this.actionCounter++}`,
      type: 'select',
      timestamp: Date.now(),
      selector: this.generateSelector(target),
      value,
      target: this.captureTargetInfo(target),
    };

    this.actions.push(action);
  }

  /**
   * Handle navigation events
   */
  private handleNavigation(): void {
    const action: RecordedAction = {
      id: `action_${this.actionCounter++}`,
      type: 'navigate',
      timestamp: Date.now(),
      selector: '',
      value: window.location.href,
    };

    this.actions.push(action);
  }

  /**
   * Handle scroll events
   */
  private handleScroll(): void {
    // Debounce scroll events
    const lastAction = this.actions[this.actions.length - 1];
    if (lastAction && lastAction.type === 'scroll' && Date.now() - lastAction.timestamp < 1000) {
      return;
    }

    const action: RecordedAction = {
      id: `action_${this.actionCounter++}`,
      type: 'scroll',
      timestamp: Date.now(),
      selector: '',
      value: JSON.stringify({
        x: window.scrollX,
        y: window.scrollY,
      }),
    };

    this.actions.push(action);
  }

  /**
   * Handle hover events
   */
  private handleHover(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target || this.shouldIgnoreElement(target)) return;

    const action: RecordedAction = {
      id: `action_${this.actionCounter++}`,
      type: 'hover',
      timestamp: Date.now(),
      selector: this.generateSelector(target),
      target: this.captureTargetInfo(target),
    };

    this.actions.push(action);
  }

  /**
   * Generate a smart selector for the element
   */
  private generateSelector(element: HTMLElement): string {
    if (!this.options.generateSmartSelectors) {
      return this.getSimpleSelector(element);
    }

    // Priority order for selector generation:
    // 1. data-testid attribute
    // 2. id attribute
    // 3. name attribute (for inputs)
    // 4. aria-label
    // 5. placeholder (for inputs)
    // 6. text content (for buttons, links)
    // 7. CSS class-based selector
    // 8. XPath as fallback

    // data-testid
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // id
    if (element.id) {
      return `#${element.id}`;
    }

    // name (for inputs)
    const name = element.getAttribute('name');
    if (name && (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA')) {
      return `${element.tagName.toLowerCase()}[name="${name}"]`;
    }

    // aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `[aria-label="${ariaLabel}"]`;
    }

    // placeholder (for inputs)
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && element.tagName === 'INPUT') {
      return `input[placeholder="${placeholder}"]`;
    }

    // text content (for buttons, links)
    if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.textContent) {
      const text = element.textContent.trim().substring(0, 30);
      return `${element.tagName.toLowerCase()}:has-text("${text}")`;
    }

    // CSS class-based selector
    return this.getSimpleSelector(element);
  }

  /**
   * Get a simple CSS selector for the element
   */
  private getSimpleSelector(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const classes = Array.from(element.classList)
      .filter(c => !c.startsWith('Mui-') && !c.includes('emotion'))
      .slice(0, 2)
      .join('.');

    if (classes) {
      return `${tag}.${classes}`;
    }

    // Find nth-child position
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      return `${parent.tagName.toLowerCase()} > ${tag}:nth-child(${index + 1})`;
    }

    return tag;
  }

  /**
   * Capture target element information
   */
  private captureTargetInfo(element: HTMLElement) {
    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
      attributes[attr.name] = attr.value;
    });

    return {
      tagName: element.tagName,
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent?.substring(0, 50) || undefined,
      attributes,
    };
  }

  /**
   * Check if element should be ignored
   */
  private shouldIgnoreElement(element: HTMLElement): boolean {
    // Ignore recorder UI elements
    if (element.closest('[data-test-recorder]')) {
      return true;
    }

    // Ignore certain system elements
    const ignoredTags = ['SCRIPT', 'STYLE', 'META', 'LINK'];
    if (ignoredTags.includes(element.tagName)) {
      return true;
    }

    return false;
  }

  /**
   * Capture screenshot if enabled
   */
  private async captureScreenshotIfEnabled(action: RecordedAction): Promise<void> {
    if (!this.options.captureScreenshots) return;

    // Note: Actual screenshot capture would require additional libraries
    // or browser APIs. This is a placeholder for the implementation.
    // In a real implementation, you might use html2canvas or similar.
  }

  /**
   * Get the current recording status
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get the current test being recorded
   */
  getCurrentTest(): RecordedTest | null {
    return this.currentTest;
  }

  /**
   * Get the number of recorded actions
   */
  getActionCount(): number {
    return this.actions.length;
  }
}

export default VisualTestRecorder;
