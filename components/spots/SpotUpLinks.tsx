import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { DEPARTMENT_LABELS, departmentArticle } from '@/lib/geo/departments'
import { SPECIES, SPECIES_BY_DB_KEY, type SpeciesSlug } from '@/lib/seo/programmatic'

// ─── Liens remontants de fiche de spot (sprint 83, Bloc 2) ───────────────────
//
// Le maillage de la fiche était HORIZONTAL uniquement : spot → spot (sprint 76,
// Bloc 10). Rien ne remontait vers les pages de plus haut niveau qui, elles,
// concentrent l'autorité et se positionnent sur les requêtes larges. Ce bloc
// ajoute les trois remontées naturelles d'une fiche :
//   1. la landing du département  → /spots?dept=<code>   (déjà au sitemap)
//   2. la fiche de l'espèce principale → /especes/<slug> (page statique, 26 slugs)
//   3. le guide de technique, SEULEMENT s'il existe vraiment
//
// ⚠️ SERVER COMPONENT ASSUMÉ (pas de `'use client'`) : le bloc doit être dans le
// HTML servi, sans une ligne de JS. Corollaire : pas de `onClick`, donc pas
// d'événement analytics ici, contrairement à `NearbySpotsSection`.
//
// ⚠️ AUCUNE COORDONNÉE ne transite par ce composant : il ne reçoit qu'un code de
// département, des clés d'espèces et des clés de techniques.
//
// ⚠️ ZÉRO LIEN MORT PAR CONSTRUCTION, c'est la règle qui gouverne tout le fichier :
//   - le département n'est rendu que s'il est dans `DEPARTMENT_LABELS` ;
//   - l'espèce n'est rendue que via `SPECIES_BY_DB_KEY`, dont les 26 slugs sont
//     tous produits par `generateStaticParams` de /especes/[slug] ;
//   - le guide n'est rendu qu'à partir d'un objet renvoyé par `getAllGuides()`,
//     donc à partir d'un fichier `content/guides/<slug>.mdx` qui existe sur disque.
// On ne fabrique jamais un slug à la main (leçon des 941 URLs mortes du sitemap).

/** Forme minimale d'un guide (structurellement compatible avec `Guide` du loader). */
export type UpLinkGuide = {
  slug: string
  /** Libellé espèce du frontmatter (« Bar », « Multi-espèces »…), pas un slug. */
  species: string
  technique?: string
  category: string
}

export type UpLink = {
  href: string
  label: string
  kind: 'department' | 'species' | 'guide'
}

/**
 * Complément « à la <technique> » grammaticalement correct. Une technique
 * absente d'ici ne produit simplement aucun lien de guide : on préfère un lien
 * en moins à une tournure fabriquée (leçon du sprint 78).
 */
const TECHNIQUE_PHRASE: Record<string, string> = {
  leurres: 'au leurre',
  surfcasting: 'au surfcasting',
  flottante: 'à la flottante',
  vif: 'au vif',
}

/** Libellé espèce du frontmatter des guides → slug du référentiel. */
const SPECIES_BY_LABEL: Record<string, SpeciesSlug> = Object.fromEntries(
  (Object.entries(SPECIES) as [SpeciesSlug, (typeof SPECIES)[SpeciesSlug]][]).map(
    ([slug, m]) => [m.label, slug],
  ),
) as Record<string, SpeciesSlug>

/** « le bar », « la dorade royale », « l'orphie » (article collé, élision incluse). */
function speciesPhrase(slug: SpeciesSlug): string {
  const meta = SPECIES[slug]
  return `${meta.article.toLowerCase()}${meta.labelLower}`
}

/**
 * Les liens remontants d'une fiche. Fonction PURE (aucune I/O), donc testable
 * sur la donnée réelle.
 *
 * ⚠️ `spots.department` est un `char(3)` : PostgREST le renvoie complété par des
 * espaces (« 29 »). Sans `trim()`, `DEPARTMENT_LABELS['29 ']` est `undefined` et
 * le bloc département disparaît en silence. Bug déjà payé aux sprints 52 et 67 :
 * on trime ICI même quand l'appelant a déjà trimé.
 */
