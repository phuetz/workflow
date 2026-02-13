import { logger } from './services/SimpleLogger';
export function registerServiceWorker(): Promise<void> {
  // Check if running in StackBlitz/WebContainer environment
  const isStackBlitz = typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && window.location.hostname.includes('stackblitz');

  if (isStackBlitz) {
    logger.info('Service worker registration skipped in StackBlitz environment');
    return Promise.resolve();
  }

  if ('serviceWorker' in navigator) {
    return new Promise<void>((resolve, reject) => {
      // Use a named function so we can remove the listener
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then(() => {
            logger.info('Service worker registered successfully');
            resolve();
          })
          .catch(err => {
            logger.error('Service worker registration failed:', err);
            reject(err);
          });

        // Remove the listener after registration
        window.removeEventListener('load', handleLoad);
      };

      // Check if the page is already loaded
      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
      }
    });
  }

  return Promise.resolve();
}
