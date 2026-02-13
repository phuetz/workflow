/**
 * Accessibility Utilities
 * Helper functions for improving application accessibility
 */

import { logger } from '../services/SimpleLogger';

// Extend HTMLElement interface to include focus trap cleanup function
interface HTMLElementWithFocusTrap extends HTMLElement {
  __focusTrapCleanup?: () => void;
}

/**
 * Generate a unique ID for accessibility attributes
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Announce content to screen readers using ARIA live regions
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  try {
    // Find or create live region
    let liveRegion = document.getElementById(`live-region-${priority}`) as HTMLElement | null;

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = `live-region-${priority}`;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    // Clear any existing content and add new message
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion!.textContent = message;
    }, 100);

    // Clear after a delay to avoid cluttering
    setTimeout(() => {
      liveRegion!.textContent = '';
    }, 10000);

    logger.debug('Screen reader announcement made', { message, priority });
  } catch (error) {
    logger.error('Failed to announce to screen reader', error);
  }
}

/**
 * Manage focus for better keyboard navigation
 */
export class FocusManager {
  private focusHistory: HTMLElement[] = [];
  private trapActive = false;
  private trapContainer: HTMLElement | null = null;

  /**
   * Save current focus and move to specified element
   */
  saveFocusAndMoveTo(element: HTMLElement): void {
    const currentFocused = document.activeElement as HTMLElement;
    if (currentFocused && currentFocused !== document.body) {
      this.focusHistory.push(currentFocused);
    }

    element.focus();
    logger.debug('Focus moved and saved', { to: element.tagName });
  }

  /**
   * Restore previously saved focus
   */
  restoreFocus(): void {
    const lastFocused = this.focusHistory.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
      logger.debug('Focus restored', { to: lastFocused.tagName });
    }
  }

  /**
   * Trap focus within a container (useful for modals)
   */
  trapFocus(container: HTMLElement): void {
    this.trapContainer = container;
    this.trapActive = true;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    const focusableElements = container.querySelectorAll(focusableSelectors.join(',')) as NodeListOf<HTMLElement>;
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.trapActive) return;

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        this.releaseFocusTrap();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Store cleanup function
    (container as HTMLElementWithFocusTrap).__focusTrapCleanup = () => {
      document.removeEventListener('keydown', handleKeyDown);
    };

    // Focus first element
    firstElement.focus();
    logger.debug('Focus trap activated', { container: container.tagName });
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(): void {
    this.trapActive = false;

    if (this.trapContainer) {
      const cleanup = (this.trapContainer as HTMLElementWithFocusTrap).__focusTrapCleanup;
      if (cleanup) cleanup();
      this.trapContainer = null;
    }

    this.restoreFocus();
    logger.debug('Focus trap released');
  }

  /**
   * Get all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter((el) => {
        const htmlEl = el as HTMLElement;
        return htmlEl.offsetWidth > 0 &&
               htmlEl.offsetHeight > 0 &&
               !htmlEl.hasAttribute('disabled') &&
               htmlEl.getAttribute('tabindex') !== '-1';
      }) as HTMLElement[];
  }
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardNavigation = {
  /**
   * Handle arrow key navigation in a list
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onIndexChange: (newIndex: number) => void
  ): void {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = totalItems - 1;
        break;
      default:
        return;
    }

    onIndexChange(newIndex);
  },

  /**
   * Handle grid navigation (arrow keys in 2D)
   */
  handleGridNavigation(
    event: KeyboardEvent,
    currentRow: number,
    currentCol: number,
    totalRows: number,
    totalCols: number,
    onPositionChange: (row: number, col: number) => void
  ): void {
    let newRow = currentRow;
    let newCol = currentCol;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newRow = currentRow < totalRows - 1 ? currentRow + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newRow = currentRow > 0 ? currentRow - 1 : totalRows - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newCol = currentCol < totalCols - 1 ? currentCol + 1 : 0;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newCol = currentCol > 0 ? currentCol - 1 : totalCols - 1;
        break;
      default:
        return;
    }

    onPositionChange(newRow, newCol);
  }
};

/**
 * Create accessible labels and descriptions
 */
export const AccessibleText = {
  /**
   * Format number for screen readers
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)} million`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)} mille`;
    }
    return num.toString();
  },

  /**
   * Format duration for screen readers
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds} millisecondes`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)} secondes`;
    } else {
      return `${(milliseconds / 60000).toFixed(1)} minutes`;
    }
  },

  /**
   * Format status for screen readers
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'success': 'succès',
      'error': 'erreur',
      'warning': 'avertissement',
      'info': 'information',
      'running': 'en cours',
      'pending': 'en attente',
      'completed': 'terminé',
      'failed': 'échoué'
    };

    return statusMap[status.toLowerCase()] || status;
  }
};

/**
 * Singleton focus manager instance
 */
export const focusManager = new FocusManager();

/**
 * Hook for managing component accessibility
 */
export function useAccessibility() {
  return {
    announceToScreenReader,
    focusManager,
    generateA11yId,
    KeyboardNavigation,
    AccessibleText
  };
}