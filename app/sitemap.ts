import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = 'https://carnet-de-peche.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                            priority: 1.0, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/carte`,                 priority: 0.9, changeFrequency: 'daily' },
    { url: `${BASE_URL}/spots`,                 priority: 0.9, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/tarifs`,                priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/guides`,                priority: 0.8, changeFrequency: 'weekly' },
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

  // Guides MDX (à compléter quand le sprint guides sera fait)
  const guidePages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/guides/peche-au-bar-au-leurre`,                         priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/guides/peche-a-la-dorade-royale-au-surfcasting`,         priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/guides/les-meilleurs-spots-de-peche-en-bretagne`,        priority: 0.7, changeFrequency: 'monthly' },
  ]

  return [...staticPages, ...spotPages, ...guidePages]
}
