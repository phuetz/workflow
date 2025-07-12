import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Only register service worker if supported and not in StackBlitz environment
if ('serviceWorker' in navigator && !window.location.hostname.includes('stackblitz') && !window.location.hostname.includes('webcontainer.io')) {
  registerServiceWorker();
}
