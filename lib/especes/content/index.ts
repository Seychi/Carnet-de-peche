import type { SpeciesSlug } from '@/lib/seo/programmatic'
import type { EspeceContent } from '../types'
import { barEspece } from './bar'
import { doradeRoyaleEspece } from './dorade-royale'
import { lieuJauneEspece } from './lieu-jaune'
import { maquereauEspece } from './maquereau'
import { sarEspece } from './sar'
import { orphieEspece } from './orphie'

export const ESPECES_CONTENT: Record<SpeciesSlug, EspeceContent> = {
  bar: barEspece,
  'dorade-royale': doradeRoyaleEspece,
  'lieu-jaune': lieuJauneEspece,
  maquereau: maquereauEspece,
  sar: sarEspece,
  orphie: orphieEspece,
}
