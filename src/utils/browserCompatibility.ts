import { logger } from '../services/SimpleLogger';
// CROSS-BROWSER FIX: Comprehensive browser compatibility layer
// Handles polyfills, feature detection, and fallbacks for maximum browser support

export interface BrowserCapabilities {
  // CSS Features
  supportsCSSVariables: boolean;
  supportsBackdropFilter: boolean;
  supportsGrid: boolean;
  supportsFocusVisible: boolean;
  supportsAppearance: boolean;
  
  // JavaScript APIs
  supportsServiceWorker: boolean;
  supportsSpeechRecognition: boolean;
  supportsAbortController: boolean;
  supportsURLSearchParams: boolean;
  supportsIntersectionObserver: boolean;
  supportsResizeObserver: boolean;
  supportsMatchMedia: boolean;
  supportsLocalStorage: boolean;
  supportsSessionStorage: boolean;
  supportsFetch: boolean;
  supportsPromise: boolean;
  supportsAsyncAwait: boolean;
  supportsES6Classes: boolean;
  supportsArrowFunctions: boolean;
  
  // Browser Info
  isIE: boolean;
  isEdgeLegacy: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isMobile: boolean;
  version: number;
}

// CROSS-BROWSER FIX: Feature detection without throwing errors
function safeFeatureDetection(testFn: () => boolean, fallback: boolean = false): boolean {
  try {
    return testFn();
  } catch {
    return fallback;
  }
}

// CROSS-BROWSER FIX: Comprehensive browser capability detection
export function detectBrowserCapabilities(): BrowserCapabilities {
  const testKey = '__test__';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edge|MSIE|Trident)[\/\s](\d+)/);

  return {
    // CSS Features
    supportsCSSVariables: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      window.CSS && 
      window.CSS.supports && 
      window.CSS.supports('color', 'var(--test)')
    ),
    
    supportsBackdropFilter: safeFeatureDetection(() => 
      typeof window !== 'undefined' &&
      window.CSS &&
      (window.CSS.supports('backdrop-filter', 'blur(1px)') ||
       window.CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))
    ),
    
    supportsGrid: safeFeatureDetection(() => 
      typeof window !== 'undefined' &&
      window.CSS &&
      window.CSS.supports('display', 'grid')
    ),
    
    supportsFocusVisible: safeFeatureDetection(() => 
      typeof window !== 'undefined' &&
      window.CSS &&
      window.CSS.supports('selector(:focus-visible)')
    ),
    
    supportsAppearance: safeFeatureDetection(() => 
      typeof window !== 'undefined' &&
      window.CSS &&
      (window.CSS.supports('appearance', 'none') ||
       window.CSS.supports('-webkit-appearance', 'none') ||
       window.CSS.supports('-moz-appearance', 'none'))
    ),
    
    // JavaScript APIs
    supportsServiceWorker: safeFeatureDetection(() => 
      typeof navigator !== 'undefined' && 
      'serviceWorker' in navigator
    ),
    
    supportsSpeechRecognition: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    ),
    
    supportsAbortController: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      'AbortController' in window
    ),
    
    supportsURLSearchParams: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      'URLSearchParams' in window
    ),
    
    supportsIntersectionObserver: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      'IntersectionObserver' in window
    ),
    
    supportsResizeObserver: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      'ResizeObserver' in window
    ),
    
    supportsMatchMedia: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      'matchMedia' in window
    ),
    
    supportsLocalStorage: safeFeatureDetection(() => {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      try {
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }),
    
    supportsSessionStorage: safeFeatureDetection(() => {
      if (typeof window === 'undefined' || !window.sessionStorage) return false;
      try {
        window.sessionStorage.setItem(testKey, 'test');
        window.sessionStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }),
    
    supportsFetch: safeFeatureDetection(() => 
      typeof window !== 'undefined' && 
      'fetch' in window
    ),
    
    supportsPromise: safeFeatureDetection(() =>
      typeof Promise !== 'undefined' &&
      typeof Promise.resolve === 'function'
    ),
    
    supportsAsyncAwait: safeFeatureDetection(() => {
      try {
        // SECURITY FIX: Use safe feature detection instead of eval
        // Test async function support by checking constructor
        return typeof (async function(){}).constructor === 'function';
      } catch {
        return false;
      }
    }),
    
    supportsES6Classes: safeFeatureDetection(() => {
      try {
        // SECURITY FIX: Use safe feature detection instead of eval  
        // Test ES6 class support by checking if class keyword is supported
        return typeof class TestClass {} === 'function';
      } catch {
        return false;
      }
    }),
    
    supportsArrowFunctions: safeFeatureDetection(() => {
      try {
        // SECURITY FIX: Use safe feature detection instead of eval
        // Test arrow function support by checking syntax
        return typeof (() => {}) === 'function';
      } catch {
        return false;
      }
    }),
    
    // Browser Detection
    isIE: userAgent.includes('MSIE') || userAgent.includes('Trident'),
    isEdgeLegacy: userAgent.includes('Edge/') && !userAgent.includes('Edg/'),
    isChrome: userAgent.includes('Chrome') && !userAgent.includes('Edg'),
    isFirefox: userAgent.includes('Firefox'),
    isSafari: userAgent.includes('Safari') && !userAgent.includes('Chrome'),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    
    version: match ? parseInt(match[2], 10) : 0
  };
}

