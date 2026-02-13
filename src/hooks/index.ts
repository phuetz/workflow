// Custom hooks barrel export

// Theme and styling
export { useTheme } from './useTheme';
export type { Theme, ResolvedTheme } from './useTheme';

// Notifications
export { useToast, ToastProvider } from './useToast';
export type { Toast, ToastType } from './useToast';

// Responsive design
export {
  useMediaQuery,
  useBreakpoint,
  useBreakpointDown,
  useBreakpointBetween,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useCurrentBreakpoint,
  usePrefersReducedMotion,
  usePrefersColorScheme,
  usePrefersHighContrast,
} from './useMediaQuery';

// Storage
export {
  useLocalStorage,
  useLocalStorageFlag,
  useLocalStorageObject,
} from './useLocalStorage';

// Existing hooks
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useWebSocket } from './useWebSocket';
export { useCollaboration } from './useCollaboration';
export { usePerformanceMetrics } from './usePerformanceMetrics';
export { useBrowserCompatibility } from './useBrowserCompatibility';
