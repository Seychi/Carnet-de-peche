import { ScrollReveal } from '@/components/ui-v2/scroll-reveal'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { AnimatedCounter } from '@/components/ui-v2/animated-counter'
import { CARNET_SPECIES_OPTIONS } from '@/lib/seo/programmatic'
import { trendLabel } from '@/lib/conditions/tide'
import type { HomeData, HomeCounts, HeroSnapshot, HomeActivity } from '@/lib/marketing/home-data'

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

export function HomeSections({ data }: { data: HomeData }) {
  return (
    <>
      <TrustStrip counts={data.counts} />
      <MoatSection hero={data.hero} />
      <CommunitySection activity={data.activity} counts={data.counts} />
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
              patterns — la saison, le jour, le vent et la marée où ça mord pour toi.{' '}
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
      ? `${activity.catchCount} prises partagées ces 30 derniers jours sur le littoral. Likes, commentaires, follows, co-pêchage — gratuit, sans pub, sans paywall.`
      : 'Vois ce qui mord dans ton département. Likes, commentaires, follows, co-pêchage — gratuit, sans pub, sans paywall.'

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
            co-pêchage pour sortir à plusieurs. 100&nbsp;% gratuit — pour de vrai.
          </p>
        </ScrollReveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((c, i) => (
            <ScrollReveal key={c.title} delayMs={i * 90}>
              <div className="h-full rounded-[18px] border border-sand-200 bg-white p-6 transition-transform duration-300 hover:-translate-y-1">
                <h3 className="font-display text-[20px] font-semibold text-navy-900">{c.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{c.body}</p>
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
