import type { SpeciesSlug } from '@/lib/seo/programmatic'
import type { EspeceContent } from '../types'
import { barEspece } from './bar'
import { doradeRoyaleEspece } from './dorade-royale'
import { lieuJauneEspece } from './lieu-jaune'
import { maquereauEspece } from './maquereau'
import { sarEspece } from './sar'
import { orphieEspece } from './orphie'
// Sprint 23 — extension à 20 espèces (fiches profondes, réglementation vérifiée Légifrance).
import { seicheEspece } from './seiche'
import { muletEspece } from './mulet'
import { soleEspece } from './sole'
import { calmarEspece } from './calmar'
import { congreEspece } from './congre'
import { vieilleEspece } from './vieille'
import { rougetEspece } from './rouget'
import { doradeGriseEspece } from './dorade-grise'
import { pageotEspece } from './pageot'
import { obladeEspece } from './oblade'
import { maigreEspece } from './maigre'
import { tacaudEspece } from './tacaud'
import { chinchardEspece } from './chinchard'
import { plieEspece } from './plie'
// Sprint 29 — +6 espèces du bord (réglementation vérifiée Légifrance 24/06/2026).
import { barracudaEspece } from './barracuda'
import { tassergalEspece } from './tassergal'
import { licheEspece } from './liche'
import { marbreEspece } from './marbre'
import { lieuNoirEspece } from './lieu-noir'
import { merlanEspece } from './merlan'

export const ESPECES_CONTENT: Record<SpeciesSlug, EspeceContent> = {
  bar: barEspece,
  'dorade-royale': doradeRoyaleEspece,
  'lieu-jaune': lieuJauneEspece,
  maquereau: maquereauEspece,
  sar: sarEspece,
  orphie: orphieEspece,
  seiche: seicheEspece,
  mulet: muletEspece,
  sole: soleEspece,
  calmar: calmarEspece,
  congre: congreEspece,
  vieille: vieilleEspece,
  rouget: rougetEspece,
  'dorade-grise': doradeGriseEspece,
  pageot: pageotEspece,
  oblade: obladeEspece,
  maigre: maigreEspece,
  tacaud: tacaudEspece,
  chinchard: chinchardEspece,
  plie: plieEspece,
  barracuda: barracudaEspece,
  tassergal: tassergalEspece,
  liche: licheEspece,
  marbre: marbreEspece,
  'lieu-noir': lieuNoirEspece,
  merlan: merlanEspece,
}
