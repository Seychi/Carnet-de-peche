# Sprint 74 — Brief d'exécution
## « Première valeur en 60 secondes » : réparer le J0 → J7

> Rédigé le 2026-08-05. Durée cible : 1-2 sessions Fable. Prérequis : S72 + S73 mergés sur `main` (fait, prod = `c62ce30`).
> Contexte : diagnostic activation du 2026-08-05 (SQL live + PostHog, chiffres ci-dessous) · `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` (lane F amorçage) · RECAP S72 (`docs/sprint-72/RECAP.md`).
> Ce sprint s'insère AVANT la phase mobile : le gate mobile (≥ 20 fondateurs actifs) est loin d'être atteint, précisément à cause du problème traité ici. Mobile passe à S75+.

### Le problème, mesuré (2026-08-05, à re-vérifier au Bloc 0)

- **9 inscriptions en 60 jours** (PostHog `signup_completed`), **0 utilisateur revenu après J+1, 0 après J+7** (une seule exception en DB : bbu85, 2 prises, revenu à J+2 — probablement hors consentement PostHog).
- Le point de chute n'est PAS l'onboarding : **10 des 11 dernières inscriptions ont `onboarded = true`**. Ils finissent les 6 étapes, arrivent sur /home, et disparaissent.
- `catch_log_started` hebdo : 4 → 1 → 1 → 0 → 0 → 0 sur 6 semaines. Personne ne logue.
- **Aucun point de contact après J0** : `emails/welcome.tsx` existe mais n'est importé nulle part (jamais envoyé, à confirmer Bloc 0) ; les alertes S72 sont gatées Local/Itinérant or 100 % des comptes sont Découverte → `alert_settings` = 0 ligne, `alerts_sent` = 0. Le produit ne donne AUCUNE raison de revenir demain à un compte gratuit.
- Le trafic n'est pas le goulot de ce sprint : ~200-250 visiteurs/mois, conversion visiteur→compte ~4-5 % (correcte). Remplir le trafic sans réparer ça = remplir un seau percé.

### Décisions verrouillées (John valide en lançant la session ; s'il veut inverser un point, il le dit dans le prompt de lancement)

- **Positionnement pricing INTACT** : ce qu'on donne aux gratuits = le **créneau GÉNÉRIQUE** (solunar + marée du secteur, exactement les données déjà affichées gratuitement sur /home via `lib/conditions/dept-window.ts`). Ce qu'on vend en Local reste la **PROACTIVITÉ PERSO** (alerte la veille quand TES conditions arrivent, S72). Chaque email gratuit contient un bloc upsell honnête vers Local. On ne touche PAS au gating S72.
- **Emails d'activation J+1 / J+3** : one-shot, catégorie marketing → `getEmailRecipient(userId, { marketing: true })` (respecte `profiles.marketing_email_optin`), lien de désinscription un clic (route `/unsubscribe` existante). Pas d'envoi si l'utilisateur a déjà logué/importé une prise.
- **Email hebdo « ton créneau de la semaine »** : **opt-in explicite, case NON pré-cochée** (cohérent avec la décision RGPD S72 : opt-in défaut OFF), proposé à l'écran de fin d'onboarding + gérable sur `/notifications`. Envoi le **vendredi matin** (le pêcheur planifie son week-end).
- **Pas de 5e cron** (contrainte plan répétée S40→S72) : tout se greffe dans `personal-window` (07:00 UTC), best-effort strict, fail-soft par utilisateur.
- **Honnêteté** : jamais de % perso ni de « tes conditions » sans données (leçon revue S72). Un compte à 0 prise reçoit un créneau explicitement générique.
- **Migration = 108** (107/107b pris par S73). **108b réservé** aux fixes de revue.

