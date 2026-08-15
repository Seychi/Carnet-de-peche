import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Sprint 81, Bloc 4 — `catch_log_abandoned` doit partir sur MOBILE aussi.
 *
 * Sur 90 jours, l'événement n'apparaissait qu'en Desktop. La cause n'était pas
 * une propriété perdue : il ne partait jamais. Il était accroché à
 * `beforeunload`, que **Safari iOS ne déclenche pas** quand on quitte une page
 * (la page part en bfcache), et que Chrome Android honore mal. Sur un site dont
 * 82 % du trafic est mobile, on mesurait l'abandon des 18 % restants et on
 * lisait « 0 abandon mobile » comme un fait produit.
 *
 * L'environnement Vitest de ce dépôt est `node` : pas de DOM, donc pas de
 * simulation d'événement. Ce test verrouille le CONTRAT dans la source, et
 * surtout la régression exacte qui le casserait : le retour de `beforeunload`.
 */

const SOURCE = readFileSync(
  path.resolve(__dirname, '..', 'CatchForm.tsx'),
  'utf8',
)

/** Source hors commentaires : le POURQUOI du correctif cite forcément l'API retirée. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('catch_log_abandoned', () => {
  it("n'est plus accroché à beforeunload (jamais déclenché par Safari iOS)", () => {
    expect(CODE).not.toContain('beforeunload')
  })

  it('écoute les deux signaux fiables : visibilitychange et pagehide', () => {
    expect(SOURCE).toContain("addEventListener('visibilitychange'")
    expect(SOURCE).toContain("addEventListener('pagehide'")
    expect(SOURCE).toContain("visibilityState === 'hidden'")
  })

  it('déduplique : une page peut passer cachée plusieurs fois, l\'abandon compte une fois', () => {
    expect(SOURCE).toContain('abandonSentRef')
    expect(SOURCE).toMatch(
      /if \(submittedRef\.current \|\| abandonSentRef\.current\) return/,
    )
  })

  it("n'émet pas d'abandon après un enregistrement réussi", () => {
    // `submittedRef` est posé à true dans les chemins de soumission ; la garde
    // ci-dessus doit le lire AVANT d'émettre.
    const guard = SOURCE.slice(SOURCE.indexOf('function reportAbandon'))
    expect(guard.slice(0, 260)).toContain('submittedRef.current')
  })

  it('retire bien ses deux écouteurs au démontage', () => {
    expect(SOURCE).toContain("removeEventListener('visibilitychange'")
    expect(SOURCE).toContain("removeEventListener('pagehide'")
  })
})
