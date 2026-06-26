// Proxy server-side des tuiles raster « Fond marin » EMODnet (sprint Fond marin / WS A).
//
// POURQUOI : avant, MapLibre tapait EMODnet en DIRECT depuis le navigateur → CORS instable
// (`Failed to fetch ... (0)`) + ServiceException XML décodée comme une image
// (`The source image could not be decoded`) + zéro cache. On route tout par notre domaine,
// on neutralise les erreurs (tuile transparente, jamais une erreur), et on cache au CDN.
//
// GATING (décision John 2026-06-26) : route PUBLIQUE. Les tuiles EMODnet sont des données
// PUBLIQUES (CC-BY 4.0, WMS ouvert, dispo directement chez EMODnet) → aucune raison de
// confidentialité de les gater, et le cache CDN partagé (WS B) est incompatible de façon
// fiable avec une vérif de tier par cookie (lecture session + refresh = Set-Cookie). Le
// gating PRODUIT reste sur le toggle UI (Local+, cf lib/map/bathy-config) et sur le popup
// au clic (/api/seabed, gaté Local). La whitelist EMODnet (lib/map/seabed-tiles) = pas d'open proxy.

import { resolveSeabedTileUrl } from '@/lib/map/seabed-tiles'

export const runtime = 'nodejs'

// PNG 1×1 transparent — fallback gracieux : MapLibre reçoit TOUJOURS une image valide,
// jamais une erreur (tue `source image could not be decoded` ET `Failed to fetch`).
const TRANSPARENT_PNG = new Uint8Array(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  ),
)
function transparentTile(): Response {
  return new Response(TRANSPARENT_PNG, {
    status: 200,
    // Fallback NON figé au CDN : l'indispo EMODnet est souvent transitoire, on retente vite.
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  })
}

async function fetchTile(url: string): Promise<Response | null> {
  const attempt = async (): Promise<Response | null> => {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 6000) // timeout court : EMODnet flanche → fallback
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        cache: 'no-store', // le cache voulu est au CDN (en-têtes de la Response), pas le Data Cache Next
        headers: { Accept: 'image/png' },
      })
      const ct = res.headers.get('content-type')?.toLowerCase() ?? ''
      // CLÉ DU BUG : une ServiceException EMODnet arrive souvent en HTTP 200 avec un
      // Content-Type XML. `res.ok` ne suffit donc PAS → on exige une vraie image.
      if (!res.ok || !ct.startsWith('image/')) return null
      return res
    } catch {
      return null // timeout / DNS / réseau (pas de CORS en server-to-server)
    } finally {
      clearTimeout(timer)
    }
  }
  return (await attempt()) ?? (await attempt()) // 1 seul retry
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const size = searchParams.get('width') === '512' ? 512 : 256

  // Whitelist + validation bbox (anti open-proxy). Entrée non conforme → tuile transparente
  // (jamais une erreur ni un relais d'URL arbitraire).
  const upstreamUrl = resolveSeabedTileUrl(searchParams.get('layer'), searchParams.get('bbox') ?? '', size)
  if (!upstreamUrl) return transparentTile()

  const upstream = await fetchTile(upstreamUrl)
  if (!upstream) return transparentTile() // EMODnet down / non-image → dégradé propre

  // Succès : cache CDN partagé (les fonds marins ne bougent pas). CDN-Cache-Control =
  // directive CDN-only (le client ne garde rien) → 30 j + stale-while-revalidate 1 j.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'CDN-Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
    },
  })
}
