// ─── Fallback OG de marque + politique de cache (sprint 70 Bloc C) ────────────
// Quand une route OG dynamique n'arrive PAS à charger ses données (Supabase lent,
// réseau edge KO), on ne rend JAMAIS un 500 ni un timeout 25 s : on sert cette
// carte de marque statique (même charte que app/opengraph-image.tsx), en cache
// COURT pour que l'incident ne colle pas au CDN. Même invariant que lib/og/fonts.ts
// (sprint 55) : « jamais de 500 ».
// Edge-safe : aucun import server-only, aucune donnée externe (les polices sont
// déjà bornées + résilientes dans lib/og/fonts.ts).

import { ImageResponse } from 'next/og'
import { loadOgFonts } from './fonts'
import {
  OG_DIMENSIONS,
  OgFrame,
  OgKicker,
  TEAL300,
  WHITE,
  type OgFormat,
} from './template'

/** Borne dure des fetchs de données internes des routes OG (Supabase). */
export const OG_DATA_FETCH_TIMEOUT_MS = 3_000

/**
 * Cache CDN long pour les images OG nominales : un OG de spot change rarement.
 * s-maxage 24 h + stale-while-revalidate 7 j → le CDN resert l'image existante
 * pendant qu'il régénère en fond (plus aucun crawler ne paie la génération).
 */
export const OG_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'

/** Cache COURT pour le fallback : un raté transitoire ne doit pas coller 24 h. */
export const OG_FALLBACK_CACHE_CONTROL = 'public, max-age=60, s-maxage=300'

/**
 * Carte OG de marque générique (200 + cache court). À retourner quand les données
 * d'une route OG dynamique sont indisponibles : les previews sociales montrent la
 * marque au lieu d'une image cassée.
 */
export async function ogBrandFallback(format: OgFormat = 'og'): Promise<ImageResponse> {
  const fonts = await loadOgFonts()
  const { width, height } = OG_DIMENSIONS[format]
  const story = format === 'story'

  return new ImageResponse(
    (
      <OgFrame format={format}>
        <OgKicker label="Pêche à la canne du bord · France" marginBottom={story ? 36 : 28} />
        <span
          style={{
            fontSize: story ? '96px' : '84px',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
          }}
        >
          Carnet de Pêche
        </span>
        <span
          style={{
            fontSize: story ? '48px' : '42px',
            fontWeight: 700,
            color: TEAL300,
            lineHeight: 1.15,
          }}
        >
          Logue. Partage. Progresse.
        </span>
        <div style={{ flex: 1, display: 'flex' }} />
      </OgFrame>
    ),
    {
      width,
      height,
      fonts,
      headers: { 'Cache-Control': OG_FALLBACK_CACHE_CONTROL },
    },
  )
}