// CROSS-BROWSER FIX: Polyfill for URLSearchParams
export function createURLSearchParamsPolyfill() {
  if (typeof window !== 'undefined' && !window.URLSearchParams) {
    (window as any).URLSearchParams = class URLSearchParamsPolyfill {
      private params: { [key: string]: string } = {};

      constructor(init?: string | { [key: string]: string }) {
        if (typeof init === 'string') {
          init.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key) {
              this.params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
          });
        } else if (init && typeof init === 'object') {
          this.params = { ...init };
        }
      }

      append(name: string, value: string) {
        this.params[name] = value;
      }

      set(name: string, value: string) {
        this.params[name] = value;
      }

      get(name: string): string | null {
        return this.params[name] || null;
      }

      has(name: string): boolean {
        return name in this.params;
      }

      delete(name: string) {
        delete this.params[name];
      }

      toString(): string {
        return Object.entries(this.params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
      }
    };
  }
}

// CROSS-BROWSER FIX: Polyfill for AbortController
export function createAbortControllerPolyfill() {
  if (typeof window !== 'undefined' && !window.AbortController) {
    class AbortSignalPolyfill extends EventTarget {
      aborted = false;

      constructor() {
        super();
      }
    }

    class AbortControllerPolyfill {
      signal: any;

      constructor() {
        this.signal = new AbortSignalPolyfill();
      }

      abort() {
        (this.signal as any).aborted = true;
        (this.signal as any).dispatchEvent(new Event('abort'));
      }
    }

    (window as any).AbortController = AbortControllerPolyfill;
    (window as any).AbortSignal = AbortSignalPolyfill;
  }
}

// CROSS-BROWSER FIX: Fetch polyfill for older browsers
export function createFetchPolyfill() {
  if (typeof window !== 'undefined' && !window.fetch) {
    (window as unknown as { fetch: typeof fetch }).fetch = function(url: string, options: RequestInit = {}): Promise<Response> {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const method = options.method || 'GET';
        const headers = options.headers as Record<string, string> || {};
        
        xhr.open(method, url);
        
        // Set headers
        if (options.headers) {
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }
        
        xhr.onload = () => {
          const headerLines = xhr.getAllResponseHeaders().split('\r\n');
          const headerPairs = headerLines
            .filter(line => line.trim())
            .map(h => {
              const colonIndex = h.indexOf(': ');
              if (colonIndex > 0) {
                return [h.substring(0, colonIndex), h.substring(colonIndex + 2)] as [string, string];
              }
              return ['', ''] as [string, string];
            })
            .filter(([key]) => key);

          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            text: () => Promise.resolve(xhr.responseText),
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            blob: () => Promise.resolve(new Blob([xhr.response])),
            headers: new Map(headerPairs)
          };
          resolve(response as unknown as Response);
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Request timeout'));
        
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            xhr.abort();
            reject(new Error('Request aborted'));
          });
        }
        
        xhr.send(options.body as string);
      });
    };
  }
}

