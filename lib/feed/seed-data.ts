// Données de seed du fil (Bloc I) — DEV/PREVIEW uniquement.
// Source unique partagée par la route /dev/seed-feed (insertion via admin client)
// et miroir du fichier supabase/seed_sprint_8.sql.
// 6 pêcheurs bretons (29/56/22), 12 prises, 24 posts (12 texte + 12 ancrés sur prise).

export type SeedAuthor = {
  id: string
  username: string
  displayName: string
  dept: string
  techniques: string[]
  species: string[]
}

export type SeedCatch = {
  authorIdx: number
  species: string
  sizeCm: number
  weightG: number
  daysAgo: number
}

export type SeedPost = {
  authorIdx: number
  region: string
  daysAgo: number
  text?: string
  catchIdx?: number
}

export const SEED_AUTHORS: SeedAuthor[] = [
  { id: 'd0000000-0000-4000-8000-000000000001', username: 'yann_bzh', displayName: 'Yann', dept: '29', techniques: ['leurres', 'surfcasting'], species: ['bar', 'lieu_jaune'] },
  { id: 'd0000000-0000-4000-8000-000000000002', username: 'morgane_29', displayName: 'Morgane', dept: '29', techniques: ['surfcasting'], species: ['dorade_royale', 'sar'] },
  { id: 'd0000000-0000-4000-8000-000000000003', username: 'erwan_56', displayName: 'Erwan', dept: '56', techniques: ['leurres'], species: ['bar', 'maquereau'] },
  { id: 'd0000000-0000-4000-8000-000000000004', username: 'gwenola', displayName: 'Gwen', dept: '56', techniques: ['flottante', 'surfcasting'], species: ['dorade_royale'] },
  { id: 'd0000000-0000-4000-8000-000000000005', username: 'tanguy_22', displayName: 'Tanguy', dept: '22', techniques: ['leurres'], species: ['lieu_jaune', 'bar'] },
  { id: 'd0000000-0000-4000-8000-000000000006', username: 'soaz', displayName: 'Soaz', dept: '22', techniques: ['flottante'], species: ['maquereau', 'orphie'] },
]

export const SEED_CATCHES: SeedCatch[] = [
  { authorIdx: 0, species: 'bar', sizeCm: 62, weightG: 2400, daysAgo: 2 },
  { authorIdx: 1, species: 'dorade_royale', sizeCm: 38, weightG: 1100, daysAgo: 4 },
  { authorIdx: 2, species: 'bar', sizeCm: 55, weightG: 1800, daysAgo: 1 },
  { authorIdx: 3, species: 'dorade_royale', sizeCm: 41, weightG: 1500, daysAgo: 6 },
  { authorIdx: 4, species: 'lieu_jaune', sizeCm: 48, weightG: 1200, daysAgo: 3 },
  { authorIdx: 5, species: 'maquereau', sizeCm: 32, weightG: 350, daysAgo: 5 },
  { authorIdx: 0, species: 'bar', sizeCm: 70, weightG: 3100, daysAgo: 9 },
  { authorIdx: 2, species: 'maquereau', sizeCm: 30, weightG: 300, daysAgo: 8 },
  { authorIdx: 4, species: 'lieu_jaune', sizeCm: 52, weightG: 1400, daysAgo: 11 },
  { authorIdx: 1, species: 'sar', sizeCm: 35, weightG: 800, daysAgo: 7 },
  { authorIdx: 3, species: 'dorade_royale', sizeCm: 44, weightG: 1700, daysAgo: 12 },
  { authorIdx: 5, species: 'orphie', sizeCm: 58, weightG: 400, daysAgo: 10 },
]

// 12 posts texte libre (questions matos, alertes spot, conditions, retours de session).
const TEXT_POSTS: SeedPost[] = [
  { authorIdx: 0, region: '29', daysAgo: 0, text: 'Quelqu’un a tâté le bar ce matin vers la pointe ? Eau claire, petit coef, je tente ce soir au leurre souple.' },
  { authorIdx: 1, region: '29', daysAgo: 1, text: 'Alerte : pas mal de déchets sur la plage après la tempête. Pensez à ramener vos lignes, on partage le spot, on le respecte.' },
  { authorIdx: 2, region: '56', daysAgo: 2, text: 'Première sortie surfcasting de la saison demain. Des conseils montage pour la dorade par ici ?' },
  { authorIdx: 3, region: '56', daysAgo: 3, text: 'Coef 95 ce week-end, ça va dépoter dans les passes. Qui est chaud ?' },
  { authorIdx: 4, region: '22', daysAgo: 5, text: 'Le lieu est bien là en ce moment sur les tombants. Marée descendante = jackpot.' },
  { authorIdx: 5, region: '22', daysAgo: 6, text: 'Test du nouveau stickbait aujourd’hui, rien touché mais l’eau était à 11°C, encore un peu froid.' },
  { authorIdx: 0, region: '29', daysAgo: 7, text: 'Vent d’ouest 25 nœuds prévu jeudi, je range les cannes. Vous pêchez quand même ?' },
  { authorIdx: 2, region: '56', daysAgo: 8, text: 'Beau coucher de soleil et un maquereau en bonus. Parfois ça suffit au bonheur.' },
  { authorIdx: 4, region: '22', daysAgo: 9, text: 'Question matos : tresse 12 ou 15 centièmes pour le bord en rocher ? J’arrête pas de me faire couper.' },
  { authorIdx: 1, region: '29', daysAgo: 10, text: 'Orphie en surface au lever du jour, ça mord sur petit leurre brillant. La saison démarre.' },
  { authorIdx: 3, region: '56', daysAgo: 11, text: 'Spot du môle blindé de touristes le week-end. Allez-y en semaine, tôt le matin.' },
  { authorIdx: 5, region: '22', daysAgo: 13, text: 'Bilan du mois : 14 sorties, 9 bredouilles, mais 2 beaux bars. La pêche du bord, c’est de la patience.' },
]

// 12 posts ancrés sur une prise (caption courte). region = dept de l'auteur.
const CATCH_CAPTIONS = [
  '62 du bord au crépuscule, relâché. Quelle baston !',
  'Belle royale au surfcasting.',
  '55 en chasse ce matin, leurre de surface.',
  'Dorade pleine page sur tellines.',
  'Lieu jaune sur le tombant, marée descendante.',
  'Maquereau apéro, les bancs sont là.',
  'Le poisson de la semaine : 70 cm, record perso !',
  'Maquereaux à la pelle, parfait pour faire des vifs.',
  '52 de lieu, joli combat sur canne light.',
  'Sar des rochers, têtu comme pas deux.',
  'Royale du soir sur la passe.',
  'Orphie vert fluo, marrant à pêcher en surface.',
]

const CATCH_POSTS: SeedPost[] = SEED_CATCHES.map((c, i) => ({
  authorIdx: c.authorIdx,
  region: SEED_AUTHORS[c.authorIdx].dept,
  daysAgo: c.daysAgo,
  text: CATCH_CAPTIONS[i],
  catchIdx: i,
}))

export const SEED_POSTS: SeedPost[] = [...TEXT_POSTS, ...CATCH_POSTS]
