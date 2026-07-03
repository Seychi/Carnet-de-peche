import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, ShieldCheck, ClipboardList, ExternalLink, Check, X } from 'lucide-react'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'
import { RecfishingLandingTracker } from '@/components/marketing/RecfishingLandingTracker'
import {
  RECFISHING_META,
  RECFISHING_LINKS,
  RECFISHING_SENSITIVE,
  MED_MARINE_PARKS,
} from '@/lib/regulation/recfishing'

// Landing SEO INDEXABLE (wedge RecFishing, sprint 73). Server Component par
// défaut, aucun noindex. Capte « déclaration pêche en mer 2026 / RecFishing ».
// Toute la donnée réglementaire vient de lib/regulation/recfishing (source
// unique, datée) : aucune valeur ni date fabriquée ici.

export const revalidate = 86400

const BASE_URL = 'https://www.carnet-de-peche.com'
const CANONICAL = `${BASE_URL}/declarer-ses-prises`

const FACADE_LABEL: Record<string, string> = {
  'manche-atlantique': 'Manche · Atlantique',
  mediterranee: 'Méditerranée',
}

// « 23/06/2026 » (JJ/MM/AAAA) → « 2026-06-23 » (ISO 8601 pour Schema.org).
function toIso(fr: string): string {
  const [d, m, y] = fr.split('/')
  return y && m && d ? `${y}-${m}-${d}` : '2026-06-23'
}

// FAQ : source unique, réutilisée pour le rendu ET le JSON-LD FAQPage.
const FAQ: { q: string; a: string }[] = [
  {
    q: 'Qui doit déclarer ses prises en mer depuis 2026 ?',
    a: `Tout pêcheur de loisir en mer qui capture une espèce dite sensible doit la déclarer sous ${RECFISHING_META.deadlineHours} heures via l'appli officielle RecFishing, y compris s'il relâche le poisson. La liste des espèces concernées est fixée par arrêté et révisée chaque année.`,
  },
  {
    q: 'Faut-il déclarer un poisson relâché ?',
    a: 'Oui. La déclaration porte sur la capture, pas sur le prélèvement. Un bar remis à l’eau reste une prise à déclarer si l’espèce est sur la liste sensible de ta façade.',
  },
  {
    q: 'Est-ce que Carnet de Pêche déclare à ma place ?',
    a: 'Non. RecFishing est une appli publique de l’Union européenne qui exige une connexion EU Login, sans API de soumission par un tiers. Le carnet détecte l’espèce sensible, te le rappelle sous 24 h, prépare un récap à recopier et ouvre RecFishing. C’est toi qui valides la déclaration.',
  },
  {
    q: 'Quel est le délai pour déclarer ?',
    a: `Le délai légal est de ${RECFISHING_META.deadlineHours} heures après la capture. Le carnet peut te l'afficher dès que tu logues une prise concernée pour t'éviter d'oublier dans la fenêtre.`,
  },
  {
    q: 'Et dans les parcs marins de Méditerranée ?',
    a: `Dans certains parcs marins (${MED_MARINE_PARKS.join(', ')}), c'est l'appli CatchMachine (Ifremer) qui s'applique, pas RecFishing. Le carnet le signale selon ton département.`,
  },
]

export const metadata: Metadata = {
  title: 'Déclaration des prises en mer : RecFishing 2026',
  description:
    'Depuis 2026, certaines espèces (bar, lieu jaune, maquereau) se déclarent sous 24 h via l’appli RecFishing, même relâchées. Ce qu’il faut déclarer, et comment le carnet te le rappelle.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Déclarer ses prises en mer : l’obligation RecFishing 2026',
    description:
      'Quelles espèces déclarer sous 24 h via RecFishing (même relâchées), et comment Carnet de Pêche te le rappelle au moment où tu logues ta prise.',
    url: CANONICAL,
    type: 'article',
    locale: 'fr_FR',
  },
}

