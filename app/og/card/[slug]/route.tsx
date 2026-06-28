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
  OG_THEMES,
  OgFrame,
  OgKicker,
  parseFormat,
  parseTheme,
  type OgFormat,
  type OgTheme,
} from '@/lib/og/template'
import type {
  OgCardPayload,
  OgCatchPayload,
  OgConditionsPayload,
  OgOutingPayload,
  OgTideState,
} from '@/lib/og/types'

export const runtime = 'edge'

// ─── Payload gearbox (miroir local edge-safe) ─────────────────────────────────
// Même découplage volontaire que lib/og/types.ts : la route edge ne lit que
// shared_cards par slug et narrowe sur payload.kind. Le payload gearbox est
// PUREMENT TEXTUEL (libellés + comptes + espèces), AUCUNE clé géo, AUCUNE photo.
type OgGearboxTopGear = {
  label?: string | null
  kind?: string | null
  catchCount?: number | null
  topSpecies?: string | null
}

type OgGearboxPayload = {
  kind: 'gearbox'
  topGear?: OgGearboxTopGear[]
  totalCatchesWithGear?: number
}

// ─── Payload recap « Wrapped » (miroir local edge-safe) ───────────────────────
// Bilan descriptif d'une période (façon Spotify Wrapped). PUREMENT TEXTUEL :
// comptes + espèce/mois dominants + plus grosse prise. AUCUNE clé géo, AUCUNE photo.
type OgRecapPayload = {
  kind: 'recap'
  period?: string | null
  totalCount?: number | null
  speciesCount?: number | null
  biggest?: { species?: string | null; size_cm?: number | null } | null
  topSpecies?: string | null
  topMonth?: string | null
  releasedRate?: number | null
}

// ─── Payload records « Mes records » (miroir local edge-safe) ─────────────────
// Liste DESCRIPTIVE des meilleures prises perso par taille (zéro classement
// inter-pêcheurs). PUREMENT TEXTUEL : espèce + taille + poids. Aucune clé géo.
type OgRecordEntry = {
  species?: string | null
  size_cm?: number | null
  weight_g?: number | null
}

type OgRecordsPayload = {
  kind: 'records'
  records?: OgRecordEntry[]
}

