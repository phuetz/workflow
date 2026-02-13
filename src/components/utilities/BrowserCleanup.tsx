import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, CheckCircle, AlertCircle, Database, HardDrive, Globe, Zap } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

interface CleanupStatus {
  serviceWorkers: 'idle' | 'cleaning' | 'done' | 'error';
  cache: 'idle' | 'cleaning' | 'done' | 'error';
  localStorage: 'idle' | 'cleaning' | 'done' | 'error';
  sessionStorage: 'idle' | 'cleaning' | 'done' | 'error';
  indexedDB: 'idle' | 'cleaning' | 'done' | 'error';
}

interface StorageInfo {
  serviceWorkers: number;
  cacheNames: string[];
  localStorageKeys: number;
  sessionStorageKeys: number;
  indexedDBDatabases: string[];
}

export default function BrowserCleanup() {
  const [status, setStatus] = useState<CleanupStatus>({
    serviceWorkers: 'idle',
    cache: 'idle',
    localStorage: 'idle',
    sessionStorage: 'idle',
    indexedDB: 'idle',
  });

  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    serviceWorkers: 0,
    cacheNames: [],
    localStorageKeys: 0,
    sessionStorageKeys: 0,
    indexedDBDatabases: [],
  });

  const [message, setMessage] = useState<string>('');

  // Charger les informations de stockage
  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    const info: StorageInfo = {
      serviceWorkers: 0,
      cacheNames: [],
      localStorageKeys: 0,
      sessionStorageKeys: 0,
      indexedDBDatabases: [],
    };

    // Service Workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        info.serviceWorkers = registrations.length;
      } catch (e) {
        logger.error('Error getting service workers', { error: e });
      }
    }

    // Cache API
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        info.cacheNames = names;
      } catch (e) {
        logger.error('Error getting cache names', { error: e });
      }
    }

    // LocalStorage
    try {
      info.localStorageKeys = localStorage.length;
    } catch (e) {
      logger.error('Error getting localStorage', { error: e });
    }

    // SessionStorage
    try {
      info.sessionStorageKeys = sessionStorage.length;
    } catch (e) {
      logger.error('Error getting sessionStorage', { error: e });
    }

    // IndexedDB
    if ('indexedDB' in window && indexedDB.databases) {
      try {
        const databases = await indexedDB.databases();
        info.indexedDBDatabases = databases.map(db => db.name || 'unknown');
      } catch (e) {
        logger.error('Error getting IndexedDB databases', { error: e });
      }
    }

    setStorageInfo(info);
  };

  // Nettoyer les Service Workers
  const cleanServiceWorkers = async () => {
    setStatus(s => ({ ...s, serviceWorkers: 'cleaning' }));
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        setStatus(s => ({ ...s, serviceWorkers: 'done' }));
        setMessage(`${registrations.length} Service Worker(s) supprime(s)`);
      }
    } catch (error) {
      setStatus(s => ({ ...s, serviceWorkers: 'error' }));
      setMessage(`Erreur: ${error}`);
    }
    await loadStorageInfo();
  };

  // Nettoyer le Cache API
  const cleanCache = async () => {
    setStatus(s => ({ ...s, cache: 'cleaning' }));
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
        setStatus(s => ({ ...s, cache: 'done' }));
        setMessage(`${names.length} cache(s) supprime(s)`);
      }
    } catch (error) {
      setStatus(s => ({ ...s, cache: 'error' }));
      setMessage(`Erreur: ${error}`);
    }
    await loadStorageInfo();
  };

  // Nettoyer localStorage
  const cleanLocalStorage = async () => {
    setStatus(s => ({ ...s, localStorage: 'cleaning' }));
    try {
      const count = localStorage.length;
      localStorage.clear();
      setStatus(s => ({ ...s, localStorage: 'done' }));
      setMessage(`${count} cle(s) localStorage supprimee(s)`);
    } catch (error) {
      setStatus(s => ({ ...s, localStorage: 'error' }));
      setMessage(`Erreur: ${error}`);
    }
    await loadStorageInfo();
  };

  // Nettoyer sessionStorage
  const cleanSessionStorage = async () => {
    setStatus(s => ({ ...s, sessionStorage: 'cleaning' }));
    try {
      const count = sessionStorage.length;
      sessionStorage.clear();
      setStatus(s => ({ ...s, sessionStorage: 'done' }));
      setMessage(`${count} cle(s) sessionStorage supprimee(s)`);
    } catch (error) {
      setStatus(s => ({ ...s, sessionStorage: 'error' }));
      setMessage(`Erreur: ${error}`);
    }
    await loadStorageInfo();
  };

  // Nettoyer IndexedDB
  const cleanIndexedDB = async () => {
    setStatus(s => ({ ...s, indexedDB: 'cleaning' }));
    try {
      if ('indexedDB' in window && indexedDB.databases) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
        setStatus(s => ({ ...s, indexedDB: 'done' }));
        setMessage(`${databases.length} base(s) IndexedDB supprimee(s)`);
      }
    } catch (error) {
      setStatus(s => ({ ...s, indexedDB: 'error' }));
      setMessage(`Erreur: ${error}`);
    }
    await loadStorageInfo();
  };

  // Tout nettoyer
  const cleanAll = async () => {
    setMessage('Nettoyage complet en cours...');
    await cleanServiceWorkers();
    await cleanCache();
    await cleanLocalStorage();
    await cleanSessionStorage();
    await cleanIndexedDB();
    setMessage('Nettoyage complet termine! Rechargez la page.');
  };

  // Hard reload
  const hardReload = () => {
    window.location.reload();
  };

  const getStatusIcon = (s: 'idle' | 'cleaning' | 'done' | 'error') => {
    switch (s) {
      case 'cleaning':
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Trash2 className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nettoyage du Navigateur
            </h1>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300">
              {message}
            </div>
          )}

          <div className="space-y-4">
            {/* Service Workers */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-purple-500" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Service Workers</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {storageInfo.serviceWorkers} enregistre(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.serviceWorkers)}
                <button
                  onClick={cleanServiceWorkers}
                  disabled={status.serviceWorkers === 'cleaning'}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* Cache API */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Cache API</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {storageInfo.cacheNames.length} cache(s): {storageInfo.cacheNames.join(', ') || 'aucun'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.cache)}
                <button
                  onClick={cleanCache}
                  disabled={status.cache === 'cleaning'}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* LocalStorage */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">LocalStorage</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {storageInfo.localStorageKeys} cle(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.localStorage)}
                <button
                  onClick={cleanLocalStorage}
                  disabled={status.localStorage === 'cleaning'}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* SessionStorage */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-yellow-500" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">SessionStorage</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {storageInfo.sessionStorageKeys} cle(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.sessionStorage)}
                <button
                  onClick={cleanSessionStorage}
                  disabled={status.sessionStorage === 'cleaning'}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* IndexedDB */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-orange-500" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">IndexedDB</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {storageInfo.indexedDBDatabases.length} base(s): {storageInfo.indexedDBDatabases.join(', ') || 'aucune'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.indexedDB)}
                <button
                  onClick={cleanIndexedDB}
                  disabled={status.indexedDB === 'cleaning'}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          {/* Actions globales */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={cleanAll}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              <Trash2 className="w-5 h-5" />
              Tout Nettoyer
            </button>
            <button
              onClick={hardReload}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Zap className="w-5 h-5" />
              Recharger la Page
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Attention:</strong> Le nettoyage du localStorage effacera vos workflows et preferences.
              Exportez vos donnees importantes avant de continuer.
            </p>
          </div>

          {/* Bouton retour */}
          <div className="mt-6">
            <a
              href="/dashboard"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              &larr; Retour au Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
