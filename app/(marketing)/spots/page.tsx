import { Fragment } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAnonClient } from '@/lib/supabase/anon'
import { signupWallTitleForFacet } from '@/lib/gating/wall'
import { SignupWall } from '@/components/map/SignupBanner'
import { SpotViewerBootstrap } from '@/components/spots/viewer/SpotViewerBootstrap'
import { SpotViewerProvider, AnonymousOnly, ConnectedOnly } from '@/components/spots/viewer/SpotViewerProvider'
import { SpotsDeptFold } from '@/components/spots/viewer/SpotsDeptFold'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS, COASTAL_DEPARTMENTS, departmentArticle } from '@/lib/geo/departments'

// ═══════════════════════════════════════════════════════════════════════════════
// ★ SPRINT 84, Bloc 3 — 1re page d'entrée organique du site.
//
// Ce qui a été fait : plus aucune lecture de session côté serveur. `getUserTier()`
// et le client Supabase à cookies sont partis ; le rendu est celui d'un visiteur
// sans compte, et la bascule connectée (retrait des murs, liste dépliée) se fait
// dans le navigateur (`components/spots/viewer/`). Gain immédiat et réel : un
// aller-retour réseau vers le serveur Auth de Supabase en MOINS par requête, sur la
// page qui reçoit le plus de trafic organique.
//
// ⚠️ CE QUI RESTE VRAI ET QU'IL NE FAUT PAS SE RACONTER : cette page N'EST PAS
// encore pré-rendue, et `revalidate = 3600` ci-dessous reste INERTE. Le brief du
// sprint 84 disait « même traitement que la fiche, la page redevient statique » :
// c'est faux, et la cause n'est pas l'auth.
//
//   Elle lit `searchParams` (les facettes `?dept=` / `?species=`, qui SONT des
//   pages d'atterrissage indexées). Dans Next 15, attendre `searchParams` au niveau
//   d'une page interrompt la génération statique ET force `revalidate = 0` — donc
//   ni pré-rendu, ni ISR, quoi qu'on écrive ici.
//   Référence : packages/next/src/server/request/search-params.ts,
//   `makeErroringSearchParams` → `throwToInterruptStaticGeneration`.
//
// Les deux sorties possibles, à arbitrer avec John (aucune n'est neutre) :
//   a. sortir les facettes de la query string vers de vrais segments
//      (`/spots/departement/[code]`), ce qui les rend pré-générables — c'est déjà
//      le plan esquissé par l'avertissement « penser à paginer » plus bas ;
//   b. envelopper le sous-arbre qui dépend de `searchParams` dans un `<Suspense>`
//      pour laisser une coquille statique se pré-rendre. ⚠️ À manier avec
//      précaution : au sprint 78 on a mesuré qu'un `<Suspense>` change l'ordre du
//      document SERVI, ce qui n'est pas anodin sur une page dont on mesure le CTR.
//
// Tant que l'un des deux n'est pas fait, ne PAS écrire ici que la page est en cache.
// ═══════════════════════════════════════════════════════════════════════════════

export const revalidate = 3600

const BASE_URL = 'https://www.carnet-de-peche.com'

/** Sprint 77, Bloc 3 : spots visibles par département avant dépliage (anonyme). */
const LIST_PREVIEW_PER_DEPT = 5

// ── Types ──────────────────────────────────────────────────────────────────────

type SpotRow = {
  id: string
  name: string
  slug: string
  department: string
  species: string[]
  techniques: string[]
  structure: string | null
  difficulty: number | null
}

