import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { SPECIES_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import {
  TEAL,
  TEAL300,
  SAND50,
  WHITE,
  CORAL,
  MONO_STYLE,
  OG_DIMENSIONS,
  OgFrame,
  OgKicker,
  parseFormat,
  type OgFormat,
} from '@/lib/og/template'
import type {
  OgCardPayload,
  OgCatchPayload,
  OgConditionsPayload,
  OgOutingPayload,
  OgTideState,
} from '@/lib/og/types'

export const runtime = 'edge'

// ─── Lecture de la carte (edge → anon, UNIQUEMENT shared_cards) ───────────────
// La route edge ne lit QUE shared_cards par slug, en client anon (RLS select public).
// Aucune lecture de catches_for_viewer ni appel server-only ici (garde-fou n°1).

type SharedCardRow = {
  payload: OgCardPayload
  kind: 'catch' | 'conditions' | 'outing'
}

async function fetchCard(slug: string): Promise<SharedCardRow | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase
    .from('shared_cards')
    .select('payload, kind')
    .eq('slug', slug)
    .maybeSingle()
  return (data as SharedCardRow | null) ?? null
}

// ─── Helpers de libellés (locaux, edge-safe) ──────────────────────────────────

const TIDE_STATE_LABELS: Record<'rising' | 'falling' | 'slack', string> = {
  rising: 'Marée montante',
  falling: 'Marée descendante',
  slack: 'Marée étale',
}

function tideLabel(state: OgTideState): string | null {
  if (!state) return null
  return TIDE_STATE_LABELS[state] ?? null
}

function speciesLabel(key: string | null | undefined): string {
  if (!key) return 'Prise'
  return SPECIES_LABELS[key] ?? key
}

