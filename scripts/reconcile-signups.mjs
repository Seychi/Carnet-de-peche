#!/usr/bin/env node
/**
 * reconcile-signups.mjs — garde-fou permanent (sprint 85, Bloc 0, Défaut 4).
 *
 * Rappel du fait qui justifie ce script : le 17/08/2026, `auth.users` comptait
 * 47 comptes créés sur 90 jours, PostHog n'en voyait que 28 (`signup_completed`)
 * — un écart de 40 %, toujours dans le même sens (PostHog ne voit que les
 * visiteurs qui ont accepté le bandeau de consentement). Conséquence : **le
 * volume d'inscriptions se lit dans `auth.users`, PostHog sert aux TAUX et aux
 * comportements** (sur un ratio, le biais de consentement touche le numérateur
 * ET le dénominateur, donc il se compense en grande partie — mais pas sur un
 * volume brut). Doctrine écrite dans `CLAUDE.md` §2.
 *
 * Ce script N'EST PAS un diagnostic ponctuel : c'est un garde-fou à REJOUER À
 * CHAQUE SPRINT qui touche la conversion, pour savoir de combien PostHog
 * sous-compte AU MOMENT DU SPRINT (le pourcentage bouge avec le taux
 * d'acceptation du bandeau, il ne faut jamais supposer qu'il reste à 40 %).
 *
 * Pourquoi le nombre PostHog est un ARGUMENT et non une valeur récupérée
 * automatiquement : ce projet n'a nulle part de clé PostHog en LECTURE
 * (`POSTHOG_PERSONAL_API_KEY` ou équivalent — vérifié dans `lib/env.ts` et
 * `.env.example`, absent). Seule `NEXT_PUBLIC_POSTHOG_KEY` existe, et c'est une
 * clé PROJET en écriture seule (capture d'events), inutilisable pour interroger
 * l'API Query de PostHog. Plutôt que d'inventer une clé ou un chiffre, ce
 * script prend le compte PostHog relevé À LA MAIN par John dans l'UI :
 *   PostHog → Insights → filtrer l'event `signup_completed` → Total count sur
 *   la même fenêtre (N derniers jours) que celle passée à --days.
 *
 * Requête SQL de référence pour LA MOITIÉ « base » de la comparaison (celle que
 * ce script exécute réellement, via l'API admin GoTrue — voir plus bas
 * pourquoi pas une requête SQL directe) :
 *
 *   select count(*) from auth.users where created_at >= now() - interval '90 days';
 *
 * Vérifiée en lecture seule via le connecteur Supabase (MCP, execute_sql) le
 * 17/08/2026 : 52 comptes au total, 47 dans les 90 derniers jours — conforme
 * au brief du sprint 85.
 *
 * Pourquoi l'API admin (`auth.admin.listUsers`) et pas une requête SQL directe
 * depuis ce script : `auth.users` vit dans le schéma `auth`, non exposé par
 * PostgREST (le client `@supabase/supabase-js` ne peut pas faire
 * `.from('auth.users')`). `auth.admin.listUsers` est le chemin officiel côté
 * service-role, déjà utilisé ailleurs dans ce repo pour la même raison
 * (`app/dev/seed-feed/actions.ts`, `app/dev/seed-heatmap/actions.ts`).
 *
 * Usage :
 *   node scripts/reconcile-signups.mjs --posthog <n> [--days <n>]
 *   pnpm reconcile:signups -- --posthog 28 --days 90
 *
 * Exemple (le relevé du sprint 85) :
 *   pnpm reconcile:signups -- --posthog 28 --days 90
 *   → 47 comptes réels, 28 vus par PostHog, écart 40,4 %.
 *
 * Prérequis : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans l'env
 * ou `.env.local` (jamais commités — cf CLAUDE.md §11). Sans la clé
 * service-role, le script s'arrête proprement avec un message d'erreur, il ne
 * plante pas.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_WINDOW_DAYS = 90

/** Lit une variable d'env, avec repli sur `.env.local` (même pattern que
 * scripts/send-test-email.ts). Ne journalise jamais la valeur trouvée. */
function loadEnvVar(name) {
  if (process.env[name]) return process.env[name]
  try {
    const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const re = new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\r\n]+)"?\\s*$`, 'm')
    const match = envFile.match(re)
    if (match) return match[1]
  } catch {
    // .env.local absent — l'appelant gère l'absence de valeur
  }
  return undefined
}

