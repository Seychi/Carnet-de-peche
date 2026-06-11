import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// ── Charte DA v2 « Instrument de précision marine » ────────────────────────────
const NAVY950 = '#04141C'
const NAVY700 = '#155A73'
const TEAL = '#14B8A6'
const TEAL300 = '#5EEAD4'
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

// ── Isobathes décoratives (paths repris de docs/maquette-v2/index.html) ────────

const ISOBATHS = [
  { d: 'M-50 580 C 250 480, 480 640, 760 540 S 1240 460, 1460 560', opacity: 0.5 },
  { d: 'M-50 500 C 230 400, 500 560, 780 460 S 1230 380, 1460 470', opacity: 0.4 },
  { d: 'M-50 420 C 220 330, 520 480, 800 390 S 1230 300, 1460 390', opacity: 0.3 },
]

const DEPTHS = [
  { label: '— 5 m', left: '1008px', top: '448px', opacity: 0.85 },
  { label: '— 10 m', left: '1026px', top: '382px', opacity: 0.65 },
  { label: '— 20 m', left: '1044px', top: '316px', opacity: 0.5 },
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
          background: NAVY950,
          padding: '64px 72px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '2px', background: TEAL }} />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: TEAL300,
              letterSpacing: '0.14em',
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
              color: TEAL300,
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
              <span style={{ fontSize: '16px', fontWeight: 900, color: NAVY950 }}>CP</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 700, color: WHITE }}>
              Carnet de Pêche
            </span>
          </div>

          <span style={{ fontSize: '16px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)' }}>
            carnet-de-peche.com/spots
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
