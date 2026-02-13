// CROSS-BROWSER FIX: Main compatibility initialization
// This file should be imported early in the application lifecycle

import { initializeBrowserCompatibility, browserCapabilities } from './utils/browserCompatibility';
import './styles/compatibility.css';
import { logger } from './services/SimpleLogger';

// CROSS-BROWSER FIX: Initialize compatibility layer immediately

// CROSS-BROWSER FIX: Add compatibility warnings for unsupported browsers
function showCompatibilityWarnings() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  const warnings: string[] = [];
  
  if (browserCapabilities.isIE) {
    warnings.push('Internet Explorer is not fully supported. Please consider upgrading to a modern browser for the best experience.');
  }
  
  if (browserCapabilities.isEdgeLegacy) {
    warnings.push('Legacy Microsoft Edge is not fully supported. Please upgrade to the new Edge browser.');
  }
  
  if (!browserCapabilities.supportsFetch) {
    warnings.push('Your browser does not support modern fetch API. Some features may work differently.');
  }
  
  if (!browserCapabilities.supportsLocalStorage) {
    warnings.push('Local storage is not available. Your preferences will not be saved between sessions.');
  }
  
  if (!browserCapabilities.supportsCSSVariables) {
    warnings.push('Your browser does not support CSS custom properties. Theming may not work correctly.');
  }
  
  // Show warnings if any exist
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    logger.warn('Browser Compatibility Warnings:', warnings);
    
    // Show user-friendly notification for critical issues
    const criticalWarnings = warnings.filter(w =>
      w.includes('Internet Explorer') || 
      w.includes('Legacy Microsoft Edge') ||
      w.includes('Local storage is not available')
    );
    
    if (criticalWarnings.length > 0) {
      // Create a non-intrusive banner
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f59e0b;
        color: white;
        padding: 8px 16px;
        text-align: center;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      // Create elements safely without innerHTML to prevent XSS
      const warningSpan = document.createElement('span');
      const dismissButton = document.createElement('button');
      warningSpan.textContent = '⚠️ Your browser may not support all features. For the best experience, please update your browser.';
      
      dismissButton.textContent = 'Dismiss';
      dismissButton.style.cssText = `
        margin-left: 10px; 
        background: transparent; 
        border: 1px solid white; 
        color: white; 
        padding: 2px 8px; 
        border-radius: 3px; 
        cursor: pointer;
        font-size: 12px;
      `;
      const handleDismiss = () => {
        if (banner.parentElement) {
          banner.parentElement.removeChild(banner);
        }
        // Clean up event listener to prevent memory leak
        dismissButton.removeEventListener('click', handleDismiss);
      };
      dismissButton.addEventListener('click', handleDismiss);
      
      banner.appendChild(warningSpan);
      banner.appendChild(dismissButton);
      
      document.body.appendChild(banner);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (banner.parentElement) {
          banner.remove();
        }
      }, 10000);
    }
  }
}

