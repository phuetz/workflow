// CROSS-BROWSER FIX: React hook for browser compatibility detection and fallbacks
import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '../services/SimpleLogger';
import { 
  detectBrowserCapabilities, 
  BrowserCapabilities,
  createSafeStorage
} from '../utils/browserCompatibility';

// CROSS-BROWSER FIX: Hook for browser capability detection
export function useBrowserCapabilities(): BrowserCapabilities {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>(() => {
    // Initialize with safe defaults for SSR
    return {
      supportsCSSVariables: true,
      supportsBackdropFilter: true,
      supportsGrid: true,
      supportsFocusVisible: true,
      supportsAppearance: true,
      supportsServiceWorker: false,
      supportsSpeechRecognition: false,
      supportsAbortController: true,
      supportsURLSearchParams: true,
      supportsIntersectionObserver: true,
      supportsResizeObserver: true,
      supportsMatchMedia: true,
      supportsLocalStorage: true,
      supportsSessionStorage: true,
      supportsFetch: true,
      supportsPromise: true,
      supportsAsyncAwait: true,
      supportsES6Classes: true,
      supportsArrowFunctions: true,
      isIE: false,
      isEdgeLegacy: false,
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isMobile: false,
      version: 0
    };
  });

  useEffect(() => {
    // Detect capabilities on client side
    const detected = detectBrowserCapabilities();
    setCapabilities(detected);
  }, []);

  return capabilities;
}

// CROSS-BROWSER FIX: Hook for safe storage operations
export function useSafeStorage() {
  const [storage] = useState(() => createSafeStorage());
  
  return {
    localStorage: storage.localStorage,
    sessionStorage: storage.sessionStorage
  };
}

// CROSS-BROWSER FIX: Hook for safe fetch with fallbacks
export function useSafeFetch() {
  const capabilities = useBrowserCapabilities();

  const safeFetch = useCallback((
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    if (capabilities.supportsFetch) {
      return fetch(url, options);
    } else {
      // Use polyfill which should be available
      return (window as any).fetch(url, options);
    }
  }, [capabilities.supportsFetch]);

  return { safeFetch };
}

// CROSS-BROWSER FIX: Hook for safe observer usage
export function useSafeIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const capabilities = useBrowserCapabilities();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (capabilities.supportsIntersectionObserver && typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver(callback, options);
    } else {
      // Use polyfill
      observerRef.current = new (window as any).IntersectionObserver(callback, options);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options, capabilities.supportsIntersectionObserver]);

  const observe = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.observe(element);
      elementsRef.current.add(element);
    }
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      elementsRef.current.clear();
    }
  }, []);
  
  return { observe, unobserve, disconnect };
}

// CROSS-BROWSER FIX: Hook for safe ResizeObserver usage
export function useSafeResizeObserver(callback: ResizeObserverCallback) {
  const capabilities = useBrowserCapabilities();
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (capabilities.supportsResizeObserver && typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(callback);
    } else {
      // Use polyfill
      observerRef.current = new (window as any).ResizeObserver(callback);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, capabilities.supportsResizeObserver]);

  const observe = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.observe(element);
    }
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  return { observe, unobserve, disconnect };
}

// CROSS-BROWSER FIX: Hook for safe media query usage
export function useSafeMediaQuery(query: string): boolean {
  const capabilities = useBrowserCapabilities();
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!capabilities.supportsMatchMedia) {
      // Fallback: assume desktop if matchMedia not supported
      setMatches(query.includes('min-width'));
      return;
    }

    try {
      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setMatches('matches' in e ? e.matches : (e as MediaQueryList).matches);
      };

      // Use addListener for older browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        (mediaQuery as any).addListener(handleChange);
        return () => (mediaQuery as any).removeListener(handleChange);
      }
    } catch (error) {
      logger.warn('MediaQuery error:', error);
      setMatches(false);
    }
  }, [query, capabilities.supportsMatchMedia]);

  return matches;
}

