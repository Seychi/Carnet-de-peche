import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Sprint 79, Blocs 1 et 2 — le bas de `/carte` ne doit plus se superposer.
 *
 * Mesuré en production le 15/08 en émulation iPhone 13 (390 x 664), sans cookie
 * de consentement : bandeau de consentement z-60 de 484 a 652, barre
 * d'inscription z-40 de 514 a 664. 138 px de recouvrement sur 150, et
 * `document.elementFromPoint()` au centre de « Créer mon carnet » renvoyait le
 * bandeau. Le CTA qui porte 44 % des murs d'inscription mobiles du site était
 * inatteignable au doigt pour tout visiteur n'ayant pas encore répondu.
 *
 * L'environnement Vitest de ce dépôt est `node` : il n'y a pas de moteur de mise
 * en page ici, donc pas de mesure de rectangles. Ce que ce test verrouille, c'est
 * le CONTRAT qui produit l'empilement, et surtout les régressions exactes qui le
 * casseraient en silence : une classe retirée, ou un `bottom` remis en style
 * inline (qui gagne sur la feuille de style et rétablirait le recouvrement).
 * La mesure de rectangles, elle, se fait en QA navigateur.
 */

const root = path.resolve(__dirname, '../../..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')

const GLOBALS = read('app/globals.css')
const SIGNUP = read('components/map/SignupBanner.tsx')
const UPSELL = read('components/map/UpsellBanner.tsx')
const MAPSHELL = read('components/map/MapShell.tsx')

describe('bas de carte : on empile, on ne se dispute pas le z-index', () => {
  it('la feuille de style adosse les barres collantes au bandeau de consentement', () => {
    expect(GLOBALS).toContain('[data-consent-pending] .sticky-bottom-bar')
    expect(GLOBALS).toMatch(
      /\[data-consent-pending\] \.sticky-bottom-bar \{[^}]*var\(--consent-banner-height/,
    )
  })

  it('la colonne de boutons flottants s\'adosse au bandeau ET à la barre', () => {
    const rule = GLOBALS.match(/\.map-fab-stack \{[^}]*\}/)
    expect(rule, '.map-fab-stack doit exister dans app/globals.css').not.toBeNull()
    const body = rule![0]
    // Les deux étages, sinon la colonne repasse par-dessus l'un des deux.
    expect(body).toContain('--consent-banner-height')
    expect(body).toContain('--map-bottom-bar-height')
    // La safe area iOS ne doit pas disparaître au passage.
    expect(body).toContain('safe-area-inset-bottom')
  })

  it.each([
    ['SignupBanner', SIGNUP],
    ['UpsellBanner', UPSELL],
  ])('%s porte sticky-bottom-bar et publie sa hauteur réelle', (_name, source) => {
    expect(source).toContain('sticky-bottom-bar fixed bottom-0')
    expect(source).toContain('useBottomBarHeight')
    expect(source).toContain('ref={barRef}')
  })

  // ── Sprint 81, Bloc 2 (décision John du 15/08) ────────────────────────────
  // Le bandeau de consentement RESTE, mais on n'empile plus deux sollicitations.
  // Mesuré en production le 15/08 en 390 × 664 : FAB 124 px + barre 150 px +
  // bandeau 191 px = 489 px sur 664, soit 74 % de l'écran, pour 175 px de carte.
  // Rien ne se recouvrait (le sprint 79 tient), il n'y avait plus de place.
  it.each([
    ['SignupBanner', SIGNUP],
    ['UpsellBanner', UPSELL],
  ])('%s ne se monte pas tant que le bandeau de consentement est à l\'écran', (_name, source) => {
    expect(source).toContain('useConsentBannerVisible')
    expect(source).toContain('const shown = visible && !consentBannerVisible')
    // ⚠️ On DÉMONTE, on ne masque pas : un composant masqué en CSS resterait
    // monté et enverrait quand même son événement « vu », ce qui gonflerait le
    // témoin du sprint 79 dans le sens flatteur.
    expect(source).toContain('if (!shown) return null')
  })

  it.each([
    ['SignupBanner', SIGNUP, 'signupWallViewed'],
    ['UpsellBanner', UPSELL, 'paywallViewed'],
  ])(
    "%s n'émet son événement « vu » que s'il est réellement affiché",
    (_name, source, event) => {
      // L'effet qui émet doit être gardé par `shown`, pas par `visible`.
      const effect = source.slice(source.indexOf(`analytics.${event}`) - 400)
      expect(effect).toContain('if (!shown) return')
      expect(source).toMatch(/\}, \[shown\]\)/)
    },
  )

  it('la colonne de FAB porte la classe et ne fixe aucun bottom en style inline', () => {
    expect(MAPSHELL).toContain('map-fab-stack')

    // ⚠️ LA régression à empêcher : un `bottom` inline gagne sur la classe.
    const fabBlock = MAPSHELL.slice(MAPSHELL.indexOf('map-fab-stack'))
    const inlineStyle = fabBlock.slice(0, fabBlock.indexOf('>'))
    expect(inlineStyle).not.toMatch(/bottom:/)
  })

  it('aucun élément du bas de carte ne monte au-dessus du bandeau de consentement', () => {
    // Le bandeau de consentement est en z-[60]. Si une barre du bas passait
    // au-dessus, le REFUS des cookies deviendrait inaccessible : c'est le
    // correctif qu'il ne faut surtout pas faire.
    for (const [name, source] of [
      ['SignupBanner', SIGNUP],
      ['UpsellBanner', UPSELL],
    ] as const) {
      const zIndexes = [...source.matchAll(/\bz-\[?(\d+)\]?\b/g)].map((m) => Number(m[1]))
      for (const z of zIndexes) {
        expect(z, `${name} : z-index ${z} >= 60, le bandeau de consentement passerait dessous`).toBeLessThan(60)
      }
    }
  })
})

describe('Bloc 2 : aucun CTA d\'inscription ne mène à la page de connexion', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : walk(full)
      return /\.tsx?$/.test(entry) ? [full] : []
    })
  }

  it('plus aucun href de composant ne pointe vers /auth/login?tab=register', () => {
    const offenders = walk(path.join(root, 'components')).filter((file) =>
      /href=["'`][^"'`]*auth\/login\?tab=register/.test(readFileSync(file, 'utf8')),
    )
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })

  it('MapShell ne rend plus le second bandeau anonyme (doublon inatteignable)', () => {
    // Hors commentaires : le pourquoi de la suppression est documenté DANS le
    // fichier, et il cite forcément la copie supprimée.
    const code = MAPSHELL.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toContain('3 spots gratuits par département')
    expect(code).not.toContain('auth/login?tab=register')
  })
})
