import { Check, Plus } from 'lucide-react'
import { ScrollReveal } from '@/components/ui-v2/scroll-reveal'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { AnimatedCounter } from '@/components/ui-v2/animated-counter'
import { Bathy } from '@/components/ui-v2/bathy'
import { HeroPrimaryCta } from '@/components/marketing/HeroPrimaryCta'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CARNET_SPECIES_OPTIONS } from '@/lib/seo/programmatic'
import { trendLabel } from '@/lib/conditions/tide'
import type {
  HomeData,
  HomeCounts,
  HeroSnapshot,
  HomeActivity,
  HomeTier,
  MedMapView,
} from '@/lib/marketing/home-data'
import type { SpotMarker } from '@/lib/map/utils'
import { HomeMapSection } from './HomeMapSection'
import { TrackedCta } from './TrackedCta'
import { MedMapBackdrop } from './MedMapBackdrop'

// Sections « storytelling » de la home (sprint 34, WS-5a) — SERVER component (SSR
// pour le SEO) ; les `ScrollReveal`/`AnimatedCounter` sont des îlots client qui
// rendent le contenu visible sans JS. Données 100 % réelles, honnêtes.

const QUALITY_LABEL: Record<string, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très bonne',
  exceptionnelle: 'Exceptionnelle',
}

function fmtMeters(m: number | null): string {
  return m == null ? '—' : `${m.toFixed(1).replace('.', ',')} m`
}

function SecNum({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-teal-700">
      {children}
    </p>
  )
}

export function HomeSections({
  data,
  mapSpots,
  medMap,
}: {
  data: HomeData
  mapSpots: SpotMarker[]
  medMap: MedMapView
}) {
  return (
    <>
      <TrustStrip counts={data.counts} />
      <MoatSection hero={data.hero} />
      <HomeMapSection spots={mapSpots} />
      <CommunitySection activity={data.activity} counts={data.counts} />
      {/* §04 Tarifs : fond = vraie carte MÉDITERRANÉE (cf medMap). */}
      <PricingSection tiers={data.tiers} medMap={medMap} />
      <FAQSection />
      <FinalCTA />
    </>
  )
}

