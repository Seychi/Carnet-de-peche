import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { SPECIES_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

export const runtime = 'edge'

// ── Charte ─────────────────────────────────────────────────────────────────────
const NAVY  = '#0A2F3D'
const NAVY2 = '#103E50'
const TEAL  = '#14B8A6'
const TEALX = '#2DD4BF'
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
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)`,
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Label catégorie */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
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
            marginBottom: '20px',
          }}
        >
          {displayName}
        </div>

        {/* Département + Structure */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          <span style={{ fontSize: '25px', color: 'rgba(255,255,255,0.55)' }}>
            {deptLabel} ({deptKey})
          </span>
          {structureLabel && (
            <span style={{ fontSize: '25px', color: 'rgba(20,184,166,0.65)' }}>
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
                  background: 'rgba(20,184,166,0.15)',
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(20,184,166,0.35)',
                  borderRadius: '100px',
                  padding: '10px 24px',
                  fontSize: '20px',
                  color: TEALX,
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
              <span style={{ fontSize: '16px', fontWeight: 900, color: NAVY }}>CP</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 700, color: WHITE }}>
              Carnet de Pêche
            </span>
          </div>

          {/* URL */}
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>
            carnet-de-peche.vercel.app
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