**Préalable avant de démarrer (manuel John)** : rien de bloquant.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-74/BRIEF.md`. Lance les workstreams A et C en parallèle dès maintenant, puis B → D/E selon le tableau, et termine par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0 | **supabase-guard** → Supabase | Schéma live (`profiles`, `favorite_spots`, `alert_settings`, `lifecycle_*`), advisors baseline, re-run des requêtes du diagnostic. |
| Avant les templates email | **docs-researcher** → Context7 | React Email + Resend versions courantes (pattern `lib/email/spot-alert.tsx` à imiter, pas à réinventer). |
| QA du parcours neuf | **qa-chrome** | Compte neuf réel : signup → onboarding → fini v2 → /home, mobile 390px + desktop. |
| Clôture | **`/verif-sprint`** puis **deploy-watch** | Standard. |

## Objectif du sprint en une phrase

Un nouvel inscrit choisit son spot à la fin de l'onboarding, voit immédiatement SON prochain créneau, reçoit un email J+1 avec ce créneau et un CTA de log/import, peut s'abonner au créneau hebdo du vendredi, et tout le funnel (fini → favori → email → retour) est mesurable dans PostHog.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Bloc 0 — Ancrage lecture | 0,25 j | — | ✅ |
| B | Bloc 1 — Migration 108 | 0,25 j | A | ❌ (A est court) |
| C | Bloc 2 — Fini v2 (spot + créneau) | 0,75 j | A (la checkbox hebdo attend B) | ✅ |
| D | Bloc 3 — Emails lifecycle + greffon cron | 0,75 j | A + B | ❌ |
| E | Bloc 4 — Mesure PostHog | 0,25 j | — (branchements finaux après C/D) | ✅ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Ancrage (lecture seule, livrable `docs/sprint-74/research/anchor.md`)

Faits déjà vérifiés le 05/08 (à re-prouver rapidement, la base bouge) : `emails/welcome.tsx` existe sans aucun import ; `signup_completed` est capturé dans `app/auth/login/actions.ts` ; `app/actions/favorites.ts` expose `toggleFavoriteSpot` ; `lib/conditions/dept-window.ts` expose `getDeptNextWindow` + `getDeptUpcomingWindows` (gratuit, déjà servi sur /home) ; le cron `personal-window` (07:00 UTC, `maxDuration = 60`) importe déjà `composeWeeklyDigest` (`lib/notifications/weekly-digest.ts`) et `isNotificationPrefEnabled` (`lib/notifications/prefs-meta.ts`).

### Tâches
1. **Confirmer que `emails/welcome.tsx` n'est jamais envoyé** (grep imports + logs Resend si accessibles). Lire son contenu : réutilisable tel quel ou à enrichir (créneau du dept) ?
2. **Dumper ce que fait `composeWeeklyDigest` aujourd'hui** (canaux, cible, cadence, gating). Règle : si un digest hebdo existe déjà pour un canal, le Bloc 3 l'ÉTEND (canal email + cible gratuits opt-in), il n'en crée pas un deuxième. Documenter la décision étendre vs créer dans `anchor.md`.
3. **Cartographier les prefs de notification existantes** (`lib/notifications/prefs-meta.ts`, colonnes `profiles.marketing_email_optin` / `email_unsub_token`, réglages `/notifications` S72) : où brancher l'opt-in hebdo sans créer un 2e système de prefs.
4. **Vérifier le flow d'inscription** : où vit l'action de signup (`app/auth/login/actions.ts`), où vit `completeOnboarding` (`app/(app)/onboarding/actions.ts`), l'email est-il confirmé au moment du fini (double email à éviter avec la confirmation Supabase).
5. **Lister les spots curés par département** (SQL : combien de départements ont ≥ 3 spots `source = 'curated'` ; lesquels en ont 0) → dimensionne le fallback du Bloc 2.
6. Vérifier que `lib/analytics.ts` `identify(userId)` est bien appelé à la connexion ET au retour de session (sinon les retours J+7 sont invisibles dans PostHog — c'est la métrique du sprint).
7. Baseline advisors + re-run des 3 requêtes du diagnostic (signups/retours, catch_log_started hebdo, compteurs alert_settings/lifecycle) pour figer le « avant ».

### Critères d'acceptation
- `anchor.md` : décision étendre vs créer pour l'hebdo, mapping prefs, flow signup→fini prouvé, table dept→nb spots curés, requêtes « avant » collées avec résultats.

---

## Bloc 1 — Migration **108** : journal lifecycle + opt-in hebdo

> **Connecteurs** : supabase-guard avant/après ; regen `lib/types.ts` ; 108b réservé.

### Tâches
1. **`lifecycle_emails`** (journal de dédup, pattern `alerts_sent` S72) : `user_id uuid` FK `auth.users` ON DELETE CASCADE, `kind text` CHECK IN (`'welcome'`, `'j1_window'`, `'j3_import'`, `'weekly_window'`), `sent_key text` (`'once'` pour les one-shot, clé de semaine ISO `'2026-W32'` pour l'hebdo), `sent_at timestamptz default now()`, PK `(user_id, kind, sent_key)`. RLS : SELECT own uniquement, **aucune policy d'écriture** (le cron écrit en service-role ; INSERT par `authenticated` → 42501, à prouver).
2. **Opt-in hebdo** : colonne `profiles.weekly_window_optin boolean not null default false`. (Pas dans `alert_settings` : cette table est le réglage des alertes payantes S72, own-only, créée à la demande ; l'hebdo est tous tiers.)
3. Cascade RGPD : prouver que `delete_my_account` + delete user purgent `lifecycle_emails` (FK cascade) et que la colonne profile part avec le profil.

### Critères d'acceptation
- Matrice SQL rollback : cross-user bloqué, 42501 sur INSERT authenticated, doublon (user, kind, sent_key) refusé, cascade prouvée.
- Advisors : aucun nouvel ERROR. `lib/types.ts` régénéré.

---

## Bloc 2 — Fini v2 : « Ton spot, ton prochain créneau »

L'écran `app/(app)/onboarding/fini/page.tsx` (211 lignes) existe et est bon (récap profil, marée du dept, avatar, encart import). Il lui manque le pont vers une raison de REVENIR. On l'enrichit, on ne le refait pas. Rien ne devient bloquant : « Ouvrir mon carnet » reste toujours accessible.

> **Connecteurs** : supabase-guard (liste spots curés du dept en lecture) ; qa-chrome pour le parcours réel.

### Tâches
1. **Section « Ton spot »** (entre la marée du dept et l'encart import) : jusqu'à 5 spots `source = 'curated'` du `home_department` (nom + commune, pas de coords), tap = favori via `toggleFavoriteSpot` (`app/actions/favorites.ts`, cap 10 et RLS déjà en place S72). État sélectionné visible (étoile pleine, pattern S72). Fallback dept sans spot curé : masquer la section, le créneau du dept (tâche 2) reste.
2. **Carte « Ton prochain créneau »** : `getDeptNextWindow(dept)` (`lib/conditions/dept-window.ts`, déjà gratuit sur /home) → jour + heure + raisons FR (solunar/marée), libellé honnête type « Créneau du secteur [dept]. Logue tes prises pour le personnaliser. ». Chiffres en `font-mono` (règle d'or DA v2). Pas de ScoreRing perso, pas de %.
3. **Checkbox opt-in hebdo** (sous le créneau) : « Reçois ton créneau du week-end par email chaque vendredi » , NON pré-cochée, écrit `profiles.weekly_window_optin` via une server action zod (messages FR). Mention une ligne : désinscription en un clic dans chaque email.
4. **Réglage `/notifications`** : exposer le toggle hebdo au même endroit que les réglages S72 (section distincte « Emails », tous tiers), pour l'activer/couper après coup.
5. L'encart import existant (« dès 3 prises ») remonte au-dessus du CTA final s'il passe sous le fold mobile — vérifier à 390 px.

### Critères d'acceptation
- Compte neuf (dept 29) : l'écran fini montre ≥ 3 spots, le tap favorise (visible ensuite sur /profil), le créneau s'affiche avec des raisons FR, la checkbox écrit bien la colonne (SQL de contrôle), rien n'est bloquant.
- Compte neuf sur un dept sans spot curé : pas de section spots, pas d'erreur, créneau affiché.
- Régressions interdites : flow d'onboarding 6 étapes intact, `completeOnboarding` inchangé dans sa sémantique, gating S72 intact (aucune alerte quotidienne pour un gratuit).
- Copy : tutoiement, zéro tiret cadratin, aucune promesse perso mensongère.

### Garde-fous
- Ne pas toucher : `lib/alerts/*` (moteur S72), policies des tables 106.
- La liste de spots au fini affiche nom + commune, JAMAIS de coordonnées (le floutage et le gating carte ne sont pas le sujet de cet écran).

---

## Bloc 3 — Emails lifecycle : welcome branché, J+1, J+3, hebdo vendredi

Toute l'infra existe (`lib/email/send.ts`, `lib/email/recipient.ts`, templates React Email dans `emails/`, pattern de référence `lib/email/spot-alert.tsx` : ne throw jamais, no-op sans clé, opt-out respecté, unsubscribe token). On assemble, on n'invente pas d'infra.

> **Connecteurs** : docs-researcher (React Email / Resend) ; supabase-guard pour les requêtes du greffon cron.

### Tâches
1. **Brancher le welcome** : envoi à la complétion d'onboarding (`completeOnboarding`), PAS à l'inscription (évite la collision avec l'email de confirmation Supabase). Best-effort : un échec d'envoi ne casse jamais l'onboarding. Réutiliser/adapter `emails/welcome.tsx` : récap une ligne + prochain créneau du dept + CTA « Logue ta première prise » + lien import. Dédup `lifecycle_emails` (`'welcome'`, `'once'`).
2. **J+1 « ton créneau »** (`emails/first-window.tsx`) : envoyé le lendemain de l'onboarding aux comptes à **0 prise**. Contenu : prochain créneau (spot favori s'il existe, sinon dept) + 1 bloc upsell honnête Local (« Local te prévient la veille quand TES conditions arrivent ») + CTA log/import.
3. **J+3 « débloque tes tendances »** (`emails/import-nudge.tsx`) : envoyé à J+3 si toujours 0 prise. Angle : 3 prises importées = tes premières tendances, 2 minutes chrono. Un seul CTA (import).
4. **Hebdo vendredi** (`emails/weekly-window.tsx`, selon décision étendre-vs-créer du Bloc 0) : pour les `weekly_window_optin = true`, meilleur créneau de sam-dim (via `getDeptUpcomingWindows` ou le pipeline du digest existant), libellé générique si 0 historique. Dédup par clé de semaine ISO.
5. **Greffon cron dans `personal-window`** (07:00 UTC ≈ 9h Paris) : sélection des cibles en requêtes groupées (pas de N+1), J+1/J+3 calculés sur `profiles.onboarded_at` en Europe/Paris, hebdo seulement si vendredi à Paris. Tous les envois passent par `getEmailRecipient(userId, { marketing: true })` (opt-out global respecté) + écriture `lifecycle_emails` APRÈS envoi réussi (pas de dédup fantôme). Fail-soft par utilisateur, time-box (pattern S72 : arrêt propre + compteur loggé), le legacy du cron reste intact au ms près.
6. **UTM partout** : `utm_source=lifecycle&utm_medium=email&utm_campaign={kind}` sur chaque lien, sinon les retours seront invisibles (c'est LA métrique).

### Critères d'acceptation (tests Vitest + simulation à blanc)
- Même user, 2 runs du cron → 1 seul envoi par kind (dédup prouvée) ; hebdo renvoyé la semaine suivante (clé ISO différente).
- Compte avec 1 prise loguée avant J+1 → ni J+1 ni J+3. Compte opt-out marketing global → AUCUN email lifecycle. Compte sans opt-in hebdo → pas d'hebdo.
- Un throw dans l'envoi d'un user n'empêche ni les users suivants ni le legacy du cron (test fail-soft).
- Previews HTML des 4 templates dans `docs/sprint-74/research/` (pattern S72), DA v2, tutoiement, désinscription visible, zéro tiret cadratin, zéro % inventé.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : si le Bloc 0 révèle que `composeWeeklyDigest` envoie DÉJÀ un email hebdo à quelqu'un (alors l'hebdo de ce sprint serait un doublon à fusionner, pas à créer).
- Ne pas toucher : emails Stripe existants (`payment-*`, `trial-*`, `winback`), leur cron `dunning-relances`.

---

## Bloc 4 — Mesure : le funnel d'activation dans PostHog

Sans ça, on ne saura pas si le sprint a marché. Events server via `captureServerEvent` (`lib/analytics/server.ts`, pattern `signup_completed` S70), client via `lib/analytics.ts`.

### Tâches
1. `onboarding_finished` (server, dans `completeOnboarding`) ; `favorite_spot_added` `{ source: 'onboarding' | 'spot_page' | 'map' }` (dans `toggleFavoriteSpot`) ; `weekly_optin_changed` `{ enabled }` ; `lifecycle_email_sent` `{ kind }` (server, dans le greffon cron).
2. Vérifier/corriger l'`identify` au retour (tâche A6) pour que les retours J+7 s'attachent à la même personne.
3. Documenter dans le RECAP la requête HogQL de suivi (signups → onboarding_finished → favorite_spot_added → retour J+7) pour que John la re-lance à J+14 et J+30.

### Critères d'acceptation
- Chaque event part avec le bon `userId` (test unitaire par action) ; la requête de suivi tourne et renvoie le funnel (même avec des zéros).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression). Puis **deploy-watch** après déploiement.
2. Relire chaque critère d'acceptation du brief et cocher ✅/❌ avec preuve (commande, SQL, capture).
3. Passe sécurité : RLS de `lifecycle_emails` prouvée en SQL, aucune écriture qui contourne les vues `*_for_viewer`, gating S72 re-testé (un Découverte ne peut toujours pas activer les alertes quotidiennes), pas de secret commité.
4. Passe copy : tutoiement partout, zod en français, zéro tiret cadratin dans la copy visible (lint `node scripts/lint-copy-dashes.mjs`), aucune promesse perso sans données.
5. Passe anti-spam/RGPD : opt-out global → 0 envoi ; désinscription un clic fonctionnelle depuis chaque template ; quiet hours non concernées (envois 9h Paris).
6. QA compte neuf réel (qa-chrome) : signup → 6 étapes → fini v2 (spots + créneau + checkbox) → /home, mobile 390 px + desktop, console propre.
7. Livrer `docs/sprint-74/RECAP.md` : fait / comment tester / reste manuel John + les requêtes « avant » (Bloc 0) vs à re-lancer à J+14.

## Reste manuel John (post-sprint)

- Merge `sprint-74` → `main`, déploiement, contrôle `deploy-watch`.
- Vérifier `RESEND_API_KEY` en prod (sinon tous les envois sont no-op silencieux, c'est le comportement voulu de `lib/email/send.ts`).
- **Lane amorçage, toujours ouverte et prioritaire** : distribuer les 18 codes fondateurs restants (2/20 utilisés), remplir le fil avec César. Le meilleur onboarding du monde ne retient personne dans un produit désert.
- Brancher Google Search Console (mesure SEO + vérif des 503 WAF de l'audit 02/07) — préalable de la future lane SEO (curation des 942 spots importés).
- À J+14 : re-lancer la requête de suivi du funnel (RECAP) et décider de la suite (itération activation vs lane SEO).
