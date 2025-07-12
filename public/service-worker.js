self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('workflow-cache-v1').then(cache => cache.addAll(['/','/index.html']))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).then(res => {
          return caches.open('workflow-cache-v1').then(cache => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      );
    })
  );
});
