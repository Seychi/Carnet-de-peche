import type { Metadata } from 'next'
import { SmoothScroll } from '@/components/marketing/motion'
import { Hero } from '@/components/marketing/home-v3/Hero'
import { HomeSections } from '@/components/marketing/home-v3/HomeSections'
import { getHomeData, getHomeMapSpots, getMedMapView } from '@/lib/marketing/home-data'

const SITE_URL = 'https://www.carnet-de-peche.com'

// La home reste cache-friendly : les fetchs de données vivent en `unstable_cache`
// (révalidés 1 h). Le Header lit les cookies → la page est rendue dynamiquement, mais
// la donnée lourde (counts, snapshot hero, spots carte) est mutualisée par le cache.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Carnet de Pêche — Sache quand et où ça va mordre',
  description:
    'Le carnet de pêche numérique et le réseau social des pêcheurs à la canne du bord en France. ' +
    'Marées réelles, 157 spots curés et vérifiés, 26 espèces sourcées, fil régional 100 % gratuit. ' +
    'Logue tes prises : le carnet apprend tes patterns et te dit quand et où sortir.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Carnet de Pêche — Sache quand et où ça va mordre',
    description:
      'Logue tes prises. Le carnet apprend tes patterns — marée, marnage, vent, heure — et te dit ' +
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
