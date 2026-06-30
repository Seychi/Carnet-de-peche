import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * Filet anti-régression de navigation (sprint 27, Bloc 4).
 *
 * But : qu'AUCUNE page finie ne redevienne orpheline. Si une destination cible
 * n'est plus reliée par AUCUNE surface de nav du shell, ce test échoue — pour
 * tous les sprints futurs.
 *
 * Pourquoi un scan de SOURCE et non un rendu Testing Library : le harness Vitest
 * du projet tourne en environnement `node` (pas de jsdom, pas de @testing-library
 * /react installés — cf vitest.config.ts). Monter jsdom + RTL + mocker
 * next/navigation, les portails base-ui (Sheet) et les Server Actions serait lourd
 * et fragile pour un sprint nav/UI. Le scan de source couvre exactement le critère
 * d'acceptation ("un test échoue si une page cible n'est plus reliée à aucune
 * surface de nav"). L'a11y au runtime (focus, clavier, Esc, cibles ≥ 44 px) est
 * vérifiée en navigateur réel par qa-chrome (Bloc 4 tâche 3).
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const layoutDir = path.resolve(here, '..') // components/layout
const componentsDir = path.resolve(layoutDir, '..') // components

// Les surfaces de nav du shell app + le menu avatar (partagé app/marketing).
const NAV_SURFACES: Record<string, string> = {
  AppSidebar: path.join(layoutDir, 'AppSidebar.tsx'),
  UserMenu: path.join(layoutDir, 'UserMenu.tsx'),
  MoreMenu: path.join(layoutDir, 'MoreMenu.tsx'),
  TabBar: path.join(layoutDir, 'TabBar.tsx'),
  MobileNav: path.join(componentsDir, 'mobile-nav.tsx'),
}

// Destinations finies qui DOIVENT rester atteignables depuis ≥ 1 surface de nav.
const REQUIRED_DESTINATIONS = [
  '/home',
  '/carnet',
  '/carte',
  '/fil',
  '/follows',
  '/sorties',
  '/especes',
  '/guides',
  '/notifications',
  '/profil',
  '/compte/abonnement',
  '/spots/proposer',
  '/spots/mes-propositions',
] as const

/** Extrait tous les href déclarés d'un fichier (JSX `href="..."` ET objet `href: '...'`). */
function extractHrefs(source: string): Set<string> {
  const hrefs = new Set<string>()
  const re = /href(?:=|:)\s*["'`]([^"'`]+)["'`]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) hrefs.add(m[1])
  return hrefs
}

const SURFACE_HREFS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(NAV_SURFACES).map(([name, file]) => [name, extractHrefs(readFileSync(file, 'utf8'))]),
)

const ALL_HREFS = new Set<string>(Object.values(SURFACE_HREFS).flatMap((s) => [...s]))

describe('atteignabilité nav (sprint 27)', () => {
  it.each(REQUIRED_DESTINATIONS)('« %s » est relié par au moins une surface de nav', (dest) => {
    const surfaces = Object.entries(SURFACE_HREFS)
      .filter(([, hrefs]) => hrefs.has(dest))
      .map(([name]) => name)
    expect(
      surfaces.length,
      `Aucune surface de nav ne relie ${dest}. Surfaces inspectées : ${Object.keys(NAV_SURFACES).join(', ')}.`,
    ).toBeGreaterThan(0)
  })

  it('le FAB « Loguer » (/carnet/nouvelle) reste présent dans la tab bar', () => {
    expect(SURFACE_HREFS.TabBar.has('/carnet/nouvelle')).toBe(true)
  })

  it('Notifications et Co-pêchage sont atteignables (sprint 27 : sortis de l’oubli)', () => {
    expect(ALL_HREFS.has('/notifications')).toBe(true)
    expect(ALL_HREFS.has('/sorties')).toBe(true)
  })

  it('« Mes sorties » (/carnet/sorties) est lié depuis le carnet, dé-gaté (sprint 54)', () => {
    const carnetPage = path.resolve(here, '../../../app/(app)/carnet/page.tsx')
    const src = readFileSync(carnetPage, 'utf8')
    expect(src).toContain('/carnet/sorties')
    // Plus de condition de volume : le lien ne dépend plus de totalOutings > 0.
    expect(src).not.toContain('outingStats.totalOutings > 0')
  })
})

describe('a11y nav — invariants vérifiables en statique', () => {
  // Seules les surfaces PERSISTANTES (rails toujours visibles) doivent marquer la
  // page courante via aria-current. Les menus TRANSIENTS (avatar UserMenu, drawer
  // MobileNav) sont des listes de liens, pas des indicateurs de position → pas
  // d'aria-current attendu.
  const PERSISTENT_SURFACES = ['AppSidebar', 'TabBar', 'MoreMenu']
  it.each(PERSISTENT_SURFACES)('%s marque l’état actif via aria-current', (name) => {
    const src = readFileSync(NAV_SURFACES[name], 'utf8')
    expect(src.includes('aria-current')).toBe(true)
  })

  it('MoreMenu : cibles ≥ 44 px (min-h-11) et fermeture clavier/Esc via le primitive Sheet', () => {
    const src = readFileSync(NAV_SURFACES.MoreMenu, 'utf8')
    expect(src.includes('min-h-11')).toBe(true) // 44 px
    expect(src.includes('@/components/ui/sheet')).toBe(true) // base-ui : focus trap + Esc + tap extérieur
    expect(src.includes('motion-reduce')).toBe(true) // prefers-reduced-motion respecté
  })
})
