#!/usr/bin/env node
// Export Search Console → CSV versionnés dans le repo.
//
// POURQUOI ce script existe : l'essai Supermetrics a expiré le 21/08/2026, et
// avec lui la seule voie automatisée vers la GSC. Depuis, la mesure SEO du projet
// dépend d'un export manuel que John fait à la main (cf `docs/export gsc/`), ce
// qui la rend non reproductible et donc invérifiable d'une session à l'autre.
// Ce script remet la GSC à portée de commande, sans abonnement et sans dépendance.
//
// CE QUE ÇA NE FAIT PAS, et c'est important : l'API applique EXACTEMENT les mêmes
// restrictions que l'interface. Les requêtes rares restent anonymisées (81 % des
// impressions de `/especes` au relevé du 26/08, cf `docs/PLAN-SEO-2026-08-26.md`
// §2), et l'API « ne garantit pas de renvoyer toutes les lignes mais les
// meilleures ». Pour lever CE plafond-là, il faut le Bulk Data Export vers
// BigQuery, qui est un autre chantier (et qui, lui, exclut carrément les requêtes
// anonymisées au lieu de les agréger).
//
// ZÉRO DÉPENDANCE : le JWT est signé avec `node:crypto`, pas avec googleapis.
// C'est 30 lignes et ça évite d'ajouter 40 Mo de node_modules pour un script.
//
// ── Mise en place (une fois) ───────────────────────────────────────────────────
//  1. Google Cloud Console → créer un projet (ou en réutiliser un) → activer
//     l'API « Google Search Console API ».
//  2. IAM → Comptes de service → Créer → générer une clé JSON.
//  3. Search Console → Paramètres → Utilisateurs et autorisations → ajouter
//     l'e-mail du compte de service (`...@....iam.gserviceaccount.com`) en
//     lecture (« Restreint » suffit).
//  4. Poser la clé en variable d'environnement, encodée en base64 pour ne pas
//     casser les retours à la ligne de la clé privée :
//        Windows : setx GSC_SA_KEY_B64 "<contenu du JSON en base64>"
//     (Pour obtenir le base64 : `node -e "console.log(require('fs').readFileSync('cle.json').toString('base64'))"`)
//
// ── Usage ─────────────────────────────────────────────────────────────────────
//   pnpm gsc                                   28 jours, par page
//   pnpm gsc -- --dims query --days 28         par requête
//   pnpm gsc -- --dims date --days 90          la série quotidienne
//   pnpm gsc -- --dims page,query --days 28    croisé (gros volume)
//   pnpm gsc -- --dims page --filter /especes/ ne garder qu'une famille d'URL
//   pnpm gsc -- --start 2026-08-10 --end 2026-08-14 --dims page
//   pnpm gsc -- --dims page --stdout           affiche au lieu d'écrire
//
// Les fichiers atterrissent dans `docs/export gsc/api/` sous un nom daté, donc
// versionnés par git : la série historique se constitue toute seule et reste
// lisible en session sans re-télécharger quoi que ce soit.

