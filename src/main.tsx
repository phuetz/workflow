// Fonction de logging pour tracer le démarrage
const startTime = performance.now();
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const elapsed = Math.round(performance.now() - startTime);
  const prefix = `[${timestamp}] [MAIN-${level}] [+${elapsed}ms]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARNING') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

log('INFO', '========================================');
log('INFO', 'DÉMARRAGE DE L\'APPLICATION FRONTEND');
log('INFO', `User Agent: ${navigator.userAgent}`);
log('INFO', `URL: ${window.location.href}`);
log('INFO', '========================================');

try {
  // CROSS-BROWSER FIX: Import compatibility layer first
  log('INFO', 'Chargement de la couche de compatibilité...');
  import('./compatibility');
  log('SUCCESS', '✓ Couche de compatibilité chargée');
} catch (error) {
  log('ERROR', '✗ Erreur lors du chargement de la compatibilité', error);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { initWebVitals } from './utils/webVitals';

log('INFO', '✓ Imports React et App chargés');

// Vérifier que l'élément root existe
const rootElement = document.getElementById('root');
if (!rootElement) {
  log('ERROR', '✗✗✗ ERREUR CRITIQUE: Élément #root non trouvé dans le DOM');
  throw new Error('Element #root not found');
}
log('SUCCESS', '✓ Élément #root trouvé dans le DOM');

try {
  log('INFO', 'Création de la racine React...');
  const root = createRoot(rootElement);
  log('SUCCESS', '✓ Racine React créée');

  log('INFO', 'Rendu du composant App...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  log('SUCCESS', '✓✓✓ Application React rendue avec succès !');
} catch (error) {
  log('ERROR', '✗✗✗ Erreur lors du rendu React', error);
  throw error;
}

// Only register service worker if supported and not running in StackBlitz/WebContainer
const isStackBlitz = typeof window !== 'undefined' && window.location.hostname.includes('stackblitz');
log('INFO', `Environnement StackBlitz détecté: ${isStackBlitz}`);

if ('serviceWorker' in navigator && !isStackBlitz) {
  log('INFO', 'Enregistrement du Service Worker...');
  registerServiceWorker()
    .then(() => log('SUCCESS', '✓ Service Worker enregistré'))
    .catch((error) => log('WARNING', 'Erreur Service Worker (non bloquant)', error));
} else {
  log('INFO', 'Service Worker non disponible ou désactivé');
}

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  log('INFO', 'Initialisation du monitoring Web Vitals...');
  try {
    initWebVitals();
    log('SUCCESS', '✓ Web Vitals initialisé');
  } catch (error) {
    log('WARNING', 'Erreur Web Vitals (non bloquant)', error);
  }
}

log('INFO', '========================================');
log('SUCCESS', `✓✓✓ DÉMARRAGE TERMINÉ EN ${Math.round(performance.now() - startTime)}ms`);
log('INFO', '========================================');
