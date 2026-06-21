import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAllGuides } from '@/lib/guides/loader'
import {
  getAllProgrammaticPages,
  programmaticUrl,
  SPECIES,
  type SpeciesSlug,
} from '@/lib/seo/programmatic'

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
    { url: `${BASE_URL}/especes`,               priority: 0.6, changeFrequency: 'monthly' },
    // /techniques exclu : la page est en robots noindex (stub teaser) tant que les
    // guides techniques ne sont pas publiés → ne pas l'annoncer dans le sitemap.
    { url: `${BASE_URL}/contact`,               priority: 0.5, changeFrequency: 'yearly' },
    { url: `${BASE_URL}/auth/login`,            priority: 0.5, changeFrequency: 'yearly' },
    { url: `${BASE_URL}/auth/register`,         priority: 0.7, changeFrequency: 'yearly' },
  ]

  // Spots publics — inclut lastModified pour signaler les mises à jour à Google
  const { data: spots } = await supabase
    .from('spots')
    .select('slug, updated_at, created_at')
    .eq('visibility', 'public')

  const spotPages: MetadataRoute.Sitemap = (spots ?? []).map((s) => ({
    url: `${BASE_URL}/spots/${s.slug}`,
    lastModified: new Date(s.updated_at ?? s.created_at),
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

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
  const especePages: MetadataRoute.Sitemap = (Object.keys(SPECIES) as SpeciesSlug[]).map((s) => ({
    url: `${BASE_URL}/especes/${s}`,
    priority: 0.8,
    changeFrequency: 'monthly',
  }))

  return [...staticPages, ...spotPages, ...guidePages, ...programmaticPages, ...especePages]
}
