import type { Metadata } from 'next'
import { SmoothScroll } from '@/components/marketing/motion'
import { Hero } from '@/components/marketing/home-v3/Hero'
import { HomeSections } from '@/components/marketing/home-v3/HomeSections'
import { getHomeData, getHomeMapSpots, getMedMapView } from '@/lib/marketing/home-data'
import { SPOTS_PUBLISHED_LABEL } from '@/lib/marketing/stats'

const SITE_URL = 'https://www.carnet-de-peche.com'

// ISR horaire, RÉELLEMENT actif depuis le sprint 84. Deux chemins rendaient cette page
// dynamique et vidaient ce `revalidate` de tout effet : le `<Header/>` du layout
// (corrigé au Bloc 1, `HeaderPublic` + `HeaderAuthSlot`) et, propre à la home,
// `lib/marketing/home-data` → `lib/conditions/spot-forecast`, dont le cache météo se
// lisait avec un client porteur de session. Les deux sont fermés : plus aucun
// `cookies()` dans l'arbre serveur de cette page.
// La donnée lourde (counts, activité, spots carte) reste mutualisée par `unstable_cache`.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Carnet de Pêche — Sache quand et où ça va mordre',
  description:
    'Le carnet de pêche numérique des pêcheurs à la canne du bord en France. ' +
    `Marées réelles, ${SPOTS_PUBLISHED_LABEL}, 26 espèces sourcées, fil régional gratuit.`,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    // IMPORTANT pour le nom de site Google : ce bloc openGraph de la home REMPLACE
    // celui du layout racine (Next.js ne fusionne pas les openGraph imbriqués), donc
    // siteName disparaissait du <head> en prod. On le redéclare ici explicitement.
    siteName: 'Carnet de Pêche',
    title: 'Carnet de Pêche — Sache quand et où ça va mordre',
    description:
      'Logue tes prises. Le carnet apprend tes patterns (marée, marnage, vent, heure) et te dit ' +
      'quand et où sortir. Carte marine, marées réelles, fil régional gratuit.',
  },
}

// JSON-LD : identité du site + organisation (rich results / Knowledge Graph).
// La FAQ (FAQPage) est injectée par HomeSections ; le hero/sections portent le contenu SEO.
const HOME_JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Carnet de Pêche',
    // Filet pour le nom de site dans Google (variantes sans accent + domaine).
    // La home doit rester le SEUL node WebSite, rendu en SSR, sur l'URL racine.
    alternateName: ['Carnet de Peche', 'carnet-de-peche.com'],
    url: SITE_URL,
    inLanguage: 'fr-FR',
    description:
      'Le carnet de pêche numérique et le réseau social des pêcheurs à la canne du bord en France.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Carnet de Pêche',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
  },
]

// Home « refonte » (sprint 34) : hero vivant (carte MapLibre + mer WebGL + données
// réelles + motion) puis storytelling SSR (moat, carte explorable, communauté, tarifs,
// FAQ, CTA). Tout en donnée réelle, anon-safe (jamais de geom brut). Source de vérité
// data : lib/marketing/home-data.ts.
export default async function HomePage() {
  const [data, mapSpots, medMap] = await Promise.all([
    getHomeData(),
    getHomeMapSpots(),
    getMedMapView(),
  ])

  return (
    <div className="bg-sand-50 font-sans text-ink-900">
      {HOME_JSONLD.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <SmoothScroll />
      <Hero hero={data.hero} counts={data.counts} />
      <HomeSections data={data} mapSpots={mapSpots} medMap={medMap} />
    </div>
  )
}
