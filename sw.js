const CACHE_NAME = 'fakebook-cache-v3';
const ASSETS = [
    'index.html',
    'manifest.json',
    'sw.js',
    'fakebook.png',
    'fakebook_small.png'
];

// Inštalácia Service Workera a uloženie súborov do cache
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Fakebook PWA: Ukladám statické súbory do cache...');
            return cache.addAll(ASSETS);
        })
    );
});

// Aktivácia a vyčistenie starých verzií cache
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('Fakebook PWA: Mažem starú cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Sieťové požiadavky - ak sme offline, načítaj dáta z cache
self.addEventListener('fetch', e => {
    // Groq API ani corsproxy nechceme cachovať, tie musia ísť vždy naživo
    if (e.request.url.includes('api.groq.com') || e.request.url.includes('corsproxy.io')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            // OPRAVENÉ: Namiesto neexistujúceho 'res' vraciame správne 'cachedResponse'
            return cachedResponse || fetch(e.request).catch(() => {
                // Priestor pre prípadný offline fallback
            });
        })
    );
});
