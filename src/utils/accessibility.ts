/**
 * Accessibility Utilities
 * Tools and helpers for improving application accessibility
 */

/**
 * Generate unique ID for ARIA attributes
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
    );
  },

  /**
   * Trap focus within a container (for modals, etc.)
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Restore focus to previous element
   */
  saveFocus(): () => void {
    const previouslyFocused = document.activeElement as HTMLElement;
    return () => {
      previouslyFocused?.focus();
    };
  }
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNav = {
  /**
   * Handle arrow key navigation in a list
   */
  handleArrowKeys(
    e: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: {
      loop?: boolean;
      horizontal?: boolean;
      onSelect?: (index: number) => void;
    } = {}
  ) {
    const { loop = true, horizontal = false, onSelect } = options;

    const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';

    let newIndex = currentIndex;

    if (e.key === nextKey) {
      e.preventDefault();
      newIndex = currentIndex + 1;
      if (newIndex >= items.length) {
        newIndex = loop ? 0 : items.length - 1;
      }
    } else if (e.key === prevKey) {
      e.preventDefault();
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? items.length - 1 : 0;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(currentIndex);
      return currentIndex;
    }

    items[newIndex]?.focus();
    return newIndex;
  },

  /**
   * Type-ahead search in a list
   */
  createTypeAhead(
    items: Array<{ id: string; label: string }>,
    onSelect: (item: any) => void
  ) {
    let searchString = '';
    let searchTimeout: NodeJS.Timeout;

    return (e: KeyboardEvent) => {
      clearTimeout(searchTimeout);

      // Only handle letter/number keys
      if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
        searchString += e.key.toLowerCase();

        const match = items.find((item) =>
          item.label.toLowerCase().startsWith(searchString)
        );

        if (match) {
          onSelect(match);
        }

        searchTimeout = setTimeout(() => {
          searchString = '';
        }, 1000);
      }
    };
  }
};

/**
 * Color contrast utilities
 */
export const colorContrast = {
  /**
   * Calculate relative luminance
   */
  getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map((val) => {
      const sRGB = val / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(hex1: string, hex2: string): number {
    const lum1 = this.getLuminance(hex1);
    const lum2 = this.getLuminance(hex2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check if contrast meets WCAG AA standard (4.5:1 for normal text)
   */
  meetsWCAGAA(foreground: string, background: string): boolean {
    return this.getContrastRatio(foreground, background) >= 4.5;
  },

  /**
   * Check if contrast meets WCAG AAA standard (7:1 for normal text)
   */
  meetsWCAGAAA(foreground: string, background: string): boolean {
    return this.getContrastRatio(foreground, background) >= 7;
  },

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : null;
  }
};

/**
 * Reduced motion detection
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Skip to content link utility
 */
export function createSkipLink(targetId: string, label: string = 'Skip to content') {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = label;
  link.onclick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  };

  document.body.insertBefore(link, document.body.firstChild);
}

/**
 * ARIA label helpers
 */
export const ariaHelpers = {
  /**
   * Create descriptive label for interactive elements
   */
  describeElement(element: string, action: string, context?: string): string {
    return context ? `${action} ${element} for ${context}` : `${action} ${element}`;
  },

  /**
   * Create status message
   */
  statusMessage(item: string, state: string, count?: number): string {
    const countText = count !== undefined ? ` (${count} items)` : '';
    return `${item} ${state}${countText}`;
  },

  /**
   * Create loading message
   */
  loadingMessage(item: string = 'content'): string {
    return `Loading ${item}...`;
  },

  /**
   * Create error message
   */
  errorMessage(action: string, item?: string): string {
    return item ? `Error ${action} ${item}` : `Error: ${action}`;
  }
};

/**
 * Modal accessibility helper
 */
export class ModalA11y {
  private previousFocus: HTMLElement | null = null;
  private cleanupFocusTrap: (() => void) | null = null;

  open(modalElement: HTMLElement) {
    // Save current focus
    this.previousFocus = document.activeElement as HTMLElement;

    // Trap focus
    this.cleanupFocusTrap = focusManager.trapFocus(modalElement);

    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';

    // Announce modal opened
    announceToScreenReader('Dialog opened');
  }

  close() {
    // Cleanup focus trap
    this.cleanupFocusTrap?.();

    // Restore focus
    this.previousFocus?.focus();

    // Restore scrolling
    document.body.style.overflow = '';

    // Announce modal closed
    announceToScreenReader('Dialog closed');
  }
}

/**
 * Form accessibility helpers
 */
export const formA11y = {
  /**
   * Get error message ID for form field
   */
  getErrorId(fieldId: string): string {
    return `${fieldId}-error`;
  },

  /**
   * Get description ID for form field
   */
  getDescriptionId(fieldId: string): string {
    return `${fieldId}-description`;
  },

  /**
   * Get aria-describedby value
   */
  getDescribedBy(fieldId: string, hasError: boolean, hasDescription: boolean): string | undefined {
    const ids: string[] = [];
    if (hasError) ids.push(this.getErrorId(fieldId));
    if (hasDescription) ids.push(this.getDescriptionId(fieldId));
    return ids.length > 0 ? ids.join(' ') : undefined;
  }
};

/**
 * Live region for dynamic content updates
 */
export class LiveRegion {
  private element: HTMLElement;

  constructor(mode: 'polite' | 'assertive' = 'polite') {
    this.element = document.createElement('div');
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', mode);
    this.element.setAttribute('aria-atomic', 'true');
    this.element.className = 'sr-only';
    document.body.appendChild(this.element);
  }

  announce(message: string) {
    this.element.textContent = message;
  }

  destroy() {
    document.body.removeChild(this.element);
  }
}
