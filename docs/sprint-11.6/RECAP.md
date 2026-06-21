# Sprint 11.6 — RECAP (remédiation audit QA live 2026-06-21)

> **État : CODE-COMPLET sur la branche `sprint-11.6` (non mergé, non poussé). Migrations 028→032 APPLIQUÉES + vérifiées en prod le 2026-06-21** (par Claude via connecteur Supabase, sur demande explicite de John).
> Vérif locale : **`pnpm test` = 327 tests verts (27 fichiers)**, **`pnpm lint` = 0 erreur**, **`pnpm build` = OK**.
> Couvre les **18 bugs** + 3 constats backend de `docs/audits/AUDIT-QA-LIVE-2026-06-21.md`.

## ✅ Migrations appliquées en prod (2026-06-21) — avec 2 corrections en vol

L'application live a révélé 2 défauts du plan initial, corrigés à la volée (fichiers repo réalignés) :
1. **Type de colonne** : `spots.geom_public` est `geography(POLYGON)`. Le jitter `ST_Project` produit un **Point** → rejeté. Corrigé : on stocke un **buffer autour du point jitteré** (les RPC lisent `ST_Centroid` → point flouté). Mesuré en prod : **510–898 m** du point réel.
2. **Revoke de colonne inopérant** : `revoke select (geom)` seul ne suffit pas (grant table-level prime). Corrigé : `revoke select on spots` + `grant select (toutes-colonnes-sauf-geom)`. Vérifié : `has_column_privilege('anon','spots','geom')` = **false**, `slug`/`geom_public` = true.
3. **`spots_for_viewer` gardée en SECURITY DEFINER** (au lieu d'invoker) : elle lit `geom` directement pour le gating ; sous invoker + `geom` révoqué elle casserait. Elle masque déjà le précis → definer assumé/documenté. Les 3 autres vues sont bien en invoker. → l'advisor `security_definer_view` signale encore `spots_for_viewer` : **assumé**.

Historique : 6 entrées (028, 028b, 029, 030, 031, 032). FK suppression = `SET NULL`. anon `get_spots_for_map()` = **3/dépt, jamais précis**. Fiche `cap-frehel` anon = floutée.

> **Note `delete_my_account`** : ce RPC (migration 005) est **réapparu en prod** entre l'analyse et l'application (probablement appliqué par John). Sans impact : le fix `deleteAccount` utilise `auth.admin.deleteUser`, pas ce RPC.

---

## ⚠️ Correction de vérité prod (à lire en premier)

L'audit et le brief disaient « 025/026/027 non appliquées ». **Nuance vérifiée par SQL le 2026-06-21** :

- L'**historique** des migrations (`list_migrations`) s'arrête bien à **`024_perf_rls`**.
- **MAIS les effets DDL de 025/026/027 sont déjà dans le schéma prod** (appliqués à la main via le SQL Editor, qui n'écrit pas de ligne d'historique) : `has_function_privilege('anon', get_spots_for_scoring) = false` (effet 025), `proconfig = search_path=public` sur les 6 fonctions (effet 026), les 5 index FK existent (effet 027).
- **La fuite GPS critique restait néanmoins grande ouverte** : 025 ne révoque qu'un vecteur mineur (`get_spots_for_scoring`). Les 2 vrais vecteurs mesurés en prod — flou `geom_public` **cosmétique (0,000 m)** et colonne `spots.geom` **lisible par `anon`** — n'étaient fermés par RIEN. Ils le sont maintenant par **028/029**.
- `CLAUDE.md` a été corrigé (l'ancienne mention « 025 appliquée + vérifiée en prod » était fausse).

**Conséquence opérationnelle** : pour 025/026/027, NE PAS ré-appliquer le SQL (idempotent mais ça ne crée pas de ligne d'historique) — **réconcilier l'historique** via `supabase migration repair --status applied 025 026 027` (ou un `supabase db push` si la CLI est `link`). Puis appliquer 028→032 normalement.

---

## Migrations (ordre d'application prod)

| # | Fichier | Objet | Dépend de |
|---|---------|-------|-----------|
| 025/026/027 | (déjà en prod, à **historiser**) | revoke scoring / search_path / index FK | `migration repair` |
| **028** | `028_spot_geom_blur_jitter.sql` | `blur_spot_geom` = jitter aléatoire 500-900 m + recalcul 38 spots + `revoke select(geom)` anon/authenticated | après 026 |
| **029** | `029_spot_rpc_tier_gating.sql` | gating tier dans `get_spots_for_map`, `nearby_spots`, **`get_spot_by_slug`, `get_spot_by_id`** (cap 3/dépt anon-discovery ; local=son dépt ; itinerant=tous ; précis = tier réel) | après 028 + 021 |
| **030** | `030_account_deletion_fks.sql` | `feed_posts.moderated_by` + `reports.resolved_by` → `ON DELETE SET NULL` | 001 |
| **031** | `031_security_invoker_views.sql` | 4 vues `*_for_viewer` en `security_invoker` + `revoke select profile_stats from anon` | vues existantes |
| **032** | `032_can_post_align_24_departments.sql` | `can_post_in_department` aligné sur 24 dépts (retrait Somme 80) | — |

Après application : **régénérer `lib/types.ts`** (`pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts`). Les signatures RPC sont **inchangées** → le diff doit être nul ou cosmétique.

---

## Par workstream

### A2 🔴 Fuite GPS + gating tier serveur (BUG-01, 02, 08)
- **Fait** : migrations 028 (flou réel) + 029 (gating tier sur les 4 RPC spots). Patch `app/api/spots/nearby/route.ts` (cap serveur 3 anon / 5 discovery / 100 abonné). `limitSpotsPerDept` **conservé** côté page (double sécurité, comme demandé). Label fiche « ZONE FLOUTÉE 1 KM » → « ZONE APPROCHÉE » (le flou n'est plus 1 km).
- **Tester (après application prod)** :
  - `select min(d),max(d) from (select ST_Distance(geom::geography,geom_public::geography) d from public.spots where geom is not null) t;` → **∈ ~[500, 900] m**.
  - `select has_column_privilege('anon','public.spots','geom','SELECT');` → **false** (idem authenticated).
  - RPC anon `get_spots_for_map{}` → **≤ 3 lignes/dépt**, `is_precise=false`.
  - Local (29) sur `/spots/<spot 22>` → **PAS** de « GPS PRÉCIS » ; Itinérant → précis partout.
  - Cron `compute-spot-scores` (service_role) → produit toujours `spot_scores` (38 lignes).
- **Tests auto** : `lib/map/__tests__/utils.test.ts` (cap 3/dépt) + `e2e/06-gps-blur-security.spec.ts` étendu (gating RPC + flou ∈ ]400,1000[ m). NB : le `has_column_privilege` ne se teste PAS en E2E (le workflow E2E re-grant `all on all tables to anon`) → vérif SQL prod.
- **Reste John** : appliquer 028/029 en prod.

### B 🟠 Suppression de compte RGPD (BUG-03, 13)
- **Cause réelle trouvée** : le RPC `delete_my_account` **n'existe pas en prod** (migration 005 jamais appliquée) → PGRST202. Ce n'était PAS la clé service-role.
- **Fait** : `deleteAccount` réécrit (`app/(app)/profil/actions.ts`) → `createServiceRoleClient().auth.admin.deleteUser` + nettoyage Storage `catches/<uid>/` + erreurs réelles loggées dans Sentry + messages FR exploitables + `redirect('/')` hors try/catch. Migration 030 (FK `moderated_by`/`resolved_by` → SET NULL).
- **Tester** : `docs/sprint-11.6/qa-bug03-deletion.md` (compte jetable : suppression OK, 0 ligne résiduelle, 0 objet Storage ; scénario modérateur ; échec → Sentry). FK : `select confdeltype from pg_constraint where conname in ('feed_posts_moderated_by_fkey','reports_resolved_by_fkey')` → `n`.
- **Tests auto** : `lib/__tests__/account-deletion-order.test.ts` (garde-fou SET NULL).
- **Reste John** : appliquer 030 ; confirmer `SUPABASE_SERVICE_ROLE_KEY` en prod Vercel ; QA suppression sur compte jetable.

### J Durcissement advisors (backend #2, #3)
- **Fait** : migration 031 (4 vues `*_for_viewer` en `security_invoker` + `revoke select profile_stats from anon`). Analyse vue-par-vue : WHERE = miroir des policies RLS, floutage hors RLS (fonctions `*_visible_geom` SECURITY DEFINER) → lecture identique. Divergence latente documentée (`catch_spot_slug` NULL pour spot `subscriber` lu par non-abonné — inerte : 0 spot subscriber en prod). Rollback inclus dans le fichier.
- **Tester (après application)** : `get_advisors(security)` → 0 `security_definer_view` ; lecture carnet/fil/profil/carte non régressée.
- **Reste John** : appliquer 031 ; **activer Leaked Password Protection (HIBP)** dans Supabase Dashboard → Authentication (réglage, pas de code).

### D 🟠 Départements (BUG-05)
- **Décision John** : liste canonique = **24 dépts** (onboarding actuel, métropole + Corse), **EXCLURE la Somme (80)**.
- **Fait** : `lib/geo/departments.ts` = source unique (retrait 80 + accessor `DEPARTMENT_OPTIONS` trié numérique puis Corse). Onboarding (`onboarding-step.tsx`) ET profil (`profile-form.tsx`) importent cette source. Select profil pré-rempli (`home_department.trim()`), et `updateProfile` n'écrit jamais NULL si le champ revient vide. Migration 032 aligne `can_post_in_department` (retrait 80). Nettoyage des refs `'80'` résiduelles (centroids/coords/SEO).
- **Tester** : `/profil` liste exactement les 24 de `/onboarding/2` ; connecté 29 → « 29 — Finistère » présélectionné ; modifier la bio sans toucher au dépt → `home_department` inchangé en base. `select can_post_in_department('80')` → false, `('29')`/`('2B')` → true.
- **Tests auto** : `lib/geo/__tests__/departments.test.ts` (24 codes, ordre, pas de 80). **Bug attrapé par les tests** : `parseInt('2A')===2` (pas NaN) plaçait la Corse en tête → corrigé (tri par `/^\d+$/`).
- **Reste John** : appliquer 032.

### G Flux auth (BUG-10, 11)
- **Fait** : `lib/auth/redirect.ts` (`safeInternalPath` anti open-redirect + `buildLoginRedirect`). `middleware.ts` ajoute `?redirect=<path>`. Guards `/fil/[dept]`, `/follows`, `/spots/[slug]` alignés sur `?redirect=` encodé. `register/page.tsx` préserve `plan`/`interval`/`redirect`. `login/page.tsx` embarque le contexte en hidden inputs ; `login/actions.ts` (`destinationFrom`) renvoie vers la cible interne validée ou `/tarifs?plan=…`.
- **Décision (tranchée, option a)** : après inscription via « Essayer 7 jours », on **conserve le contexte plan** (l'utilisateur retombe sur `/tarifs` plan prêt) ; le **relancement auto du Checkout post-onboarding = backlog** (option b).
- **⚠️ Limite connue (relevée par la revue indépendante)** : pour une inscription par **email à confirmer**, le `plan`/`after` posé sur l'URL de callback n'est PAS relu par `app/auth/callback/route.ts` (qui ne lit que `next`) → le plan n'est pas réutilisé après confirmation. C'est précisément l'**option (b)** (backlog). La connexion **mot de passe** applique bien `destinationFrom` ; le critère BUG-10 (« plan conservé jusqu'à `/auth/login` » + hidden input) est tenu. À implémenter avec l'option (b) : faire suivre `plan`/`after` du callback jusqu'au post-onboarding.
- **Tester** : déconnecté `GET /fil/29` → `/auth/login?redirect=%2Ffil%2F29` → après login → `/fil/29`. « Essayer 7 jours » Local → URL finale conserve `plan=local`.
- **Tests auto** : `lib/auth/redirect.test.ts` (open-redirect) + `e2e/07-auth-redirect-plan.spec.ts`.
- **Garde-fou** : `?next=` du callback OAuth NON renommé (ne pas casser OAuth).

### C Fil : /follows + post sans refresh (BUG-04, 09)
- **Fait** : `app/actions/follow.ts` — `listProfilesByIds` propage l'erreur (plus de « Tu suis 0 » silencieux) + préserve l'ordre. Nouveau `FeedClient` (état `posts` partagé composer↔liste) : post en tête sans reload (refetch+prepend, même mécanisme que le Realtime), suppression retire la carte immédiatement. `FollowingList` retire la carte au désabonnement (`onToggle`). Le fil reste **gratuit tous tiers**.
- **À savoir (BUG-04)** : la RLS (`follows_select_authenticated`, `profiles_select_all`) autorise bien la lecture, et la logique de `follow.ts` est correcte → BUG-04 **non reproductible dans le code actuel** (le compte de test de l'audit a été supprimé). Le durcissement rend toute erreur réelle visible. **À re-tester en live** après déploiement (suivre un pêcheur → `/follows` affiche « Tu suis (1) »).
- **Tests auto** : `follow.test.ts` étendu (propagation d'erreur + ordre).
- **Reste John** : re-test live BUG-04.

### E Carte noire au montage (BUG-06)
- **Fait** : `lib/map/resize.ts` (helper testable) + `MapView.tsx` — ResizeObserver attaché **après** l'init (l'`observe()` initial était un no-op garanti), resize seulement sur taille non nulle, double `requestAnimationFrame` post-`load`, garde-fou CSS `minHeight:'100%'`, cleanup propre.
- **Tester (QA navigateur)** : `/carte` (anon + abonné) peint les tuiles dès le chargement sur 5 rechargements ; mini-map fiche OK ; mobile ≤ 500 px. (Un test unit ne peut pas prouver le rendu WebGL.)
- **Tests auto** : `lib/map/__tests__/resize.test.ts` (logique de décision).

### F Copy mensongère + article espèces (BUG-07, 14)
- **Fait** : retrait « Export GPX/JSON prévu cette année », « 27 départements couverts », « Corse prévue fin 2026 », « App iOS/Android — bientôt ». Genre par espèce dans `SPECIES` (`lib/seo/programmatic.ts`) → « La dorade royale », « L'orphie » (élision), 4 masculins inchangés ; appliqué à `/especes/[slug]` + `/peche/[...slug]` (H1, meta, JSON-LD, ~330 pages).
- **Tester** : `grep -ri "Export GPX|prévu cette année|27 départements|Corse prévue" app/` → 0 ; H1 `/especes/dorade-royale` = « La dorade royale… » ; `/especes/orphie` = « L'orphie… ».
- **Tests auto** : `lib/__tests__/copy-truthfulness.test.ts`.

### H Polish UX (BUG-15, 16, 17, 18)
- **Fait** : BUG-15 modale `PostDeleteDialog` (confirmation avant suppression de post, cohérence avec la suppression de prise). BUG-16 fiche prise `timeZone:'Europe/Paris'` (le Server Component rendait en UTC → -2 h). BUG-17 onglets `/fil` scroll maîtrisé + tailles réduites < 500 px. BUG-18 `autoComplete="off"` sur le form prise + brouillon localStorage expiré après **30 min** (option B1 — garde l'anti-perte dans la session).
- **Tester** : suppr post → modale ; prise 06:46 → affiche 06:46 ; 3 onglets tiennent en 500 px ; rouvrir `/carnet/nouvelle` après abandon (> 30 min) → vierge.
- **Tests auto** : `lib/catches/__tests__/datetime.test.ts` (tz + garde-fous form).
- **Décision (tranchée, B1)** : TTL 30 min plutôt que suppression totale du brouillon (B2). Override possible si John veut « toujours vierge ».

### I Perf onboarding INP (BUG-12)
- **Cause** : pas du JS bloquant — un waterfall RSC (4× `auth.getUser()` + ~4 requêtes en série par transition), masqué par un bouton qui reste « Enregistrement… » jusqu'à la peinture. L'overlay « 2096 ms » est **probablement l'extension navigateur** de John.
- **Fait (gains sûrs)** : `app/(app)/onboarding/loading.tsx` (skeleton instantané au `router.push`) + `useTransition` + `router.prefetch` de l'étape suivante dans `onboarding-step.tsx` (les 6 handlers). GAIN 2 (couplage middleware↔layout pour éviter une requête `subscriptions` inutile) **non livré** (optionnel, plus risqué) → backlog.
- **Tester** : INP « Continuer » < 300 ms en **navigateur propre** (build prod). Si non reproductible hors extension → consigner « cause = extension, robustesse améliorée ».
- **Tests auto** : `app/(app)/onboarding/__tests__/onboarding-perf.test.ts`.

### A1 Doc (backend #1, partie historique)
- **Fait** : `CLAUDE.md` corrigé (état réel migrations + fuite GPS partielle au 11.5).

---

## Tableau de fermeture des 18 bugs

| # | Sév | Workstream | État code | Vérif live = John après déploiement |
|---|-----|-----------|-----------|--------------------------------------|
| 01 fuite GPS | 🔴 | A2 (028/029) | ✅ | SQL : flou ∈ [500,900] m, `geom` non lisible anon |
| 02 cap freemium client-only | 🟠 | A2 (029 + route) | ✅ | RPC anon ≤ 3/dépt |
| 03 suppression compte | 🟠 | B (030 + actions) | ✅ | suppression compte jetable OK |
| 04 /follows vide | 🟠 | C (hardening) | ✅ (durci) | re-test live (non repro en code) |
| 05 départements | 🟠 | D (032 + UI) | ✅ | select profil = 24, présélection OK |
| 06 carte noire | 🟠 | E | ✅ | QA navigateur 5× |
| 07 copy fausse | 🟡 | F | ✅ | grep 0 |
| 08 Local précis hors dépt | 🟡 | A2 (029 fiche) | ✅ | Local (29) sur spot 22 → pas de précis |
| 09 post sans refresh | 🟡 | C (FeedClient) | ✅ | post/suppr immédiats |
| 10 contexte plan perdu | 🟡 | G | ✅ | « Essayer 7 j » garde plan |
| 11 redirect perdu | 🟡 | G | ✅ | `/fil/29` → login → retour |
| 12 INP onboarding | 🟡 | I | ✅ (gains sûrs) | INP < 300 ms navigateur propre |
| 13 FK non-cascade | 🟡 | B (030) | ✅ | suppr compte modérateur OK |
| 14 article espèces | 🔵 | F | ✅ | H1 « La/L' » |
| 15 suppr post sans confirm | 🔵 | H | ✅ | modale présente |
| 16 heure prise -2h | 🔵 | H | ✅ | 06:46 affiché 06:46 |
| 17 onglets fil mobile | 🔵 | H | ✅ | 500 px OK |
| 18 form prise pré-rempli | 🔵 | H | ✅ | vierge après abandon |
| backend #1 search_path | — | (026 déjà en prod) + A1 doc | ✅ | advisor clean |
| backend #2 vues definer | — | J (031) | ✅ | advisor 0 ERROR |
| backend #3 HIBP | — | J (manuel) | ⏳ | toggle dashboard |

---

## Reste manuel John (hors autonomie agent)

> ✅ **Migrations 028→032 APPLIQUÉES + vérifiées en prod** (2026-06-21). ✅ **`lib/types.ts` régénéré** (John). ✅ **Vars Vercel confirmées** (John). Restent :

1. ~~Régénérer `lib/types.ts`~~ — **fait** (John).
2. ~~Vercel `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_*`~~ — **fait** (John).
3. **HIBP (Leaked Password Protection) → SKIPPÉ (décision John 2026-06-21)** : réservé au plan Pro, projet en Free. Reste un WARN advisor `auth_leaked_password_protection` **assumé** (non bloquant). À réactiver si passage au plan Pro.
4. *(Optionnel, cosmétique)* `supabase migration repair --status applied 025 026 027` pour que la CLI voie 025-027 dans l'historique.
5. Relire le diff, **merger `sprint-11.6` → `main`**, déployer le code (le schéma prod est déjà à jour — compatible avec le code actuellement déployé car signatures RPC inchangées).
6. **QA finale** : suppression de compte (compte jetable → 0 résidu), `/follows` live, portail Stripe (vrai Checkout → bouton gestion sur `/compte/abonnement`), carte (rendu au mount), parcours auth (`?redirect=`).

---

## Décisions tranchées ce sprint (override possible)
- **Liste départements** = 24 (sans Somme 80). [John, confirmé]
- **G** : option (a) — contexte plan conservé ; relance auto Checkout post-onboarding = backlog.
- **H BUG-18** : option B1 — brouillon TTL 30 min (garde l'anti-perte) plutôt que B2 (zéro brouillon).
- **J** : `profile_stats` passée en invoker + `revoke anon` (vue non utilisée par l'app).
- **A2** : `limitSpotsPerDept` côté page **conservé** (double sécurité) — pas retiré ce sprint.

*RECAP rédigé le 2026-06-21. Branche `sprint-11.6`, non mergée/déployée.*
