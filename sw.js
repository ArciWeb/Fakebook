const CACHE_NAME = 'fakebook-cache-v3.98';
const CACHE_PREFIX = 'fakebook-cache-';
const ASSETS = [
    './',
    './index.html',
    './changelog.html',
    './fakebook.png',
    './fakebook_small.png'
];

// Install the new worker and activate it without waiting for old tabs to close.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Delete only old Fakebook caches, not caches belonging to other apps on the same origin.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle GET requests from this origin. Leave API/external requests alone.
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    if (url.href.includes('api.groq.com') || url.href.includes('pollinations.com') || url.href.includes('corsproxy')) return;

    // For page navigations, try the network first and bypass the browser HTTP cache.
    // If offline, fall back to the cached page.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(new Request(request, { cache: 'no-store' }))
                .then(response => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
                    }
                    return response;
                })
                .catch(async () => {
                    return (await caches.match(request)) ||
                           (await caches.match('./index.html')) ||
                           Response.error();
                })
        );
        return;
    }

    // For other same-origin resources, prefer a fresh network response.
    event.respondWith(
        fetch(new Request(request, { cache: 'no-cache' }))
            .then(response => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
                }
                return response;
            })
            .catch(() => caches.match(request).then(cached => cached || Response.error()))
    );
});
