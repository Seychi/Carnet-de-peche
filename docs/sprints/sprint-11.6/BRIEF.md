# Sprint 11.6 — Brief d'exécution
## Remédiation audit QA live (sécurité GPS + RGPD + social + UX)

> Rédigé le 2026-06-21. Durée cible : ~1 semaine (la majorité est parallélisable).
> Contexte : audit live multi-comptes `docs/audits/AUDIT-QA-LIVE-2026-06-21.md` (18 bugs + 3 constats backend). S'appuie sur le travail **déjà écrit mais non déployé** du sprint 11.5 (`docs/sprint-11.5/BRIEF.md`, `docs/sprint-11.5/ADDENDUM-gps.md`).
> Décisions John 2026-06-21 : « tout corriger » en un sprint, mode Fable `ultracode` + `xhigh`.

**⚠️ Constat fondateur (à lire avant tout)** : la prod tourne sur la **migration 024**. Les migrations **025, 026, 027 existent comme fichiers mais ne sont PAS appliquées en prod** ; 028/029 ne sont pas encore écrites. La doc (`CLAUDE.md`) affirme à tort « migration 025 appliquée + vérifiée en prod le 2026-06-21 » : **c'est faux**. La fuite GPS critique est donc grande ouverte en prod. Ce sprint commence par rétablir la vérité prod, puis corrige.