import { createSign } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SITE_URL = 'sc-domain:carnet-de-peche.com'
const OUT_DIR = join('docs', 'export gsc', 'api')
// La GSC a 2 à 3 jours de retard : la fenêtre s'arrête à J-3 pour ne comparer
// que des journées complètes. Lire « aujourd'hui » dans la GSC produit une fausse
// chute tous les jours de l'année (cf `docs/PLAN-IMPRESSIONS-2026-08-19.md` §0).
const LAG_DAYS = 3
const ROWS_PER_REQUEST = 25_000
const VALID_DIMS = new Set(['page', 'query', 'date', 'device', 'country', 'searchAppearance'])

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const valueOf = (f, fallback) => {
  const i = args.indexOf(f)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const dims = valueOf('--dims', 'page').split(',').map((d) => d.trim()).filter(Boolean)
for (const d of dims) {
  if (!VALID_DIMS.has(d)) {
    console.error(`Dimension inconnue : « ${d} ». Valides : ${[...VALID_DIMS].join(', ')}`)
    process.exit(1)
  }
}

function isoDaysAgo(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const days = Number(valueOf('--days', '28'))
const endDate = valueOf('--end', isoDaysAgo(LAG_DAYS))
const startDate = valueOf('--start', isoDaysAgo(LAG_DAYS + days - 1))
const urlFilter = valueOf('--filter', null)
const toStdout = has('--stdout')

// ── Auth : JWT signé localement → jeton d'accès ───────────────────────────────
function serviceAccount() {
  const b64 = process.env.GSC_SA_KEY_B64
  const raw = process.env.GSC_SA_KEY
  if (!b64 && !raw) {
    console.error(
      'Aucune clé trouvée. Pose GSC_SA_KEY_B64 (le JSON du compte de service encodé en base64).\n' +
        'Voir l\'en-tête de ce fichier, section « Mise en place ».',
    )
    process.exit(1)
  }
  try {
    return JSON.parse(b64 ? Buffer.from(b64, 'base64').toString('utf8') : raw)
  } catch {
    console.error('La clé est illisible : ce n\'est pas du JSON valide (base64 tronqué ?).')
    process.exit(1)
  }
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = [
    b64url({ alg: 'RS256', typ: 'JWT' }),
    b64url({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ].join('.')
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  })
  const json = await res.json()
  if (!res.ok) {
    console.error(`Échec de l'authentification Google (${res.status}) :`, json.error_description ?? json)
    process.exit(1)
  }
  return json.access_token
}

// ── Requête, paginée ──────────────────────────────────────────────────────────
async function fetchAllRows(token) {
  const endpoint =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`
  const rows = []
  for (let startRow = 0; ; startRow += ROWS_PER_REQUEST) {
    const body = {
      startDate,
      endDate,
      dimensions: dims,
      type: 'web',
      // `final` = on ne récupère que les données consolidées. Sans ça on mélange
      // du provisoire aux journées complètes et les comparaisons deviennent fausses.
      dataState: 'final',
      rowLimit: ROWS_PER_REQUEST,
      startRow,
    }
    if (urlFilter) {
      body.dimensionFilterGroups = [
        { filters: [{ dimension: 'page', operator: 'contains', expression: urlFilter }] },
      ]
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error(`Erreur API Search Console (${res.status}) :`, json.error?.message ?? json)
      process.exit(1)
    }
    const batch = json.rows ?? []
    rows.push(...batch)
    // L'API renvoie une réponse vide quand la pagination dépasse les lignes
    // disponibles : c'est la condition d'arrêt documentée.
    if (batch.length < ROWS_PER_REQUEST) return rows
  }
}

// ── Sortie ────────────────────────────────────────────────────────────────────
const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function toCsv(rows) {
  const header = [...dims, 'clicks', 'impressions', 'ctr', 'position']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [
        ...(r.keys ?? []).map(csvCell),
        r.clicks,
        r.impressions,
        (r.ctr * 100).toFixed(2),
        r.position.toFixed(2),
      ].join(','),
    )
  }
  return lines.join('\n') + '\n'
}

const sa = serviceAccount()
const token = await accessToken(sa)
const rows = await fetchAllRows(token)

const totals = rows.reduce(
  (a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }),
  { clicks: 0, impressions: 0 },
)
const ctr = totals.impressions ? (100 * totals.clicks) / totals.impressions : 0

const csv = toCsv(rows)
if (toStdout) {
  process.stdout.write(csv)
} else {
  mkdirSync(OUT_DIR, { recursive: true })
  const name = `gsc_${dims.join('-')}${urlFilter ? '_' + urlFilter.replaceAll('/', '') : ''}_${startDate}_${endDate}.csv`
  const path = join(OUT_DIR, name)
  writeFileSync(path, csv, 'utf8')
  console.log(`→ ${path}`)
}

console.error(
  `${rows.length} lignes · ${startDate} → ${endDate} · ` +
    `${totals.clicks} clics / ${totals.impressions} impressions · CTR ${ctr.toFixed(2)} %`,
)
