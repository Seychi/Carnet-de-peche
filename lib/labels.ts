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

export const SPECIES_LABELS: Record<string, string> = {
  // 6 espèces cœur (carnet + onboarding — voir catchSpeciesEnum, liste séparée)
  bar: 'Bar',
  dorade_royale: 'Dorade royale',
  lieu_jaune: 'Lieu jaune',
  maquereau: 'Maquereau',
  sar: 'Sar',
  orphie: 'Orphie',
  // Espèces additionnelles portées par les spots curés — AFFICHAGE uniquement
  // (fiches spots, carte, filtres). Le carnet/onboarding restent sur les 6 ci-dessus.
  vieille: 'Vieille',
  mulet: 'Mulet',
  sole: 'Sole',
  congre: 'Congre',
  maigre: 'Maigre',
  chinchard: 'Chinchard',
}

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
