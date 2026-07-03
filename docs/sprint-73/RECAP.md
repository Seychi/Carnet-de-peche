# Sprint 73 — RECAP « Sorties groupées » (VERSION SOLO-FIRST)

> Exécuté le 2026-07-03 (mode ultracode/xhigh, workflows multi-agents). Branche `sprint-73`.
> Migrations **107 + 107b appliquées en prod** + prouvées live. Build vert, typecheck vert, 0 régression de test.
> Une passe adversariale a trouvé + fait corriger une **fuite XP réelle** (voir §2, migration 107b).

---

## 0. Décision de cadrage majeure (⚠️ à lire d'abord)

Le Bloc 0 (ancrage lecture seule, `docs/sprint-73/research/anchor.md`) a **invalidé la prémisse centrale du brief**. En base, « sortie » = **DEUX tables disjointes, sans aucune FK entre elles** :

- **`outings`** (S25) : SOLO, owner-only, a `ended_at` + le lien `catches.outing_id`. **Pas de participants.**
- **`outing_proposals`** (S40/S50) : a les participants (`outing_participants`) + le chat, mais **AUCUN `ended_at`** et **AUCUN lien vers les prises**.

Conséquence : « 1 sortie GROUPÉE = 1 post avec les prises agrégées de A ET B + tags » **n'a aucune clé pour exister** (les prises de chaque pêcheur pointent vers SA propre sortie solo, jamais vers la proposal partagée). Ce n'est pas un « CONNECTE », c'est une reconstruction de modèle.

**Décision John (2026-07-03) : SOLO-FIRST.** On livre le post de sortie **solo** (le gain densité réel : 1 post riche par sortie au lieu de N posts de prises), et on **diffère** l'agrégation multi-participants + les tags tant qu'il n'y a aucune activité groupe à tester (en prod : 1 outing, 1 proposal, **0 participant accepté**, 0 catch lié).

---

## 1. Ce qui est fait

### Bloc 0 — Ancrage (livré)
`docs/sprint-73/research/anchor.md` : RLS/policies live des 6 tables, flux sortie solo vs groupe, rendu du fil à réutiliser, où `catches.outing_id` est (n')écrit (nulle part aujourd'hui), baseline advisors. 5 hypothèses du brief invalidées documentées.

### Bloc 1 — Migration 107 (appliquée + prouvée en prod)
`supabase/migrations/107_outing_feed_link.sql` :
- `feed_posts.outing_id` uuid null → FK `outings(id)` `ON DELETE SET NULL` + index.
- **Index UNIQUE PARTIEL** `feed_posts_one_post_per_outing_idx` → au plus **1 post par sortie**.
- Vue `feed_posts_for_viewer` recréée à l'identique (`security_invoker=true` préservé) + colonne `outing_id`.
- RPC **`get_outing_summary(uuid)`** : résumé geom-free d'une sortie, du point de vue de l'appelant. `SECURITY DEFINER` hardened (`search_path=''`, REVOKE public/anon, GRANT authenticated). Lit les métadonnées (durée/département) sur `outings` (DEFINER, non sensible) et les **prises via `catches_for_viewer`** (self-filtre `auth.uid()` → per-viewer). Renvoie : nb prises visibles, blank, nb par espèce, plus grosse **photo-vérifiée uniquement**, conditions (snapshot météo/marée), durée. **AUCUNE coordonnée en sortie.**

**Matrice privacy prouvée live (transaction rollback, prod)** : un tiers voit `catch_count=2` (prise `private` masquée), le propriétaire voit `3` ; `biggest` = la prise vérifiée 50 cm (jamais la 60 cm non vérifiée) ; **zéro geom/lat/lng/spot_id** dans le JSON. Advisors : **aucun nouvel ERROR** (seul +1 WARN attendu = fonction DEFINER exécutable par authenticated, intentionnel/hardened). `lib/types.ts` régénéré.

