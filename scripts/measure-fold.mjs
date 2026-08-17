#!/usr/bin/env node
// Mesure du PREMIER ÉCRAN des gabarits SEO (sprint 87, Bloc 0).
//
// Pourquoi ce script existe : le sprint 75 a corrigé `/especes` sur ce critère,
// et `/peche` a dérivé pendant 12 sprints sans que rien ne le signale. Une règle
// qu'aucune commande ne vérifie n'est pas une règle.
//
// Il lit les marqueurs posés par les primitives du Bloc 1 :
//   [data-fold="title"]   le h1
//   [data-fold="answer"]  la réponse à la requête
//   [data-fold="cta"]     un CTA rencontré EN LISANT (la barre collante est exclue)
//
// ⚠️ Chrome desktop sous Windows refuse de descendre sous ~500 px de large : la QA
// du 17/08 s'est faite en 501 x 660 et non en 390 x 844. On passe donc par
// l'émulation d'appareil de Playwright, seule façon d'obtenir un vrai 390.
//
// Usage :
//   node scripts/measure-fold.mjs                      (contre la prod)
//   node scripts/measure-fold.mjs http://localhost:3000 (contre un build local)

import { devices, chromium } from 'playwright'

const BASE = process.argv[2] ?? 'https://www.carnet-de-peche.com'

// Un témoin par gabarit. `/especes` est le seul avec un avant mesurable.
// `expectAnswer` est EXPLICITE, pas une exemption silencieuse : `/guides` est de la
// prose rédigée, il n'a aucun bloc de réponse structuré à remonter. En fabriquer un
// « L'ESSENTIEL » à partir des premiers paragraphes serait exactement le gabarit
// interchangeable que le sprint 78 a appris à refuser. À rouvrir le jour où le
// frontmatter des guides portera de vrais points-clés.
const PAGES = [
  { template: 'peche', path: '/peche/dorade-royale/surfcasting/morbihan', expectAnswer: true },
  { template: 'guide', path: '/guides/comment-lire-une-courbe-de-maree', expectAnswer: false },
  { template: 'espece', path: '/especes/dorade-royale', expectAnswer: true },
]

// Seuils. Le viewport de l'iPhone 13 fait 844 px de haut : « avant 400 px » veut
// dire dans la première moitié du premier écran, « avant 1 000 px » veut dire à
// moins d'un écran et demi, soit un seul geste de défilement.
const ANSWER_MAX_Y = 400
const CTA_MAX_Y = 1000
const TITLE_MAX_LINES = 3

async function measure(page, { template, path }) {
  const url = `${BASE}${path}`
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  const status = res?.status() ?? 0

  const data = await page.evaluate(() => {
    // `getClientRects().length === 0` = pas peint du tout (même règle que
    // `useSignupWallImpression`, sprint 85). `offsetParent` serait FAUX : il vaut
    // null pour tout `position: fixed`.
    const seen = (el) => el && el.getClientRects().length > 0
    const yOf = (el) => (seen(el) ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null)

    const title = document.querySelector('[data-fold="title"]') ?? document.querySelector('h1')
    const answer = document.querySelector('[data-fold="answer"]')
    const ctas = [...document.querySelectorAll('[data-fold="cta"]')].filter(seen)

    let titleLines = null
    if (seen(title)) {
      const cs = getComputedStyle(title)
      let lh = parseFloat(cs.lineHeight)
      if (!Number.isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.2
      titleLines = Math.round(title.getBoundingClientRect().height / lh)
    }

    return {
      titleY: yOf(title),
      titleText: title?.textContent?.trim().slice(0, 70) ?? null,
      titleLines,
      answerY: yOf(answer),
      ctaY: ctas.length > 0 ? Math.min(...ctas.map((c) => Math.round(c.getBoundingClientRect().top + window.scrollY))) : null,
      ctaCount: ctas.length,
    }
  })

  return { template, path, status, ...data }
}

const fmt = (v) => (v === null ? '   —' : String(v).padStart(4))

function verdicts(r) {
  const out = []
  if (!r.expectAnswer) out.push('➖ pas de bloc de réponse sur ce gabarit (prose, attendu)')
  else if (r.answerY === null) out.push('❌ aucune réponse marquée (data-fold="answer")')
  else if (r.answerY >= ANSWER_MAX_Y) out.push(`❌ réponse à ${r.answerY} px (seuil ${ANSWER_MAX_Y})`)
  else out.push(`✅ réponse à ${r.answerY} px`)

  if (r.ctaY === null) out.push('❌ aucun CTA de lecture marqué (data-fold="cta")')
  else if (r.ctaY >= CTA_MAX_Y) out.push(`❌ 1er CTA à ${r.ctaY} px (seuil ${CTA_MAX_Y})`)
  else out.push(`✅ 1er CTA à ${r.ctaY} px (${r.ctaCount} au total)`)

  if (r.titleLines === null) out.push('❌ titre introuvable')
  else if (r.titleLines > TITLE_MAX_LINES) out.push(`❌ titre sur ${r.titleLines} lignes (max ${TITLE_MAX_LINES})`)
  else out.push(`✅ titre sur ${r.titleLines} ligne(s)`)

  return out
}

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 13'] })
const page = await context.newPage()

console.log(`\nmeasure-fold — iPhone 13 émulé (390 x 844), base ${BASE}\n`)

let failed = 0
for (const target of PAGES) {
  let r
  try {
    r = { ...(await measure(page, target)), expectAnswer: target.expectAnswer }
  } catch (err) {
    console.log(`  ${target.template.padEnd(7)} ${target.path}\n    ❌ injoignable : ${err.message}\n`)
    failed++
    continue
  }
  console.log(`  ${r.template.padEnd(7)} ${r.path}  [HTTP ${r.status}]`)
  console.log(`    titre "${r.titleText}"`)
  console.log(`    y : titre ${fmt(r.titleY)} · réponse ${fmt(r.answerY)} · cta ${fmt(r.ctaY)}`)
  for (const v of verdicts(r)) {
    console.log(`    ${v}`)
    if (v.startsWith('❌')) failed++
  }
  console.log('')
}

await browser.close()

if (failed > 0) {
  console.log(`❌ measure-fold : ${failed} manquement(s).\n`)
  process.exit(1)
}
console.log('✅ measure-fold : les trois gabarits tiennent le premier écran.\n')
