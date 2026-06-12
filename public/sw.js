/* Service worker Carnet de Pêche — PWA sprint 11 (Bloc A).
 * Volontairement SIMPLE (cf brief) : app shell + page offline + cache
 * des dernières pages consultées. Pas de background sync (sprint 16).
 *
 * Versionning : bump CACHE_VERSION à chaque changement de stratégie.
 * Le déploiement d'un nouveau SW attend le message SKIP_WAITING envoyé
 * par le toast « Mettre à jour » côté client (pas de skipWaiting auto :
 * évite les versions fantômes mi-anciennes mi-nouvelles).
 */
const CACHE_VERSION = 'cdp-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const PAGES_CACHE = `${CACHE_VERSION}-pages`
const ASSETS_CACHE = `${CACHE_VERSION}-assets`

const SHELL_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

// Jamais de cache : API, auth, Supabase, Stripe, webhooks.
function isBypassed(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/dev/') ||
    url.origin.includes('supabase.co') ||
    url.origin.includes('stripe.com')
  )
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (isBypassed(url)) return

  // Navigations : network-first → cache de la page → page offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(PAGES_CACHE)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(request)
          if (cached) return cached
          return (await caches.match('/offline')) ?? Response.error()
        }
      })(),
    )
    return
  }

  // Assets immuables Next (_next/static, images, fonts, tuiles icônes) :
  // cache-first (ils sont fingerprintés).
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/images/') ||
      /\.(woff2?|png|jpe?g|webp|svg|ico)$/.test(url.pathname))

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        try {
          const fresh = await fetch(request)
          if (fresh.ok) {
            const cache = await caches.open(ASSETS_CACHE)
            cache.put(request, fresh.clone())
          }
          return fresh
        } catch {
          return Response.error()
        }
      })(),
    )
  }
})
