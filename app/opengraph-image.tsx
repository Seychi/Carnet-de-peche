import { ImageResponse } from 'next/og'

// OG image de marque par défaut (convention Next.js : appliquée à toute page qui
// ne définit pas sa propre `openGraph.images`). Les fiches spots gardent leur
// image dynamique via `app/og/spot/[slug]`. Sert aussi de twitter:image (fallback).
export const runtime = 'edge'
export const alt = 'Carnet de Pêche — Logue. Partage. Progresse.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Charte ─────────────────────────────────────────────────────────────────────
const NAVY = '#0A2F3D'
const NAVY2 = '#103E50'
const TEAL = '#14B8A6'
const TEALX = '#2DD4BF'
const WHITE = '#FFFFFF'

// Nœuds décoratifs (points côtiers stylisés — Atlantique / Manche / Méditerranée)
type Dot = { x: number; y: number; r: number; opacity: number }
const DOTS: Dot[] = [
  { x: 150, y: 110, r: 8, opacity: 0.6 },
  { x: 130, y: 200, r: 6, opacity: 0.5 },
  { x: 120, y: 300, r: 10, opacity: 0.7 },
  { x: 135, y: 400, r: 7, opacity: 0.55 },
  { x: 165, y: 500, r: 9, opacity: 0.6 },
  { x: 320, y: 70, r: 7, opacity: 0.55 },
  { x: 470, y: 55, r: 5, opacity: 0.45 },
  { x: 620, y: 65, r: 8, opacity: 0.6 },
  { x: 770, y: 72, r: 6, opacity: 0.5 },
  { x: 920, y: 88, r: 9, opacity: 0.6 },
  { x: 1060, y: 110, r: 5, opacity: 0.4 },
  { x: 820, y: 520, r: 10, opacity: 0.65 },
  { x: 950, y: 500, r: 6, opacity: 0.5 },
  { x: 1060, y: 460, r: 8, opacity: 0.6 },
  { x: 480, y: 250, r: 4, opacity: 0.18 },
  { x: 660, y: 320, r: 4, opacity: 0.16 },
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
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)`,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Points décoratifs côtiers */}
        <div style={{ display: 'flex', position: 'absolute', inset: 0 }}>
          {DOTS.map((d, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${d.x}px`,
                top: `${d.y}px`,
                width: `${d.r * 2}px`,
                height: `${d.r * 2}px`,
                borderRadius: '50%',
                background: TEAL,
                opacity: d.opacity,
              }}
            />
          ))}
        </div>

        {/* Label catégorie */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
          <div style={{ width: '6px', height: '44px', background: TEAL, borderRadius: '3px' }} />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: TEAL,
              letterSpacing: '0.1em',
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
        <span style={{ fontSize: '46px', fontWeight: 700, color: TEALX, lineHeight: 1.15 }}>
          Logue. Partage. Progresse.
        </span>

        {/* Sous-titre */}
        <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255,255,255,0.55)', marginTop: '20px', maxWidth: '900px' }}>
          Le carnet numérique et le réseau des pêcheurs à la canne du bord — bar, dorade, lieu, maquereau…
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: TEAL,
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 900, color: NAVY }}>CP</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 700, color: WHITE }}>Carnet de Pêche</span>
          </div>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>carnet-de-peche.com</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
