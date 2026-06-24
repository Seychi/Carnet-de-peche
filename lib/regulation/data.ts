import type { Facade, SpeciesSlug } from '@/lib/seo/programmatic'

// ═══════════════════════════════════════════════════════════════════════════════
// RÉGLEMENTATION STRUCTURÉE — SOURCE UNIQUE DU MOTEUR (sprint 24, Chantier C).
//
// Données LÉGÈRES (chiffres + booléens, pas de prose) → importable côté CLIENT
// (CatchForm) sans tirer les ~20 fiches espèces complètes dans le bundle.
//
// EXACTITUDE = BLOQUANTE : aucune valeur inventée. `minSizeCm` et `marquage` sont
// la copie EXACTE des fiches (`lib/especes/content/*` — vérifiées Légifrance au
// sprint 23) ; un test de cohérence (`__tests__/regulation.test.ts`) échoue si la
// moindre maille diverge de sa fiche → impossible de driver deux sources.
//
// `dailyQuota` / `closedWindows` sont la STRUCTURATION de la prose réglementaire
// déjà sourcée des fiches (extraction sprint 24). `null` honnête quand la donnée
// n'existe pas (espèce sans quota / sans fermeture) — jamais de chiffre deviné.
//
// ⚠️ Limites connues (validées 24/06/2026 — détail docs/sprint-24/RECAP.md) :
//  · Mailles locales dérogatoires du Parc naturel marin du Golfe du Lion (arrêté
//    préfectoral R93-2024-02-12-00002 du 12/02/2024 : bar 42 cm, pageot 25 cm,
//    rouget/oblade 20 cm, congre maille MINIMALE 120 cm, dorade royale 30 cm,
//    + autorisation CatchMachine) NON modélisées par `minSizeCm` (une valeur par
//    façade) → signalées en prose + avertissement Med (CatchRegulationSection).
//  · Chinchard : PAS d'interdiction de pêche de loisir en zone CIEM VIIIa (vérifié
//    24/06/2026, Ifremer + EUR-Lex — les TAC UE visent le pro). L'ancienne mention
//    « interdit en VIIIa » de la fiche était FAUSSE et a été corrigée.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quota journalier (nombre max de prises CONSERVÉES /jour/pêcheur). Certains quotas
 * dépendent d'une sous-zone qui n'est pas la façade (ex. « au nord du 48e parallèle »
 * pour le bar) → `zone`. `note` cite/résume fidèlement la source (jamais inventé).
 */
export type RegulationQuotaRule = {
  facade: Facade | 'all'
  /** Sous-zone précise quand le quota ne dépend pas de la seule façade. null = toute la façade. */
  zone: string | null
  /** Nombre max de prises conservées /jour/pêcheur. */
  perDay: number
  note: string
}

/**
 * Fenêtre de fermeture saisonnière / pêcher-relâcher obligatoire.
 * `type='no-take'` = pêche autorisée mais prélèvement interdit ;
 * `type='closed'` = pêche interdite.
 */
export type RegulationClosedWindow = {
  facade: Facade | 'all'
  /** Sous-zone (48e parallèle, parc marin…). null = toute la façade. */
  zone: string | null
  /** Mois concernés (1 = janvier … 12 = décembre). */
  months: number[]
  type: 'no-take' | 'closed'
  note: string
}

export type SpeciesRegulation = {
  /** Date de dernière vérification (format JJ/MM/AAAA), recopiée de la fiche. */
  verifiedAt: string
  /** Référence(s) réglementaire(s), recopiée(s) de la fiche. */
  source: string
  /** Maille (cm) par façade. null = espèce non réglementée / absente sur cette façade. */
  minSizeCm: Record<Facade, number | null>
  /** Marquage obligatoire du poisson conservé (ablation nageoire caudale, arrêté 17 mai 2011). */
  marquage: boolean
  /** Quotas journaliers structurés. [] = aucun quota chiffré (honnête). */
  dailyQuota: RegulationQuotaRule[]
  /** Fenêtres de fermeture / no-kill. [] = aucune restriction saisonnière connue. */
  closedWindows: RegulationClosedWindow[]
}

const MA: Facade = 'manche-atlantique'
const MED: Facade = 'mediterranee'