// CROSS-BROWSER FIX: IntersectionObserver polyfill
export function createIntersectionObserverPolyfill() {
  if (typeof window !== 'undefined' && !window.IntersectionObserver) {
    class IntersectionObserverPolyfill {
      private callback: IntersectionObserverCallback;
      private elements: Element[] = [];
      private intervalId: number | null = null;

      constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) { // eslint-disable-line @typescript-eslint/no-unused-vars
        this.callback = callback;

        // Simple polling-based implementation
        this.intervalId = window.setInterval(() => {
          if (this.elements.length > 0) {
            const entries = this.elements.map(element => ({
              target: element,
              isIntersecting: this.isElementVisible(element),
              boundingClientRect: element.getBoundingClientRect(),
              intersectionRatio: 1,
              intersectionRect: element.getBoundingClientRect(),
              rootBounds: { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth },
              time: Date.now()
            }));
            this.callback(entries as unknown as IntersectionObserverEntry[], this as any);
          }
        }, 100);
      }

      private isElementVisible(element: Element): boolean {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0 &&
               rect.left < window.innerWidth && rect.right > 0;
      }

      observe(element: Element) {
        if (!this.elements.includes(element)) {
          this.elements.push(element);
        }
      }

      unobserve(element: Element) {
        const index = this.elements.indexOf(element);
        if (index > -1) {
          this.elements.splice(index, 1);
        }
      }

      disconnect() {
        this.elements = [];
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }
    }

    (window as any).IntersectionObserver = IntersectionObserverPolyfill;
  }
}

// CROSS-BROWSER FIX: ResizeObserver polyfill
export function createResizeObserverPolyfill() {
  if (typeof window !== 'undefined' && !window.ResizeObserver) {
    (window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = class ResizeObserver {
      private callback: ResizeObserverCallback;
      private elements: Element[] = [];
      private elementSizes: Map<Element, { width: number; height: number }> = new Map();
      private intervalId: number | null = null;
      
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        
        this.intervalId = window.setInterval(() => {
          const changedEntries: ResizeObserverEntry[] = [];
          
          this.elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const currentSize = { width: rect.width, height: rect.height };
            const lastSize = this.elementSizes.get(element);

            if (!lastSize || lastSize.width !== currentSize.width || lastSize.height !== currentSize.height) {
              this.elementSizes.set(element, currentSize);
              changedEntries.push({
                target: element,
                contentRect: {
                  top: 0,
                  left: 0,
                  width: currentSize.width,
                  height: currentSize.height,
                  bottom: currentSize.height,
                  right: currentSize.width,
                  x: 0,
                  y: 0,
                  toJSON: () => ({})
                },
                borderBoxSize: [{ blockSize: currentSize.height, inlineSize: currentSize.width }],
                contentBoxSize: [{ blockSize: currentSize.height, inlineSize: currentSize.width }],
                devicePixelContentBoxSize: [{ blockSize: currentSize.height, inlineSize: currentSize.width }]
              } as unknown as ResizeObserverEntry);
            }
          });
          
          if (changedEntries.length > 0) {
            this.callback(changedEntries, this);
          }
        }, 100);
      }
      
      observe(element: Element) {
        if (!this.elements.includes(element)) {
          this.elements.push(element);
          const rect = element.getBoundingClientRect();
          this.elementSizes.set(element, { width: rect.width, height: rect.height });
        }
      }

      unobserve(element: Element) {
        const index = this.elements.indexOf(element);
        if (index > -1) {
          this.elements.splice(index, 1);
          this.elementSizes.delete(element);
        }
      }
      
      disconnect() {
        this.elements = [];
        this.elementSizes.clear();
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }
    };
  }
}

