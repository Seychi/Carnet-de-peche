import { describe, it, expect } from 'vitest'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Sprint 79, Bloc 6 — longueur des `<title>` et des meta descriptions.
 *
 * C'est la DEUXIÈME fois que le critère « aucun titre > 60 » saute : il avait été
 * posé au Bloc 4 du sprint 78, et `/especes` servait un titre de 76 caractères le
 * 15/08. Un critère d'acceptation qui ne tient qu'à une relecture humaine ne tient
 * pas. Celui-ci se relit tout seul.
 *
 * Bornes : Google affiche ~60 caractères de titre et ~155 de description. Au-delà,
 * c'est tronqué, donc perdu — sur la home, 2 100 impressions par mois.
 *
 * Portée : les pages à métadonnées STATIQUES (`export const metadata`). Les titres
 * construits par `generateMetadata` (fiches de spots, d'espèces) ont leur propre
 * garde-fou côté génération : ce test ne prétend pas les couvrir, et il vaut mieux
 * une couverture honnête et vérifiable qu'une passoire qui rassure.
 */

const TITLE_MAX = 60
const DESCRIPTION_MAX = 155

const APP_DIR = path.resolve(__dirname, '..', 'app')

/** Pages dont le titre reçoit un suffixe de template (`app/auth/layout.tsx`). */
const TITLE_TEMPLATE_SUFFIX = ' · Carnet de Pêche'
const TEMPLATED_PREFIX = path.join('app', 'auth')

function walkPages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return walkPages(full)
    return entry === 'page.tsx' ? [full] : []
  })
}

/**
 * Concatène les littéraux d'une valeur de métadonnée. Gère `'a' + \`b\` + 'c'`,
 * la forme la plus courante ici. Renvoie `null` si la valeur est calculée
 * (interpolation) : on ne mesure alors que ce qui est mesurable, sans inventer.
 */
function literalValue(block: string, key: 'title' | 'description'): string | null {
  const start = block.search(new RegExp(`\\n\\s{2}${key}:\\s`))
  if (start < 0) return null
  const rest = block.slice(start + 1)
  // La valeur s'arrête à la prochaine clé de premier niveau ou à la fin de l'objet.
  const end = rest.search(/\n {2}[a-zA-Z_$]+:\s|\n\}/)
  const raw = end < 0 ? rest : rest.slice(0, end)
  if (raw.includes('${')) return null
  const literals = [...raw.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)]
  if (literals.length === 0) return null
  return literals
    .map((m) => m[1] ?? m[2] ?? m[3])
    .join('')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
}

type PageMeta = { route: string; title: string | null; description: string | null }

const pages: PageMeta[] = walkPages(APP_DIR)
  .map((file) => {
    const source = readFileSync(file, 'utf8')
    const at = source.indexOf('export const metadata')
    if (at < 0) return null
    const block = source.slice(at, at + 2500)
    const rel = path.relative(path.resolve(__dirname, '..'), file)
    const templated = rel.startsWith(TEMPLATED_PREFIX)
    const rawTitle = literalValue(block, 'title')
    return {
      route: rel.replace(/\\/g, '/'),
      title: rawTitle === null ? null : templated ? rawTitle + TITLE_TEMPLATE_SUFFIX : rawTitle,
      description: literalValue(block, 'description'),
    }
  })
  .filter((p): p is PageMeta => p !== null)

describe('SEO — longueur des métadonnées statiques', () => {
  it('trouve bien les pages à métadonnées statiques (garde anti-test-vide)', () => {
    // Sans ça, une régression du parseur rendrait la suite verte pour rien.
    expect(pages.length).toBeGreaterThan(10)
    expect(pages.some((p) => p.title !== null)).toBe(true)
    expect(pages.some((p) => p.description !== null)).toBe(true)
  })

  it(`aucun <title> au-dessus de ${TITLE_MAX} caractères`, () => {
    const tooLong = pages
      .filter((p) => p.title !== null && p.title.length > TITLE_MAX)
      .map((p) => `${p.route} — ${p.title!.length} car. : ${p.title}`)
    expect(tooLong).toEqual([])
  })

  it(`aucune meta description au-dessus de ${DESCRIPTION_MAX} caractères`, () => {
    const tooLong = pages
      .filter((p) => p.description !== null && p.description.length > DESCRIPTION_MAX)
      .map((p) => `${p.route} — ${p.description!.length} car.`)
    expect(tooLong).toEqual([])
  })
})
