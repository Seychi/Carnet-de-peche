import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { loadOgFonts } from '@/lib/og/fonts'
import { SPECIES_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import {
  NAVY700,
  TEAL300,
  WHITE,
  OG_DIMENSIONS,
  OgFrame,
  OgKicker,
} from '@/lib/og/template'

export const runtime = 'edge'

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

// ── Labels de profondeur (décoratifs, calés sur le layout 1200×630) ───────────

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
  const fonts = await loadOgFonts()

  return new ImageResponse(
    (
      <OgFrame
        format="og"
        rootOverlay={
          // Labels de profondeur — absolus par rapport au cadre racine (coordonnées
          // calées sur le viewport plein 1200×630, comme dans l'historique).
          <div style={{ display: 'flex', position: 'absolute', top: '0px', left: '0px' }}>
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
          </div>
        }
      >
        <OgKicker label="Spot de pêche · canne du bord" />

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
      </OgFrame>
    ),
    { width: OG_DIMENSIONS.og.width, height: OG_DIMENSIONS.og.height, fonts },
  )
}
