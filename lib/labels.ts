// Regex canonique username — même règle en onboarding et au profil.
// Autorise lettres, chiffres, tiret, underscore, point.
export const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/

// Libellés de fréquence de pêche — source unique partagée entre onboarding et profil.
export const FREQUENCY_LABELS: { value: string; label: string }[] = [
  { value: 'rare',     label: 'Quelques fois par an' },
  { value: 'seasonal', label: 'Saisonnièrement' },
  { value: 'weekly',   label: 'Toutes les semaines' },
  { value: 'daily',    label: 'Plusieurs fois par semaine' },
]

// Libellés d'espèces (clé DB snake_case → label). DÉRIVÉ du référentiel unique
// `SPECIES` (lib/seo/programmatic.ts) depuis le sprint 23 — fini la liste parallèle.
// Couvre les 20 espèces (carnet + carte + filtres + fiches).
import { SPECIES } from '@/lib/seo/programmatic'

export const SPECIES_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(SPECIES).map((s) => [s.dbKey, s.label]),
)

export const TECHNIQUE_LABELS: Record<string, string> = {
  leurres: 'Leurres',
  surfcasting: 'Surfcasting',
  flottante: 'Flottante',
  vif: 'Vif',
}

export const STRUCTURE_LABELS: Record<string, string> = {
  digue: 'Digue',
  plage: 'Plage',
  pointe_rocheuse: 'Pointe rocheuse',
  estuaire: 'Estuaire',
  cale: 'Cale',
  passe: 'Passe',
  cassure: 'Cassure',
}

// Dangers d'un spot (sprint 43, curage). Renseignés à la curation, affichés sur la
// fiche spot. Clé snake_case (stockée dans spots.hazards text[]) → label FR.
export const HAZARDS_LABELS: Record<string, string> = {
  ressac: 'Ressac et retour de vague',
  vagues_scelerates: 'Vagues scélérates',
  courants_forts: 'Courants forts',
  roches_glissantes: 'Roches glissantes',
  maree_montante_rapide: 'Marée montante rapide',
  rochers_immerges: 'Rochers immergés',
  acces_falaise: 'Accès par la falaise',
  isolement: 'Zone isolée',
}

// Provenance d'un spot (migration 041) — source unique pour les badges
// carte / fiche. Le badge « Vérifié » (garantie éditoriale) reste réservé aux
// spots `curated`. cf docs/carte-v2/RECAP-C2.md.
export const SOURCE_LABELS: Record<string, string> = {
  curated: 'Vérifié',
  community: 'Communautaire',
  imported: 'OpenStreetMap',
}
