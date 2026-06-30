import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowRight, Award, Fish, MapPin, TrendingUp, Wind } from 'lucide-react'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'
import { SPECIES_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import type {
  CatchCardPayload,
  ConditionsCardPayload,
  GearboxCardPayload,
  OutingCardPayload,
  RecapCardPayload,
  RecordsCardPayload,
} from '@/app/actions/share'

// Page PUBLIQUE (groupe marketing) : accessible sans login (le middleware
// n'inclut pas /c dans APP_ROUTES). On lit la carte via le client ANON
// (RLS shared_cards : SELECT public). Aucune coordonnée n'existe dans le payload
// (invariant anti spot-burning, sprint 38). Revalidée régulièrement, 404 propre
// si la carte a été révoquée (suppression owner).

export const revalidate = 300

const BASE_URL = 'https://www.carnet-de-peche.com'

type SharedCardRow = {
  slug: string
  kind: string
  payload: unknown
}

type AnyPayload =
  | CatchCardPayload
  | ConditionsCardPayload
  | OutingCardPayload
  | GearboxCardPayload
  | RecapCardPayload
  | RecordsCardPayload

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function fetchCard(slug: string): Promise<SharedCardRow | null> {
  const supabase = anonClient()
  const { data } = await supabase
    .from('shared_cards')
    .select('slug, kind, payload')
    .eq('slug', slug)
    .maybeSingle()
  return (data as SharedCardRow | null) ?? null
}

// ─── Libellés (geom-free, jamais de point) ─────────────────────────────────────

const TIDE_LABELS: Record<string, string> = {
  rising: 'Marée montante',
  falling: 'Marée descendante',
  slack: 'Étale',
}

function speciesLabel(key: string | null): string {
  if (!key) return 'Prise'
  return SPECIES_LABELS[key] ?? key
}

// @pseudo du partageur (présent sur tous les payloads sprint 47, optionnel sur
// l'historique). Borné et préfixé d'un seul @.
function handleLabel(username: string | null | undefined): string | null {
  if (!username) return null
  const clean = username.trim().replace(/^@+/, '')
  if (!clean) return null
  return `@${clean.slice(0, 40)}`
}

function deptLabel(dept: string | null): string | null {
  // spots.department est un char(3) paddé d'espaces ('17 ') : on trime avant le
  // lookup, sinon DEPARTMENT_LABELS['17 '] est undefined et l'affichage retombe
  // sur le code paddé (« dans 17 . »). Corrige aussi les cartes déjà en base.
  const key = dept?.trim()
  if (!key) return null
  return DEPARTMENT_LABELS[key] ?? key
}

function monthLabel(yyyymm: string): string {
  // 'YYYY-MM' → « juin 2026 »
  const [y, m] = yyyymm.split('-').map(Number)
  if (!y || !m) return yyyymm
  const s = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date(Date.UTC(y, m - 1, 1)))
  return s
}

function dateLabel(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    }).format(new Date(iso))
  } catch {
    return null
  }
}

// ─── Titres / descriptions par type (pour la page ET les meta OG) ──────────────

function cardHeadline(kind: string, payload: AnyPayload): string {
  if (kind === 'catch') {
    const p = payload as CatchCardPayload
    const parts = [
      speciesLabel(p.species),
      p.size_cm != null ? `${p.size_cm} cm` : null,
    ].filter(Boolean)
    return parts.join(' · ') || 'Une belle prise'
  }
  if (kind === 'conditions') {
    return 'Mes conditions gagnantes'
  }
  if (kind === 'outing') {
    const p = payload as OutingCardPayload
    return `Sortie : ${p.catchCount} prise${p.catchCount > 1 ? 's' : ''}`
  }
  if (kind === 'gearbox') {
    return 'Ma boîte à pêche'
  }
  if (kind === 'recap') {
    const p = payload as RecapCardPayload
    return `Mon année de pêche ${p.period}`
  }
  if (kind === 'records') {
    return 'Mes records'
  }
  return 'Carnet de Pêche'
}