type Props = {
  searchParams: Promise<{ dept?: string; species?: string }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildH1(dept?: string, species?: string): string {
  const speciesLabel = species ? (SPECIES_LABELS[species] ?? species) : null
  // Article accordé au département + code entre parenthèses (« dans les Alpes-Maritimes (06) »).
  const deptPhrase = dept ? `${departmentArticle(dept, 'dans')} (${dept})` : null
  if (speciesLabel && deptPhrase) return `Spots à ${speciesLabel} ${deptPhrase}`
  if (speciesLabel) return `Spots à ${speciesLabel} en France`
  if (deptPhrase) return `Spots de pêche ${deptPhrase}`
  return 'Spots de pêche à la canne du bord en France'
}

function buildDescription(dept?: string, species?: string): string {
  const sp = species ? (SPECIES_LABELS[species]?.toLowerCase() ?? species) : null
  const dp = dept ? departmentArticle(dept, 'dans') : null
  if (sp && dp)
    return `Tous les spots à ${sp} ${dp}. Fiches avec conditions météo, marées et prises de la communauté.`
  if (sp)
    return `Tous les spots à ${sp} sur le littoral français. Conditions, marées et scores d'activité par spot.`
  if (dp)
    return `Tous les spots de pêche à la canne du bord ${dp}. Fiches complètes avec données environnementales.`
  return 'Annuaire complet des spots de pêche à la canne du bord en France. Conditions météo, marées et prises récentes pour chaque spot.'
}

// ── Data ───────────────────────────────────────────────────────────────────────

async function fetchPublicSpots(dept?: string, species?: string): Promise<SpotRow[]> {
  const supabase = createAnonClient()
  let query = supabase
    .from('spots')
    .select('id, name, slug, department, species, techniques, structure, difficulty')
    .eq('visibility', 'public')
    .order('department', { ascending: true })
    .order('name', { ascending: true })
  if (dept) query = query.eq('department', dept)
  if (species) query = query.contains('species', [species])
  const { data, error } = await query
  if (error) {
    console.error('[SpotsPage] fetchPublicSpots:', error.message)
    return []
  }
  return (data ?? []) as SpotRow[]
}

// Facettes pour le maillage interne (sprint 57 WS-C) : départements et espèces ayant
// au moins un spot public → liens vers les landings /spots?dept= / /spots?species=.
// Requête légère (2 colonnes). ⚠️ Sprint 84 : elle n'est PAS mise en cache par
// `revalidate=3600`, contrairement à ce qui était écrit ici. Cette page lit
// `searchParams`, ce qui interrompt la génération statique et force `revalidate = 0`
// (cf le bandeau en tête de fichier) : la requête repart à chaque visite.
async function fetchSpotFacets(): Promise<{ depts: string[]; species: string[] }> {
  const supabase = createAnonClient()
  const { data } = await supabase
    .from('spots')
    .select('department, species')
    .eq('visibility', 'public')
  const depts = new Set<string>()
  const species = new Set<string>()
  for (const s of data ?? []) {
    if (s.department) depts.add(String(s.department).trim())
    for (const sp of (s.species as string[] | null) ?? []) if (sp) species.add(sp)
  }
  const deptList = [...depts].sort((a, b) => {
    const na = parseInt(a)
    const nb = parseInt(b)
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb
    return a.localeCompare(b)
  })
  const speciesList = [...species].sort((a, b) =>
    (SPECIES_LABELS[a] ?? a).localeCompare(SPECIES_LABELS[b] ?? b),
  )
  return { depts: deptList, species: speciesList }
}

function groupByDepartment(spots: SpotRow[]): [string, SpotRow[]][] {
  const map = new Map<string, SpotRow[]>()
  for (const spot of spots) {
    const key = String(spot.department).trim()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(spot)
  }
  // Tri numérique (29 avant 33, 2A/2B à leur place)
  return [...map.entries()].sort(([a], [b]) => {
    const na = parseInt(a)
    const nb = parseInt(b)
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb
    if (!isNaN(na) && isNaN(nb)) return -1
    if (isNaN(na) && !isNaN(nb)) return 1
    return a.localeCompare(b)
  })
}

// ── SEO ────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { dept, species } = await searchParams
  const title = `${buildH1(dept, species)} — Carnet de Pêche`
  const description = buildDescription(dept, species)
  const canonical = dept || species
    ? `${BASE_URL}/spots?${new URLSearchParams({ ...(dept ? { dept } : {}), ...(species ? { species } : {}) }).toString()}`
    : `${BASE_URL}/spots`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: buildH1(dept, species),
      description,
      url: canonical,
      type: 'website',
      images: [{ url: `${BASE_URL}/og/spots`, width: 1200, height: 630, alt: 'Spots de pêche en France — Carnet de Pêche' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: buildH1(dept, species),
      description,
      images: [`${BASE_URL}/og/spots`],
    },
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SpotCard({ spot }: { spot: SpotRow }) {
  const topSpecies = spot.species.slice(0, 3)
  const topTechniques = spot.techniques.slice(0, 2)
  const structureLabel = spot.structure ? (STRUCTURE_LABELS[spot.structure] ?? null) : null

  return (
    <Link
      href={`/spots/${spot.slug}`}
      className="group flex flex-col gap-3 bg-white border border-ink-100 rounded-[14px] p-4 hover:shadow-md hover:border-teal-500/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <div className="min-w-0">
        <p className="font-semibold text-navy-900 text-sm leading-snug group-hover:text-teal-700 transition-colors truncate">
          {spot.name}
        </p>
        {structureLabel && (
          <p className="text-xs text-ink-500 mt-0.5">{structureLabel}</p>
        )}
      </div>

      {topSpecies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topSpecies.map((s) => (
            <span key={s} className="text-[11px] bg-teal-500/10 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {SPECIES_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}

      {topTechniques.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {topTechniques.map((t) => (
            <span key={t} className="text-[11px] bg-navy-900/10 text-navy-900 px-2 py-0.5 rounded-full font-medium">
              {TECHNIQUE_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function SpotsPage({ searchParams }: Props) {
  const { dept, species } = await searchParams
  // Sprint 76, Bloc 9 : cette page est la 2e la plus vue du site et sa 1re source
  // de SORTIE, sans aucune surface de conversion.
  const [spots, facets] = await Promise.all([
    fetchPublicSpots(dept, species),
    fetchSpotFacets(),
  ])

  // Règle unique du sprint 75 : anonyme → mur d'INSCRIPTION (gratuit, zéro prix).
  // Inscrit gratuit et abonnés → rien ici, l'encart /tarifs de pied de page est
  // inchangé pour tout le monde.
  //
  // Sprint 84 : le rendu serveur est celui d'un anonyme, donc les murs sont
  // TOUJOURS dans le HTML mis en cache, et retirés dans le navigateur d'un
  // connecté avant la première peinture (`AnonymousOnly`).
  const wallTitle = signupWallTitleForFacet({
    deptPhrase: dept ? departmentArticle(dept, 'de') : null,
    speciesLabel: species ? (SPECIES_LABELS[species] ?? species).toLowerCase() : null,
  })
  const wallQuery = new URLSearchParams({
    ...(dept ? { dept } : {}),
    ...(species ? { species } : {}),
  }).toString()
  const wallRedirectTo = wallQuery ? `/spots?${wallQuery}` : '/spots'

  if (spots.length > 500) {
    console.warn(
      `[SpotsPage] ${spots.length} spots publics — penser à paginer ` +
      `(/spots/page/2) ou à splitter par département (/spots/departement/29)`
    )
  }

  const h1 = buildH1(dept, species)
  const grouped = groupByDepartment(spots)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    itemListElement: spots.map((spot, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/spots/${spot.slug}`,
      name: spot.name,
    })),
  }

  return (
    <SpotViewerProvider>
    <div>
      {/* Masque les blocs [data-anon-only] avant la première peinture pour un
          visiteur qui a un cookie de session. Voir components/spots/viewer/auth-hint.ts. */}
      <SpotViewerBootstrap />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-navy-900 pt-16 pb-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <h1 className="text-white font-display max-w-2xl">{h1}</h1>
          <p className="mt-4 text-white/60 max-w-2xl text-base leading-relaxed">
            {dept || species
              ? `${spots.length} spot${spots.length > 1 ? 's' : ''} trouvé${spots.length > 1 ? 's' : ''} : fiches détaillées avec conditions météo, marées et prises de la communauté.`
              : "Retrouve tous les spots de pêche à la canne du bord sur le littoral français. Chaque fiche intègre les conditions météo, les marées et les prises récentes pour que tu choisisses le bon spot au bon moment."}
          </p>
          <Link
            href="/carte"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Voir sur la carte
          </Link>
        </div>
      </section>

      {/* ── Filtres — form HTML GET, server-side ────────────────────────── */}
      <section className="bg-white border-b border-ink-100 py-5 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <form method="GET" action="/spots" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end flex-wrap">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label
                htmlFor="filter-dept"
                className="text-xs font-medium text-ink-500 uppercase tracking-wide"
              >
                Département
              </label>
              <select
                id="filter-dept"
                name="dept"
                defaultValue={dept ?? ''}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Tous les départements</option>
                {COASTAL_DEPARTMENTS.map((code) => (
                  <option key={code} value={code}>
                    {code} — {DEPARTMENT_LABELS[code] ?? code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label
                htmlFor="filter-species"
                className="text-xs font-medium text-ink-500 uppercase tracking-wide"
              >
                Espèce
              </label>
              <select
                id="filter-species"
                name="species"
                defaultValue={species ?? ''}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Toutes les espèces</option>
                {Object.entries(SPECIES_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-[10px] transition-colors whitespace-nowrap"
            >
              Filtrer
            </button>

            {(dept || species) && (
              <Link
                href="/spots"
                className="text-sm text-ink-500 hover:text-ink-700 transition-colors py-2.5"
              >
                Réinitialiser
              </Link>
            )}
          </form>
        </div>
      </section>

      {/* ── Corps — spots groupés par département ────────────────────────── */}
      <section className="bg-sand-50 py-10">
        <div className="max-w-[1280px] mx-auto px-6">
          {spots.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-semibold text-navy-900 text-lg mb-2">Aucun spot trouvé</p>
              <p className="text-sm text-ink-500 mb-6">
                Essaie un autre filtre ou reviens bientôt, la base grossit chaque semaine.
              </p>
              <Link
                href="/spots"
                className="inline-block px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-[10px] transition-colors"
              >
                Voir tous les spots
              </Link>
            </div>
          ) : (
            <div className="space-y-14">
              {grouped.map(([deptCode, deptSpots], groupIndex) => {
                // ─── Sprint 77, Bloc 3 : un extrait qui reste crawlable ──────
                // Un anonyme ne voit que les 5 premiers spots du département,
                // les autres sont repliés dans un <details> NATIF.
                //
                // ⚠️ C'est le point entier du bloc : le <details> est du HTML
                // servi, donc les liens repliés sont DANS le document, Google
                // les suit, et l'inventaire indexable ne perd pas une ligne.
                // C'est aussi ce qui distingue ce motif du cloaking : bot et
                // humain reçoivent exactement le même HTML, le repli est un
                // comportement de navigateur, pas une branche serveur.
                // Ne JAMAIS remplacer ça par un montage au clic.
                //
                // Sprint 84, Bloc 3 : le HTML est mis en cache, il porte donc
                // TOUJOURS la version repliée. `SpotsDeptFold` déplie dans le
                // navigateur d'un connecté, avant la première peinture.
                const preview = deptSpots.slice(0, LIST_PREVIEW_PER_DEPT)
                const folded = deptSpots.slice(LIST_PREVIEW_PER_DEPT)
                return (
                <div key={deptCode}>
                  <h2 className="font-display text-navy-900 text-xl mb-5">
                    {DEPARTMENT_LABELS[deptCode] ?? deptCode}
                    <span className="text-ink-500 text-base font-normal ml-2">
                      · {deptSpots.length} spot{deptSpots.length > 1 ? 's' : ''}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {preview.map((spot, i) => (
                      <Fragment key={spot.id}>
                        <SpotCard spot={spot} />
                        {/* Mur d'inscription (Bloc 9) : glissé DANS le premier
                            groupe après 3 cartes, sur toute la largeur de la
                            grille. Le brief disait « après le premier groupe de
                            département » : sur `?dept=56` ce groupe fait 105
                            spots, le mur serait tombé aussi bas qu'un pied de
                            page (exactement ce que le brief voulait éviter).
                            Après 3 cartes, il est atteint dans le 1er écran et
                            demi en 390 px, quelle que soit la facette. */}
                        {groupIndex === 0 &&
                          i === Math.min(2, preview.length - 1) && (
                            <AnonymousOnly>
                              <SignupWall
                                surface="spots_list"
                                title={wallTitle}
                                redirectTo={wallRedirectTo}
                                className="sm:col-span-2 lg:col-span-3"
                              />
                            </AnonymousOnly>
                          )}
                      </Fragment>
                    ))}
                  </div>

                  {folded.length > 0 && (
                    <SpotsDeptFold
                      summary={
                        <>
                          Voir les {folded.length} autres spots{' '}
                          {departmentArticle(deptCode, 'de')}
                        </>
                      }
                    >
                      {folded.map((spot) => (
                        <SpotCard key={spot.id} spot={spot} />
                      ))}
                    </SpotsDeptFold>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Maillage interne : landings par département & espèce (SEO) ───── */}
      <section className="bg-sand-50 pb-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <h2 className="font-display text-navy-900 text-xl mb-5">Explorer les spots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-3">
                Par département
              </p>
              <div className="flex flex-wrap gap-2">
                {facets.depts.map((code) => (
                  <Link
                    key={code}
                    href={`/spots?dept=${code}`}
                    aria-current={dept === code ? 'page' : undefined}
                    className="inline-flex items-center gap-1.5 text-[13px] rounded-full border border-ink-200 bg-white px-3 py-1.5 text-ink-700 transition-colors hover:border-teal-500/50 hover:text-teal-700 aria-[current=page]:border-teal-500 aria-[current=page]:bg-teal-500/10 aria-[current=page]:font-semibold aria-[current=page]:text-teal-700"
                  >
                    {DEPARTMENT_LABELS[code] ?? code}
                    <span className="font-mono text-ink-400">{code}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-3">
                Par espèce
              </p>
              <div className="flex flex-wrap gap-2">
                {facets.species.map((sp) => (
                  <Link
                    key={sp}
                    href={`/spots?species=${sp}`}
                    aria-current={species === sp ? 'page' : undefined}
                    className="text-[13px] rounded-full border border-ink-200 bg-white px-3 py-1.5 text-ink-700 transition-colors hover:border-teal-500/50 hover:text-teal-700 aria-[current=page]:border-teal-500 aria-[current=page]:bg-teal-500/10 aria-[current=page]:font-semibold aria-[current=page]:text-teal-700"
                  >
                    {SPECIES_LABELS[sp] ?? sp}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bas de page : mur d'inscription OU upsell, jamais les deux ─────
          ⚠️ SPRINT 79, Bloc 5. Cette section vendait « Abonnement Local à partir
          de 4,90 €/mois » à TOUT LE MONDE, visiteurs sans compte compris. C'était
          la seule surface du site à le faire (vérifié le 15/08 en anonyme sur
          /carte, /spots, /spots/[slug] et /especes/bar : ici et nulle part
          ailleurs). 158 `paywall_viewed` sur mobile en 90 jours, pour 4 abonnés
          payants au total : un visiteur sur deux qui rencontrait un mur
          rencontrait un mur PAYANT, avant même d'avoir un compte.

          Un anonyme n'a rien à acheter, il a un carnet gratuit à créer. Un
          inscrit gratuit, lui, garde l'upsell : c'est lui la cible.

          ⚠️ Le titre et la meta description de /spots ne bougent pas : le témoin
          de sortie du sprint (CTR Google de /spots, 7,2 %) se joue là, pas ici. */}
      <section className="bg-white py-12 border-t border-ink-100">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <AnonymousOnly>
            <SignupWall
              surface="spots_index_footer"
              intro="Tes spots de côté, tes prises loguées, les marées de chacun d'eux."
              className="mx-auto max-w-md text-left"
            />
          </AnonymousOnly>
          {/* Upsell abonnement : jamais dans le HTML mis en cache (règle sprint 79,
              Bloc 5 — un visiteur sans compte n'a rien à acheter, et c'est SA
              version qui est mise en cache). Monté après résolution, en pied de
              page : il ne pousse aucun contenu. */}
          <ConnectedOnly>
            <h2 className="font-display text-navy-900 text-2xl mb-3">
              Accède aux coordonnées précises
            </h2>
            <p className="text-ink-500 mb-6 text-sm leading-relaxed max-w-md mx-auto">
              GPS exact et données de marée sur chaque spot. Abonnement Local à partir de
              4,90 €/mois.
            </p>
            <Link
              href="/tarifs"
              className="inline-block px-8 py-3 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors text-sm"
            >
              Voir les formules
            </Link>
          </ConnectedOnly>
        </div>
      </section>
    </div>
    </SpotViewerProvider>
  )
}
