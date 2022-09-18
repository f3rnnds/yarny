//change to force update
const cacheName = "yarny-cache-v1"
const urlsToCache = [
    "/",
    "index.html",
    "index.js",
    "icon.png",
    "https://cdn.jsdelivr.net/npm/bootstrap-dark-5@1.1.3/dist/css/bootstrap-dark.min.css"
]

self.addEventListener("install", function (event) {
    console.log("service worker installed")
    event.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log("installing cache: " + cacheName)
            return cache.addAll(urlsToCache)
        })
    )
})

self.addEventListener("activate", event => {
    console.log("service worker activated")
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys
                .filter((key) => key != cacheName)
                .map(function (key) {
                    console.log("deleting cache: " + key)
                    caches.delete(key)   
                })
            )
        })
    )
})

// cache first strategy
self.addEventListener("fetch", function (event) {
    console.log("url requested: " + event.request.url)
    event.respondWith(
        caches.match(event.request).then(function (cachedResponse) {
            if (cachedResponse) {
                console.log("responding with cache: " + event.request.url)
                return cachedResponse
            } else {
                console.log("not in the cache, fetching: " + event.request.url)
                return fetch(event.request)
            }
            // or
            // return cachedResponse || fetch(event.request)
        })
    )
})