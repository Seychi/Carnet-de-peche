#!/usr/bin/env node
// Notifie IndexNow des URLs nouvelles ou modifiées (Bing, Yandex, Naver, Seznam,
// et donc aussi DuckDuckGo, Ecosia et Copilot qui tournent sur l'index Bing).
//
// POURQUOI, précisément, sur ce projet : le goulot d'étranglement mesuré au
// sprint 78 n'est pas la qualité des pages, c'est le DÉBIT DE DÉCOUVERTE. Google
// ne consacre que ~10 requêtes par jour aux URLs neuves, soit ~19 jours pour
// absorber un lot de 191 fiches et ~10 mois pour les 2 905 restantes. IndexNow
// renverse la logique : au lieu d'attendre le crawl, on notifie à la publication.
//
// ⚠️ Ce que ça ne fait PAS : ça ne change rien au débit de Google, qui reste le
// vrai plafond et qui ne se règle que par le temps de réponse du serveur.
//
// Usage :
//   pnpm indexnow -- --url https://www.carnet-de-peche.com/peche/oblade/flottante
//   pnpm indexnow -- --sitemap --prefix /peche/        (toutes les pages /peche du sitemap)
//   pnpm indexnow -- --sitemap --prefix /peche/ --dry  (montre sans envoyer)
//
// La clé est LUE dans `public/<clé>.txt`, le fichier que Bing doit pouvoir
// télécharger à la racine du site. Elle n'est pas secrète : elle est publiée en
// clair sur le site, c'est précisément ce qui prouve qu'on contrôle le domaine.
// Aucune variable d'environnement à poser (`INDEXNOW_KEY` reste prioritaire si on
// veut forcer une rotation ou un essai).

import { readdirSync, readFileSync } from 'node:fs'

const HOST = 'www.carnet-de-peche.com'
const ORIGIN = `https://${HOST}`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
// Le protocole plafonne à 10 000 URLs par envoi. On reste bien en dessous.
const BATCH_MAX = 500

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const valueOf = (f) => {
  const i = args.indexOf(f)
  return i >= 0 ? args[i + 1] : undefined
}

// La clé se DÉDUIT du fichier de vérification, qui doit de toute façon exister et
// être servi à la racine du site : c'est lui qui prouve à Bing qu'on contrôle le
// domaine. Une seule source de vérité, donc aucune variable à poser, et surtout
// impossible que la clé envoyée et le fichier publié divergent, ce qui donnerait un
// 202 indéfini et des lots jamais vérifiés.
// `INDEXNOW_KEY` reste prioritaire si on veut forcer (rotation, essai).
function discoverKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY
  const dir = new URL('../public/', import.meta.url)
  const found = readdirSync(dir)
    .filter((f) => /^[0-9a-f]{8,128}\.txt$/i.test(f))
    .map((f) => f.replace(/\.txt$/i, ''))
    // Le fichier doit contenir EXACTEMENT la clé, sinon Bing refuse la vérification.
    .filter((k) => readFileSync(new URL(`${k}.txt`, dir), 'utf8').trim() === k)
  return found[0]
}

const key = discoverKey()
if (!key) {
  console.error(
    '\n❌ Aucune clé IndexNow trouvée.\n' +
      '   Génère-la sur https://www.bing.com/indexnow/getstarted, puis dépose\n' +
      '   `public/<clé>.txt` contenant EXACTEMENT la clé, et rien d’autre.\n' +
      `   Elle sera servie sur ${ORIGIN}/<clé>.txt au déploiement suivant.\n`,
  )
  process.exit(1)
}

// ⚠️ Git Bash sous Windows convertit tout argument qui ressemble à un chemin Unix :
// `--prefix /peche/` arrive au script sous la forme `C:/Program Files/Git/peche/`,
// et le filtre ne matche alors plus rien, SANS erreur. On normalise donc, et on
// accepte aussi bien `peche/` que `/peche/`.
function normalizePrefix(raw) {
  if (!raw) return undefined
  let p = raw
  // Une lettre de lecteur (« C:/… ») est la signature de la réécriture MSYS.
  if (/^[A-Za-z]:/.test(p)) {
    const tail = p.split(/[\\/]+/).filter(Boolean).pop()
    console.warn(
      `⚠️  --prefix a été réécrit par le shell (« ${raw} »), interprété comme « /${tail}/ ».`,
    )
    p = `/${tail}/`
  }
  if (!p.startsWith('/')) p = `/${p}`
  return p
}

async function urlsFromSitemap(prefix) {
  const res = await fetch(`${ORIGIN}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap ${res.status}`)
  const xml = await res.text()
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  return prefix ? all.filter((u) => u.startsWith(ORIGIN + prefix)) : all
}

let urls = []
if (has('--sitemap')) {
  urls = await urlsFromSitemap(normalizePrefix(valueOf('--prefix')))
} else if (has('--url')) {
  urls = args.filter((a) => a.startsWith('http'))
} else {
  console.error('❌ Précise --url <URL...> ou --sitemap [--prefix /peche/].')
  process.exit(1)
}

// Une URL d'un autre hôte ferait rejeter TOUT le lot par le protocole.
const foreign = urls.filter((u) => !u.startsWith(ORIGIN + '/'))
if (foreign.length > 0) {
  console.error(`❌ ${foreign.length} URL(s) hors de ${ORIGIN}, envoi annulé :`)
  for (const u of foreign.slice(0, 5)) console.error(`   ${u}`)
  process.exit(1)
}

urls = [...new Set(urls)]
if (urls.length === 0) {
  // Un préfixe qui ne ramène rien est presque toujours une faute de frappe ou une
  // réécriture par le shell : on sort en ERREUR, pas en succès silencieux.
  console.error(`❌ Aucune URL ne correspond${has('--sitemap') ? ' dans le sitemap' : ''}. Vérifie --prefix.`)
  process.exit(1)
}

console.log(`\nIndexNow — ${urls.length} URL(s) pour ${HOST}`)
for (const u of urls.slice(0, 3)) console.log(`  ${u}`)
if (urls.length > 3) console.log(`  … et ${urls.length - 3} autres`)

if (has('--dry')) {
  console.log('\n(--dry : rien n’a été envoyé)\n')
  process.exit(0)
}

let sent = 0
for (let i = 0; i < urls.length; i += BATCH_MAX) {
  const batch = urls.slice(i, i + BATCH_MAX)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `${ORIGIN}/${key}.txt`, urlList: batch }),
  })
  // 200 = accepté, 202 = accepté mais clé pas encore vérifiée (le fichier .txt doit
  // être en ligne). 403 = clé invalide, 422 = URLs incohérentes avec l'hôte.
  if (res.status === 200 || res.status === 202) {
    sent += batch.length
    console.log(`  ✅ lot de ${batch.length} accepté (HTTP ${res.status})`)
    if (res.status === 202) {
      console.log(`     ⚠️ 202 : vérifie que ${ORIGIN}/${key}.txt est bien en ligne.`)
    }
  } else {
    console.error(`  ❌ lot refusé (HTTP ${res.status}) : ${(await res.text()).slice(0, 200)}`)
    process.exit(1)
  }
}

console.log(`\n✅ ${sent} URL(s) notifiée(s). Suivi dans Bing Webmaster Tools → IndexNow.\n`)
