#!/usr/bin/env node
/**
 * check-prerender.mjs — sprint 84, Bloc 0.
 *
 * Vérifie qu'après `pnpm build` les pages SEO témoins sont réellement
 * pré-rendues. Sort en code 1 sinon.
 *
 * Contexte : avant le sprint 84, `app/(marketing)/layout.tsx` rendait un
 * <Header /> qui lisait les cookies (auth.getUser()). Lire les cookies rend la
 * route dynamique, donc `revalidate` et `generateStaticParams` étaient inertes
 * sur TOUT le groupe (marketing) : le build ne pré-rendait que 2 routes
 * (/icon.svg, /robots.txt) et 0 fichier .html. Ce script est le garde-fou qui
 * empêche ce retour en arrière de passer inaperçu.
 *
 * Une route témoin est acceptée par DEUX chemins distincts, tous deux valides :
 *
 *   1. `routes` — la page a été pré-rendue au moment du build (HTML sur disque,
 *      servi au CDN dès le premier visiteur).
 *   2. `dynamicRoutes` — le motif de la page (ex. `/especes/[slug]`) est déclaré
 *      en ISR avec fallback actif : la page n'est pas générée au build mais elle
 *      SERA générée à la première visite puis mise en cache. C'est le modèle
 *      documenté de `/peche/[...slug]`, et c'est celui retenu pour les 607 fiches
 *      spots (le brief interdit de pré-générer 607 pages au build, à cause des
 *      appels marée/météo/bathy).
 *
 * En revanche `fallback === false` (équivalent de `dynamicParams = false`) est
 * REFUSÉ : dans ce cas, une page absente de `routes` renvoie un 404, elle n'est
 * pas « pré-rendue à la demande ».
 *
 * Le script imprime pour CHAQUE témoin par quel chemin il a été satisfait, pour
 * qu'on ne confonde jamais « pré-rendu au build » et « ISR à la demande ».
 *
 * Usage :
 *   node scripts/check-prerender.mjs      (ou : pnpm check:prerender)
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MANIFEST = path.join(ROOT, '.next', 'prerender-manifest.json')

/**
 * Routes témoins : une par gabarit SEO du groupe (marketing).
 * - `/`                              → la home
 * - `/especes/bar`                   → les 26 fiches espèces
 * - `/guides/peche-au-bar-au-leurre` → les guides MDX
 * - `/peche/bar/leurres/finistere`   → les pages programmatiques
 * - `/spots/pointe-du-grand-minou`   → les fiches spots
 *
 * ★ La fiche spot a été ajoutée au sprint 88. Le commentaire qui vivait ici disait
 * « la rajouter le jour où le Bloc 3 est livré » : le Bloc 3 du sprint 84 A ÉTÉ
 * livré, et personne n'est revenu poser le témoin. Coût de cet oubli : la fiche a
 * perdu son rendu statique le 17/08 et personne ne l'a vu pendant 22 h, sur la page
 * qui porte 80 % des clics Google (issue Sentry JAVASCRIPT-NEXTJS-1P).
 *
 * ⚠️ Ce témoin est nécessaire mais PAS suffisant, et il faut le savoir pour ne pas
 * s'endormir dessus : il lit un manifeste de build, or la bascule statique→dynamique
 * du 17/08 se produisait au RUNTIME, à la régénération ISR. Le manifeste était
 * impeccable pendant tout l'incident. Le verrou qui attrape ce cas-là est le test
 * `__tests__/spot-pages-are-static.test.ts` (« aucune option de cache »), pas ce
 * script. Les deux sont complémentaires, aucun ne remplace l'autre.
 *
 * Le slug retenu est l'un des 10 de `generateStaticParams()`, donc attendu dans
 * `routes`. S'il disparaît du catalogue, ce script échouera : c'est voulu, ça force
 * à resynchroniser la liste des 10 plutôt qu'à la laisser pourrir.
 */
const WITNESSES = [
  '/',
  '/especes/bar',
  '/guides/peche-au-bar-au-leurre',
  '/peche/bar/leurres/finistere',
  '/spots/pointe-du-grand-minou',
]

function fail(lines) {
  console.error(lines.join('\n'))
  process.exit(1)
}

