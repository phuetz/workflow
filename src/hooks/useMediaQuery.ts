/**
 * Media Query Hook
 *
 * A responsive design hook that detects screen sizes and breakpoints.
 * Provides utility hooks for common breakpoints.
 */

import { useState, useEffect } from 'react';

// Tailwind CSS default breakpoints
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

type Breakpoint = keyof typeof breakpoints;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(\`(min-width: \${breakpoints[breakpoint]})\`);
}

export function useBreakpointDown(breakpoint: Breakpoint): boolean {
  return useMediaQuery(\`(max-width: \${breakpoints[breakpoint]})\`);
}

export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  return useMediaQuery(\`(min-width: \${breakpoints[min]}) and (max-width: \${breakpoints[max]})\`);
}

export function useIsMobile(): boolean { return useBreakpointDown('md'); }
export function useIsTablet(): boolean { return useBreakpointBetween('md', 'lg'); }
export function useIsDesktop(): boolean { return useBreakpoint('lg'); }
export function useIsLargeDesktop(): boolean { return useBreakpoint('xl'); }

export function useCurrentBreakpoint(): Breakpoint | 'xs' {
  const is2xl = useBreakpoint('2xl');
  const isXl = useBreakpoint('xl');
  const isLg = useBreakpoint('lg');
  const isMd = useBreakpoint('md');
  const isSm = useBreakpoint('sm');
  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function usePrefersColorScheme(): 'light' | 'dark' {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return prefersDark ? 'dark' : 'light';
}

export function usePrefersHighContrast(): boolean {
  return useMediaQuery('(prefers-contrast: high)');
}
