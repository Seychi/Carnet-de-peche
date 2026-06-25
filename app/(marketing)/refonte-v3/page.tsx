import type { Metadata } from 'next'
import { SmoothScroll } from '@/components/marketing/motion'
import { Hero } from '@/components/marketing/home-v3/Hero'
import { getHeroSnapshot, getHomeCounts } from '@/lib/marketing/home-data'

// Préversion de la refonte home (sprint 34). Route PUBLIQUE volontairement nommée
// hors du préfixe protégé `/home` (cf middleware APP_ROUTES). Noindex tant qu'on
// itère — le swap vers `/` se fait en WS-7.
export const metadata: Metadata = {
  title: 'Préversion refonte · Carnet de Pêche',
  robots: { index: false, follow: false },
}

export default async function RefonteV3Preview() {
  const [hero, counts] = await Promise.all([getHeroSnapshot(), getHomeCounts()])
  return (
    <>
      <SmoothScroll />
      <Hero hero={hero} counts={counts} />
      {/* WS-4/5 : carte explorable + sections storytelling (01→04) + FAQ + CTA à venir. */}
    </>
  )
}