// ─── Handle du partageur (tous kinds) ─────────────────────────────────────────
// Le @pseudo arrive dans le payload (champ `username` ajouté côté WS A/D). On le
// lit de façon défensive (le JSON vient de la base, peut être absent/null).
function payloadUsername(payload: { username?: string | null } | null | undefined): string | null {
  const raw = payload?.username
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

// ─── Lecture de la carte (edge → anon, UNIQUEMENT shared_cards) ───────────────
// La route edge ne lit QUE shared_cards par slug, en client anon (RLS select public).
// Aucune lecture de catches_for_viewer ni appel server-only ici (garde-fou n°1).

type SharedCardRow = {
  payload: OgCardPayload | OgGearboxPayload | OgRecapPayload | OgRecordsPayload
  kind: 'catch' | 'conditions' | 'outing' | 'gearbox' | 'recap' | 'records'
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
  // Photo nettoyée (EXIF strippé serveur) : URL PUBLIQUE bucket share-photos.
  // next/og rend les images distantes. Absente/null → rendu texte inchangé.
  const photoUrl = (() => {
    const raw = (p as { photo_url?: string | null }).photo_url
    return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null
  })()

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
      <OgKicker label="Carnet de Pêche · canne du bord" marginBottom={photoUrl ? (story ? 24 : 16) : story ? 36 : 24} />

      {p.is_personal_best ? <PersonalBestBadge story={story} /> : null}

      {/* Photo du poisson (opt-in, EXIF strippé serveur, URL publique). En HERO. */}
      {photoUrl ? (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: story ? '760px' : '300px',
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: story ? '32px' : '20px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(94,234,212,0.28)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt=""
            width={story ? 920 : 1056}
            height={story ? 760 : 300}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : null}

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

// ─── Layout GEARBOX (boîte à matériel : les leurres qui pêchent) ──────────────
// PUREMENT TEXTUEL : libellés + comptes + espèces. Aucune photo de leurre (l'edge
// ne peut pas signer une URL de bucket privé, et le payload n'en porte aucune).

function GearboxCard({ p, format }: { p: OgGearboxPayload; format: OgFormat }) {
  const story = format === 'story'
  const gear = (p.topGear ?? [])
    .filter((g) => g && (g.label ?? '').trim())
    .slice(0, story ? 6 : 5)
  const total = p.totalCatchesWithGear ?? 0

  return (
    <>
      <OgKicker label="Carnet de Pêche · ma boîte" marginBottom={story ? 36 : 24} />

      <div
        style={{
          fontSize: story ? '60px' : '52px',
          fontWeight: 800,
          color: WHITE,
          lineHeight: 1.05,
          marginBottom: '12px',
        }}
      >
        Ma boîte à pêche
      </div>
      <div style={{ display: 'flex', marginBottom: story ? '44px' : '30px' }}>
        <span style={{ fontSize: story ? '26px' : '21px', color: 'rgba(255,255,255,0.55)' }}>
          {total > 0
            ? `Les leurres qui pêchent, sur ${total} prise${total > 1 ? 's' : ''} loguée${total > 1 ? 's' : ''}`
            : 'Les leurres qui pêchent'}
        </span>
      </div>

      {/* Liste des leurres : libellé + nombre de prises + espèce dominante. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: story ? '18px' : '14px' }}>
        {gear.map((g, i) => {
          const label = (g.label ?? '').trim()
          const count = g.catchCount ?? 0
          const sp = g.topSpecies ? speciesLabel(g.topSpecies) : null
          return (
            <div
              key={`${label}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                background: 'rgba(20,184,166,0.07)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(94,234,212,0.22)',
                borderRadius: '14px',
                padding: story ? '22px 28px' : '16px 24px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span
                  style={{
                    fontSize: story ? '32px' : '26px',
                    fontWeight: 700,
                    color: SAND50,
                    letterSpacing: '0.01em',
                  }}
                >
                  {label}
                </span>
                {sp ? (
                  <span style={{ fontSize: story ? '21px' : '17px', color: 'rgba(94,234,212,0.75)', marginTop: '6px' }}>
                    surtout {sp}
                  </span>
                ) : null}
              </div>
              <span style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ ...MONO_STYLE, fontSize: story ? '44px' : '36px', fontWeight: 800, color: TEAL300, lineHeight: 1 }}>
                  {count}
                </span>
                <span style={{ fontSize: story ? '22px' : '18px', color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>
                  {count > 1 ? 'prises' : 'prise'}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1, display: 'flex' }} />
    </>
  )
}

// ─── Layout RECAP (« Wrapped » : bilan descriptif d'une période) ──────────────
// Gros chiffres façon Spotify Wrapped, DESCRIPTIF (zéro classement, zéro prédictif).
// PUREMENT TEXTUEL : comptes + espèce/mois dominants + plus grosse prise.

function BigStat({
  label,
  value,
  unit,
  story,
}: {
  label: string
  value: string
  unit?: string | null
  story: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(20,184,166,0.07)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(94,234,212,0.22)',
        borderRadius: '16px',
        padding: story ? '26px 30px' : '20px 26px',
        minWidth: story ? '280px' : '230px',
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: story ? '18px' : '16px',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.50)',
          marginBottom: '10px',
        }}
      >
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ ...MONO_STYLE, fontSize: story ? '64px' : '54px', fontWeight: 800, color: TEAL300, lineHeight: 1 }}>
          {value}
        </span>
        {unit ? (
          <span style={{ fontSize: story ? '26px' : '22px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginLeft: '10px' }}>
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function RecapCard({ p, format }: { p: OgRecapPayload; format: OgFormat }) {
  const story = format === 'story'
  const period = (p.period ?? '').trim() || null
  const total = p.totalCount ?? 0
  const speciesCount = p.speciesCount ?? 0
  const biggestSize = numFmt(p.biggest?.size_cm ?? null)
  const biggestSpecies = p.biggest?.species ? speciesLabel(p.biggest.species) : null
  const topSpecies = p.topSpecies ? speciesLabel(p.topSpecies) : null
  // topMonth = libellé texte (« juin 2026 » ou « juin »). Si c'est un stamp
  // 'YYYY-MM', on l'embellit ; sinon on garde le texte tel quel.
  const rawMonth = (p.topMonth ?? '').trim() || null
  const topMonth = monthYearFr(rawMonth ?? undefined) ?? rawMonth
  const released =
    p.releasedRate != null && !Number.isNaN(p.releasedRate)
      ? Math.round(Math.max(0, Math.min(1, p.releasedRate)) * 100)
      : null

  return (
    <>
      <OgKicker label="Carnet de Pêche · mon bilan" marginBottom={story ? 32 : 22} />

      <div
        style={{
          fontSize: story ? '62px' : '54px',
          fontWeight: 800,
          color: WHITE,
          lineHeight: 1.04,
          marginBottom: '10px',
        }}
      >
        Mon année de pêche
      </div>
      <div style={{ display: 'flex', marginBottom: story ? '44px' : '30px' }}>
        <span style={{ fontSize: story ? '26px' : '21px', color: 'rgba(255,255,255,0.55)' }}>
          {period ? `Ce que dit ${period}` : 'Ce que dit mon carnet'}
        </span>
      </div>

      {/* Rangée 1 : prises + espèces */}
      <div style={{ display: 'flex', gap: story ? '20px' : '16px', marginBottom: story ? '20px' : '16px' }}>
        <BigStat label="Prises loguées" value={String(total)} story={story} />
        <BigStat label="Espèces" value={String(speciesCount)} story={story} />
      </div>

      {/* Rangée 2 : plus grosse prise (si dispo) + relâché (si dispo) */}
      {(biggestSize || released != null) ? (
        <div style={{ display: 'flex', gap: story ? '20px' : '16px', marginBottom: story ? '32px' : '22px' }}>
          {biggestSize ? (
            <BigStat
              label={biggestSpecies ? `Plus belle · ${biggestSpecies}` : 'Plus belle'}
              value={biggestSize}
              unit="cm"
              story={story}
            />
          ) : null}
          {released != null ? (
            <BigStat label="Relâchées" value={String(released)} unit="%" story={story} />
          ) : null}
        </div>
      ) : null}

      {/* Faits marquants : espèce + mois dominants (texte) */}
      {(topSpecies || topMonth) ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {topSpecies ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(20,184,166,0.10)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(94,234,212,0.32)',
                borderRadius: '10px',
                padding: story ? '14px 24px' : '12px 20px',
              }}
            >
              <span style={{ fontSize: story ? '20px' : '17px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Espèce reine
              </span>
              <span style={{ fontSize: story ? '24px' : '20px', fontWeight: 700, color: TEAL300 }}>{topSpecies}</span>
            </div>
          ) : null}
          {topMonth ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(20,184,166,0.10)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(94,234,212,0.32)',
                borderRadius: '10px',
                padding: story ? '14px 24px' : '12px 20px',
              }}
            >
              <span style={{ fontSize: story ? '20px' : '17px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Meilleur mois
              </span>
              <span style={{ fontSize: story ? '24px' : '20px', fontWeight: 700, color: SAND50 }}>{topMonth}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ flex: 1, display: 'flex' }} />
    </>
  )
}

// ─── Layout RECORDS (« Mes records » : liste perso par taille, anti-leaderboard) ─
// Liste DESCRIPTIVE des meilleures prises perso (façon « segments »). Zéro
// classement inter-pêcheurs. PUREMENT TEXTUEL : espèce + taille + poids.

function RecordsCard({ p, format }: { p: OgRecordsPayload; format: OgFormat }) {
  const story = format === 'story'
  const records = (p.records ?? [])
    .filter((r) => r && (r.species ?? '').trim() && r.size_cm != null)
    .slice(0, story ? 8 : 6)

  return (
    <>
      <OgKicker label="Carnet de Pêche · mes records" marginBottom={story ? 32 : 22} />

      <div
        style={{
          fontSize: story ? '62px' : '54px',
          fontWeight: 800,
          color: WHITE,
          lineHeight: 1.04,
          marginBottom: '10px',
        }}
      >
        Mes records perso
      </div>
      <div style={{ display: 'flex', marginBottom: story ? '40px' : '28px' }}>
        <span style={{ fontSize: story ? '26px' : '21px', color: 'rgba(255,255,255,0.55)' }}>
          Mes plus belles prises, espèce par espèce
        </span>
      </div>

      {/* Liste « segments » : espèce — taille cm (+ poids si dispo) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: story ? '14px' : '11px' }}>
        {records.map((r, i) => {
          const sp = speciesLabel(r.species)
          const size = numFmt(r.size_cm ?? null)
          const weight = numFmt(r.weight_g ?? null)
          return (
            <div
              key={`${sp}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                background: 'rgba(20,184,166,0.07)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(94,234,212,0.22)',
                borderRadius: '12px',
                padding: story ? '18px 26px' : '14px 22px',
              }}
            >
              <span
                style={{
                  fontSize: story ? '30px' : '25px',
                  fontWeight: 700,
                  color: SAND50,
                  letterSpacing: '0.01em',
                }}
              >
                {sp}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                {weight ? (
                  <span style={{ fontSize: story ? '20px' : '17px', color: 'rgba(255,255,255,0.5)' }}>
                    <span style={MONO_STYLE}>{weight}</span> g
                  </span>
                ) : null}
                <span style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ ...MONO_STYLE, fontSize: story ? '40px' : '34px', fontWeight: 800, color: TEAL300, lineHeight: 1 }}>
                    {size}
                  </span>
                  <span style={{ fontSize: story ? '22px' : '18px', color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>cm</span>
                </span>
              </span>
            </div>
          )
        })}
      </div>

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
  const themeName = parseTheme(url.searchParams.get('theme'))
  const theme: OgTheme = OG_THEMES[themeName]
  const { width, height } = OG_DIMENSIONS[format]

  const payload = card.payload
  const kind = payload.kind ?? card.kind
  // Handle du partageur (tous kinds) : affiché en footer « via @username ».
  const username = payloadUsername(payload as { username?: string | null })

  let body
  if (kind === 'catch') {
    body = <CatchCard p={payload as OgCatchPayload} format={format} />
  } else if (kind === 'conditions') {
    body = <ConditionsCard p={payload as OgConditionsPayload} format={format} />
  } else if (kind === 'outing') {
    body = <OutingCard p={payload as OgOutingPayload} format={format} />
  } else if (kind === 'gearbox') {
    body = <GearboxCard p={payload as OgGearboxPayload} format={format} />
  } else if (kind === 'recap') {
    body = <RecapCard p={payload as OgRecapPayload} format={format} />
  } else if (kind === 'records') {
    body = <RecordsCard p={payload as OgRecordsPayload} format={format} />
  } else {
    return new Response('Not found', { status: 404 })
  }

  return new ImageResponse(
    <OgFrame format={format} theme={theme} username={username}>
      {body}
    </OgFrame>,
    { width, height },
  )
}