export default function DeclarerSesPrisesPage() {
  const iso = toIso(RECFISHING_META.verifiedAt)

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Déclarer ses prises en mer : l’obligation RecFishing 2026',
      description:
        'La déclaration obligatoire des espèces sensibles en pêche de loisir en mer, expliquée et sourcée, et le rôle du carnet qui te le rappelle.',
      author: { '@type': 'Organization', name: 'Carnet de Pêche' },
      publisher: { '@type': 'Organization', name: 'Carnet de Pêche', url: BASE_URL },
      mainEntityOfPage: CANONICAL,
      inLanguage: 'fr',
      datePublished: iso,
      dateModified: iso,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Déclarer ses prises', item: CANONICAL },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]

  // Exemple de récap préparé par le carnet (statique, clairement étiqueté).
  const demoFields: { label: string; value: string }[] = [
    { label: 'Espèce', value: 'Bar (commun)' },
    { label: 'Taille', value: '48 cm' },
    { label: 'Date et heure', value: '03/07/2026 à 07:15' },
    { label: 'Lieu', value: 'Finistère (29)' },
    { label: 'Quantité', value: '1' },
    { label: 'Technique', value: 'Leurres' },
    { label: 'Devenir', value: 'Relâché (à déclarer aussi)' },
  ]

  return (
    <div className="bg-sand-50 min-h-screen">
      {jsonLd.map((x, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }}
        />
      ))}

      {/* Event PostHog au montage (consentement + UTM gérés côté client). */}
      <Suspense fallback={null}>
        <RecfishingLandingTracker />
      </Suspense>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-950 pt-10 pb-12">
        <Bathy opacity={0.3} withLabels />
        <div className="relative mx-auto max-w-[860px] px-5">
          <nav className="mb-6 flex items-center gap-2" aria-label="Fil d'ariane">
            <Link
              href="/"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300 hover:text-white transition-colors"
            >
              Accueil
            </Link>
            <ChevronRight size={12} className="text-white/30" />
            <TagData className="text-white/45">DÉCLARER SES PRISES</TagData>
          </nav>
          <h1 className="font-display text-white">
            Déclarer ses prises en mer : l&rsquo;obligation RecFishing 2026
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
            Depuis 2026, la pêche de loisir en mer impose de déclarer certaines espèces sensibles
            sous {RECFISHING_META.deadlineHours} heures via l&rsquo;appli officielle de
            l&rsquo;Union européenne, RecFishing. Cette obligation vaut même pour les poissons que
            tu relâches. Voici ce qu&rsquo;il faut déclarer, et comment le carnet te le rappelle au
            bon moment.
          </p>
          <TagData variant="on-dark" className="mt-6 block">
            SOURCE VÉRIFIÉE LE {RECFISHING_META.verifiedAt}
          </TagData>
        </div>
      </section>

      <div className="mx-auto max-w-[860px] px-5 py-10">
        {/* ── Ce que dit la règle ───────────────────────────────────── */}
        <section>
          <h2 className="font-display text-xl text-navy-900">Ce que dit la règle depuis 2026</h2>
          <aside className="mt-4 rounded-[14px] border border-gold-500/35 bg-gold-500/[0.07] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#A87C20]">
                <ShieldCheck size={14} strokeWidth={1.7} />
                Pêche de loisir en mer · déclaration obligatoire
              </span>
            </div>
            <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-ink-700">
              <li className="flex gap-2.5">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                <span>
                  Les captures de certaines espèces sensibles doivent être déclarées sous{' '}
                  <strong className="text-navy-900">{RECFISHING_META.deadlineHours} heures</strong>{' '}
                  via l&rsquo;appli RecFishing.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                <span>
                  La déclaration porte sur la{' '}
                  <strong className="text-navy-900">capture</strong>, pas sur le prélèvement : un
                  poisson relâché reste à déclarer.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                <span>
                  La liste des espèces concernées est{' '}
                  <strong className="text-navy-900">révisée chaque année</strong> : elle a déjà
                  changé deux fois en 2026 (le thon rouge en a été retiré au 1er avril 2026, il
                  relève d&rsquo;un régime propre).
                </span>
              </li>
            </ul>
            <p className="mt-3 border-t border-gold-500/20 pt-3 text-[12px] leading-snug text-ink-500">
              Source : {RECFISHING_META.source}. Vérifié le {RECFISHING_META.verifiedAt}. La
              réglementation évolue : vérifie l&rsquo;arrêté en vigueur de ta façade avant de
              prélever.
            </p>
          </aside>
        </section>

        {/* ── Quelles espèces déclarer ──────────────────────────────── */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-navy-900">Quelles espèces sont concernées</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-700">
            La liste dépend de ta façade. Voici les espèces sensibles à déclarer aujourd&rsquo;hui,
            telles que le carnet les connaît :
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-left">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="py-2.5 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-500">
                    Espèce
                  </th>
                  <th className="py-2.5 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-500">
                    Nom scientifique
                  </th>
                  <th className="py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-500">
                    Façade(s)
                  </th>
                </tr>
              </thead>
              <tbody>
                {RECFISHING_SENSITIVE.map((s) => (
                  <tr key={s.latin} className="border-b border-sand-200 last:border-b-0">
                    <td className="py-2.5 pr-4 text-[14px] font-semibold text-navy-900">
                      {s.commonFr}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] italic text-ink-500">
                      {s.latin}
                    </td>
                    <td className="py-2.5 text-[13px] text-ink-700">
                      {s.facades.map((f) => FACADE_LABEL[f] ?? f).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-ink-500">
            Dans les parcs marins de Méditerranée ({MED_MARINE_PARKS.join(', ')}), c&rsquo;est
            l&rsquo;appli CatchMachine (Ifremer) qui s&rsquo;applique à la place de RecFishing. Le
            carnet te le signale selon ton département.
          </p>
        </section>

        {/* ── Ce que le carnet fait, et ne fait pas ─────────────────── */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-navy-900">
            Ce que Carnet de Pêche fait pour toi (et ce qu&rsquo;il ne fait pas)
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-700">
            Soyons clairs : le carnet ne déclare pas à ta place. RecFishing est une appli publique
            de l&rsquo;Union européenne qui exige une connexion EU Login, sans passerelle pour un
            tiers. Ce que le carnet fait, c&rsquo;est t&rsquo;éviter l&rsquo;oubli et la corvée de
            ressaisie.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[14px] border border-teal-200 bg-white p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                <Check size={16} className="shrink-0 text-teal-600" /> Ce que le carnet fait
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-700">
                <li>Il détecte automatiquement quand ta prise est une espèce sensible.</li>
                <li>
                  Il te rappelle de déclarer dans la fenêtre des {RECFISHING_META.deadlineHours} h.
                </li>
                <li>Il prépare un récap prêt à recopier (espèce, taille, date, lieu, devenir).</li>
                <li>Il ouvre RecFishing, où tu finalises la déclaration.</li>
              </ul>
            </div>
            <div className="rounded-[14px] border border-sand-200 bg-white p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                <X size={16} className="shrink-0 text-coral-500" /> Ce qu&rsquo;il ne fait pas
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-700">
                <li>Il ne soumet pas la déclaration à ta place (EU Login obligatoire).</li>
                <li>Il ne se substitue pas à l&rsquo;arrêté en vigueur de ta façade.</li>
                <li>Il n&rsquo;invente aucune donnée : la liste vient de la source datée ci-dessus.</li>
              </ul>
            </div>
          </div>

          {/* Démo honnête du récap (statique, étiqueté EXEMPLE). */}
          <div className="mt-6 rounded-[14px] border border-amber-300 bg-amber-50 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-700">
                <ClipboardList size={13} /> Le récap que le carnet prépare
              </p>
              <TagData variant="gold">EXEMPLE</TagData>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {demoFields.map((f) => (
                <div key={f.label} className="flex flex-col">
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-400">
                    {f.label}
                  </dt>
                  <dd className="text-[13px] font-medium text-navy-900">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-1.5 text-[12px] leading-relaxed text-amber-800">
              <span aria-hidden>ⓘ</span>
              <span>
                Tu recopies ce récap dans RecFishing, tu te connectes avec EU Login, et c&rsquo;est
                toi qui valides. Le carnet t&rsquo;aura juste évité l&rsquo;oubli et la ressaisie.
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={RECFISHING_LINKS.webPortal}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-amber-300 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                Le portail RecFishing <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </section>

        {/* ── FAQ (aligne le JSON-LD FAQPage) ───────────────────────── */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-navy-900">Questions fréquentes</h2>
          <div className="mt-4 flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[14px] border border-sand-200 bg-white p-4">
                <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-navy-900 marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Liens croisés ─────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-navy-900">Pour aller plus loin</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/guides/declaration-obligatoire-peche-en-mer-recfishing"
              className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-teal-500/40 hover:text-navy-900"
            >
              Le guide complet RecFishing
            </Link>
            <Link
              href="/especes"
              className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-teal-500/40 hover:text-navy-900"
            >
              Les fiches espèces et leurs mailles
            </Link>
            <Link
              href="/especes/bar"
              className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-teal-500/40 hover:text-navy-900"
            >
              Réglementation du bar
            </Link>
          </div>
        </section>

        {/* ── CTA inscription ───────────────────────────────────────── */}
        <div className="mt-10 relative overflow-hidden rounded-[18px] bg-navy-950 p-6 text-center sm:p-8">
          <Bathy density={2} opacity={0.3} />
          <div className="relative mx-auto max-w-lg">
            <p className="font-display text-xl text-white">
              Ne rate plus une déclaration
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Logue tes prises : le carnet repère les espèces sensibles, te rappelle sous 24 h et
              prépare ton récap RecFishing. Gratuit, illimité.
            </p>
            <Link
              href="/auth/register"
              className={cn(buttonVariants({ variant: 'accent', size: 'cta' }), 'mt-6')}
            >
              Créer mon carnet, c&rsquo;est gratuit
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <MarketingCTA
        title="Un carnet qui pense à la déclaration pour toi"
        subtitle="Suis tes sorties, analyse tes patterns, partage avec la communauté, et laisse le carnet te rappeler ce que tu dois déclarer. Gratuit, illimité."
      />
    </div>
  )
}