export function buildSpotUpLinks(input: {
  department: string
  /** Clés DB des espèces du spot (`spots.species`), l'espèce principale en tête. */
  species: readonly string[]
  /** Clés DB des techniques du spot (`spots.techniques`). */
  techniques: readonly string[]
  /** Guides publiés, tels que renvoyés par `getAllGuides()`. */
  guides: readonly UpLinkGuide[]
}): UpLink[] {
  const links: UpLink[] = []

  // 1. Landing département — déjà déclarée au sitemap avec son propre canonical.
  const deptKey = (input.department ?? '').trim()
  if (DEPARTMENT_LABELS[deptKey]) {
    links.push({
      kind: 'department',
      href: `/spots?dept=${deptKey}`,
      label: `Tous les spots ${departmentArticle(deptKey, 'de')}`,
    })
  }

  // 2. Fiche de l'espèce principale = la 1re espèce du spot qui existe au
  //    référentiel. `spots.species` est un text[] libre : une clé inconnue ne
  //    doit produire aucun lien plutôt qu'un /especes/<clé> en 404.
  const mainSpeciesSlug = input.species
    .map((key) => SPECIES_BY_DB_KEY[key])
    .find((slug): slug is SpeciesSlug => Boolean(slug))
  if (mainSpeciesSlug) {
    links.push({
      kind: 'species',
      href: `/especes/${mainSpeciesSlug}`,
      label: `Pêcher ${speciesPhrase(mainSpeciesSlug)} du bord`,
    })
  }

  // 3. Guide de technique — le lien le plus exigeant des trois, parce que
  //    l'ancre annonce une espèce ET une technique. On ne le rend donc QUE si le
  //    guide parle bien d'une espèce présente sur le spot ET d'une technique
  //    pratiquée sur le spot. Un spot méditerranéen à l'oblade au surfcasting ne
  //    reçoit pas « Pêcher l'oblade au surfcasting » sous prétexte qu'un guide
  //    surfcasting existe : ce guide parle de la dorade royale.
  const spotSpecies = new Set(input.species)
  const spotTechniques = new Set(input.techniques)
  const candidates = input.guides.filter((g) => {
    if (!g.technique || !spotTechniques.has(g.technique)) return false
    if (!TECHNIQUE_PHRASE[g.technique]) return false
    const slug = SPECIES_BY_LABEL[g.species]
    return Boolean(slug) && spotSpecies.has(SPECIES[slug].dbKey)
  })
  // Un guide de catégorie « Technique » décrit la technique elle-même ; les
  // autres (Marées, Matériel…) ne portent la technique qu'en second plan.
  const guide =
    candidates.find((g) => g.category === 'Technique') ?? candidates[0] ?? null
  if (guide?.technique) {
    const slug = SPECIES_BY_LABEL[guide.species]
    links.push({
      kind: 'guide',
      href: `/guides/${guide.slug}`,
      label: `Pêcher ${speciesPhrase(slug)} ${TECHNIQUE_PHRASE[guide.technique]}`,
    })
  }

  return links
}

export function SpotUpLinks({
  department,
  species,
  techniques,
  guides,
  className = '',
}: {
  department: string
  species: readonly string[]
  techniques: readonly string[]
  guides: readonly UpLinkGuide[]
  className?: string
}) {
  const links = buildSpotUpLinks({ department, species, techniques, guides })
  if (links.length === 0) return null

  return (
    <nav
      aria-label="Continuer ta recherche"
      className={`rounded-[18px] border border-sand-200 bg-white p-6 md:p-7 ${className}`}
    >
      <h2 className="font-display text-navy-900 text-xl mb-4">Continuer ta recherche</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex min-h-11 items-center justify-between gap-2 rounded-[12px] border border-sand-200 px-4 py-2.5 text-[14px] font-medium text-navy-900 transition-colors hover:border-teal-500/40 hover:text-teal-700"
            >
              <span>{link.label}</span>
              <ChevronRight
                size={15}
                className="shrink-0 text-ink-400 transition-colors group-hover:text-teal-600"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
