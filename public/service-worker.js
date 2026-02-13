// Service Worker for Workflow Builder Pro PWA
// Version 2.0.0 - Advanced Performance Optimizations

const CACHE_VERSION = 'v2';
const CACHE_NAME = `workflow-builder-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-cache-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const IMAGE_CACHE = `image-cache-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Cache configuration
const CACHE_CONFIG = {
  maxAge: {
    static: 31536000, // 1 year for static assets
    api: 300,         // 5 minutes for API responses
    images: 2592000,  // 30 days for images
  },
  maxEntries: {
    runtime: 50,
    api: 100,
    images: 60,
  },
};

// Critical assets to precache (only essential files)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
];

// Assets to prefetch (non-critical, loaded in background)
const PREFETCH_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - strategic precaching
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install v2.0');

  event.waitUntil(
    Promise.all([
      // Precache critical assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Pre-caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      // Prefetch non-critical assets in background
      caches.open(RUNTIME_CACHE).then((cache) => {
        console.log('[ServiceWorker] Prefetching assets');
        return Promise.allSettled(
          PREFETCH_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[ServiceWorker] Prefetch failed:', url, err))
          )
        );
      }),
    ]).then(() => {
      console.log('[ServiceWorker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate v2.0');

  event.waitUntil(
    Promise.all([
      // Cleanup old caches
      caches.keys().then((keyList) => {
        const currentCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE];
        return Promise.all(
          keyList.map((key) => {
            if (!currentCaches.includes(key)) {
              console.log('[ServiceWorker] Removing old cache:', key);
              return caches.delete(key);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event - advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Navigation requests - Network first with fast cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          // Cache successful navigation
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to offline page
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
          // Last resort - return a basic error page
          return new Response('Offline - Page not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      })()
    );
    return;
  }

  // API calls - Network first with cache fallback and staleness check
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Only cache successful GET requests
          if (response.ok && request.method === 'GET') {
            const cache = await caches.open(API_CACHE);
            cache.put(request, response.clone());
            // Cleanup old API cache entries
            cleanupCache(API_CACHE, CACHE_CONFIG.maxEntries.api);
          }
          return response;
        } catch (error) {
          // Fallback to cache
          const cached = await caches.match(request);
          if (cached) {
            // Check cache age
            const cachedDate = new Date(cached.headers.get('date') || 0);
            const now = new Date();
            const age = (now - cachedDate) / 1000; // seconds

            // Return cached if not too old
            if (age < CACHE_CONFIG.maxAge.api) {
              return cached;
            }
          }
          // Return error response instead of throwing
          return new Response(JSON.stringify({ error: 'Network error and no valid cache' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // Images - Cache first with background update
  if (request.destination === 'image') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);

        // Start fetch in background
        const fetchPromise = fetch(request).then(async response => {
          if (response.ok) {
            const cache = await caches.open(IMAGE_CACHE);
            cache.put(request, response.clone());
            cleanupCache(IMAGE_CACHE, CACHE_CONFIG.maxEntries.images);
          }
          return response;
        }).catch(() => null);

        // Return cached immediately if available
        if (cached) {
          fetchPromise; // Continue background fetch
          return cached;
        }

        // Wait for network if no cache
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // Return placeholder for missing images
        return new Response('', { status: 404, statusText: 'Image not found' });
      })()
    );
    return;
  }

  // Static assets - Cache first, network fallback
  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          // Update cache in background for stale assets
          const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
          const age = (new Date() - cachedDate) / 1000;
          if (age > 3600) { // 1 hour
            fetch(request).then(async fresh => {
              if (fresh && fresh.ok) {
                const cache = await caches.open(RUNTIME_CACHE);
                cache.put(request, fresh.clone());
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }

        const networkResponse = await fetch(request);

        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone and cache
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
        cleanupCache(RUNTIME_CACHE, CACHE_CONFIG.maxEntries.runtime);

        return networkResponse;
      } catch (error) {
        // Return a fallback response for failed static assets
        return new Response('Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// Helper: Cleanup cache to max entries
async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync', event.tag);
  
  if (event.tag === 'sync-workflows') {
    event.waitUntil(syncWorkflows());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = {};
  
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'New workflow update',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Workflow Builder Pro',
      options
    )
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_WORKFLOWS') {
    cacheWorkflows(event.data.workflows);
  }
});

// Helper function to sync workflows
async function syncWorkflows() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    
    const workflowRequests = requests.filter(req => 
      req.url.includes('/api/workflows')
    );
    
    for (const request of workflowRequests) {
      try {
        const response = await fetch(request);
        await cache.put(request, response);
      } catch (error) {
        console.error('[ServiceWorker] Sync failed for', request.url);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync workflows failed', error);
  }
}

// Helper function to cache workflows
async function cacheWorkflows(workflows) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    
    for (const workflow of workflows) {
      const request = new Request(`/api/workflows/${workflow.id}`);
      const response = new Response(JSON.stringify(workflow), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(request, response);
    }
  } catch (error) {
    console.error('[ServiceWorker] Cache workflows failed', error);
  }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-workflows') {
    event.waitUntil(updateWorkflows());
  }
});

async function updateWorkflows() {
  try {
    const response = await fetch('/api/workflows/updates');
    const updates = await response.json();
    
    if (updates && updates.length > 0) {
      await cacheWorkflows(updates);
      
      // Notify clients about updates
      const allClients = await clients.matchAll();
      allClients.forEach(client => {
        client.postMessage({
          type: 'WORKFLOWS_UPDATED',
          workflows: updates
        });
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Update workflows failed', error);
  }
}