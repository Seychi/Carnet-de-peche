import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// ── Charte ─────────────────────────────────────────────────────────────────────
const NAVY  = '#0A2F3D'
const NAVY2 = '#103E50'
const TEAL  = '#14B8A6'
const TEALX = '#2DD4BF'
const WHITE = '#FFFFFF'

// ── Données ────────────────────────────────────────────────────────────────────

async function fetchSpotCount(): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { count } = await supabase
    .from('spots')
    .select('id', { count: 'exact', head: true })
    .eq('visibility', 'public')
  return count ?? 0
}

// ── Nœuds décoratifs (points côtiers stylisés) ─────────────────────────────────

type Dot = { x: number; y: number; r: number; opacity: number }
const DOTS: Dot[] = [
  // Littoral atlantique (gauche)
  { x: 180, y: 90,  r: 5,   opacity: 0.55 },
  { x: 145, y: 145, r: 8,   opacity: 0.65 },
  { x: 130, y: 220, r: 6,   opacity: 0.50 },
  { x: 115, y: 295, r: 10,  opacity: 0.70 },
  { x: 125, y: 375, r: 7,   opacity: 0.60 },
  { x: 140, y: 450, r: 5,   opacity: 0.45 },
  { x: 170, y: 510, r: 9,   opacity: 0.65 },
  // Littoral Manche (haut)
  { x: 310, y: 70,  r: 7,   opacity: 0.55 },
  { x: 430, y: 55,  r: 5,   opacity: 0.45 },
  { x: 560, y: 65,  r: 8,   opacity: 0.60 },
  { x: 680, y: 80,  r: 6,   opacity: 0.50 },
  { x: 790, y: 70,  r: 9,   opacity: 0.65 },
  { x: 900, y: 90,  r: 5,   opacity: 0.40 },
  // Littoral Méditerranée (bas-droite)
  { x: 750, y: 490, r: 7,   opacity: 0.55 },
  { x: 850, y: 510, r: 10,  opacity: 0.70 },
  { x: 950, y: 490, r: 6,   opacity: 0.50 },
  { x: 1040, y: 460, r: 8,  opacity: 0.65 },
  { x: 1090, y: 410, r: 5,  opacity: 0.45 },
  // Points intérieurs (trame légère)
  { x: 400, y: 200, r: 4,   opacity: 0.20 },
  { x: 580, y: 280, r: 4,   opacity: 0.18 },
  { x: 700, y: 200, r: 3,   opacity: 0.15 },
  { x: 500, y: 380, r: 4,   opacity: 0.20 },
  { x: 650, y: 400, r: 3,   opacity: 0.15 },
]

// ── Route ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const count = await fetchSpotCount()
  const countStr = count > 0 ? `${count}` : '…'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)`,
          padding: '64px 72px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div
            style={{
              width: '6px',
              height: '44px',
              background: TEAL,
              borderRadius: '3px',
            }}
          />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: TEAL,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Annuaire · canne du bord · France
          </span>
        </div>

        {/* Compteur */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px', marginBottom: '16px' }}>
          <span
            style={{
              fontSize: '120px',
              fontWeight: 900,
              color: WHITE,
              lineHeight: 1,
              letterSpacing: '-0.04em',
            }}
          >
            {countStr}
          </span>
          <span
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: TEALX,
              lineHeight: 1.1,
              maxWidth: '420px',
            }}
          >
            spots de pêche en France
          </span>
        </div>

        {/* Sous-titre */}
        <div
          style={{
            fontSize: '22px',
            color: 'rgba(255,255,255,0.50)',
            marginBottom: '40px',
          }}
        >
          Atlantique · Manche · Méditerranée — bar, dorade, lieu, maquereau…
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
            <span style={{ fontSize: '24px', fontWeight: 700, color: WHITE }}>
              Carnet de Pêche
            </span>
          </div>

          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>
            carnet-de-peche.com/spots
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
