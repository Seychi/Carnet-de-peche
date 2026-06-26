import { ImageResponse } from 'next/og'

// OG image de marque par défaut (convention Next.js : appliquée à toute page qui
// ne définit pas sa propre `openGraph.images`). Les fiches spots gardent leur
// image dynamique via `app/og/spot/[slug]`. Sert aussi de twitter:image (fallback).
export const runtime = 'edge'
export const alt = 'Carnet de Pêche — Logue. Partage. Progresse.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Charte DA v2 « Instrument de précision marine » ────────────────────────────
const NAVY950 = '#04141C'
const NAVY700 = '#155A73'
const TEAL = '#14B8A6'
const TEAL300 = '#5EEAD4'
const SAND50 = '#FBF8F2'
const WHITE = '#FFFFFF'

// Isobathes décoratives (paths repris de docs/maquette-v2/index.html)
const ISOBATHS = [
  { d: 'M-50 580 C 250 480, 480 640, 760 540 S 1240 460, 1460 560', opacity: 0.5 },
  { d: 'M-50 500 C 230 400, 500 560, 780 460 S 1230 380, 1460 470', opacity: 0.4 },
  { d: 'M-50 420 C 220 330, 520 480, 800 390 S 1230 300, 1460 390', opacity: 0.3 },
]

// Sondes (« la donnée est l'ornement ») — posées sur les isobathes, côté droit
const DEPTHS = [
  { label: '— 5 m', left: '1008px', top: '448px', opacity: 0.85 },
  { label: '— 10 m', left: '1026px', top: '382px', opacity: 0.65 },
  { label: '— 20 m', left: '1044px', top: '316px', opacity: 0.5 },
]

export default function Image() {
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
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Isobathes en fond (1400×700 → recadrées à 1260×630, centrées) */}
        <svg
          width="1260"
          height="630"
          viewBox="0 0 1400 700"
          style={{ position: 'absolute', top: '0px', left: '-30px' }}
        >
          {ISOBATHS.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={NAVY700}
              strokeWidth={2}
              opacity={p.opacity}
            />
          ))}
        </svg>
        {DEPTHS.map((d) => (
          <span
            key={d.label}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              fontSize: '13px',
              letterSpacing: '0.08em',
              color: NAVY700,
              opacity: d.opacity,
            }}
          >
            {d.label}
          </span>
        ))}

        {/* Kicker (tiret teal + étiquette espacée) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
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
            Pêche à la canne du bord · France
          </span>
        </div>

        {/* Titre */}
        <span
          style={{
            fontSize: '92px',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
          }}
        >
          Carnet de Pêche
        </span>

        {/* Tagline */}
        <span style={{ fontSize: '46px', fontWeight: 700, color: TEAL300, lineHeight: 1.15 }}>
          Logue. Partage. Progresse.
        </span>

        {/* Sous-titre */}
        <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255,255,255,0.55)', marginTop: '20px', maxWidth: '880px' }}>
          Le carnet numérique et le réseau des pêcheurs à la canne du bord : bar, dorade, lieu, maquereau…
        </div>

        {/* Spacer */}
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
            {/* Picto « carnet qui ferre » — variante dark (fond navy-950) */}
            {/* source: public/logo/logo-icon.svg — Satori ne supporte pas <mask>,
                l'échancrure de l'hameçon est émulée par un trait couleur du fond */}
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <g stroke={SAND50} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <rect x="11" y="6" width="26" height="29" rx="5" />
                <path d="M16 13.5h10" />
                <path d="M16 19.5h10" />
                <path d="M16 25.5h6" />
              </g>
              {/* échancrure : repeint le fond par-dessus le bord du carnet */}
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
    { ...size },
  )
}
