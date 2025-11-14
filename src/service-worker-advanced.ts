/**
 * Advanced Service Worker with intelligent caching strategies
 * Enables offline functionality and performance optimization
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Cache durations (in seconds)
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60, // 7 days
  dynamic: 24 * 60 * 60, // 1 day
  api: 5 * 60, // 5 minutes
  images: 30 * 24 * 60 * 60 // 30 days
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              // Delete caches that don't match current version
              return !Object.values(CACHE_NAMES).includes(name);
            })
            .map(name => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Choose strategy based on request type
  if (request.method !== 'GET') {
    // Don't cache non-GET requests
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    // API requests: Network first, fall back to cache
    event.respondWith(networkFirst(request, CACHE_NAMES.api, CACHE_DURATION.api));
  } else if (request.destination === 'image') {
    // Images: Cache first, fall back to network
    event.respondWith(cacheFirst(request, CACHE_NAMES.images, CACHE_DURATION.images));
  } else if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    // Static assets: Cache first
    event.respondWith(cacheFirst(request, CACHE_NAMES.static, CACHE_DURATION.static));
  } else {
    // Dynamic content: Stale while revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic, CACHE_DURATION.dynamic));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);

  if (event.tag === 'sync-workflows') {
    event.waitUntil(syncWorkflows());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');

  const data = event.data?.json() || {};
  const title = data.title || 'WorkflowBuilder Pro';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.url || '/',
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');

  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});

// Caching Strategies

/**
 * Cache First Strategy
 * Returns cached response if available, otherwise fetches from network
 */
async function cacheFirst(
  request: Request,
  cacheName: string,
  maxAge: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Check if cache is still fresh
    const cacheTime = getCacheTime(cached);
    if (cacheTime && Date.now() - cacheTime < maxAge * 1000) {
      console.log('[ServiceWorker] Cache hit:', request.url);
      return cached;
    }
  }

  // Fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseToCache = response.clone();
      cache.put(request, addCacheTime(responseToCache));
    }
    return response;
  } catch (error) {
    // If network fails and we have cached version, return it
    if (cached) {
      console.log('[ServiceWorker] Network failed, using stale cache:', request.url);
      return cached;
    }
    throw error;
  }
}

/**
 * Network First Strategy
 * Tries network first, falls back to cache if offline
 */
async function networkFirst(
  request: Request,
  cacheName: string,
  maxAge: number
): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseToCache = response.clone();
      cache.put(request, addCacheTime(responseToCache));
    }
    console.log('[ServiceWorker] Network response:', request.url);
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[ServiceWorker] Network failed, using cache:', request.url);
      return cached;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Returns cached response immediately, then updates cache in background
 */
async function staleWhileRevalidate(
  request: Request,
  cacheName: string,
  maxAge: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch from network in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, addCacheTime(response.clone()));
      }
      return response;
    })
    .catch(() => null);

  // Return cached response immediately if available
  if (cached) {
    console.log('[ServiceWorker] Returning cached, updating in background:', request.url);
    return cached;
  }

  // Wait for network if no cache
  const response = await fetchPromise;
  if (response) {
    return response;
  }

  throw new Error('No cached response and network failed');
}

/**
 * Add timestamp to response for cache freshness check
 */
function addCacheTime(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Cache-Time', Date.now().toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Get cache timestamp from response
 */
function getCacheTime(response: Response): number | null {
  const cacheTime = response.headers.get('X-Cache-Time');
  return cacheTime ? parseInt(cacheTime, 10) : null;
}

/**
 * Sync workflows when back online
 */
async function syncWorkflows(): Promise<void> {
  try {
    // Get pending workflows from IndexedDB
    const pendingWorkflows = await getPendingWorkflows();

    for (const workflow of pendingWorkflows) {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow)
        });

        if (response.ok) {
          await removePendingWorkflow(workflow.id);
          console.log('[ServiceWorker] Synced workflow:', workflow.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync workflow:', workflow.id, error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

/**
 * Get pending workflows from IndexedDB
 */
async function getPendingWorkflows(): Promise<any[]> {
  // Implementation would use IndexedDB
  return [];
}

/**
 * Remove synced workflow from IndexedDB
 */
async function removePendingWorkflow(id: string): Promise<void> {
  // Implementation would use IndexedDB
}

// Message handling
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLAIM_CLIENTS') {
    self.clients.claim();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});

export {};
