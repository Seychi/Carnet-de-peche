import type { SpeciesSlug } from '@/lib/seo/programmatic'
import type { SpeciesContent } from './types'
import { barContent } from './bar'
import { doradeRoyaleContent } from './dorade-royale'
import { lieuJauneContent } from './lieu-jaune'
import { maquereauContent } from './maquereau'
import { sarContent } from './sar'
import { orphieContent } from './orphie'
import { seicheContent } from './seiche'
import { obladeContent } from './oblade'
import { marbreContent } from './marbre'
import { pageotContent } from './pageot'
import { rougetContent } from './rouget'
import { licheContent } from './liche'

// Partial depuis le sprint 23 : seules les espèces avec contenu programmatique
// rédigé sont listées. Les espèces sans contenu ont une fiche /especes profonde
// (ESPECES_CONTENT) mais PAS de pages /peche/… — c'est le garde-fou anti thin
// content. Doit rester cohérent avec SPECIES[slug].hasProgrammatic et avec
// SPECIES_TECHNIQUES (lib/seo/programmatic.ts).
//
// ⚠️ INVARIANT DUR, testé (lib/seo/__tests__/programmatic-mediterranee.test.ts) :
// toute espèce présente dans SPECIES_TECHNIQUES doit avoir son contenu ICI. Sinon
// `app/(marketing)/peche/[...slug]/page.tsx` tombe sur son `if (!content) notFound()`
// et le sitemap déclare à Google des URLs qui répondent 404 (le piège du 05/08).
export const SPECIES_CONTENT: Partial<Record<SpeciesSlug, SpeciesContent>> = {
  bar: barContent,
  'dorade-royale': doradeRoyaleContent,
  'lieu-jaune': lieuJauneContent,
  maquereau: maquereauContent,
  sar: sarContent,
  orphie: orphieContent,
  // ── Sprint 83, Bloc 4 : ouverture méditerranéenne (+ seiche sur les 2 façades) ──
  seiche: seicheContent,
  oblade: obladeContent,
  marbre: marbreContent,
  pageot: pageotContent,
  rouget: rougetContent,
  liche: licheContent,
}
