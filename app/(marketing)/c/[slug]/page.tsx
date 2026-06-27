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
  OutingCardPayload,
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

type AnyPayload = CatchCardPayload | ConditionsCardPayload | OutingCardPayload

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

function deptLabel(dept: string | null): string | null {
  if (!dept) return null
  return DEPARTMENT_LABELS[dept] ?? dept
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
  if (!row) {
    return { title: 'Carte introuvable · Carnet de Pêche' }
  }
  const payload = row.payload as AnyPayload
  const headline = cardHeadline(row.kind, payload)
  const description = cardDescription(row.kind, payload)
  const url = `${BASE_URL}/c/${slug}`
  const imageUrl = `${BASE_URL}/og/card/${slug}`

  return {
    title: `${headline} · Carnet de Pêche`,
    description,
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

  return (
    <div className="bg-sand-50">
      <div className="mx-auto max-w-[640px] px-4 py-10 sm:py-14">
        <p className="text-center font-mono text-[11.5px] font-medium uppercase tracking-[0.12em] text-teal-700">
          Carnet de Pêche
        </p>
        <h1 className="mt-2 text-center font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
          {headline}
        </h1>

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
