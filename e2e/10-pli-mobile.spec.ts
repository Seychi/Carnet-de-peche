import { test, expect, devices, type Page } from '@playwright/test'

// Garde-fou du PREMIER ÉCRAN des gabarits SEO (sprint 87, Bloc 5).
//
// ★ Sa raison d'être, en une phrase : le sprint 75 a corrigé `/especes` sur
// exactement ce critère, et `/peche` a dérivé pendant DOUZE sprints sans que rien
// ne le signale. Une règle qu'aucune commande ne vérifie n'est pas une règle.
//
// Ce test double `scripts/measure-fold.mjs` volontairement : le script sert à
// mesurer et à comparer (il affiche des chiffres), le test sert à INTERDIRE la
// régression en CI.
//
// ⚠️ Chrome desktop sous Windows refuse de descendre sous ~500 px de large : la QA
// du 17/08 s'est faite en 501 x 660, pas en 390 x 844. D'où l'émulation d'appareil,
// seule façon d'obtenir un vrai 390 px.

test.use({ ...devices['iPhone 13'] })

/** Position absolue du premier élément RÉELLEMENT peint, ou null. */
async function topOf(page: Page, selector: string): Promise<number | null> {
  return page.evaluate((sel) => {
    // `getClientRects().length === 0` = pas peint (même règle que
    // `useSignupWallImpression`, sprint 85). `offsetParent` serait FAUX : il vaut
    // `null` pour tout `position: fixed`.
    const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length > 0)
    if (els.length === 0) return null
    return Math.min(...els.map((e) => Math.round(e.getBoundingClientRect().top + window.scrollY)))
  }, selector)
}

async function titleLines(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el =
      document.querySelector('[data-fold="title"]') ?? document.querySelector('h1')
    if (!el || el.getClientRects().length === 0) return 99
    const cs = getComputedStyle(el)
    let lh = parseFloat(cs.lineHeight)
    if (!Number.isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.2
    return Math.round(el.getBoundingClientRect().height / lh)
  })
}

// `expectAnswer` est EXPLICITE, pas une exemption silencieuse : un guide est de la
// prose rédigée, il n'a aucun bloc de réponse structuré. En fabriquer un à partir
// des premiers paragraphes serait le gabarit interchangeable que le sprint 78 a
// appris à refuser.
const TEMPLATES = [
  { name: 'peche', path: '/peche/dorade-royale/surfcasting/morbihan', expectAnswer: true },
  { name: 'guide', path: '/guides/comment-lire-une-courbe-de-maree', expectAnswer: false },
  { name: 'espece', path: '/especes/dorade-royale', expectAnswer: true },
]

for (const t of TEMPLATES) {
  test.describe(`premier écran — gabarit ${t.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(t.path, { waitUntil: 'networkidle' })
    })

    test('le titre tient en 3 lignes au plus', async ({ page }) => {
      expect(await titleLines(page)).toBeLessThanOrEqual(3)
    })

    test('un CTA de lecture est atteignable en un seul geste', async ({ page }) => {
      // ⚠️ La barre collante d'`/especes` est volontairement EXCLUE du marqueur
      // (cf components/especes/tracked-links.tsx) : toujours dans le viewport, elle
      // ferait passer ce test sur n'importe quelle page. On mesure ce que le
      // visiteur rencontre EN LISANT.
      const y = await topOf(page, '[data-fold="cta"]')
      expect(y, 'aucun CTA marqué data-fold="cta"').not.toBeNull()
      expect(y!).toBeLessThan(1000)
    })

    if (t.expectAnswer) {
      test('la réponse à la requête est dans le premier demi-écran', async ({ page }) => {
        const y = await topOf(page, '[data-fold="answer"]')
        expect(y, 'aucune réponse marquée data-fold="answer"').not.toBeNull()
        expect(y!).toBeLessThan(400)
      })
    }
  })
}

test.describe('non-régressions du gabarit /peche', () => {
  test('le CTA porte un spot en contexte, jamais /carnet/nouvelle nu', async ({ page }) => {
    // Sprint 87 Bloc 2 : `/carnet/nouvelle` NU envoie un visiteur sans compte sur
    // « Choisis d'abord ton spot », qui le renvoie chercher ailleurs. Tout le
    // parcours anonyme des sprints 77/86 ne fonctionne QU'AVEC un spot en contexte.
    await page.goto('/peche/dorade-royale/surfcasting/morbihan', { waitUntil: 'networkidle' })
    const hrefs = await page
      .locator('[data-fold="cta"] a')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) {
      expect(h, 'un CTA pointe /carnet/nouvelle sans spot_id').not.toBe('/carnet/nouvelle')
      expect(h).toMatch(/^\/carnet\/nouvelle\?spot_id=|^\/spots\?species=/)
    }
  })
})

test.describe('non-régressions du gabarit /guides', () => {
  test('plus aucun lien vers /tarifs ni vers /auth/login', async ({ page }) => {
    // Sprint 87 Bloc 3 : la sidebar vendait un ABONNEMENT à un lecteur sans compte
    // (anti-motif du sprint 75), et le CTA « Créer mon carnet gratuit » pointait
    // `/auth/login`, où l'on ne crée pas de compte (leçon du sprint 85).
    await page.goto('/guides/comment-lire-une-courbe-de-maree', { waitUntil: 'networkidle' })
    await expect(page.locator('a[href="/tarifs"]')).toHaveCount(0)
    await expect(page.locator('a[href^="/auth/login"]')).toHaveCount(0)
  })
})