function printUsage() {
  console.error(
    [
      '',
      'Usage : node scripts/reconcile-signups.mjs --posthog <n> [--days <n>]',
      '        pnpm reconcile:signups -- --posthog 28 --days 90',
      '',
      '  --posthog <n>  Nombre d\'events `signup_completed` relevé À LA MAIN dans',
      '                  PostHog (Insights → signup_completed → Total count) sur',
      '                  la même fenêtre que --days. Obligatoire : ce script ne',
      '                  peut pas interroger PostHog (aucune clé en lecture dans',
      '                  ce projet, cf en-tête du fichier).',
      '  --days <n>      Taille de la fenêtre en jours. Défaut : 90.',
      '',
    ].join('\n'),
  )
}

function parseArgs(argv) {
  const args = { days: DEFAULT_WINDOW_DAYS, posthog: undefined }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--posthog' || a === '-p') {
      args.posthog = Number(argv[++i])
    } else if (a === '--days' || a === '-d') {
      args.days = Number(argv[++i])
    } else if (a === '--help' || a === '-h') {
      args.help = true
    }
  }
  return args
}

/**
 * Compte les comptes réels créés depuis `cutoff` via l'API admin GoTrue,
 * paginée (utile dès que le réservoir dépasse 1000 comptes — 52 aujourd'hui).
 */
async function countRealSignups(admin, cutoff) {
  const perPage = 1000
  let page = 1
  let count = 0
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`auth.admin.listUsers a échoué : ${error.message}`)
    const users = data?.users ?? []
    for (const u of users) {
      if (u.created_at && new Date(u.created_at) >= cutoff) count++
    }
    if (users.length < perPage) break
    page++
  }
  return count
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printUsage()
    process.exit(0)
  }

  if (!Number.isFinite(args.posthog) || args.posthog < 0) {
    console.error('❌ reconcile-signups : --posthog <n> est obligatoire (nombre entier ≥ 0).')
    printUsage()
    process.exit(1)
  }
  if (!Number.isFinite(args.days) || args.days <= 0) {
    console.error('❌ reconcile-signups : --days <n> doit être un entier > 0.')
    printUsage()
    process.exit(1)
  }

  const url = loadEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const key = loadEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    console.error(
      [
        '',
        '❌ reconcile-signups : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
        '   requis (env ou .env.local). La clé service-role n\'est pas dans le repo,',
        '   demande-la à John (CLAUDE.md §5) — jamais côté client, jamais commitée.',
        '',
      ].join('\n'),
    )
    process.exit(1)
  }

  const admin = createClient(url, key, { auth: { persistSession: false } })
  const cutoff = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000)

  let realCount
  try {
    realCount = await countRealSignups(admin, cutoff)
  } catch (err) {
    console.error(`❌ reconcile-signups : ${err.message}`)
    process.exit(1)
  }

  const posthogCount = args.posthog
  const gapAbs = realCount - posthogCount
  const gapPct = realCount > 0 ? (gapAbs / realCount) * 100 : 0
  const sign = gapAbs > 0 ? 'sous-compte' : gapAbs < 0 ? 'sur-compte' : 'compte pareil'

  console.log('')
  console.log(`reconcile-signups — fenêtre de ${args.days} jour(s) (auth.users vs PostHog)`)
  console.log('')
  console.log(`  auth.users (source de vérité)      : ${realCount}`)
  console.log(`  PostHog signup_completed (relevé)  : ${posthogCount}`)
  console.log(
    `  écart                              : ${gapAbs >= 0 ? '+' : ''}${gapAbs} compte(s), ` +
      `${gapPct.toFixed(1)} % (PostHog ${sign})`,
  )
  console.log('')
  if (Math.abs(gapPct) < 1) {
    console.log('  → écart négligeable : PostHog est exceptionnellement fiable sur ce relevé.')
  } else {
    console.log(
      '  → ne PAS utiliser le nombre PostHog comme volume d\'inscriptions dans un',
    )
    console.log('    RECAP ou une décision produit. PostHog reste bon pour les TAUX (ex.')
    console.log('    /auth/register vus → comptes créés), pas pour le volume absolu.')
  }
  console.log('')
}

main().catch((err) => {
  console.error('❌ reconcile-signups : erreur inattendue —', err?.message ?? err)
  process.exit(1)
})
