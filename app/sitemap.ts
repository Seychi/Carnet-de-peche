import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAllGuides } from '@/lib/guides/loader'
import {
  getAllProgrammaticPages,
  programmaticUrl,
  SPECIES,
  type SpeciesSlug,
} from '@/lib/seo/programmatic'
import { SPECIES_COVERS, speciesCover } from '@/lib/especes/covers'

const BASE_URL = 'https://www.carnet-de-peche.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                            priority: 1.0, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/carte`,                 priority: 0.9, changeFrequency: 'daily' },
    { url: `${BASE_URL}/spots`,                 priority: 0.9, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/tarifs`,                priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/guides`,                priority: 0.8, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/fil`,                   priority: 0.5, changeFrequency: 'monthly' },
    {
      url: `${BASE_URL}/especes`,
      priority: 0.6,
      changeFrequency: 'monthly',
      // Les planches ne sont référencées dans le HTML qu'à travers /_next/image :
      // le sitemap donne à Google leur URL de fichier, stable et directe, comme
      // il le recommande. La grille les affiche toutes, elles sont donc déclarées
      // ici en bloc, et une par une sur la fiche de leur espèce plus bas.
      images: Object.values(SPECIES_COVERS).map((path) => `${BASE_URL}${path}`),
    },
    { url: `${BASE_URL}/declarer-ses-prises`,   priority: 0.7, changeFrequency: 'monthly' },
    // /techniques exclu : la page est en robots noindex (stub teaser) tant que les
    // guides techniques ne sont pas publiés → ne pas l'annoncer dans le sitemap.
    { url: `${BASE_URL}/contact`,               priority: 0.5, changeFrequency: 'yearly' },
    // /auth/login retirée au sprint 85 (Bloc 1) : 23 personnes sur 90 jours
    // ENTRAIENT sur le site par la page de connexion (4e page d'entrée). Qui
    // arrive d'un moteur sur une page de connexion n'a pas de compte. La page
    // reste crawlable (Allow dans robots.ts) mais porte un noindex : c'est
    // /auth/register qui est la porte d'entrée déclarée.
    { url: `${BASE_URL}/auth/register`,         priority: 0.7, changeFrequency: 'yearly' },
  ]

  // Spots publics — inclut lastModified pour signaler les mises à jour à Google.
  // ⚠️ Fix 2026-08-05 : filtre moderation_status ajouté. Sans lui, les 941 imports
  // OSM en backlog (pending depuis la migration 072) étaient déclarés dans le
  // sitemap alors que leurs fiches filtrent 'approved' → ~80 % d'URLs mortes
  // déclarées à Google. Le filtre aligne le sitemap sur ce que les fiches servent.
  const { data: spots } = await supabase
    .from('spots')
    .select('slug, updated_at, created_at, department, species')
    .eq('visibility', 'public')
    .eq('moderation_status', 'approved')

  const spotPages: MetadataRoute.Sitemap = (spots ?? []).map((s) => ({
    url: `${BASE_URL}/spots/${s.slug}`,
    lastModified: new Date(s.updated_at ?? s.created_at),
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  // Landings /spots filtrées (sprint 57 WS-C, décision John « landing SEO ») : une
  // page par DÉPARTEMENT et par ESPÈCE ayant au moins un spot public (facette simple
  // = contenu réel groupé). Pas de produit croisé dept×espèce (pages trop minces) :
  // ces combos restent atteignables/indexables mais non déclarés. URLs alignées sur
  // le canonical auto-émis par /spots (generateMetadata).
  const deptSet = new Set<string>()
  const speciesSet = new Set<string>()
  for (const s of spots ?? []) {
    if (s.department) deptSet.add(String(s.department).trim())
    for (const sp of (s.species as string[] | null) ?? []) if (sp) speciesSet.add(sp)
  }
  const spotsFacetPages: MetadataRoute.Sitemap = [
    ...[...deptSet].map((code) => ({
      url: `${BASE_URL}/spots?dept=${code}`,
      priority: 0.6,
      changeFrequency: 'weekly' as const,
    })),
    ...[...speciesSet].map((sp) => ({
      url: `${BASE_URL}/spots?species=${sp}`,
      priority: 0.6,
      changeFrequency: 'weekly' as const,
    })),
  ]

  // Guides MDX — lus depuis content/guides/ (sprint 10 Bloc 1)
  const guides = await getAllGuides()
  const guidePages: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${BASE_URL}/guides/${g.slug}`,
    lastModified: g.updated_at ?? g.published_at,
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  // Pages programmatiques /peche/<espèce>/<technique>[/<dépt>] (sprint 10 Bloc 2)
  const programmaticPages: MetadataRoute.Sitemap = getAllProgrammaticPages().map((p) => ({
    url: `${BASE_URL}${programmaticUrl(p)}`,
    priority: p.deptCode ? 0.6 : 0.7,
    changeFrequency: 'weekly',
  }))

  // Fiches espèces profondes (sprint 10 Bloc 3)
  const especePages: MetadataRoute.Sitemap = (Object.keys(SPECIES) as SpeciesSlug[]).map((s) => {
    const cover = speciesCover(s)
    return {
      url: `${BASE_URL}/especes/${s}`,
      priority: 0.8,
      changeFrequency: 'monthly' as const,
      // Une espèce sans planche n'en déclare aucune : un sitemap qui annonce une
      // image absente est une erreur d'exploration, pas un signal.
      ...(cover ? { images: [`${BASE_URL}${cover}`] } : {}),
    }
  })

  return [...staticPages, ...spotPages, ...spotsFacetPages, ...guidePages, ...programmaticPages, ...especePages]
}
