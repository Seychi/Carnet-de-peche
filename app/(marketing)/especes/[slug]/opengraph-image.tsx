import { ImageResponse } from 'next/og'
import { SPECIES, type SpeciesSlug } from '@/lib/seo/programmatic'
import { loadOgFonts } from '@/lib/og/fonts'

// OG image dynamique par fiche espèce (convention Next.js : remplace l'OG de
// marque par défaut sur /especes/[slug]). Data 100% statique (SPECIES) → aucun
// appel réseau, contrairement à l'OG des spots (app/og/spot/[slug]). Charte DA v2.
export const runtime = 'edge'
export const alt = 'Fiche espèce — pêche à la canne du bord — Carnet de Pêche'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Charte DA v2 « Instrument de précision marine » ────────────────────────────
const NAVY950 = '#04141C'
const NAVY700 = '#155A73'
const TEAL = '#14B8A6'
const TEAL300 = '#5EEAD4'
const GOLD = '#D9A53C'
const WHITE = '#FFFFFF'

// Isobathes décoratives (mêmes paths que l'OG de marque)
const ISOBATHS = [
  { d: 'M-50 580 C 250 480, 480 640, 760 540 S 1240 460, 1460 560', opacity: 0.5 },
  { d: 'M-50 500 C 230 400, 500 560, 780 460 S 1230 380, 1460 470', opacity: 0.4 },
  { d: 'M-50 420 C 220 330, 520 480, 800 390 S 1230 300, 1460 390', opacity: 0.3 },
]

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  // Next 15 : params est une Promise → await obligatoire.
  const { slug } = await params
  const species = SPECIES[slug as SpeciesSlug]
  const label = species?.label ?? 'Espèce'
  const latin = species?.latin ?? ''
  const fonts = await loadOgFonts()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: NAVY950,
          padding: '72px 80px',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Isobathes en fond */}
        <svg
          width="1260"
          height="630"
          viewBox="0 0 1400 700"
          style={{ position: 'absolute', top: '0px', left: '-30px' }}
        >
          {ISOBATHS.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke={NAVY700} strokeWidth={2} opacity={p.opacity} />
          ))}
        </svg>

        {/* Kicker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '2px', background: TEAL }} />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: TEAL300,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Fiche espèce · Pêche à la canne du bord
          </span>
        </div>

        {/* Nom de l'espèce */}
        <span
          style={{
            fontSize: '88px',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: '18px',
          }}
        >
          {label}
        </span>

        {/* Nom latin */}
        <span style={{ display: 'flex', fontSize: '34px', fontStyle: 'italic', color: GOLD }}>
          {latin}
        </span>

        {/* Sous-titre */}
        <div
          style={{
            display: 'flex',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.55)',
            marginTop: '22px',
            maxWidth: '900px',
          }}
        >
          Taille légale vérifiée · saisons par façade · techniques et postes du bord
        </div>

        <div style={{ flex: 1, display: 'flex' }} />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            borderTopColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <g stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <rect x="11" y="6" width="26" height="29" rx="5" />
                <path d="M16 13.5h10" />
                <path d="M16 19.5h10" />
                <path d="M16 25.5h6" />
              </g>
              <path d="M31 33v4" stroke={NAVY950} strokeWidth={5} strokeLinecap="butt" />
              <path
                d="M31 6v31a4.5 4.5 0 1 1-9 0v-2"
                stroke={TEAL300}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '24px', fontWeight: 700, color: WHITE }}>Carnet de Pêche</span>
          </div>
          <span style={{ fontSize: '16px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)' }}>
            carnet-de-peche.com
          </span>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