// CROSS-BROWSER FIX: CSS Variable polyfill for IE
export function applyCSSVariablePolyfill(capabilities: BrowserCapabilities) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;


  if (!capabilities.supportsCSSVariables) {
    // Simple CSS variable polyfill for IE
    const cssVariables: { [key: string]: string } = {
      '--primary-500': '#3b82f6',
      '--primary-600': '#2563eb',
      '--primary-700': '#1d4ed8',
      '--secondary-50': '#f8fafc',
      '--secondary-100': '#f1f5f9',
      '--secondary-200': '#e2e8f0',
      '--secondary-300': '#cbd5e1',
      '--secondary-400': '#94a3b8',
      '--secondary-500': '#64748b',
      '--secondary-600': '#475569',
      '--secondary-700': '#334155',
      '--secondary-800': '#1e293b',
      '--secondary-900': '#0f172a',
      '--success-500': '#22c55e',
      '--warning-500': '#f59e0b',
      '--error-500': '#ef4444',
      '--info-500': '#3b82f6'
    };
    
    // Replace CSS variables in stylesheets
    try {
      Array.from(document.styleSheets).forEach(styleSheet => {
        try {
          const rules = styleSheet.cssRules || styleSheet.rules;
          Array.from(rules).forEach((rule: unknown) => {
            const cssRule = rule as CSSStyleRule;
            if (cssRule.style) {
              const cssText = cssRule.style.cssText;
              Object.entries(cssVariables).forEach(([variable, value]) => {
                if (cssText.includes(`var(${variable})`)) {
                  cssRule.style!.cssText = cssText.replace(
                    new RegExp(`var\\(${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
                    value
                  );
                }
              });
            }
          });
        } catch (e) {
          // Cross-origin stylesheet or other access issues
          logger.warn('Could not access stylesheet for CSS variable polyfill:', e);
        }
      });
    } catch (e) {
      logger.warn('CSS variable polyfill failed:', e);
    }
  }
}

// CROSS-BROWSER FIX: Add vendor prefixes for CSS properties
export function addVendorPrefixes(): void {
  if (typeof document === 'undefined') return;
  
  const prefixedProperties = [
    'transform',
    'transition',
    'animation',
    'backdrop-filter',
    'user-select',
    'appearance',
    'box-sizing'
  ];
  
  const prefixes = ['webkit', 'moz', 'ms', 'o'];
  const style = document.createElement('div').style;
  
  prefixedProperties.forEach(property => {
    if (!(property in style)) {
      // Property not supported, try prefixed versions
      prefixes.forEach(prefix => {
        const prefixedProperty = `${prefix}${property.charAt(0).toUpperCase()}${property.slice(1)}`;
        if (prefixedProperty in style) {
          // Add CSS rule for the prefixed property
          const styleTag = document.createElement('style');
          styleTag.textContent = `
            [style*="${property}"] {
              -${prefix}-${property}: inherit;
            }
          `;
          document.head.appendChild(styleTag);
        }
      });
    }
  });
}

// CROSS-BROWSER FIX: Safe localStorage with fallback
export function createSafeStorage() {
  const capabilities = detectBrowserCapabilities();
  const fallbackStorage: { [key: string]: string } = {};

  return {
    localStorage: {
      getItem: (key: string): string | null => {
        if (capabilities.supportsLocalStorage) {
          try {
            return localStorage.getItem(key);
          } catch {
            return fallbackStorage[key] || null;
          }
        }
        return fallbackStorage[key] || null;
      },

      setItem: (key: string, value: string): void => {
        if (capabilities.supportsLocalStorage) {
          try {
            localStorage.setItem(key, value);
            return;
          } catch {
            // Fall through to memory storage
          }
        }
        fallbackStorage[key] = value;
      },

      removeItem: (key: string): void => {
        if (capabilities.supportsLocalStorage) {
          try {
            localStorage.removeItem(key);
          } catch {
            // Fall through to memory storage
          }
        }
        delete fallbackStorage[key];
      },

      clear: (): void => {
        if (capabilities.supportsLocalStorage) {
          try {
            localStorage.clear();
          } catch {
            // Fall through to memory storage
          }
        }
        Object.keys(fallbackStorage).forEach(key => delete fallbackStorage[key]);
      }
    },

    sessionStorage: {
      getItem: (key: string): string | null => {
        if (capabilities.supportsSessionStorage) {
          try {
            return sessionStorage.getItem(key);
          } catch {
            return fallbackStorage[`session_${key}`] || null;
          }
        }
        return fallbackStorage[`session_${key}`] || null;
      },

      setItem: (key: string, value: string): void => {
        if (capabilities.supportsSessionStorage) {
          try {
            sessionStorage.setItem(key, value);
            return;
          } catch {
            // Fall through to memory storage
          }
        }
        fallbackStorage[`session_${key}`] = value;
      },

      removeItem: (key: string): void => {
        if (capabilities.supportsSessionStorage) {
          try {
            sessionStorage.removeItem(key);
          } catch {
            // Fall through to memory storage
          }
        }
        delete fallbackStorage[`session_${key}`];
      },

      clear: (): void => {
        if (capabilities.supportsSessionStorage) {
          try {
            sessionStorage.clear();
          } catch {
            // Fall through to memory storage
          }
        }
        Object.keys(fallbackStorage)
          .filter(key => key.startsWith('session_'))
          .forEach(key => delete fallbackStorage[key]);
      }
    }
  };
}

// CROSS-BROWSER FIX: Initialize all polyfills and compatibility fixes
export function initializeBrowserCompatibility(): BrowserCapabilities {
  // Detect browser capabilities first
  const capabilities = detectBrowserCapabilities();

  // Apply polyfills based on capabilities
  if (!capabilities.supportsURLSearchParams) {
    createURLSearchParamsPolyfill();
  }
  
  if (!capabilities.supportsAbortController) {
    createAbortControllerPolyfill();
  }
  
  if (!capabilities.supportsFetch) {
    createFetchPolyfill();
  }
  
  if (!capabilities.supportsIntersectionObserver) {
    createIntersectionObserverPolyfill();
  }
  
  if (!capabilities.supportsResizeObserver) {
    createResizeObserverPolyfill();
  }

  // Apply CSS compatibility fixes
  applyCSSVariablePolyfill(capabilities);
  addVendorPrefixes();

  // Add compatibility classes to document
  if (typeof document !== 'undefined') {
    const classes: string[] = [];

    if (capabilities.isIE) classes.push('browser-ie');
    if (capabilities.isEdgeLegacy) classes.push('browser-edge-legacy');
    if (capabilities.isFirefox) classes.push('browser-firefox');
    if (capabilities.isChrome) classes.push('browser-chrome');
    if (capabilities.isSafari) classes.push('browser-safari');
    if (capabilities.isMobile) classes.push('browser-mobile');
    
    if (!capabilities.supportsCSSVariables) classes.push('no-css-variables');
    if (!capabilities.supportsGrid) classes.push('no-css-grid');
    if (!capabilities.supportsFocusVisible) classes.push('no-focus-visible');
    if (!capabilities.supportsBackdropFilter) classes.push('no-backdrop-filter');
    
    document.documentElement.classList.add(...classes);
  }
  
  logger.info('Browser compatibility layer initialized:', capabilities);
  
  return capabilities;
}

// CROSS-BROWSER FIX: Export browser capabilities for use in components
export const browserCapabilities = typeof window !== 'undefined' 
  ? initializeBrowserCompatibility() 
  : {} as BrowserCapabilities;