function cardDescription(kind: string, payload: AnyPayload): string {
  if (kind === 'catch') {
    const p = payload as CatchCardPayload
    const where = deptLabel(p.department)
    return where
      ? `Une prise loguée sur Carnet de Pêche dans ${where}. Logue tes prises, comprends tes patterns.`
      : 'Une prise loguée sur Carnet de Pêche. Logue tes prises, comprends tes patterns.'
  }
  if (kind === 'conditions') {
    const p = payload as ConditionsCardPayload
    return `Les moments et conditions où je sors le plus, sur ${p.sampleCount} prises loguées. Crée ton carnet et découvre les tiennes.`
  }
  if (kind === 'outing') {
    const p = payload as OutingCardPayload
    const where = deptLabel(p.department)
    return where
      ? `Ma sortie de pêche dans ${where}, loguée sur Carnet de Pêche.`
      : 'Ma sortie de pêche loguée sur Carnet de Pêche.'
  }
  if (kind === 'gearbox') {
    const p = payload as GearboxCardPayload
    const n = p.topGear?.length ?? 0
    return n > 0
      ? `Les ${n} leurre${n > 1 ? 's' : ''} qui pêchent le plus dans ma boîte, sur ${p.totalCatchesWithGear} prise${p.totalCatchesWithGear > 1 ? 's' : ''} loguée${p.totalCatchesWithGear > 1 ? 's' : ''}. Crée ton carnet et suis le tien.`
      : 'Les leurres qui pêchent le plus dans ma boîte, sur Carnet de Pêche.'
  }
  if (kind === 'recap') {
    const p = payload as RecapCardPayload
    return `Mon bilan de pêche ${p.period} : ${p.totalCount} prise${p.totalCount > 1 ? 's' : ''}, ${p.speciesCount} espèce${p.speciesCount > 1 ? 's' : ''}. Crée ton carnet, fais le tien.`
  }
  if (kind === 'records') {
    const p = payload as RecordsCardPayload
    const n = p.records.length
    return n > 0
      ? `Mes plus beaux poissons par espèce, sur ${n} record${n > 1 ? 's' : ''} logué${n > 1 ? 's' : ''}. Crée ton carnet et suis les tiens.`
      : 'Mes plus beaux poissons par espèce, sur Carnet de Pêche.'
  }
  return 'Le carnet de pêche numérique des pêcheurs du bord.'
}

// ─── generateMetadata : preview riche iMessage / Discord / X / Facebook ─────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await fetchCard(slug)
  // D4 (sprint 47) : les cartes de partage ne sont PAS indexées (contenu perso,
  // éphémère, révocable). On garde une preview sociale riche (OG/Twitter) mais on
  // sort ces URLs de l'index moteur.
  const noindex = { index: false, follow: false } as const
  if (!row) {
    return { title: 'Carte introuvable · Carnet de Pêche', robots: noindex }
  }
  const payload = row.payload as AnyPayload
  const headline = cardHeadline(row.kind, payload)
  const description = cardDescription(row.kind, payload)
  const url = `${BASE_URL}/c/${slug}`
  const imageUrl = `${BASE_URL}/og/card/${slug}`

  return {
    title: `${headline} · Carnet de Pêche`,
    description,
    robots: noindex,
    alternates: { canonical: url },
    openGraph: {
      title: headline,
      description,
      url,
      type: 'article',
      locale: 'fr_FR',
      siteName: 'Carnet de Pêche',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: headline }],
    },
    twitter: {
      card: 'summary_large_image',
      title: headline,
      description,
      images: [imageUrl],
    },
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default async function SharedCardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const row = await fetchCard(slug)
  if (!row) notFound()

  const payload = row.payload as AnyPayload
  const headline = cardHeadline(row.kind, payload)
  const handle = handleLabel(payload.username)
  // Photo de prise partagée (geom-free, EXIF strippé serveur) : présente uniquement
  // si la prise en a une et que l'utilisateur a accepté de l'inclure.
  const photoUrl =
    row.kind === 'catch' ? (payload as CatchCardPayload).photo_url ?? null : null

  return (
    <div className="bg-sand-50">
      <div className="mx-auto max-w-[640px] px-4 py-10 sm:py-14">
        <p className="text-center font-mono text-[11.5px] font-medium uppercase tracking-[0.12em] text-teal-700">
          Carnet de Pêche
        </p>
        <h1 className="mt-2 text-center font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
          {headline}
        </h1>
        {handle && (
          <p className="mt-1.5 text-center font-mono text-[13px] text-ink-500">
            {handle}
          </p>
        )}

        {/* Photo de la prise (quand partagée) : affichée au-dessus de la carte
            générée. Servie depuis le bucket public share-photos (EXIF/GPS déjà
            retirés côté serveur). */}
        {photoUrl && (
          <div className="mt-6 overflow-hidden rounded-[18px] border border-sand-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={`Photo de la prise : ${headline}`}
              className="block h-auto max-h-[560px] w-full object-cover"
            />
          </div>
        )}

        {/* La carte image (générée server-side, geom-free). On garde le ratio
            1200×630 pour le rendu inline ; ?format=story sert au Web Share mobile. */}
        <div className="mt-6 overflow-hidden rounded-[18px] border border-sand-200 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/og/card/${slug}`}
            alt={headline}
            width={1200}
            height={630}
            className="block h-auto w-full"
          />
        </div>

        {/* Récap HTML lisible (accessible, sans dépendre de l'image). */}
        <div className="mt-6 rounded-[18px] border border-sand-200 bg-white p-5 sm:p-6">
          <CardRecap kind={row.kind} payload={payload} />
        </div>

        {/* CTA fort de conversion. */}
        <div className="mt-7 text-center">
          <Link
            href="/auth/register"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-600 px-7 text-[16px] font-bold text-white transition-colors hover:bg-teal-700"
          >
            Crée ton carnet en 30 s
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <p className="mt-3 text-[13px] text-ink-500">
            Gratuit et illimité. Logue tes prises, comprends quand et où ça mord pour toi.
          </p>
        </div>
      </div>

      <MarketingCTA
        title="Le carnet qui apprend de tes prises"
        subtitle="Logue tes sorties, suis tes patterns, partage sans jamais cramer ton spot. Gratuit, illimité."
      />
    </div>
  )
}

