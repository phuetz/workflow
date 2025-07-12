export function registerServiceWorker() {
  // Check if running in StackBlitz/WebContainer environment
  const hostname = window.location.hostname;
  const isStackBlitz = hostname.includes('stackblitz.com') || hostname.includes('webcontainer.io');
  
  if (isStackBlitz) {
    console.log('Service worker registration skipped in StackBlitz environment');
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch(err => console.error('Service worker registration failed:', err));
    });
  }
}