export const SPECIES_REGULATION: Record<SpeciesSlug, SpeciesRegulation> = {
  bar: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 1er avril 2026 (pêche de loisir du bar européen) ; arrêté du 26 octobre 2012 modifié (tailles minimales) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 42, [MED]: 30 },
    marquage: true,
    dailyQuota: [
      {
        facade: MA,
        zone: 'Au nord du 48e parallèle nord (≈ Audierne)',
        perDay: 3,
        note: '3 bars/jour/pêcheur au nord du 48e parallèle (≈ Audierne).',
      },
      {
        facade: MA,
        zone: 'Au sud du 48e parallèle nord',
        perDay: 2,
        note: '2 bars/jour au sud du 48e parallèle ; pêche autorisée toute l’année (2/jour).',
      },
    ],
    closedWindows: [
      {
        facade: MA,
        zone: 'Au nord du 48e parallèle nord',
        months: [2, 3],
        type: 'no-take',
        note: 'Février-mars : pêcher-relâcher obligatoire au nord du 48e parallèle (aucun prélèvement). Au sud, pêche autorisée toute l’année.',
      },
    ],
  },
  'dorade-royale': {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié le 6 janvier 2026 (tailles minimales) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 23, [MED]: 23 },
    marquage: true,
    dailyQuota: [],
    closedWindows: [],
  },
  'lieu-jaune': {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 24 décembre 2024 (fermeture + quota, zones CIEM 7 et 8) ; arrêté du 26 octobre 2012 modifié (maille) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 42, [MED]: null },
    marquage: true,
    dailyQuota: [
      {
        facade: MA,
        zone: null,
        perDay: 2,
        note: '2 lieus jaunes/jour/pêcheur, toutes techniques confondues (zones CIEM 7 et 8).',
      },
    ],
    closedWindows: [
      {
        facade: MA,
        zone: null,
        months: [1, 2, 3, 4],
        type: 'closed',
        note: 'Fermeture totale du 1er janvier au 30 avril : aucune capture ni détention.',
      },
    ],
  },
  maquereau: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié (maille) ; arrêté du 1er avril 2026 (quota, zones CIEM 4/7/8) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 20, [MED]: 18 },
    marquage: true,
    dailyQuota: [
      {
        facade: MA,
        zone: 'Manche, mer du Nord et Atlantique',
        perDay: 10,
        note: '10 maquereaux/jour/pêcheur en Manche, mer du Nord et Atlantique (depuis avril 2026). Pas de quota en Méditerranée.',
      },
    ],
    closedWindows: [],
  },
  sar: {
    verifiedAt: '21/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié le 6 janvier 2026 (maille) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 25, [MED]: 23 },
    marquage: true,
    dailyQuota: [],
    closedWindows: [],
  },
  orphie: {
    verifiedAt: '21/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié le 6 janvier 2026 (tailles minimales pêche de loisir)',
    minSizeCm: { [MA]: 30, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  seiche: {
    verifiedAt: '23/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié (tailles minimales, pêche de loisir) ; règlement (CE) 1967/2006 (Méditerranée) — la seiche n’y figure pas',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  mulet: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe I, « Mulets / Mugil spp. »)',
    minSizeCm: { [MA]: 30, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  sole: {
    verifiedAt: '23/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié (harmonisé par l’arrêté du 12 mai 2023) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 25, [MED]: 24 },
    marquage: true,
    dailyQuota: [],
    closedWindows: [],
  },
  calmar: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié ; règlement (UE) 2019/1241 — le calmar n’y est pas listé',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  congre: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe I, Conger conger)',
    minSizeCm: { [MA]: 60, [MED]: 60 },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  vieille: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié ; arrêté du 17 mai 2011 modifié — la vieille n’y figure pas',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  rouget: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (genre Mullus)',
    minSizeCm: { [MA]: 15, [MED]: 15 },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  'dorade-grise': {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (Spondyliosoma cantharus)',
    minSizeCm: { [MA]: 23, [MED]: 23 },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  pageot: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe Méditerranée) ; règlement (CE) 1967/2006 (Pagellus erythrinus)',
    minSizeCm: { [MA]: null, [MED]: 15 },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  oblade: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié ; règlement (CE) 1967/2006 — l’oblade n’y figure pas',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [
      {
        facade: MED,
        zone: 'Parc naturel marin du Golfe du Lion (entre Cerbère et Leucate)',
        perDay: 10,
        note: 'Parc naturel marin du Golfe du Lion : maille locale 20 cm + 10 poissons/jour + autorisation requise (arrêté préfectoral du 12/02/2024).',
      },
    ],
    closedWindows: [],
  },
  maigre: {
    verifiedAt: '23/06/2026',
    source:
      'Arrêté du 26 octobre 2012 modifié (relevé par l’arrêté du 23 août 2022) ; arrêté du 17 mai 2011 modifié (marquage)',
    minSizeCm: { [MA]: 50, [MED]: 45 },
    marquage: true,
    dailyQuota: [],
    closedWindows: [],
  },
  tacaud: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié ; règlement (UE) 2019/1241 — le tacaud n’y figure pas',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  chinchard: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (Trachurus spp., taille minimale pêche de loisir)',
    minSizeCm: { [MA]: 15, [MED]: 15 },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  plie: {
    verifiedAt: '23/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (Pleuronectes platessa)',
    minSizeCm: { [MA]: 27, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  // ── Sprint 29 : +6 espèces (recherche sourcée+datée 24/06/2026 → docs/sprint-29/regulation-research.md) ──
  barracuda: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (tailles minimales pêche de loisir) — le barracuda (Sphyraena spp.) n’y figure pas',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  tassergal: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié — le tassergal (Pomatomus saltatrix) n’y figure pas ; arrêté du 17 mai 2011 modifié (marquage) — non listé',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  liche: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié — la liche (Lichia amia) n’y figure pas',
    minSizeCm: { [MA]: null, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  marbre: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe Méditerranée, Lithognathus mormyrus)',
    minSizeCm: { [MA]: null, [MED]: 20 },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
  'lieu-noir': {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe I, Pollachius virens) ; arrêté du 17 mai 2011 modifié (marquage, « lieu jaune/noir »)',
    minSizeCm: { [MA]: 35, [MED]: null },
    marquage: true,
    dailyQuota: [],
    closedWindows: [],
  },
  merlan: {
    verifiedAt: '24/06/2026',
    source: 'Arrêté du 26 octobre 2012 modifié (annexe I, Merlangius merlangus)',
    minSizeCm: { [MA]: 27, [MED]: null },
    marquage: false,
    dailyQuota: [],
    closedWindows: [],
  },
}