if (!fs.existsSync(MANIFEST)) {
  fail([
    '',
    '❌ check:prerender — fichier introuvable :',
    `   ${MANIFEST}`,
    '',
    "   Ce script lit le manifeste produit par le build de production. Lance",
    '   `pnpm build` d\'abord, puis relance `pnpm check:prerender`.',
    '',
  ])
}

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
} catch (err) {
  fail([
    '',
    '❌ check:prerender — manifeste illisible :',
    `   ${MANIFEST}`,
    `   ${err.message}`,
    '',
    '   Le build est probablement corrompu ou interrompu. Relance `pnpm build`.',
    '',
  ])
}

const routes = manifest.routes ?? {}
const dynamicRoutes = manifest.dynamicRoutes ?? {}

/** Motifs ISR compilés une fois, avec leur fallback. */
const dynamicEntries = Object.entries(dynamicRoutes).map(([pattern, entry]) => {
  let regex = null
  if (typeof entry?.routeRegex === 'string') {
    try {
      regex = new RegExp(entry.routeRegex)
    } catch {
      regex = null
    }
  }
  return { pattern, regex, fallback: entry?.fallback }
})

/**
 * @returns {{ok: true, how: string} | {ok: false, why: string}}
 */
function checkWitness(route) {
  if (Object.prototype.hasOwnProperty.call(routes, route)) {
    const revalidate = routes[route]?.initialRevalidateSeconds
    const suffix =
      typeof revalidate === 'number' ? `, revalidate ${revalidate}s` : ''
    return { ok: true, how: `pré-rendu au build (routes${suffix})` }
  }

  const match = dynamicEntries.find((d) => d.regex && d.regex.test(route))
  if (match) {
    if (match.fallback === false) {
      return {
        ok: false,
        why: `le motif "${match.pattern}" existe mais avec fallback:false (dynamicParams = false) : une page hors generateStaticParams renverrait un 404, elle n'est pas générée à la demande`,
      }
    }
    return {
      ok: true,
      how: `ISR à la demande via le motif "${match.pattern}" (dynamicRoutes, fallback: ${JSON.stringify(match.fallback)})`,
    }
  }

  return {
    ok: false,
    why: 'absente de `routes` ET aucun motif de `dynamicRoutes` ne la couvre : la page est rendue dynamiquement à chaque requête',
  }
}

const results = WITNESSES.map((route) => ({ route, ...checkWitness(route) }))
const missing = results.filter((r) => !r.ok)

console.log('')
console.log('check:prerender — routes témoins du groupe (marketing)')
console.log(
  `  manifeste : ${Object.keys(routes).length} route(s) pré-rendue(s) au build, ` +
    `${Object.keys(dynamicRoutes).length} motif(s) ISR`
)
console.log('')
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.route}`)
  console.log(`       ${r.ok ? r.how : r.why}`)
}
console.log('')

if (missing.length > 0) {
  fail([
    `❌ check:prerender ÉCHOUE : ${missing.length}/${WITNESSES.length} route(s) témoin(s) ne sont pas pré-rendues.`,
    '',
    '   Manquantes :',
    ...missing.map((r) => `     - ${r.route}`),
    '',
    '   Cause probable, et de très loin la plus fréquente sur ce projet :',
    '   un composant rendu par le layout `app/(marketing)/layout.tsx` (ou par',
    '   `app/not-found.tsx`) lit les cookies côté serveur. Typiquement un',
    '   `<Header />` qui appelle `createClient()` de `@/lib/supabase/server`,',
    "   lequel appelle `cookies()` de `next/headers`. Il suffit d'UN accès aux",
    '   cookies dans l\'arbre serveur pour rendre TOUT le groupe dynamique et',
    '   neutraliser `revalidate` et `generateStaticParams` sur chaque page.',
    '',
    "   Le test `__tests__/marketing-layout-is-static.test.ts` localise le",
    "   coupable sans build : il affiche le chemin d'imports complet du layout",
    '   jusqu\'au module fautif. Lance-le en premier.',
    '',
    '   Autres causes possibles, plus rares :',
    '     - un `export const dynamic = \'force-dynamic\'` ajouté sur la page ;',
    '     - un `headers()` / `searchParams` lu dans un composant serveur ;',
    '     - un `cookies()` dans un provider ou un composant analytics du layout.',
    '',
  ])
}

console.log(
  `✅ check:prerender OK : les ${WITNESSES.length} routes témoins sont pré-rendues.`
)
console.log('')