// ── Bandeau de confiance ────────────────────────────────────────────────────────
function TrustStrip({ counts }: { counts: HomeCounts }) {
  const items = [
    { value: counts.departments ?? 24, label: 'départements côtiers' },
    { value: counts.spots ?? 157, label: 'spots curés & vérifiés' },
    { value: counts.species, label: 'fiches espèces sourcées' },
  ]
  return (
    <div className="border-y border-sand-200 bg-white">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-start justify-around gap-6 px-6 py-9 text-center">
        {items.map((it, i) => (
          <ScrollReveal key={it.label} delayMs={i * 70}>
            <div className="font-display text-[34px] font-semibold text-navy-900">
              <AnimatedCounter value={it.value} />
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-400">
              {it.label}
            </div>
          </ScrollReveal>
        ))}
        <ScrollReveal delayMs={210}>
          <div className="font-display text-[34px] font-semibold text-teal-600">0 €</div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-400">
            pour loguer, pour toujours
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}

// ── 01 — Le moat (donnée réelle du spot hero + couche perso honnête) ────────────
function MoatSection({ hero }: { hero: HeroSnapshot }) {
  const spotName = hero.spot?.name ?? 'ton spot'
  const qualityLabel = hero.quality ? (QUALITY_LABEL[hero.quality] ?? hero.quality) : null
  const windowTime = hero.nextWindow
    ? new Date(hero.nextWindow.startISO).toLocaleTimeString('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <section className="py-24 md:py-28">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        <ScrollReveal>
          <SecNum>01 — Le moat</SecNum>
          <h2 className="mt-3 font-display text-[clamp(28px,4.6vw,52px)] font-semibold leading-[1.08] text-navy-900">
            Tout le monde a la météo.
            <br />
            Personne n&apos;a la tienne.
          </h2>
          <p className="mt-5 max-w-[540px] text-[18px] leading-relaxed text-ink-600">
            Marées astronomiques, solunaire standard, vent générique : les autres apps
            donnent la même chose à chacun. Nous, on superpose <b className="text-navy-900">tes</b>{' '}
            prises par-dessus la donnée brute. Plus tu logues, plus le carnet ne parle qu&apos;à toi.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {['Marée', 'Marnage', 'Vent', 'Heure', 'Lune', 'Pression'].map((p) => (
              <span
                key={p}
                className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 font-mono text-[12px] text-ink-600"
              >
                {p}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={120}>
          <div className="rounded-[22px] border border-sand-200 bg-white p-6 shadow-[0_20px_44px_-24px_rgba(14,26,34,.18)]">
            <div className="mb-4 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
              <span>La donnée brute d&apos;aujourd&apos;hui</span>
              <span className="truncate pl-2 text-teal-700">{spotName}</span>
            </div>
            <div className="flex items-center gap-4">
              {hero.score != null ? (
                <ScoreRing value={hero.score} size="lg" className="shrink-0" />
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-full border border-sand-200 font-mono text-[13px] text-ink-400">
                  —
                </div>
              )}
              <div className="min-w-0">
                <div className="font-display text-[15px] font-semibold text-navy-900">
                  {qualityLabel ? `${qualityLabel} · meilleur moment du jour` : 'Meilleur moment du jour'}
                </div>
                <div className="mt-1 text-[13px] leading-snug text-ink-600">
                  Marnage {fmtMeters(hero.tide.marnageM)}
                  {hero.tide.trend ? ` · marée ${trendLabel(hero.tide.trend).toLowerCase()}` : ''}
                  {windowTime ? ` · prochain créneau ${windowTime}` : ''}
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-sand-100 pt-4 text-[13.5px] leading-relaxed text-ink-600">
              <b className="text-navy-900">Tes prises, par-dessus :</b> le carnet apprend TES
              patterns : la saison, le jour, le vent et la marée où ça mord pour toi.{' '}
              <span className="font-mono text-[11px] text-ink-400">(débloqué dès ta 1re prise)</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── 03 — La communauté (activité AGRÉGÉE k-anon, jamais d'individuel) ────────────
function CommunitySection({ activity, counts }: { activity: HomeActivity; counts: HomeCounts }) {
  const filBody =
    activity.catchCount > 0
      ? `${activity.catchCount} prises partagées ces 30 derniers jours sur le littoral. Likes, commentaires, follows, co-pêchage, gratuit, sans pub, sans paywall.`
      : 'Vois ce qui mord dans ton département. Likes, commentaires, follows, co-pêchage, gratuit, sans pub, sans paywall.'

  const cards = [
    {
      title: 'Le carnet qui te parle',
      body: 'Chaque prise affine tes tendances perso : saison, jour, vent, marée. Le carnet finit par te connaître mieux que n’importe quelle appli météo.',
    },
    { title: 'Le fil de ta côte', body: filBody },
    {
      title: 'Des fiches d’instrument',
      body: `${counts.species} espèces à fond : tailles légales sourcées et datées, saisons par façade. Plus ${counts.spots ?? 157} fiches spots avec marées et bathymétrie.`,
    },
  ]

  return (
    <section className="bg-sand-100 py-24 md:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <ScrollReveal>
          <SecNum>03 — La communauté</SecNum>
          <h2 className="mt-3 max-w-[680px] font-display text-[clamp(28px,4.6vw,52px)] font-semibold leading-[1.08] text-navy-900">
            Tout ce qui sort sur ta côte.
          </h2>
          <p className="mt-5 max-w-[560px] text-[18px] leading-relaxed text-ink-600">
            Le fil de ton département, les fiches espèces traitées comme des instruments, et le
            co-pêchage pour sortir à plusieurs. 100&nbsp;% gratuit. Pour de vrai.
          </p>
        </ScrollReveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((c, i) => (
            <ScrollReveal key={c.title} delayMs={i * 90}>
              <div className="group h-full rounded-[18px] border border-sand-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:border-teal-400/70 hover:shadow-[0_24px_50px_-26px_rgba(14,26,34,.4)]">
                <h3 className="font-display text-[20px] font-semibold text-navy-900 transition-colors group-hover:text-teal-700">
                  {c.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{c.body}</p>
                {/* Barre d'accent qui s'étire au survol — repère de FORME (daltonien-safe). */}
                <span
                  aria-hidden="true"
                  className="mt-4 block h-[3px] w-8 rounded-full bg-teal-500/30 transition-all duration-300 group-hover:w-16 group-hover:bg-teal-500"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>

        <SpeciesMarquee />
      </div>
    </section>
  )
}

// ── Défilé des 26 espèces (réel, référentiel) ───────────────────────────────────
function SpeciesMarquee() {
  const line = `${CARNET_SPECIES_OPTIONS.map((o) => o.label).join(' · ')} · `
  return (
    <div className="mt-16 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max animate-marquee gap-10 font-display text-[22px] font-semibold text-ink-300">
        <span className="whitespace-nowrap">{line}</span>
        <span className="whitespace-nowrap" aria-hidden="true">
          {line}
        </span>
      </div>
    </div>
  )
}

// ── 04 — Tarifs (HOME_TIERS réels + copy features statique) ──────────────────────
// Les features sont de la copy marketing (pas de la donnée) ; les MONTANTS viennent
// de HOME_TIERS (source = lib/stripe/pricing).
const TIER_FEATURES: Record<HomeTier['id'], string[]> = {
  discovery: [
    'Carnet illimité + photos',
    'Fil régional complet, gratuit',
    '26 fiches espèces + guides',
    '3 spots/dépt, coords floutées',
  ],
  local: [
    'Carte complète de ton département',
    'Coords GPS précises + score 0-100',
    'Filtres, hors-ligne, notifications',
    'Bathymétrie, vent, courants',
  ],
  itinerant: [
    'Tous les départements côtiers',
    'Bathymétrie EMODnet premium',
    'Itinéraires GPS multi-spots',
    'Accès anticipé + support prio',
  ],
}
const TIER_CTA: Record<HomeTier['id'], { label: string; href: string }> = {
  discovery: { label: 'Créer mon carnet', href: '/auth/register' },
  local: { label: 'Essai 7 jours', href: '/auth/register?plan=local' },
  itinerant: { label: 'Essai 7 jours', href: '/auth/register?plan=itinerant' },
}

function PricingSection({ tiers, medMap }: { tiers: HomeTier[]; medMap: MedMapView }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-24 text-white md:py-28">
      {/* Fond = vraie carte MÉDITERRANÉE (décorative, lazy à l'entrée en viewport). */}
      <MedMapBackdrop center={medMap.center} spots={medMap.mapSpots} />
      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <ScrollReveal>
          <p className="font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-gold-300">
            04 — La précision se paie
          </p>
          <h2 className="mt-3 max-w-[640px] font-display text-[clamp(28px,4.6vw,52px)] font-semibold leading-[1.08] text-white">
            Le carnet est gratuit.
            <br />
            La carte au mètre, c&apos;est toi qui choisis.
          </h2>
          <p className="mt-5 max-w-[560px] text-[18px] leading-relaxed text-white/70">
            Logue sans limite, poste sans limite. Tu paies seulement ce qui se voit au mètre
            près : coordonnées GPS exactes, score par spot, bathymétrie.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {tiers.map((t, i) => (
            <ScrollReveal key={t.id} delayMs={i * 90}>
              <div
                className={cn(
                  'relative h-full rounded-[20px] border p-7 transition-all duration-300 hover:-translate-y-2',
                  t.highlight
                    ? 'border-gold-500/55 bg-gradient-to-b from-gold-500/[0.14] to-white/[0.03] hover:border-gold-400/80 hover:shadow-[0_30px_70px_-28px_rgba(217,165,60,.45)]'
                    : 'border-white/12 bg-white/[0.04] hover:border-teal-300/50 hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,.65)]',
                )}
              >
                {t.highlight && (
                  <span className="absolute right-4 top-4 rounded-full bg-gold-500 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-navy-950">
                    LE PLUS POPULAIRE
                  </span>
                )}
                <p
                  className={cn(
                    'font-mono text-[12px] font-medium uppercase tracking-[0.1em]',
                    t.highlight ? 'text-gold-300' : 'text-teal-300',
                  )}
                >
                  {t.name}
                </p>
                <p className="mt-2.5 font-display text-[40px] font-semibold leading-none">
                  {t.monthly}{' '}
                  <span className="text-[15px] font-normal text-white/55">{t.period}</span>
                </p>
                {t.annual && (
                  <p className="mt-1.5 font-mono text-[11px] text-white/45">
                    ou {t.annual} / an (−17 %)
                  </p>
                )}
                <ul className="mt-5 flex flex-col gap-2.5">
                  {TIER_FEATURES[t.id].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-white/75">
                      <Check
                        size={16}
                        strokeWidth={2}
                        className={cn(
                          'mt-0.5 shrink-0',
                          t.highlight ? 'text-gold-300' : 'text-teal-400',
                        )}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <TrackedCta
                  href={TIER_CTA[t.id].href}
                  event={`pricing_${t.id}`}
                  className={cn(
                    buttonVariants({ variant: t.highlight ? 'accent' : 'lineDark', size: 'cta' }),
                    'mt-6 w-full justify-center',
                  )}
                >
                  {TIER_CTA[t.id].label}
                </TrackedCta>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FAQ (a11y <details> + JSON-LD FAQPage) ──────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "C'est vraiment gratuit ?",
    a: 'Oui. Le carnet, le fil régional, les guides et les fiches espèces sont gratuits et illimités, pour toujours. Tu ne paies que pour la carte précise (coords au mètre, score par spot).',
  },
  {
    q: 'En quoi c’est différent des autres apps de marées ?',
    a: 'Les autres donnent la même info à tout le monde. Carnet de Pêche superpose tes prises par-dessus la donnée brute et te dit ce qui marche pour toi. C’est ton historique qui devient ton avantage.',
  },
  {
    q: 'Il faut une carte bancaire pour commencer ?',
    a: 'Non. Tu crées ton carnet en 30 secondes, sans CB. La carte bancaire n’est demandée que si tu lances l’essai 7 jours d’une formule payante.',
  },
  {
    q: 'Mes spots restent privés ?',
    a: 'Par défaut, oui : tes prises sont privées et tu décides ce que tu partages, à quel cercle, et avec quelle précision GPS. Tes données restent les tiennes.',
  },
]

function FAQSection() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return (
    <section className="py-24 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-[760px] px-6">
        <ScrollReveal className="text-center">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.18em] text-teal-700">
            Questions fréquentes
          </p>
          <h2 className="mt-3 font-display text-[clamp(26px,4.2vw,46px)] font-semibold text-navy-900">
            Tes questions, nos réponses.
          </h2>
        </ScrollReveal>
        <ScrollReveal delayMs={100} className="mt-10">
          {FAQ_ITEMS.map((f, i) => (
            <details
              key={f.q}
              open={i === 0}
              className="group border-b border-sand-200 py-1"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[18px] font-semibold text-navy-900">
                {f.q}
                <Plus
                  size={18}
                  className="shrink-0 text-teal-600 transition-transform group-open:rotate-45"
                />
              </summary>
              <p className="pb-4 text-[15.5px] leading-relaxed text-ink-600">{f.a}</p>
            </details>
          ))}
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── CTA final ───────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-28 text-center text-white md:py-32">
      <Bathy density={4} opacity={0.2} />
      <div className="relative mx-auto max-w-[1180px] px-6">
        <ScrollReveal>
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.18em] text-teal-300">
            Gratuit · illimité · sans CB
          </p>
          <h2 className="mx-auto mt-4 max-w-[760px] font-display text-[clamp(30px,5vw,60px)] font-semibold leading-[1.05] text-white">
            Ton prochain beau bar
            <br />
            commence par une ligne.
          </h2>
          <p className="mt-4 text-[18px] text-white/65">
            Crée ton carnet en 30 secondes. La marée n&apos;attend pas.
          </p>
          <div className="mt-9 flex justify-center">
            <HeroPrimaryCta
              className={cn(buttonVariants({ variant: 'accent', size: 'cta' }))}
              registerLabel="Créer mon carnet — gratuit"
              event="final_register"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