**Préalable avant de démarrer (manuel John)** :
- Confirmer l'accès `apply_migration` sur le projet prod `glgciwwnpmgifyhbvxsw` (les migrations seront **appliquées par John ou avec sa validation explicite** — jamais en autonomie sur la prod).
- Vérifier dans Vercel (prod) la présence de `SUPABASE_SERVICE_ROLE_KEY` (suspect n°1 de BUG-03) **et** des `NEXT_PUBLIC_SUPABASE_*` en env **Preview** (sinon CI/E2E rouge, cf CLAUDE.md).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-11.6/BRIEF.md`. Lance dès maintenant en parallèle les workstreams **WS-B, WS-C, WS-D, WS-E, WS-F, WS-G, WS-H, WS-I, WS-J** (aucune dépendance) ; **WS-A1 (apply 025/026/027) en tout premier**, puis **WS-A2 (028/029 + gating)** qui en dépend. Respecte le tableau de dépendances. Termine **obligatoirement** par le **workstream VERIF** (agent indépendant) avant de me rendre la main. Prépare les migrations et le `RECAP.md`, mais **ne push pas** et **n'applique rien en prod sans ma validation** : les migrations prod et le déploiement sont dans « Reste manuel John ».

---

## Objectif du sprint en une phrase

Fermer les 18 bugs de l'audit du 2026-06-21 — d'abord la fuite GPS critique et la suppression de compte RGPD — et **synchroniser prod avec le code** (appliquer 025→029), avec preuve vérifiable pour chacun.

---

## Workstreams & dépendances

| WS | Bloc(s) | Bugs couverts | Durée | Dépend de | Parallèle J1 |
|----|---------|---------------|-------|-----------|--------------|
| **A1** | Bloc 0 — sync migrations prod | backend #1, #3 (partie search_path) | 0,5 j | préalable John | ✅ (en 1er) |
| **A2** | Bloc A — fuite GPS + gating tier | 01, 02, 08, backend #1 | 2-3 j | **A1** (026 avant 028) | ❌ |
| **B** | Bloc B — suppression compte + FK | 03, 13 | 1,5 j | — | ✅ |
| **C** | Bloc C — fil : /follows + realtime post | 04, 09 | 2 j | — | ✅ |
| **D** | Bloc D — départements profil | 05 | 1 j | — | ✅ |
| **E** | Bloc E — rendu carte (mount noir) | 06 | 1 j | — | ✅ |
| **F** | Bloc F — copy + i18n espèces | 07, 14 | 0,5 j | — | ✅ |
| **G** | Bloc G — flux auth (redirect + plan) | 10, 11 | 1 j | — | ✅ |
| **H** | Bloc H — polish UX | 15, 16, 17, 18 | 1,5 j | — | ✅ |
| **I** | Bloc I — perf onboarding (INP) | 12 | 1 j | — | ✅ |
| **J** | Bloc J — durcissement backend | backend #2, #3 (HIBP) | 0,5 j | coord. A1 | ✅ |
| **VERIF** | revue finale indépendante | tous + #9/portail Stripe | 1 j | tous | ❌ (toujours en dernier) |

> Règle ultracode : tout ce qui est ✅ démarre J1 en parallèle. Seul **A2** attend **A1**.

---

## Bloc 0 (WS-A1) — Synchroniser les migrations prod déjà écrites

La prod est en retard de 3 migrations **déjà committées** (`supabase/migrations/025_lock_get_spots_for_scoring.sql`, `026_harden_functions.sql`, `027_perf_fk_indexes.sql`). C'est le préalable à tout : 028 (Bloc A) recrée `blur_spot_geom` que 026 modifie. **Ne pas réécrire ces fichiers** ; les relire, les appliquer, les vérifier.

### Tâches
1. Relire 025/026/027 et vérifier qu'ils s'appliquent proprement au-dessus de 024 (pas de dépendance manquante).
2. Préparer la commande d'application prod (pour John) et les requêtes de vérif.
3. Après application : régénérer `lib/types.ts` (`pnpm dlx supabase gen types … > lib/types.ts`).
4. Corriger `CLAUDE.md` : remplacer l'affirmation « 025 appliquée + vérifiée en prod » par l'état réel + date d'application effective.

### Critères d'acceptation
- `list_migrations` prod inclut `025`, `026`, `027` (la liste ne s'arrête plus à 024).
- `get_advisors(security)` : la ligne `function_search_path_mutable` pour `blur_spot_geom/blur_catch_geom/bump_*/touch_updated_at/get_my_catches_breakdown` **disparaît**.
- `CLAUDE.md` ne contient plus d'affirmation de déploiement non vérifiée pour 025.

### Garde-fous
- ⚠️ **L'application en prod est faite par John** (ou validée explicitement). L'agent prépare + vérifie, n'applique pas seul.
- Ne pas modifier le contenu de 025/026/027 (déjà committés).

---

## Bloc A (WS-A2) — Fermer la fuite GPS + gating de tier serveur  🔴 CRITIQUE

Couvre **BUG-01** (floutage cosmétique : `geom_public` = cercle centré sur le point exact → centroïde = point réel ; itinéraire anon = coords exactes), **BUG-02** (cap 3/dépt + limite 1-dépt côté client seulement) et **BUG-08** (un Local voit le précis hors de son département). Le design complet est **déjà écrit** dans `docs/sprint-11.5/ADDENDUM-gps.md` — l'implémenter tel quel (migrations **028** + **029** + patch route). **Dépend de Bloc 0** (028 après 026).

### Tâches
1. Écrire `supabase/migrations/028_spot_geom_blur_jitter.sql` (cf. ADDENDUM) : `blur_spot_geom` = jitter **aléatoire stocké** 500–900 m (pas de dérivation depuis l'id) ; `UPDATE` des 38 spots existants ; `revoke select (geom) on public.spots from anon, authenticated`.
2. Écrire `supabase/migrations/029_spot_rpc_tier_gating.sql` (cf. ADDENDUM) : `get_spots_for_map` gate par `current_tier(auth.uid())` + `home_department` (local = son dépt, itinerant = tous, anon/discovery = 3/dépt via `row_number`), précis dérivé du **tier réel**. Appliquer le plafond (3 anon/discovery) à `nearby_spots` (COUNT only, pas de geom).
3. Patch `app/api/spots/nearby/route.ts` : garde de tier serveur (`getUserTier()` → cap 3 anon / 5 discovery / 100 local-itinerant), comme dans l'ADDENDUM.
4. Garder `limitSpotsPerDept` dans `app/(map)/carte/page.tsx` en **double sécurité** (ne pas le retirer ce sprint).
5. Régénérer `lib/types.ts`. Tests Vitest : ajouter une régression « floutage » (distance public↔précis ∈ [400, 1000] m) et « gating tier » (anon → 3 max/dépt, local → son dépt seulement).

### Critères d'acceptation (vérifiables)
- `select min(d),max(d) from (select ST_Distance(geom::geography,geom_public::geography) d from public.spots) t;` → tout **entre ~500 et ~900 m** (plus 0,02 m).
- `select has_column_privilege('anon','public.spots','geom','SELECT');` → **false**.
- En **anonyme**, sur `/spots/cap-frehel`, les boutons Google/Plans/Waze pointent à **~500–900 m** du point réel (≠ 48.6852,-2.3197). La fiche dit toujours « zone approchée » — désormais **vrai**.
- RPC anonyme (clé publishable, sans JWT) : `get_spots_for_map{}` → **≤ 3 lignes/département** ; `get_spots_for_scoring` → soit révoquée à `anon`, soit ne renvoyant plus `geom` précis (cf 025).
- Abonné **Local (29)** sur `/spots/<spot 22>` → **PAS** de « GPS PRÉCIS DISPONIBLE » (précis réservé à son dépt + Itinérant). Abonné **Itinérant** → précis partout.
- `get_advisors(security)` : `get_spots_for_scoring` n'apparaît plus comme `anon_security_definer_function_executable` (ou justifié).

### Garde-fous
- ⚠️ Jitter **aléatoire stocké uniquement** (un offset déterministe dérivé de l'id serait réversible — interdit).
- Ne pas régresser : carte abonnés (précis + 18 spots), fiche abonné, cron `compute-spot-scores` (passe par `service_role`, doit garder l'accès à `geom`).
- ⚠️ DEMANDER À JOHN AVANT de **retirer** `limitSpotsPerDept` côté page (on le garde ce sprint).

---

## Bloc B (WS-B) — Suppression de compte (RGPD) + FK non-cascade  🟠 HAUTE

Couvre **BUG-03** (la suppression échoue : « Erreur lors de la suppression. Contacte le support. ») et **BUG-13** (FK latentes). Diagnostic audit : `qa-fresh` intact après suppression, **aucun** `DELETE /admin/users` dans les logs GoTrue → l'échec est **côté serveur avant** l'appel admin. Code : `app/(app)/profil/actions.ts`.

### Tâches
1. **Diagnostiquer** `app/(app)/profil/actions.ts` (action de suppression). Hypothèse n°1 : client admin non instancié car `SUPABASE_SERVICE_ROLE_KEY` absent/mauvais en prod (cf `lib/env.ts`). Vérifier aussi un éventuel ordre de suppression qui throw avant l'appel `auth.admin.deleteUser`.
2. Rendre l'action robuste : logguer l'erreur réelle (Sentry) au lieu d'un message générique ; renvoyer un message FR exploitable.
3. Écrire `supabase/migrations/030_account_deletion_fks.sql` : passer `feed_posts.moderated_by` et `reports.resolved_by` (FK → `profiles(id)`) en **`ON DELETE SET NULL`** (cohérent avec « les contenus modérés restent, l'auteur-modérateur est anonymisé »). Vérifier qu'aucune autre FK vers `profiles`/`auth.users` ne bloque (toutes les autres sont déjà CASCADE).
4. Si la suppression doit nettoyer le Storage (`storage/catches/<uid>/…`), l'inclure dans l'action (service role).

### Critères d'acceptation
- Sur un **compte jetable dédié** : « Supprimer définitivement » → **succès** (déconnexion/redirection), pas d'erreur.
- Après suppression : `select count(*) from auth.users where id = '<uid>'` = **0**, et 0 ligne résiduelle dans `catches/feed_posts/feed_comments/feed_likes/follows/subscriptions`.
- Supprimer un compte ayant **modéré un post** et **résolu un signalement** → succès (les lignes `feed_posts.moderated_by` / `reports.resolved_by` passent à NULL, le post/report subsiste).
- En cas d'échec réel, l'erreur exacte remonte dans Sentry (plus de message muet).

### Garde-fous
- ⚠️ Tests de suppression **uniquement sur comptes jetables**. Ne jamais supprimer un compte réel.
- Ne pas exposer `SERVICE_ROLE_KEY` côté client (server action / route uniquement).

---

## Bloc C (WS-C) — Fil : `/follows` cassé + post sans refresh  🟠/🟡

Couvre **BUG-04** (`/follows` affiche « Tu suis (0) » alors que le suivi existe en base) et **BUG-09** (un post publié/supprimé n'apparaît/disparaît pas sans rechargement). Code : `app/(app)/follows/page.tsx`, `app/actions/follow.ts`, `app/actions/feed.ts`, composants `components/feed/*`.

### Tâches
1. **`/follows`** : corriger la requête qui peuple « Tu suis » / « Te suivent » (vérifier `follower_id`/`following_id` non inversés, et qu'aucun filtre dépt ne s'applique à tort). Ajouter un bouton **se désabonner** depuis la liste.
2. **Post realtime/optimistic** : après `createPost`, insérer le post en tête de liste sans refresh (optimistic update ou refetch ciblé) ; après `deletePost`, le retirer immédiatement (aujourd'hui : reste avec spinner). S'aligner sur le comportement déjà correct des **commentaires**.
3. Tests : étendre `app/actions/__tests__/follow.test.ts` (un follow apparaît bien dans la liste « Tu suis ») ; test feed (post créé présent sans reload).

### Critères d'acceptation
- Suivre un pêcheur depuis `/u/<x>` → `/follows` affiche ce pêcheur sous « Tu suis (1) » **sans rechargement**, et un bouton « Ne plus suivre » l'y retire.
- Publier un post sur `/fil/<dept>` → il apparaît en tête **immédiatement** ; le supprimer → il disparaît **immédiatement** (plus de spinner persistant).
- Aucune régression : like/commentaire (déjà OK), gating « fil 100% gratuit ».

### Garde-fous
- Le fil reste **gratuit tous tiers** (ne pas réintroduire de gating tier sur post/like/commentaire/follow).
- Lire le fil via les vues/RPC existantes, ne pas requêter `feed_posts` en contournant la RLS.

---

## Bloc D (WS-D) — Départements : aligner profil sur onboarding  🟠 HAUTE

Couvre **BUG-05** : l'onboarding propose **24** départements (06,11,13,30,59,2A,2B inclus), l'édition profil seulement **17** ; de plus le `<select>` profil ne pré-remplit pas la valeur sauvegardée (`value===""` alors que dept=29) → sauvegarder risque d'effacer `home_department`. Code : `app/(app)/profil/*` (formulaire), onboarding étape 2.

### Tâches
1. Créer/centraliser **une seule source de vérité** des départements côtiers (`lib/departments.ts`) = la liste complète (les 24 de l'onboarding + `80` si pertinent, à aligner avec `can_post_in_department`). Onboarding **et** profil l'importent.
2. Corriger le `<select>` profil pour **pré-sélectionner** `home_department` enregistré (attention au `char(3)` complété par des espaces, « 29 » vs « 29  » : `btrim` à la lecture).
3. Empêcher l'effacement : à la sauvegarde, si le select n'a pas été touché, conserver la valeur existante (ne pas écrire NULL).
4. Aligner `can_post_in_department` (migration si nécessaire) sur la même liste canonique.

### Critères d'acceptation
- `/profil` : le `<select>` département liste **exactement** la même chose que `/onboarding/2` (24+).
- Connecté en 29 : `/profil` affiche « 29 — Finistère » **présélectionné** (plus le placeholder).
- Modifier la bio puis « Mettre à jour mon profil » **sans toucher** au département → `home_department` **inchangé** en base (pas de NULL).
- Un compte en **06 / 13 / 2B** voit et conserve son département ; `/fil` ne renvoie pas vers le sélecteur de côte.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : liste canonique finale (24 vs 25 vs 27) — proposer 24 dépts côtiers métropole+Corse, et trancher le sort de `80` (Somme).

---

## Bloc E (WS-E) — Carte noire au montage  🟠 HAUTE

Couvre **BUG-06** : `/carte` s'affiche noire (tuiles non peintes) au chargement, ne se rend qu'après un resize/interaction (intermittent). MapTiler répond 200 → c'est un problème de dimension/`resize` au mount. Code : `components/map/MapView.tsx`, `components/map/MapShell.tsx`, `components/spots/SpotMiniMap.tsx`.

### Tâches
1. Appeler `map.resize()` après le premier `load` **et** après que le conteneur a sa taille finale (ResizeObserver sur le conteneur, ou `requestAnimationFrame` post-mount). Le fix T0.4 existant (sprint 9.5) est insuffisant — le rendre fiable.
2. Vérifier que le conteneur a une hauteur non nulle au mount (CSS) sur `/carte` et sur la mini-map fiche.
3. Si pertinent, afficher un skeleton tant que `map.loaded()` est faux.

### Critères d'acceptation
- `/carte` (anon **et** abonné) affiche les tuiles **dès le chargement**, sans resize manuel, sur 5 chargements consécutifs.
- La mini-map de `/spots/<slug>` s'affiche au chargement.
- Pas de régression des markers / clustering / disque de flou.

### Garde-fous
- Tester en **mobile (≤ 500 px)** aussi (la carte plein écran y est passée OK une fois, mais c'était intermittent).

---

## Bloc F (WS-F) — Copy mensongère + faute d'article espèces  🟡/🔵

Couvre **BUG-07** (sur-promesses) et **BUG-14** (« Le dorade royale » / « Le orphie »). Code : `app/(marketing)/page.tsx`, `app/(marketing)/tarifs/page.tsx`, `app/(marketing)/especes/[slug]/page.tsx`.

### Tâches
1. Home : **supprimer** « Export GPX/JSON prévu cette année » (fonctionnalité inexistante + date). Retirer/assouplir « App iOS/Android — bientôt ».
2. Tarifs FAQ « Vous couvrez toute la France ? » : remplacer « 27 départements côtiers couverts » par une formulation **vraie** (ex. « On démarre en Bretagne (22, 29, 35, 56), extension Atlantique en cours »). Retirer « Corse prévue fin 2026 » (date).
3. Espèces : remplacer l'article codé en dur « Le » par un **genre par espèce** (donnée dans le contenu/`content/especes/*` ou une map) : « La dorade royale », « L'orphie » (élision), « Le bar / lieu / maquereau / sar ».

### Critères d'acceptation
- `grep -ri "Export GPX\|prévu cette année\|27 départements\|Corse prévue" app content` → **0 résultat** (hors ce brief/audit).
- H1 de `/especes/dorade-royale` = « La dorade royale … » ; `/especes/orphie` = « L'orphie … » ; les 4 masculins inchangés.
- Aucune autre promesse datée dans la copy marketing.

### Garde-fous
- Vérifier les `<title>`/OG/JSON-LD des fiches espèces (même genre) pour le SEO.

---

## Bloc G (WS-G) — Flux d'auth : redirection & contexte de plan  🟡

Couvre **BUG-11** (routes protégées → `/auth/login` sans paramètre de retour) et **BUG-10** (« Essayer 7 jours » perd le plan via `/auth/register`→`/auth/login`). Code : `middleware.ts`, pages `app/(auth)/*`, CTA `app/(marketing)/tarifs/page.tsx`.

### Tâches
1. `middleware.ts` : sur redirection des routes protégées, ajouter `?redirect=<path>` (chemin **interne** uniquement, validé — pas d'open-redirect). Après login réussi, rediriger vers ce `redirect`.
2. Préserver le paramètre **plan** : `/auth/register?plan=local` → conserver `plan` à travers la redirection vers `/auth/login` (et le réutiliser post-auth pour lancer le bon Checkout/atterrir sur le bon plan).
3. Tests E2E Playwright : `/fil/29` déconnecté → login → atterrit sur `/fil/29` ; « Essayer 7 jours » Local → après inscription → contexte plan « local » conservé.

### Critères d'acceptation
- Déconnecté, `GET /fil/29` → `/auth/login?redirect=%2Ffil%2F29` ; après login → **`/fil/29`**.
- « Essayer 7 jours » (Local) → l'URL finale conserve `plan=local` (ou équivalent) ; après auth, l'utilisateur arrive sur le Checkout/plan **Local**, pas sur un accueil générique.
- ⚠️ Sécurité : `redirect` n'accepte que des chemins internes (`/^\/(?!\/)/`), jamais une URL absolue externe.

### Garde-fous
- Ne pas ouvrir de faille **open redirect** (valider strictement la cible).

---

## Bloc H (WS-H) — Polish UX  🔵

Couvre **BUG-15** (suppression de post sans confirmation), **BUG-16** (heure de prise -2 h, timezone), **BUG-17** (onglets `/fil` débordent en mobile), **BUG-18** (formulaire « nouvelle prise » pré-rempli de valeurs périmées).

### Tâches
1. **BUG-15** : ajouter une modale de confirmation à la suppression de post du fil (cohérence avec la suppression de prise). Composant `components/feed/*`.
2. **BUG-16** : auditer le traitement de `datetime-local` à la création/édition de prise (`app/(app)/carnet/nouvelle` + `…/modifier`) — stocker/afficher en cohérence Europe/Paris (saisie 06:46 doit s'afficher 06:46). Ajouter un test.
3. **BUG-17** : rendre la rangée d'onglets `/fil` (`Ton département / Tes follows / Tous les départements côtiers`) responsive (wrap ou scroll maîtrisé) en < 500 px.
4. **BUG-18** : `autoComplete="off"` (+ `name` non standard si besoin) sur le formulaire `carnet/nouvelle` pour éviter l'autofill navigateur de valeurs périmées ; s'assurer qu'aucun brouillon persistant n'est pré-injecté.

### Critères d'acceptation
- Supprimer un post du fil ouvre une modale « action irréversible » avant suppression.
- Créer une prise à 06:46 → la fiche affiche **06:46** (et l'édition recharge 06:46).
- En 500 px, les 3 onglets `/fil` tiennent sans débordement gênant.
- Ouvrir `carnet/nouvelle` deux fois de suite → champs **vierges** (pas de ville/leurre/date résiduels).

### Garde-fous
- BUG-16/18 : reproduire d'abord **hors extension navigateur** (l'audit a vu de l'autofill côté navigateur de John — confirmer que ce n'est pas que ça).

---

## Bloc I (WS-I) — Perf onboarding (INP ~2 s)  🟡

Couvre **BUG-12** : le bouton « Continuer » de l'onboarding a montré ~2096 ms de blocage UI (signalé par un overlay Web-Vitals — **probablement une extension**, mais la latence est réelle, ~2 s ressentie entre étapes). Code : `app/(app)/onboarding/*`.

### Tâches
1. Reproduire **sans extension** (navigateur propre) et mesurer l'INP réel de la transition d'étape (DevTools Performance).
2. Identifier la cause (revalidation serveur synchrone ? gros bundle ? re-render bloquant — l'audit a vu des refs DOM réinvalidées entre lectures, signe de re-renders lourds).
3. Optimiser : transition d'étape non bloquante (optimistic / `useTransition`), alléger le travail synchrone sur le clic.

### Critères d'acceptation
- INP de « Continuer » (étapes onboarding) **< 300 ms** mesuré en navigateur propre, profil mid-tier.
- Le parcours 6 étapes reste fonctionnel (validation FR, pseudo unique, écran final).

### Garde-fous
- Si la latence n'est **pas** reproductible hors extension, documenter « non reproduit hors extension » et clore en conséquence (ne pas sur-optimiser à l'aveugle).

---

## Bloc J (WS-J) — Durcissement backend (advisors)  🟡

Couvre **backend #2** (4 vues `SECURITY DEFINER`) et **backend #3** (protection mots de passe compromis désactivée ; le `search_path` est traité par 026 via WS-A1).

### Tâches
1. Vues `feed_posts_for_viewer`, `profile_stats`, `catches_for_viewer`, `spots_for_viewer` : passer en `security_invoker = true` (Postgres 15+) **si** la RLS sous-jacente le permet sans casser l'app, sinon documenter explicitement pourquoi elles restent DEFINER (et restreindre les `GRANT`). Migration `031_security_invoker_views.sql` le cas échéant.
2. Activer **Leaked Password Protection** (HaveIBeenPwned) dans Supabase Auth (réglage dashboard — manuel John).
3. Re-lancer `get_advisors(security)` et viser **0 ERROR**.

### Critères d'acceptation
- `get_advisors(security)` : plus de `security_definer_view` en ERROR (ou justification écrite + grants restreints) ; `auth_leaked_password_protection` résolu.
- Aucune régression de lecture (carnet, fil, profil stats, carte) après bascule des vues.

### Garde-fous
- ⚠️ Tester chaque vue après bascule `security_invoker` : risque de casser la lecture si la RLS de l'appelant est plus stricte. Rollback prêt.

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. `pnpm test` (suite Vitest complète **verte**) + `pnpm build` (**OK**) + `pnpm lint` (le lint est bloquant depuis 11.5).
2. Rejouer **les 10 vérifications de l'audit** et cocher ✅/❌ avec preuve (cf `docs/audits/AUDIT-QA-LIVE-2026-06-21.md` §3). Cible : 1→8 et 10 **fermés** ; #9 (modération commentaires) **tranché** (créer un commentaire par un compte non-modo, vérifier la présence/absence du bouton mod côté UI).
3. **Vérifs SQL clés** : floutage ∈ [500,900] m ; `has_column_privilege('anon',…,'geom')`=false ; `list_migrations` inclut 025→029(+030/031) ; suppression compte jetable → 0 ligne ; advisors security 0 ERROR.
4. Passe sécurité : nouvelles policies/migrations → RLS d'abord ; aucune écriture contournant `*_for_viewer` ; pas de secret committé ; pas d'open-redirect (Bloc G).
5. Passe copy : tutoiement partout, zod en français, **zéro** promesse produit mensongère/datée.
6. **Portail Stripe** : créer un abonnement via **vrai Checkout** (compte jetable, mode test si possible) et vérifier que `/compte/abonnement` affiche le bouton de gestion/annulation Stripe (non testable sur les comptes seedés de l'audit).
7. Livrer `docs/sprint-11.6/RECAP.md` : par bloc — fait / comment tester / preuve / reste manuel John ; + tableau de fermeture des 18 bugs.

---

## Reste manuel John (post-sprint, hors autonomie agent)

- **Appliquer les migrations en prod** dans l'ordre : 025 → 026 → 027 (Bloc 0) → 028 → 029 (Bloc A) → 030 (Bloc B) → 031 (Bloc J si créé). Puis régénérer `lib/types.ts`.
- **Vercel** : confirmer `SUPABASE_SERVICE_ROLE_KEY` en prod (BUG-03) + `NEXT_PUBLIC_SUPABASE_*` en Preview.
- **Supabase Auth** : activer Leaked Password Protection (Bloc J).
- Relire le diff, **merger** `sprint-11.6` → `main`, déployer, puis lancer la QA finale (VERIF étape 6 incluse).
- Trancher les `⚠️ DEMANDER À JOHN` : liste canonique départements (Bloc D), retrait éventuel de `limitSpotsPerDept` (Bloc A).

---

## Rappels invariants (CLAUDE.md)

- **Pas de push sans validation de John** ; **rien appliqué en prod sans sa validation**.
- **RLS jamais désactivé** ; nouvelle table → RLS d'abord, puis policies.
- **1 migration = 1 nouveau fichier** numéroté ; ne pas éditer les anciens (025/026/027 sont figés).
- **Régénérer `lib/types.ts`** après chaque migration.
- Afficher les catches via `catches_for_viewer`, les spots via les RPC dédiées — jamais `geom` en direct.

*Brief rédigé le 2026-06-21 à partir de `docs/audits/AUDIT-QA-LIVE-2026-06-21.md`. Couvre 18 bugs + 3 constats backend.*