function deptText(dept: string | null | undefined): string | null {
  const key = (dept ?? '').trim()
  if (!key) return null
  const label = DEPARTMENT_LABELS[key] ?? key
  return `${label} (${key})`
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** Date FR « 14 juin 2026 » à partir d'un ISO (edge-safe, sans date-fns/Intl tz). */
function frDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCDate()} ${MONTHS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Durée « 2 h 15 » entre deux ISO (edge-safe). */
function durationLabel(start: string | undefined, end: string | null | undefined): string | null {
  if (!start || !end) return null
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null
  const mins = Math.round((b - a) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

function monthYearFr(stamp: string | undefined): string | null {
  if (!stamp || stamp.length < 7) return null
  const y = Number(stamp.slice(0, 4))
  const m = Number(stamp.slice(5, 7))
  if (!y || !m || m < 1 || m > 12) return null
  return `${MONTHS_FR[m - 1]} ${y}`
}

function numFmt(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// ─── Fragment : pastille « instrument » (label + valeur mono) ─────────────────

function StatChip({
  label,
  value,
  story,
}: {
  label: string
  value: string
  story: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(20,184,166,0.08)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(94,234,212,0.28)',
        borderRadius: '12px',
        padding: story ? '20px 24px' : '16px 20px',
        minWidth: story ? '220px' : '180px',
      }}
    >
      <span
        style={{
          fontSize: story ? '17px' : '15px',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.50)',
          marginBottom: '8px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          ...MONO_STYLE,
          fontSize: story ? '34px' : '28px',
          fontWeight: 700,
          color: WHITE,
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Fragment : pastille « Record perso » (forme + texte, daltonien-safe) ─────

function PersonalBestBadge({ story }: { story: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        alignSelf: 'flex-start',
        background: 'rgba(229,96,79,0.16)',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: CORAL,
        borderRadius: '999px',
        padding: story ? '12px 22px' : '10px 18px',
        marginBottom: story ? '28px' : '20px',
      }}
    >
      {/* Étoile dessinée (pas d'emoji : rendu fiable Satori) */}
      <svg width={story ? 26 : 22} height={story ? 26 : 22} viewBox="0 0 24 24" fill={CORAL}>
        <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01z" />
      </svg>
      <span
        style={{
          fontSize: story ? '22px' : '19px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: SAND50,
        }}
      >
        Record perso
      </span>
    </div>
  )
}

// ─── Layout CATCH ─────────────────────────────────────────────────────────────

function CatchCard({ p, format }: { p: OgCatchPayload; format: OgFormat }) {
  const story = format === 'story'
  const species = speciesLabel(p.species).toUpperCase()
  const size = numFmt(p.size_cm ?? null)
  const weight = numFmt(p.weight_g ?? null)
  const dept = deptText(p.department)
  const place = (p.location_label ?? '').trim() || null
  const date = frDate(p.caught_at)
  const gear = (p.gear_label ?? '').trim() || null

  const cond = p.conditions ?? {}
  const tide = tideLabel(cond.tide_state ?? null)
  const marnage = numFmt(cond.tide_range_m ?? null)
  const wind = numFmt(cond.wind_speed_kmh ?? null)
  const water = numFmt(cond.water_temperature_c ?? null)

  // Stats « instrument » présentes seulement si la donnée existe.
  const stats: Array<{ label: string; value: string }> = []
  if (tide) stats.push({ label: 'Marée', value: tide.replace('Marée ', '') })
  if (marnage) stats.push({ label: 'Marnage', value: `${marnage} m` })
  if (wind) stats.push({ label: 'Vent', value: `${wind} km/h` })
  if (water) stats.push({ label: 'Eau', value: `${water}°C` })

  // Lieu = libellé + département (JAMAIS de coordonnée).
  const locationParts = [place, dept].filter(Boolean)
  const heroSize = story ? 132 : 108

  return (
    <>
      <OgKicker label="Carnet de Pêche · canne du bord" marginBottom={story ? 36 : 24} />

      {p.is_personal_best ? <PersonalBestBadge story={story} /> : null}

      {/* Héro : ESPÈCE · TAILLE cm */}
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: story ? '52px' : '44px',
            fontWeight: 800,
            color: TEAL300,
            letterSpacing: '0.02em',
            marginRight: '20px',
          }}
        >
          {species}
        </span>
        {size ? (
          <span style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ ...MONO_STYLE, fontSize: `${heroSize}px`, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
              {size}
            </span>
            <span style={{ fontSize: story ? '46px' : '38px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginLeft: '10px' }}>
              cm
            </span>
          </span>
        ) : null}
      </div>

      {/* Poids en sous-titre */}
      {weight ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: story ? '36px' : '24px',
            color: 'rgba(255,255,255,0.65)',
            fontSize: story ? '30px' : '24px',
          }}
        >
          <span style={MONO_STYLE}>{weight}</span>
          <span style={{ marginLeft: '8px' }}>g</span>
        </div>
      ) : (
        <div style={{ display: 'flex', height: story ? '24px' : '12px' }} />
      )}

      {/* Rangée de stats instrument */}
      {stats.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: story ? '16px' : '14px', marginBottom: story ? '40px' : '28px' }}>
          {stats.map((s) => (
            <StatChip key={s.label} label={s.label} value={s.value} story={story} />
          ))}
        </div>
      ) : null}

      {/* Spacer */}
      <div style={{ flex: 1, display: 'flex' }} />

      {/* Lieu + date + leurre */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: story ? '32px' : '20px' }}>
        {locationParts.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '999px', background: TEAL }} />
            <span style={{ fontSize: story ? '28px' : '22px', color: 'rgba(255,255,255,0.78)', letterSpacing: '0.02em' }}>
              {locationParts.join(' · ')}
            </span>
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {date ? (
            <span style={{ fontSize: story ? '24px' : '19px', color: 'rgba(255,255,255,0.5)' }}>{date}</span>
          ) : null}
          {gear ? (
            <span style={{ fontSize: story ? '24px' : '19px', color: 'rgba(94,234,212,0.75)' }}>
              {gear}
            </span>
          ) : null}
        </div>
      </div>
    </>
  )
}

// ─── Layout CONDITIONS (« wrapped » descriptif, jamais prédictif) ─────────────

