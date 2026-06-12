import type { SpeciesSlug } from '@/lib/seo/programmatic'
import type { SpeciesContent } from './types'
import { barContent } from './bar'
import { doradeRoyaleContent } from './dorade-royale'
import { lieuJauneContent } from './lieu-jaune'
import { maquereauContent } from './maquereau'
import { sarContent } from './sar'
import { orphieContent } from './orphie'

export const SPECIES_CONTENT: Record<SpeciesSlug, SpeciesContent> = {
  bar: barContent,
  'dorade-royale': doradeRoyaleContent,
  'lieu-jaune': lieuJauneContent,
  maquereau: maquereauContent,
  sar: sarContent,
  orphie: orphieContent,
}