// CROSS-BROWSER FIX: Hook for safe speech recognition
export function useSafeSpeechRecognition() {
  const capabilities = useBrowserCapabilities();
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(capabilities.supportsSpeechRecognition);

    if (capabilities.supportsSpeechRecognition) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition ||
                                  (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
        }
      } catch (error) {
        logger.warn('Speech recognition initialization failed:', error);
        setIsSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (error) {
          logger.warn('Speech recognition cleanup failed:', error);
        }
      }
    };
  }, [capabilities.supportsSpeechRecognition]);

  const startRecognition = useCallback((
    onResult: (transcript: string) => void,
    onError?: (error: unknown) => void
  ) => {
    if (!isSupported || !recognitionRef.current) {
      if (onError) {
        onError(new Error('Speech recognition not supported'));
      }
      return;
    }

    try {
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        // CRASH FIX: Safe nested array access for speech recognition results
        if (event.results && event.results.length > 0 &&
            event.results[0] && event.results[0].length > 0 &&
            event.results[0][0] && event.results[0][0].transcript) {
          const transcript = event.results[0][0].transcript;
          onResult(transcript);
        }
      };

      recognitionRef.current.onerror = (event: unknown) => {
        if (onError) {
          onError(event);
        }
      };
      
      recognitionRef.current.start();
    } catch (error) {
      if (onError) {
        onError(error);
      }
    }
  }, [isSupported]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        logger.warn('Failed to stop speech recognition:', error);
      }
    }
  }, []);

  return {
    isSupported,
    startRecognition,
    stopRecognition
  };
}

// CROSS-BROWSER FIX: Hook for safe clipboard operations
export function useSafeClipboard() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    // Try modern clipboard API first
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        logger.warn('Clipboard API failed, falling back to legacy method:', error);
      }
    }

    // Fallback to legacy method
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (error) {
      logger.error('All clipboard methods failed:', error);
      return false;
    }
  }, []);

  const readFromClipboard = useCallback(async (): Promise<string | null> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        logger.warn('Clipboard read failed:', error);
        return null;
      }
    }

    // No fallback for reading clipboard in older browsers for security reasons
    return null;
  }, []);

  return {
    copyToClipboard,
    readFromClipboard,
    isSupported: typeof navigator !== 'undefined' &&
                 (!!navigator.clipboard || !!document.execCommand)
  };
}

// CROSS-BROWSER FIX: Hook for safe CSS feature detection
export function useCSSFeatureSupport(feature: string, value: string): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }

    try {
      if (window.CSS && window.CSS.supports) {
        setIsSupported(window.CSS.supports(feature, value));
      } else {
        // Fallback: create test element
        const testElement = document.createElement('div');
        const property = feature;
        (testElement.style as any)[property] = value;
        setIsSupported((testElement.style as any)[property] === value);
      }
    } catch (error) {
      logger.warn(`CSS feature detection failed for ${feature}:${value}:`, error);
      setIsSupported(false);
    }
  }, [feature, value]);

  return isSupported;
}

// CROSS-BROWSER FIX: Hook for safe animation preferences
export function useReducedMotion(): boolean {
  const capabilities = useBrowserCapabilities();
  const prefersReducedMotion = useSafeMediaQuery('(prefers-reduced-motion: reduce)');

  // For older browsers, assume no preference for reduced motion
  return capabilities.supportsMatchMedia ? prefersReducedMotion : false;
}

// CROSS-BROWSER FIX: Hook for safe dark mode detection
export function useSystemDarkMode(): boolean {
  const capabilities = useBrowserCapabilities();
  const prefersDarkMode = useSafeMediaQuery('(prefers-color-scheme: dark)');

  // For older browsers, assume light mode
  return capabilities.supportsMatchMedia ? prefersDarkMode : false;
}

// CROSS-BROWSER FIX: Hook for performance optimization based on browser
export function useBrowserOptimization() {
  const capabilities = useBrowserCapabilities();

  return {
    // Reduce animations for older browsers
    shouldReduceAnimations: capabilities.isIE || capabilities.isEdgeLegacy || capabilities.version < 60,

    // Use simpler effects for mobile
    shouldSimplifyEffects: capabilities.isMobile,

    // Disable heavy features for older browsers
    shouldDisableBackdropFilter: !capabilities.supportsBackdropFilter,

    // Use fallback grid for unsupported browsers
    shouldUseFallbackGrid: !capabilities.supportsGrid,

    // Disable service workers for incompatible browsers
    shouldDisableServiceWorker: !capabilities.supportsServiceWorker,

    // Use polling instead of observers for older browsers
    shouldUsePolling: !capabilities.supportsIntersectionObserver || !capabilities.supportsResizeObserver
  };
}

export default {
  useBrowserCapabilities,
  useSafeStorage,
  useSafeFetch,
  useSafeIntersectionObserver,
  useSafeResizeObserver,
  useSafeMediaQuery,
  useSafeSpeechRecognition,
  useSafeClipboard,
  useCSSFeatureSupport,
  useReducedMotion,
  useSystemDarkMode,
  useBrowserOptimization
};