// ─── Récap par type ──────────────────────────────────────────────────────────

function CardRecap({ kind, payload }: { kind: string; payload: AnyPayload }) {
  if (kind === 'catch') return <CatchRecap payload={payload as CatchCardPayload} />
  if (kind === 'conditions')
    return <ConditionsRecap payload={payload as ConditionsCardPayload} />
  if (kind === 'outing')
    return <OutingRecap payload={payload as OutingCardPayload} />
  if (kind === 'gearbox')
    return <GearboxRecap payload={payload as GearboxCardPayload} />
  if (kind === 'recap')
    return <RecapRecap payload={payload as RecapCardPayload} />
  if (kind === 'records')
    return <RecordsRecap payload={payload as RecordsCardPayload} />
  return null
}

function RecapRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-sand-100 py-2.5 last:border-0">
      <span className="flex items-center gap-2 text-[13px] text-ink-500">
        {icon}
        {label}
      </span>
      <span className="font-mono text-[13.5px] font-medium text-navy-900 tabular-nums">
        {value}
      </span>
    </div>
  )
}

function CatchRecap({ payload: p }: { payload: CatchCardPayload }) {
  const where = [p.location_label, deptLabel(p.department)]
    .filter(Boolean)
    .join(' · ')
  const tide = p.conditions?.tide_state
    ? TIDE_LABELS[p.conditions.tide_state] ?? p.conditions.tide_state
    : null
  return (
    <div>
      {p.is_personal_best && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-[12px] font-semibold text-navy-900">
          <Award size={13} aria-hidden="true" /> Record perso
        </div>
      )}
      <div className="flex flex-col">
        <RecapRow
          icon={<Fish size={14} className="text-teal-600" aria-hidden="true" />}
          label="Espèce"
          value={speciesLabel(p.species)}
        />
        {p.size_cm != null && (
          <RecapRow icon={<span aria-hidden="true">📏</span>} label="Taille" value={`${p.size_cm} cm`} />
        )}
        {p.weight_g != null && (
          <RecapRow
            icon={<span aria-hidden="true">⚖️</span>}
            label="Poids"
            value={`${(p.weight_g / 1000).toFixed(2).replace('.', ',')} kg`}
          />
        )}
        {where && (
          <RecapRow
            icon={<MapPin size={14} className="text-ink-400" aria-hidden="true" />}
            label="Secteur"
            value={where}
          />
        )}
        {dateLabel(p.caught_at) && (
          <RecapRow icon={<span aria-hidden="true">🗓️</span>} label="Date" value={dateLabel(p.caught_at)!} />
        )}
        {tide && (
          <RecapRow
            icon={<Wind size={14} className="text-ink-400" aria-hidden="true" />}
            label="Marée"
            value={tide}
          />
        )}
        {p.conditions?.tide_range_m != null && (
          <RecapRow
            icon={<span aria-hidden="true">🌊</span>}
            label="Marnage"
            value={`${p.conditions.tide_range_m.toFixed(1).replace('.', ',')} m`}
          />
        )}
        {p.conditions?.wind_speed_kmh != null && (
          <RecapRow
            icon={<Wind size={14} className="text-ink-400" aria-hidden="true" />}
            label="Vent"
            value={`${Math.round(p.conditions.wind_speed_kmh)} km/h`}
          />
        )}
        {p.conditions?.water_temperature_c != null && (
          <RecapRow
            icon={<span aria-hidden="true">🌡️</span>}
            label="Temp. eau"
            value={`${p.conditions.water_temperature_c.toFixed(1).replace('.', ',')} °C`}
          />
        )}
        {p.gear_label && (
          <RecapRow icon={<span aria-hidden="true">🎣</span>} label="Leurre" value={p.gear_label} />
        )}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
        Aucune coordonnée n&rsquo;est partagée : la carte montre le secteur, jamais le point exact.
      </p>
    </div>
  )
}

