import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mots qui ne doivent jamais apparaître dans le texte affiché à l'utilisateur.
// Heuristique imparfaite (ne couvre que le texte entre > et <), mais attrape
// les fuites dev les plus évidentes — cf. fiche prise « Carte interactive · Sprint 5 ».
const FORBIDDEN_TERMS = ['sprint ', 'todo', 'fixme', 'xxx:', 'à compléter', 'lorem ipsum', 'placeholder']

// Pages et composants rendus côté utilisateur à surveiller.
const PATHS_TO_CHECK = [
  'app/(marketing)/page.tsx',
  'app/(marketing)/tarifs/page.tsx',
  'app/(marketing)/legal/mentions-legales/page.tsx',
  'app/(marketing)/legal/cgu/page.tsx',
  'app/(marketing)/legal/confidentialite/page.tsx',
  'app/(app)/home/page.tsx',
  'app/(app)/carnet/[id]/page.tsx',
]

describe('pas de jargon dev dans les pages destinées aux utilisateurs', () => {
  for (const path of PATHS_TO_CHECK) {
    it(`${path} ne contient aucun terme dev visible`, () => {
      const raw = readFileSync(join(process.cwd(), path), 'utf-8')
      // On retire les commentaires (JSX et JS) — ils ne sont pas affichés.
      const content = raw
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      // On n'inspecte que le texte affiché (entre > et <), pas le code ni les attributs.
      const visibleTextMatches = content.match(/>[^<>]*</g) ?? []
      for (const match of visibleTextMatches) {
        const lower = match.toLowerCase()
        for (const term of FORBIDDEN_TERMS) {
          expect(lower, `« ${term.trim()} » trouvé dans ${path} : ${match.trim()}`).not.toContain(term)
        }
      }
    })
  }
})
