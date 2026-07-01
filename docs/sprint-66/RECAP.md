# Sprint 66 — RECAP « Classements » (dopamine multi-joueur, spot-safe)

> Exécuté le 2026-07-01 (Fable, effort xhigh, ultracode). Premier sprint **multi-joueur** (la comparaison entre pêcheurs arrive, pivot ADN 2026-06-28). **Code-complet, NON poussé.**
> Migration **102** (⚠️ PAS 101 : le brief disait 101, mais le sprint 63 a déjà consommé 100 + `101_dopamine_notifications`. Le prochain libre sur disque était 102).

---

## Décisions John (prises en début de sprint)

1. **Portée = classements RÉSERVÉS AUX CONNECTÉS.** La RPC `get_leaderboard` est grantée à `authenticated` uniquement (**pas `anon`**), pas de page SEO publique. Ça enforce au niveau des droits ton gate « ne pas exposer un classement maigre ». (On pourra ouvrir au public plus tard sans casser la migration.)
2. **Métrique-reine par défaut = « XP de la saison ».** Les 3 autres (nombre de prises, plus grosse vérifiée, diversité d'espèces) restent sélectionnables.

## Objectif (rappel)

Des classements opt-in (national / département / espèce / saison) + un duel vs tes follows, classés sur des métriques **sans aucune fuite de spot**, avec un état vide digne tant que le réservoir se remplit.

---

## Ce qui est fait

### Bloc 0 — Migration `102_leaderboards.sql` (APPLIQUÉE en prod + prouvée en live)
- **`profiles.public_ranking bool not null default false`** — opt-in RGPD. Un compte n'apparaît dans AUCUN classement tant que c'est `false`.
- **RPC `get_leaderboard(p_scope, p_dept, p_species, p_period, p_metric, p_limit)`** `STABLE SECURITY DEFINER SET search_path=public`, calquée sur `084`/`get_user_xp` :
  - renvoie `{rank, user_id, username, avatar_url, metric_value}` — **JAMAIS** de `geom`, ville, département ou coordonnée en sortie.
  - **4 métriques spot-safe** : `xp` (défaut), `catches`, `biggest` (mesurée + photo-vérifiée), `diversity`.
  - **3 portées** : `national`, `department` (filtre `profiles.home_department`), `follows` (duel : comptes suivis + soi).
  - **2 périodes** : `season` (année civile, frontière **Europe/Paris**) / `all_time`.
  - filtre `public_ranking = true` sur **tous** les scopes (y compris `follows`).
  - **k-anon K=3** sur les scopes publics (national/département) : sous 3 pêcheurs classés → renvoie **rien** (état vide digne). Pas de k-anon sur `follows` (comptes que tu suis explicitement, tous opt-in, un duel à 2 est le cas d'usage).
  - grant `authenticated` uniquement (revoke `public, anon`).
- **Index** `xp_events_created_at_user_idx (created_at, user_id) include (points)` pour la somme d'XP saisonnière.

**Preuves live (transaction rollback → prod jamais mutée) :**
| Vérif | Résultat |
|---|---|
| Opt-out respecté (toutes les lignes renvoyées appartiennent à des opt-in) | ✅ `all_rows_are_optin = true` |
| Aucune colonne géo dans la signature (entrée + sortie) | ✅ `no_geo_columns = true` |
| k-anon : 2 opt-in → national **vide** | ✅ `national_rows = 0` |
| k-anon : 4 opt-in → national **4 lignes** classées desc | ✅ `national_rows = 4`, `ordering_desc_ok = true` |
| Scope ultra-granulaire (Corse-du-Sud × barracuda) | ✅ `granular_rows = 0` |
| `anon` absent des grants ; `authenticated` présent | ✅ `authenticated, postgres, service_role` |
| `public_ranking` default false, not null | ✅ |

### Bloc 1 — UI classements + duel follows
- **`/classements`** (`app/(app)/classements/page.tsx`) : RSC auth-gaté, rend le 1er classement (national/XP/saison) côté serveur, `noindex` (connectés).
- **`LeaderboardTable`** (`components/gamification/LeaderboardTable.tsx`) : sélecteurs métrique / portée / période + filtres contextuels (département si scope=department ; espèce si métrique prises/plus-grosse), **duel « Mes pêcheurs »**, met en évidence **ta ligne** (pastille « toi » + fond, jamais la seule teinte), badge ✓ « vérifié » sur la métrique « plus grosse », fetch via la Server Action.
- **`LeaderboardEmptyState`** : état vide digne (message adapté public vs follows) + CTA loguer / activer sa visibilité.
- **Nav** : entrée « Classements » (icône `Trophy`) dans la sidebar desktop (`AppSidebar`) + l'overflow mobile (`MoreMenu`).

### Bloc 2 — Opt-in RGPD & réglages
- **`updateRankingVisibility(enabled)`** (`app/(app)/profil/actions.ts`) : action DÉDIÉE (découplée du gros formulaire qui exige ≥ 1 technique) → **retour arrière immédiat**. Ne touche que `public_ranking`. Revalide `/profil` + `/classements`.
- **`RankingVisibilityToggle`** (`app/(app)/profil/ranking-visibility-toggle.tsx`) : toggle instantané (optimiste + toast), off par défaut, état donné de **3 façons** (position + libellé « Activé/Désactivé » + `role="switch"`/`aria-checked`, daltonien-safe). Câblé sur `/profil`.

### Tests
- **19 tests neufs** : `lib/gamification/__tests__/leaderboard.test.ts` (13 : format/pluriels/groupement déterministe/métriques/médailles) + `app/actions/__tests__/leaderboard.test.ts` (6 : refus anonyme, mapping snake→camel, erreur RPC, **liste blanche des params**, bornage dept/species).

---

## Décisions techniques (à connaître / confirmer)
- **« Saison » = année civile courante, frontière Europe/Paris** (leçon `challenges_month_paris_boundary` : `date_trunc` UTC décale la frontière). ⚠️ **Sprint 67** formalisera les resets saisonniers (trimestriel ?) → à trancher là-bas.
- **Période filtrée sur `created_at`** (date d'enregistrement), pas `caught_at` (déclaratif/antidatable) — cohérent avec le moteur XP (098). Ladder « fraîche » chaque saison, anti-antidatage.
- **`catches` n'a PAS de colonne `department`** → le scope département filtre `profiles.home_department` (région grossière déjà publique, spot-safe), pas la localisation de la prise.
- **Métriques prises = uniquement `privacy = 'public'`** (le pêcheur a choisi de les montrer ; « plus grosse » est vérifiable sur son profil). « Plus grosse » exige `measured_length_cm` + `photo_verified_at` (standard record anti-farm 098/066).
- **Métrique XP** : all-time lit `user_progress.total_xp` (déjà public via `get_user_xp`) ; saison somme `xp_events` sur `created_at`. XP holistique → le filtre espèce est ignoré pour XP et diversity.
- **2 bugs runtime attrapés au smoke-test** (que les 5 relecteurs statiques n'ont pas vus) : (1) `column reference is ambiguous` (collision alias internes vs colonnes OUT de `RETURNS TABLE` → renommés `uid/uname/avatar/mv/rnk`) ; (2) `rank()` renvoie `bigint` vs colonne OUT `int` → cast `::int`.

## Garde-fous vérifiés (passe anti-régression)
- 🔒 **Anti spot-burning** : zéro coordonnée possible (signature de la RPC sans colonne géo, prouvé live `no_geo_columns=true`). ✅
- 🔒 **RGPD opt-in** : off par défaut, réversible immédiatement, opt-out respecté partout (prouvé live). ✅
- 🔒 **Honnêteté** : « plus gros » = prises vérifiées seulement ; état vide digne (pas de tableau vide triste) ; pas de « bon dernier » (seuls les métriques > 0 apparaissent). ✅
- 🔒 **Daltonisme** : rang (chiffre), « toi » (texte), toggle (position + texte), badge vérifié (icône ✓ + tooltip) — jamais la seule teinte. ✅
- **Adversarial SQL review** : 5 lentilles (spot-leak / opt-out / verified-only / privilège-injection / correction) = **5/5 clean**.

## Vérification (VERIF)
- **Typecheck** : `tsc --noEmit` → **0 erreur**.
- **Tests** : **657/657** verts (dont 19 neufs).
- **Lint** : fichiers changés → **0 warning/erreur**.
- **Build** : `next build` → **✅ compilé** (`/classements` = route dynamique 7.99 kB, 0 erreur).
- **Advisors sécurité** : ✅ **GO** — toujours **3 ERROR** (baseline pré-existante : 2 `security_definer_view` sur `*_for_viewer` assumées + `spatial_ref_sys` PostGIS ; **aucune nouvelle**). `get_leaderboard` = **+1 `authenticated_security_definer`** (assumé, pattern projet), **absent de `anon_security_definer`** (confirme authenticated-only). HIBP reste le WARN assumé (plan Free).
- **Revue indépendante TS/UI** (agent code-reviewer) : 0 critical, **1 HIGH + 3 MEDIUM + 2 LOW**. Lentilles anti-spot-burning / RGPD / daltonisme = **PASS** (aucune fuite, aucune faille). Corrigés :
  - **HIGH — race condition sur les fetchs concurrents** des sélecteurs (une réponse en retard écrasait le bon résultat) → jeton de requête `requestId` (les réponses obsolètes sont ignorées).
  - **MEDIUM — scope « Département » sans département** affichait l'état vide k-anon trompeur → message dédié « Choisis un département ».
  - **MEDIUM — label « Mon département »** alors que le sélecteur laisse choisir n'importe quel département → renommé « Département ».
  - **Accepté (non bloquant)** : MEDIUM `optedIn` figé au montage (mitigé par `revalidatePath('/classements')` dans l'action opt-in ; à QA au retour /profil→/classements) ; 2 LOW (pluriel à 0 jamais atteint car SQL filtre `mv>0` ; `key={i}` sur squelettes figés).

---

## À tester (John, live)
- Activer/désactiver « Apparaître dans les classements » sur `/profil` → apparaître/disparaître des classements immédiatement.
- `/classements` : changer métrique/portée/période, duel « Mes pêcheurs », état vide digne quand < 3 opt-in.
- Confirmer qu'aucune coordonnée n'apparaît jamais (QA anti-fuite).

## Reste manuel John (post-sprint)
- **Confirmer la migration 102** (déjà appliquée en prod : additive/non-destructive, revue 5/5 + prouvée live ; `lib/types.ts` régénéré).
- **Trancher pour plus tard** : définition de « saison » (année vs trimestre) au Sprint 67 ; seuil k-anon K=3 (relevable si « 3 fait triste »).
- **NE PAS mettre en avant tant que le réservoir est maigre** (0/18 opt-in aujourd'hui) — lancer après le Sprint 68 (amorçage). Le k-anon rend d'ailleurs les classements publics vides tant que < 3 pêcheurs opt-in par scope.
- Merge → déploiement (le code UI n'est pas encore poussé).
