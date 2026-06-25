import type { Metadata } from 'next'
import { SmoothScroll } from '@/components/marketing/motion'
import { Hero } from '@/components/marketing/home-v3/Hero'
import { HomeSections } from '@/components/marketing/home-v3/HomeSections'
import { getHomeData } from '@/lib/marketing/home-data'

// Préversion de la refonte home (sprint 34). Route PUBLIQUE volontairement nommée
// hors du préfixe protégé `/home` (cf middleware APP_ROUTES). Noindex tant qu'on
// itère — le swap vers `/` se fait en WS-7.
export const metadata: Metadata = {
  title: 'Préversion refonte · Carnet de Pêche',
  robots: { index: false, follow: false },
}

export default async function RefonteV3Preview() {
  const data = await getHomeData()
  return (
    <>
      <SmoothScroll />
      <Hero hero={data.hero} counts={data.counts} />
      <HomeSections data={data} />
      {/* WS-5b : tarifs (HOME_TIERS) + FAQ + CTA final ; WS-4 : section 02 carte explorable. */}
    </>
  )
}