function ConditionsCard({ p, format }: { p: OgConditionsPayload; format: OgFormat }) {
  const story = format === 'story'
  const tendencies = (p.tendencies ?? []).filter((t) => t && t.label).slice(0, 4)
  const period = monthYearFr(p.generatedFor)
  const sample = p.sampleCount ?? 0

  return (
    <>
      <OgKicker label="Carnet de Pêche · mes tendances" marginBottom={story ? 36 : 24} />

      <div
        style={{
          fontSize: story ? '64px' : '56px',
          fontWeight: 800,
          color: WHITE,
          lineHeight: 1.04,
          marginBottom: '12px',
          maxWidth: story ? '900px' : '1000px',
        }}
      >
        Mes conditions gagnantes
      </div>
      <div style={{ display: 'flex', marginBottom: story ? '48px' : '32px' }}>
        <span style={{ fontSize: story ? '26px' : '21px', color: 'rgba(255,255,255,0.55)' }}>
          {sample > 0
            ? `Ce que disent ${sample} de mes prises${period ? ` · ${period}` : ''}`
            : 'Ce que disent mes prises'}
        </span>
      </div>

      {/* Tendances dominantes : libellé + part % (descriptif) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: story ? '22px' : '16px' }}>
        {tendencies.map((t, i) => {
          const pct = t.share != null ? Math.round(Math.max(0, Math.min(1, t.share)) * 100) : null
          return (
            <div
              key={`${t.factor ?? i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(20,184,166,0.07)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(94,234,212,0.22)',
                borderRadius: '14px',
                padding: story ? '24px 28px' : '18px 24px',
              }}
            >
              <span
                style={{
                  fontSize: story ? '32px' : '26px',
                  fontWeight: 600,
                  color: SAND50,
                  letterSpacing: '0.01em',
                }}
              >
                {t.label}
              </span>
              {pct != null ? (
                <span
                  style={{
                    ...MONO_STYLE,
                    fontSize: story ? '36px' : '30px',
                    fontWeight: 800,
                    color: TEAL300,
                  }}
                >
                  {pct}%
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1, display: 'flex' }} />
    </>
  )
}

// ─── Layout OUTING (résumé de sortie, bredouille assumée positive) ────────────

function OutingCard({ p, format }: { p: OgOutingPayload; format: OgFormat }) {
  const story = format === 'story'
  const date = frDate(p.started_at)
  const duration = durationLabel(p.started_at, p.ended_at)
  const dept = deptText(p.department)
  const catchCount = p.catchCount ?? 0
  const blank = p.blank === true || catchCount === 0
  const best = p.bestCatch ?? null
  const bestSize = numFmt(best?.size_cm ?? null)
  const speciesList = (p.species ?? []).map((s) => speciesLabel(s)).slice(0, 6)

  const stats: Array<{ label: string; value: string }> = []
  if (duration) stats.push({ label: 'Durée', value: duration })
  stats.push({ label: 'Prises', value: String(catchCount) })
  if (best && bestSize) {
    stats.push({ label: 'Meilleure', value: `${speciesLabel(best.species)} ${bestSize} cm` })
  }

  return (
    <>
      <OgKicker label="Carnet de Pêche · sortie" marginBottom={story ? 36 : 24} />

      <div
        style={{
          fontSize: story ? '60px' : '52px',
          fontWeight: 800,
          color: WHITE,
          lineHeight: 1.05,
          marginBottom: '12px',
        }}
      >
        {date ? `Sortie du ${date}` : 'Ma sortie'}
      </div>
      {dept ? (
        <div style={{ display: 'flex', marginBottom: story ? '40px' : '28px' }}>
          <span style={{ fontSize: story ? '26px' : '21px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
            {dept}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', height: story ? '24px' : '12px' }} />
      )}

      {blank ? (
        // Bredouille assumée : cadrage positif, pas humiliant.
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(20,184,166,0.07)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(94,234,212,0.22)',
            borderRadius: '16px',
            padding: story ? '36px' : '28px',
            marginBottom: story ? '36px' : '24px',
          }}
        >
          <span style={{ fontSize: story ? '40px' : '32px', fontWeight: 700, color: TEAL300, marginBottom: '12px' }}>
            Bredouille, et alors
          </span>
          <span style={{ fontSize: story ? '26px' : '21px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, maxWidth: story ? '880px' : '980px' }}>
            {duration
              ? `${duration} au bord, l'air iodé et le geste. La prochaine sera la bonne.`
              : "Du temps au bord, l'air iodé et le geste. La prochaine sera la bonne."}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: story ? '16px' : '14px', marginBottom: story ? '40px' : '28px' }}>
          {stats.map((s) => (
            <StatChip key={s.label} label={s.label} value={s.value} story={story} />
          ))}
        </div>
      )}

      {!blank && speciesList.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {speciesList.map((s) => (
            <div
              key={s}
              style={{
                display: 'flex',
                background: 'rgba(20,184,166,0.10)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(94,234,212,0.32)',
                borderRadius: '8px',
                padding: story ? '12px 22px' : '10px 20px',
                fontSize: story ? '22px' : '18px',
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
      ) : null}

      <div style={{ flex: 1, display: 'flex' }} />
    </>
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const card = await fetchCard(slug)
  if (!card || !card.payload) return new Response('Not found', { status: 404 })

  const url = new URL(req.url)
  const format = parseFormat(url.searchParams.get('format'))
  const { width, height } = OG_DIMENSIONS[format]

  const payload = card.payload
  const kind = payload.kind ?? card.kind

  let body
  if (kind === 'catch') {
    body = <CatchCard p={payload as OgCatchPayload} format={format} />
  } else if (kind === 'conditions') {
    body = <ConditionsCard p={payload as OgConditionsPayload} format={format} />
  } else if (kind === 'outing') {
    body = <OutingCard p={payload as OgOutingPayload} format={format} />
  } else {
    return new Response('Not found', { status: 404 })
  }

  return new ImageResponse(<OgFrame format={format}>{body}</OgFrame>, { width, height })
}
