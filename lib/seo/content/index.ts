import type { SpeciesSlug } from '@/lib/seo/programmatic'
import type { SpeciesContent } from './types'
import { barContent } from './bar'
import { doradeRoyaleContent } from './dorade-royale'
import { lieuJauneContent } from './lieu-jaune'
import { maquereauContent } from './maquereau'
import { sarContent } from './sar'
import { orphieContent } from './orphie'

// Partial depuis le sprint 23 : seules les espèces avec contenu programmatique
// rédigé sont listées (les 6 cœur). Les ~14 espèces ajoutées au sprint 23 ont une
// fiche /especes profonde (ESPECES_CONTENT) mais PAS de pages /peche/… — c'est le
// garde-fou anti thin content. Doit rester cohérent avec SPECIES[slug].hasProgrammatic
// et avec SPECIES_TECHNIQUES (lib/seo/programmatic.ts).
export const SPECIES_CONTENT: Partial<Record<SpeciesSlug, SpeciesContent>> = {
  bar: barContent,
  'dorade-royale': doradeRoyaleContent,
  'lieu-jaune': lieuJauneContent,
  maquereau: maquereauContent,
  sar: sarContent,
  orphie: orphieContent,
}