// CROSS-BROWSER FIX: Apply runtime fixes
function applyRuntimeFixes() {
  if (typeof window === 'undefined') return;
  
  // Fix for IE missing Array.from
  if (!Array.from) {
    Array.from = function(arrayLike: unknown, mapFn?: unknown, thisArg?: unknown) {
      const arrayLikeObj = arrayLike as { length: number; [key: number]: unknown };
      const len = parseInt(String(arrayLikeObj.length)) || 0;
      const result = new Array(len);
      
      for (let i = 0; i < len; i++) {
        const value = arrayLikeObj[i];
        result[i] = mapFn ? (mapFn as (value: unknown, index: number) => unknown).call(thisArg, value, i) : value;
      }
      
      return result;
    };
  }
  
  // Fix for IE missing Object.assign
  if (!Object.assign) {
    Object.assign = function(target: unknown, ...sources: unknown[]) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      
      const to = Object(target);

      for (let index = 0; index < sources.length; index++) {
        const nextSource = sources[index];
        if (nextSource != null) {
          const nextSourceObj = nextSource as Record<string, unknown>;
          for (const nextKey in nextSourceObj) {
            if (Object.prototype.hasOwnProperty.call(nextSourceObj, nextKey)) {
              (to as Record<string, unknown>)[nextKey] = nextSourceObj[nextKey];
            }
          }
        }
      }
      
      return to;
    };
  }
  
  // Fix for missing String.prototype.includes
  if (!String.prototype.includes) {
    String.prototype.includes = function(search: string, start?: number) {
      if (typeof start !== 'number') {
        start = 0;
      }
      
      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }
  
  // Fix for missing Array.prototype.includes
  if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement: unknown, fromIndex?: number) {
      return this.indexOf(searchElement, fromIndex) !== -1;
    };
  }
  
  // Fix for missing Promise.finally (for older browsers)
  if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
    Promise.prototype.finally = function(callback: () => void) {
      const P = this.constructor as PromiseConstructor;
      return this.then(
        value => P.resolve(callback()).then(() => value),
        reason => P.resolve(callback()).then(() => { throw reason; })
      );
    };
  }
  
  // Fix for missing Element.closest
  if (typeof Element !== 'undefined' && !Element.prototype.closest) {
    Element.prototype.closest = function(selector: string) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let el: Element | null = this;
      while (el) {
        if (el.matches && el.matches(selector)) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };
  }
  
  // Fix for missing Element.matches
  if (typeof Element !== 'undefined' && !Element.prototype.matches) {
    const proto = Element.prototype as unknown as Record<string, unknown>;
    Element.prototype.matches =
      (proto.matchesSelector as (s: string) => boolean) ||
      (proto.mozMatchesSelector as (s: string) => boolean) ||
      (proto.msMatchesSelector as (s: string) => boolean) ||
      (proto.oMatchesSelector as (s: string) => boolean) ||
      (proto.webkitMatchesSelector as (s: string) => boolean) ||
      function(this: Element, s: string) {
        const doc = (this as HTMLElement).ownerDocument || document;
        const matches = doc.querySelectorAll(s);
        let i = matches.length;
        while (--i >= 0 && matches.item(i) !== this) {
          // Empty loop body - just iterating to find index
        }
        return i > -1;
      };
  }
}

// CROSS-BROWSER FIX: Performance monitoring for older browsers
function setupPerformanceMonitoring() {
  if (typeof window === 'undefined') return;
  
  // Add performance monitoring for older browsers
  if (!browserCapabilities.supportsPromise || browserCapabilities.isIE) {
    // Monitor for potential performance issues
    const originalSetTimeout = window.setTimeout;
    let slowOperationCount = 0;

    (window.setTimeout as unknown) = function(callback: unknown, delay: number, ...args: unknown[]) {
      const start = Date.now();
      return originalSetTimeout(() => {
        const duration = Date.now() - start;
        if (duration > delay + 100) { // More than 100ms delay
          slowOperationCount++;
          if (slowOperationCount > 10) {
            logger.warn('Multiple slow operations detected. Browser may be struggling with performance.');
          }
        }

        if (typeof callback === 'function') {
          callback(...(args as unknown[]));
        }
      }, delay);
    };
  }
}

// CROSS-BROWSER FIX: Add fallback event listeners for older browsers
function setupEventListenerFallbacks() {
  if (typeof window === 'undefined') return;
  
  // Add wheel event fallback for IE
  if (browserCapabilities.isIE) {
    // IE uses 'mousewheel' instead of 'wheel'
    const originalAddEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function(type: string, listener: unknown, options?: unknown) {
      if (type === 'wheel') {
        // Also listen to mousewheel for IE
        originalAddEventListener.call(this, 'mousewheel', listener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }
  
  // Add input event fallback for IE
  if (browserCapabilities.isIE) {
    const originalAddEventListener2 = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function(type: string, listener: unknown, options?: unknown) {
      if (type === 'input' && this.tagName === 'INPUT') {
        // IE uses 'propertychange' instead of 'input'
        originalAddEventListener2.call(this, 'propertychange', function(this: Element, e: unknown) {
          if ((e as { propertyName: string }).propertyName === 'value') {
            (listener as (e: unknown) => void).call(this, e);
          }
        }, options);
      }
      return originalAddEventListener2.call(this, type, listener, options);
    };
  }
}

// CROSS-BROWSER FIX: Initialize everything
export function initializeCompatibility() {
  applyRuntimeFixes();
  setupPerformanceMonitoring();
  setupEventListenerFallbacks();
  
  // Show warnings after DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      const handleDOMContentLoaded = () => {
        showCompatibilityWarnings();
        // Clean up event listener to prevent memory leak
        document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      };
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    } else {
      showCompatibilityWarnings();
    }
  }
}

// CROSS-BROWSER FIX: Export capabilities for use in components
export { browserCapabilities };

// CROSS-BROWSER FIX: Auto-initialize if not in test environment
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeCompatibility();
}