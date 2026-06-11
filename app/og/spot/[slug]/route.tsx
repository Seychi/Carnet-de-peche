import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { SPECIES_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

export const runtime = 'edge'

// ── Charte DA v2 « Instrument de précision marine » ────────────────────────────
const NAVY950 = '#04141C'
const NAVY700 = '#155A73'
const TEAL = '#14B8A6'
const TEAL300 = '#5EEAD4'
const WHITE = '#FFFFFF'

// ── Données ────────────────────────────────────────────────────────────────────

type SpotOg = {
  name: string
  slug: string
  department: string
  species: string[]
  structure: string | null
}

async function fetchSpotForOg(slug: string): Promise<SpotOg | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase
    .from('spots')
    .select('name, slug, department, species, structure, visibility')
    .eq('slug', slug)
    .neq('visibility', 'private')
    .maybeSingle()
  return data as SpotOg | null
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const spot = await fetchSpotForOg(slug)
  if (!spot) return new Response('Not found', { status: 404 })

  const topSpecies = (Array.isArray(spot.species) ? spot.species.slice(0, 3) : []).map(
    (s) => SPECIES_LABELS[s] ?? s,
  )
  const structureLabel = (spot.structure && STRUCTURE_LABELS[spot.structure]) ?? null
  const deptKey = String(spot.department).trim()
  const deptLabel = DEPARTMENT_LABELS[deptKey] ?? deptKey
  const displayName = spot.name.length > 48 ? `${spot.name.slice(0, 45)}…` : spot.name
  const fontSize = displayName.length > 32 ? 60 : displayName.length > 22 ? 72 : 84

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
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
            Spot de pêche · canne du bord
          </span>
        </div>

        {/* Nom du spot */}
        <div
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color: WHITE,
            lineHeight: 1.05,
            maxWidth: '960px',
            marginBottom: '24px',
          }}
        >
          {displayName}
        </div>

        {/* Département + Structure — étiquette « instrument » */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          <span
            style={{
              fontSize: '22px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {deptLabel} ({deptKey})
          </span>
          {structureLabel && (
            <span
              style={{
                fontSize: '22px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(94,234,212,0.65)',
              }}
            >
              · {structureLabel}
            </span>
          )}
        </div>

        {/* Espèces */}
        {topSpecies.length > 0 && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {topSpecies.map((s) => (
              <div
                key={s}
                style={{
                  display: 'flex',
                  background: 'rgba(20,184,166,0.10)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(94,234,212,0.32)',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '18px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: TEAL300,
                  fontWeight: 600,
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}

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
          {/* Logo + nom */}
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

          {/* URL */}
          <span style={{ fontSize: '16px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)' }}>
            carnet-de-peche.com
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
