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

// Only register service worker if supported and not running in StackBlitz/WebContainer
const hostname = window.location.hostname;
const isStackBlitz = /stackblitz|webcontainer\./.test(hostname);
if ('serviceWorker' in navigator && !isStackBlitz) {
  registerServiceWorker();
}