**Migration 107b (fixes de revue, appliquée + prouvée en prod)** : (1) colonne `outings.is_retroactive` + `recompute_my_challenges` exclut les sorties rétroactives du défi `outing_logged` (cf §2, fuite XP) ; (2) `get_outing_summary` restreinte au propriétaire OU à une sortie référencée par un post approuvé (une sonde d'UUID de sortie non publiée renvoie `null`).

### Bloc 2 — UX solo (livré)
- **`createPost` étendu** (`app/actions/feed.ts`) : param optionnel `outingId`. Re-check serveur (la sortie doit m'appartenir → sinon « Cette sortie n'est pas la tienne »). Violation d'unicité (23505) → « Cette sortie a déjà un récit publié. » **Sans `outingId` : comportement strictement inchangé.** Rate-limit 10/24h intact.
- **`getFeedPage` enrichi** : chaque post à `outing_id` reçoit `outingSummary` calculé serveur via `get_outing_summary` sous la session du viewer (per-viewer, geom-free). Posts de sortie rares → un appel par sortie de la page, en parallèle.
- **`regroupCatchesIntoOuting`** (`lib/outings/regroup.ts`, NOUVEAU) : « Regrouper en sortie » = crée une sortie rétroactive à partir de prises d'une même journée non rattachées. ⚠️ **Insère l'outing DIRECTEMENT (pas `createOuting`) → ZÉRO XP / dopamine.** Owner-scopé, geom-free, race-safe (`.is('outing_id', null)`), nettoie l'outing orpheline en cas d'échec.
- **`getOutingPostState`** : dit quelles sorties ont déjà un post (pour le CTA).
- **PostComposer** en mode sortie (en-tête récap + bredouille postable), **PostCard** rend le **bandeau sortie** quand `outing_id && outingSummary` (post normal inchangé), **OutingSummaryBanner** (geom-free, daltonien-safe : icône+label, jamais la teinte seule), **OutingPostComposerDialog**, **TellOutingButton** (CTA « Raconte cette sortie » sur sortie clôturée sans post), **RegroupCatchesCard** (sélection multi dans `/carnet/sorties`).
- Copy FR tutoiement, **zéro tiret cadratin** dans les nouveaux fichiers, états vides honnêtes, bredouille assumée.

### Bloc 3 — Wedge RecFishing (livré, indépendant)
- Landing SEO indexable **`/declarer-ses-prises`** : la déclaration obligatoire 2026 expliquée + pitch honnête « le carnet te RAPPELLE, il ne déclare PAS à ta place » (EU Login). Toute la donnée réglementaire vient du module S24 `lib/regulation/recfishing.ts` (source unique datée, **rien de fabriqué**).
- SEO : title < 60c, meta, canonical, JSON-LD (Article + BreadcrumbList + FAQPage), entrée sitemap, liens croisés depuis les fiches espèces (bloc réglementation, gaté sur les espèces sensibles) + guide MDX `content/guides/declaration-obligatoire-peche-en-mer-recfishing.mdx`.
- PostHog : `landing_recfishing_viewed` (client, consentement + UTM). Composant `RecfishingLandingTracker`.

---

## 2. Vérification (VERIF)

- **Typecheck** `tsc --noEmit` : **vert** (EXIT 0).
- **Build** `next build` : **✓ Compiled successfully**. `/declarer-ses-prises` + guide RecFishing + toutes les routes buildent.
- **Tests** `vitest run` : **914/915 verts**. Le seul échec DÉTERMINISTE est **pré-existant** (S72 `recfishing-reminders` : le cron renvoie `spotAlerts.truncated`, le test ne l'attend pas) : fichier **byte-identique à HEAD**, hors périmètre S73. `security-headers.test.ts` a échoué au 1er run puis passé au re-run (flaky, non lié). **Zéro régression introduite par ce sprint** (tous les tests outings/feed passent). → à traiter hors S73 (voir §4).
- **Copy-dashes** : les nouveaux fichiers sont propres (les 17 occurrences restantes sont toutes pré-existantes et tolérées : libellés data, titres, `console.warn`).
- **Passe adversariale (relecteur indépendant)** : a confirmé sains privacy/geom, ownership, non-régression fil, daltonisme, copy. A trouvé **1 finding CRITIQUE réel** (voir ci-dessous) + 1 HAUTE + 1 MOYENNE, tous corrigés.
- 🔴 **FUITE XP trouvée + corrigée (107b)** : « Regrouper en sortie » insère une ligne `outings`, or le défi `first_outing` (« Logue une sortie », +20 XP) comptait les sorties SANS filtre → un pêcheur décrochait +20 XP au premier regroupement (au prochain recompute : log de prise OU cockpit /home). Le simple « ne pas appeler `createOuting` » ne suffisait pas (le chemin XP est INDIRECT via `recompute_my_challenges`). Corrigé : flag `is_retroactive` exclu du comptage du défi. **Prouvé live** : baseline `first_outing` 0/non complété → après sortie RÉTROACTIVE : toujours 0/non complété (**zéro XP**) → après sortie RÉELLE : 1/complété (flux normal intact). La série était déjà saine (105b filtre les outings par `is_competitive_catch`).
- 🟠 **Course partielle corrigée** (`regroup.ts`) : si une prise change entre la lecture et le rattachement, on exige désormais que TOUTES les prises soient rattachées, sinon on annule tout (pas de sortie partielle silencieuse).
- 🟠 **Autorisation `get_outing_summary` resserrée (107b)** : prouvé live (propriétaire voit une sortie non publiée ; un tiers sans post approuvé reçoit `null`).
- **Zéro nouvel XP (final)** : grep du diff = aucun `award_xp`/`xp_events`/`emitDopamine` ajouté ; `regroup` insère directement (pas de `createOuting`) ET est exclu du défi via `is_retroactive`.
- **ON DELETE SET NULL** : supprimer une sortie ne supprime pas le post (le post reste, `outing_id`→null → le bandeau disparaît proprement).

---

## 3. Comment tester (QA manuelle John)

1. **Regrouper** : dans `/carnet/sorties`, sélectionne 2 prises d'une même journée non rattachées → « Regrouper en sortie » → le composer s'ouvre pré-rempli → publie → le post apparaît dans le fil avec le bandeau sortie (durée, département, stats espèces).
2. **Raconte** : sur une sortie solo clôturée (avec `ended_at`) sans récit → bouton « Raconte cette sortie » → même composer.
3. **Unicité** : republier un récit pour la même sortie → message « Cette sortie a déjà un récit publié. »
4. **Bredouille** : une sortie sans prise → post « Bredouille assumée » publiable.
5. **Privacy** (2 comptes) : A logue une prise `private` + une `public` dans une sortie, publie le récit → un compte B (Découverte) voit le bandeau avec **seulement la prise publique comptée** et la **zone = département**, jamais de spot ni de coordonnée.
6. **Wedge** : `/declarer-ses-prises` indexable, sourcée, CTA inscription ; liens croisés depuis `/especes/bar`.

---

## 4. Reste manuel John (post-sprint)

- **Merge `sprint-73` → main + déploiement** (auto Vercel) + QA fumée.
- **Tests pré-existants rouges (hors S73)** : décider quand corriger le drift `recfishing-reminders` (le cron renvoie `truncated`, le test ne l'attend pas → ajouter `truncated: 0` à l'attendu) et `security-headers` (CSP enforce). Non touchés ici pour garder le diff S73 focalisé.
- **Tests auto des nouvelles surfaces (dette)** : `createPost({outingId})`, `regroupCatchesIntoOuting` (dont l'invariant zéro-XP), l'enrichissement `outingSummary` de `getFeedPage` et l'autorisation `get_outing_summary` ne sont couverts que par des preuves SQL live (ce RECAP), pas par des tests Vitest. La fuite XP l'a montré : ces invariants méritent un test de régression. À ajouter (nécessite un harnais DB ou des mocks Supabase ciblés).
- **Différé (non fait, décision solo-first)** :
  - Agrégation **multi-participants** + **tags** (@A @B) : nécessite de ponter `outings`/`outing_proposals` (nouvelle modélisation) — à rouvrir quand il y a de l'activité groupe. La notif « ta sortie avec @x est en ligne » en dépend (aucun participant en solo).
  - **Photos des prises pré-remplies** dans le composer de sortie : `get_outing_summary` ne renvoie pas les chemins photo (geom-safe) ; upload manuel pour l'instant. Pré-remplir demanderait un endpoint serveur dédié (prises publiques, geom-free).
  - Bandeau sortie sur le **profil public** `/u/[username]` : `PostList` n'y enrichit pas `outingSummary` → dégradation gracieuse (post sans bandeau). À enrichir si voulu.
  - `/declarer-ses-prises` est rendu **dynamique** (ƒ) et non statique malgré `revalidate` : à investiguer si on veut le figer en ISR (non bloquant pour le SEO, rendu SSR indexable).
- **Amorçage** : la première vraie sortie solo racontée = le premier post de sortie du fil, à relayer par César.