function ConditionsRecap({ payload: p }: { payload: ConditionsCardPayload }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-teal-700">
        <TrendingUp size={15} aria-hidden="true" /> Sur {p.sampleCount} prises loguées ({monthLabel(p.generatedFor)})
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {p.tendencies.slice(0, 4).map((t) => (
          <li
            key={t.factor}
            className="flex items-center justify-between gap-3 rounded-[12px] bg-sand-50 px-3.5 py-2.5"
          >
            <span className="text-[14px] text-navy-900">{t.label}</span>
            <span className="font-mono text-[14px] font-bold text-teal-700 tabular-nums">
              {Math.round(t.share * 100)} %
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
        Ces tendances décrivent où et quand tombent les prises de ce pêcheur. Aucune comparaison, aucun classement.
      </p>
    </div>
  )
}

function OutingRecap({ payload: p }: { payload: OutingCardPayload }) {
  const where = deptLabel(p.department)
  const best = p.bestCatch
  return (
    <div className="flex flex-col">
      <RecapRow
        icon={<Fish size={14} className="text-teal-600" aria-hidden="true" />}
        label="Prises"
        value={String(p.catchCount)}
      />
      {best && best.size_cm != null && (
        <RecapRow
          icon={<Award size={14} className="text-gold-500" aria-hidden="true" />}
          label="Meilleure prise"
          value={`${speciesLabel(best.species)} · ${best.size_cm} cm`}
        />
      )}
      {p.species.length > 0 && (
        <RecapRow
          icon={<span aria-hidden="true">🐟</span>}
          label="Espèces"
          value={p.species.map((s) => speciesLabel(s)).join(', ')}
        />
      )}
      {where && (
        <RecapRow
          icon={<MapPin size={14} className="text-ink-400" aria-hidden="true" />}
          label="Secteur"
          value={where}
        />
      )}
      {dateLabel(p.started_at) && (
        <RecapRow icon={<span aria-hidden="true">🗓️</span>} label="Date" value={dateLabel(p.started_at)!} />
      )}
    </div>
  )
}

function GearboxRecap({ payload: p }: { payload: GearboxCardPayload }) {
  const gear = (p.topGear ?? []).filter((g) => g.label?.trim()).slice(0, 8)
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-teal-700">
        <span aria-hidden="true">🎣</span> Mes leurres qui pêchent, sur{' '}
        {p.totalCatchesWithGear} prise{p.totalCatchesWithGear > 1 ? 's' : ''} loguée
        {p.totalCatchesWithGear > 1 ? 's' : ''}
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {gear.map((g, i) => (
          <li
            key={`${g.label}-${i}`}
            className="flex items-center justify-between gap-3 rounded-[12px] bg-sand-50 px-3.5 py-2.5"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-medium text-navy-900">
                {g.label}
              </span>
              {g.topSpecies && (
                <span className="text-[12.5px] text-ink-400">
                  surtout {speciesLabel(g.topSpecies)}
                </span>
              )}
            </span>
            <span className="shrink-0 font-mono text-[14px] font-bold text-teal-700 tabular-nums">
              {g.catchCount} prise{g.catchCount > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
        Le nombre de prises par leurre, jamais un classement ni un taux. Aucune
        coordonnée, aucun spot, aucune photo n&rsquo;est partagé.
      </p>
    </div>
  )
}

// ─── kind 'recap' (Wrapped : mon année de pêche, sprint 47) ────────────────────
// Bilan DESCRIPTIF de l'année, geom-free : compteurs + plus beau poisson. Aucun
// classement inter-pêcheurs, aucun spot.
const MONTH_STAMP_RE = /^\d{4}-\d{2}$/

function topMonthLabel(raw: string | null): string | null {
  if (!raw) return null
  return MONTH_STAMP_RE.test(raw) ? monthLabel(raw) : raw
}

function RecapRecap({ payload: p }: { payload: RecapCardPayload }) {
  const month = topMonthLabel(p.topMonth)
  return (
    <div className="flex flex-col">
      <RecapRow
        icon={<Fish size={14} className="text-teal-600" aria-hidden="true" />}
        label="Prises loguées"
        value={String(p.totalCount)}
      />
      <RecapRow
        icon={<span aria-hidden="true">🐟</span>}
        label="Espèces"
        value={String(p.speciesCount)}
      />
      {p.biggest && p.biggest.size_cm != null && (
        <RecapRow
          icon={<Award size={14} className="text-gold-500" aria-hidden="true" />}
          label="Plus beau poisson"
          value={`${speciesLabel(p.biggest.species)} · ${p.biggest.size_cm} cm`}
        />
      )}
      {p.topSpecies && (
        <RecapRow
          icon={<span aria-hidden="true">🎣</span>}
          label="Espèce phare"
          value={speciesLabel(p.topSpecies)}
        />
      )}
      {month && (
        <RecapRow
          icon={<span aria-hidden="true">🗓️</span>}
          label="Meilleur mois"
          value={month}
        />
      )}
      {p.releasedRate != null && (
        <RecapRow
          icon={<span aria-hidden="true">🌊</span>}
          label="Prises relâchées"
          value={`${Math.round(p.releasedRate * 100)} %`}
        />
      )}
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
        Le bilan d&rsquo;une année de pêche, sans aucune coordonnée ni spot. Aucune
        comparaison, aucun classement.
      </p>
    </div>
  )
}

// ─── kind 'records' (mes records par espèce, sprint 47) ────────────────────────
// Le plus beau poisson par espèce, DESCRIPTIF et geom-free. Zéro classement
// inter-pêcheurs (anti-leaderboard).
function RecordsRecap({ payload: p }: { payload: RecordsCardPayload }) {
  const records = (p.records ?? []).slice(0, 8)
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-teal-700">
        <Award size={15} aria-hidden="true" /> Mes plus beaux poissons par espèce
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {records.map((r, i) => (
          <li
            key={`${r.species}-${i}`}
            className="flex items-center justify-between gap-3 rounded-[12px] bg-sand-50 px-3.5 py-2.5"
          >
            <span className="text-[14px] text-navy-900">{speciesLabel(r.species)}</span>
            <span className="flex items-baseline gap-2 text-right">
              <span className="font-mono text-[14px] font-bold text-teal-700 tabular-nums">
                {r.size_cm} cm
              </span>
              {r.weight_g != null && (
                <span className="font-mono text-[12px] text-ink-400 tabular-nums">
                  {(r.weight_g / 1000).toFixed(2).replace('.', ',')} kg
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
        Le plus beau poisson par espèce de ce pêcheur. Aucune comparaison avec les
        autres, aucune coordonnée, aucun spot.
      </p>
    </div>
  )
}
