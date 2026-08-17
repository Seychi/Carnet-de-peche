import { describe, it, expect, vi } from 'vitest'

// Sprint 85, Bloc 1 — `/auth/login` sort de l'index.
//
// LE FAIT : 23 personnes sur 90 jours entraient sur le site par la page de
// CONNEXION (4e page d'entrée), parce que le sitemap la déclarait à Google en
// priorité 0.5. Quelqu'un qui arrive d'un moteur sur une page de connexion n'a
// par définition pas de compte : on lui montrait un formulaire qui suppose qu'il
// en a un. La bonne porte, c'est `/auth/register`, qui reste déclarée.
//
// ⚠️ Garde-fou du sprint 83 (fenêtre de mesure jusqu'au 07/09) : le sitemap porte
// aussi les fiches spots, les espèces et les pages /peche, toutes en cours de
// mesure. Ce test verrouille que la SEULE entrée retirée est `/auth/login` :
// le reste du sitemap est compté et doit rester strictement identique.

const SPOTS = [
  { slug: 'pointe-du-raz', updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', department: '29', species: ['bar'] },
  { slug: 'pointe-des-chats', updated_at: '2026-01-02T00:00:00Z', created_at: '2026-01-02T00:00:00Z', department: '56', species: ['bar', 'lieu_jaune'] },
]

// `lib/guides/loader` importe `server-only` (interdit hors Server Component) :
// on le remplace par un jeu fixe, la liste des guides n'est pas le sujet ici.
vi.mock('@/lib/guides/loader', () => ({
  getAllGuides: async () => [
    { slug: 'peche-au-bar-au-leurre', updated_at: '2026-01-01', published_at: '2026-01-01' },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          // deuxième .eq() → thenable qui résout la requête
          eq: () => Promise.resolve({ data: SPOTS, error: null }),
        }),
      }),
    }),
  }),
}))

const BASE = 'https://www.carnet-de-peche.com'

async function urls(): Promise<string[]> {
  const sitemap = (await import('@/app/sitemap')).default
  const entries = await sitemap()
  return entries.map((e) => e.url)
}

describe('sitemap — /auth/login retirée, /auth/register conservée', () => {
  it("ne déclare plus la page de connexion", async () => {
    const list = await urls()
    expect(list).not.toContain(`${BASE}/auth/login`)
    // Aucune variante non plus (?tab=register, ?redirect=…) : la page de
    // connexion ne doit apparaître sous AUCUNE forme dans le sitemap.
    expect(list.filter((u) => u.includes('/auth/login'))).toEqual([])
  })

  it("déclare toujours la page d'inscription (la bonne porte)", async () => {
    const list = await urls()
    expect(list).toContain(`${BASE}/auth/register`)
  })

  it("n'a retiré QUE cette entrée : le reste du sitemap est intact (sprint 83)", async () => {
    const list = await urls()
    // Référence gelée le 2026-08-17 avec le jeu de spots ci-dessus : 10 pages
    // statiques (11 avant le retrait de /auth/login). Si ce nombre bouge, c'est
    // qu'une autre entrée statique a été touchée → la mesure du sprint 83 est
    // perturbée.
    const staticUrls = list.filter(
      (u) => !u.includes('/spots') && !u.includes('/guides/') && !u.includes('/peche/') && !u.includes('/especes/'),
    )
    expect(staticUrls).toEqual([
      BASE,
      `${BASE}/carte`,
      `${BASE}/tarifs`,
      `${BASE}/guides`,
      `${BASE}/fil`,
      `${BASE}/especes`,
      `${BASE}/declarer-ses-prises`,
      `${BASE}/contact`,
      `${BASE}/auth/register`,
    ])
  })
})
