# Sprint 21 — Brief d'exécution
## Socle & Vérité (Chantier 0 + hygiène pré-lancement)

> Rédigé le 2026-06-23. Durée cible : ~3-4 jours (tout est parallélisable J1).
> Contexte : audit transverse `docs/audits/AUDIT-2026-06-23.md` + roadmap `docs/ROADMAP-2026-H2.md` (Phase **P1 — Socle & vérité**). C'est le sprint qui **assainit la base avant** d'attaquer le moat (P2 = scoring perso + pôle espèces).
> Décisions John 2026-06-23 : roadmap validée (Chantiers A→G), ce sprint = **P1** uniquement. Rien n'est codé tant que John ne lance pas la ligne ci-dessous.

**Pourquoi ce sprint d'abord (ne pas le sauter).** L'audit a montré un produit très complet MAIS deux zones critiques **sans aucun test** (catch CRUD + RLS), une dérive d'historique de migrations, des restes de pré-lancement (seed de test en prod, og:image manquants, copy « Bretagne » périmée) et une doc (`CLAUDE.md`) gravement périmée. On nettoie tout ça en un sprint court pour partir sur une base saine et **vérifiable**.

**Préalable avant de démarrer (manuel John)** : aucun merge bloquant (prod = HEAD de `main` = `5a17509`, tout est déployé). Le sprint produit du code + des fichiers de migration **non appliqués/non poussés** (cf « Reste manuel John »).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-21/BRIEF.md`. Lance **WS-A, WS-B, WS-C, WS-D, WS-E en parallèle dès maintenant** (aucune dépendance entre eux ; WS-B fait d'abord une passe **lecture** supabase-guard avant d'écrire la migration). Termine **obligatoirement** par le **workstream VERIF** (agent indépendant) avant de me rendre la main. **Ne push pas, ne déploie pas, n'applique aucune migration ni suppression de données en prod** : tout est dans « Reste manuel John ». Invariants : tutoiement partout, zod en français, RLS jamais désactivé, migration = nouveau fichier numéroté (047) + régénérer `lib/types.ts`, pas de promesse produit mensongère.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher au schéma / migration / RLS / advisors | **supabase-guard** → Supabase (RO) | Confirmer le n° de migration suivant (047), l'état réel des objets (`get_spots_for_scoring`, `catches_for_viewer`, FK `feed_post_photos.user_id`), relancer `get_advisors`. **Lecture seule.** |
| Avant toute lib externe (Vitest API, supabase-js de test, Next metadata) | **docs-researcher** → Context7 | API version-correcte (Vitest 3.2, `@supabase/ssr`, Next 15 metadata/OG). Pas de code de mémoire. |
| QA réelle des pages retouchées (espèces, home, tarifs, guides) | **qa-chrome** → Claude in Chrome | Vérifier og:image, JSON-LD, copy, accord de genre, sur preview/prod. |
| Après déploiement (par John) | **deploy-watch** → Vercel + Sentry | Confirmer `JAVASCRIPT-NEXTJS-4` (upload photo) fermé, zéro régression runtime. |
| Clôture | **`/verif-sprint`** | tests + build + typecheck + lint + revue indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

À la fin, **les deux zones les plus sensibles (catch CRUD + RLS) sont testées**, la base et l'historique de migrations sont cohérents, les restes de pré-lancement sont nettoyés, et `CLAUDE.md` reflète la réalité — sans aucune régression de gating/floutage.

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **A** | Tests des zones critiques (catch CRUD + RLS) | 1,5-2 j | — | ✅ |
| **B** | Durcissement DB (migration 047) | 0,5-1 j | passe lecture supabase-guard (interne au WS) | ✅ |
| **C** | Hygiène pré-lancement front/SEO | 1 j | — | ✅ |
| **D** | Audit précision marées Med/Corse | 0,5 j | — | ✅ |
| **E** | Mise à jour doc (`CLAUDE.md`) | 0,5 j | — | ✅ |
| **VERIF** | Revue finale indépendante | 0,5 j | A, B, C, D, E | ❌ (toujours en dernier) |

---

## Bloc A — Tests des zones critiques (catch CRUD + RLS)

Les deux trous de l'audit. `lib/catches/actions.ts` (cœur produit) et les RLS (le moat sécurité) n'ont **aucun test**. On comble, dans le style existant.

> **Connecteurs** : **docs-researcher** (API Vitest 3.2 + pattern de mock du client Supabase — calquer sur `lib/conditions/openmeteo.test.ts` qui mocke déjà session + service-role). **supabase-guard** pour confirmer en lecture le comportement RLS réel à asserter (floutage, gating) avant d'écrire les tests SQL.

### Tâches
1. **Tests unitaires catch CRUD** — `lib/catches/__tests__/actions.test.ts` (nouveau), client Supabase mocké :
   - `createCatch` (actions.ts:43) : input valide → insert avec les bons champs + **valeurs de privacy par défaut** (`precise_for_friends=true`, `reveal_precise_to_public=false`) ; input invalide → erreur **zod en français** ; chemin photo.
   - `updateCatch` (actions.ts:114) : refus si non-propriétaire ; update partiel correct.
   - `deleteCatch` (actions.ts:217) : refus si non-propriétaire ; succès → `{ ok: true }`.
   - `uploadCatchPhoto` (actions.ts:273) : **rejette > `MAX_SIZE_BYTES` (1,8 Mo)** et **rejette un type ≠ `image/webp`** avec message FR (c'est le bug Sentry `JAVASCRIPT-NEXTJS-4` du hotfix sprint 20 — verrouiller par un test).
2. **Tests RLS en SQL** — `supabase/tests/rls_gps_floutage.sql` + `supabase/tests/rls_tier_gating.sql` (nouveaux), **dans le style des existants** (`supabase/tests/heatmap_kanon.sql`, `quality_cells_kanon.sql`) :
   - **Floutage GPS** : en rôle `anon` et en `authenticated` non-abonné, `SELECT geom FROM spots` / `FROM catches` = refusé (grant colonne 028b/041) ; les RPC `get_spots_for_map` / `get_spot_by_slug` / `nearby_spots` renvoient un point **flouté** (`ST_Centroid(geom_public)`, ≈500-900 m), jamais `geom`.
   - **Gating de tier** : `get_quality_cells` renvoie la composante **perso uniquement** pour un Itinérant ; un gratuit n'obtient pas le perso. Fil social **lisible/écrivable tous tiers** (100% gratuit).
   - **k-anon** : une cellule communauté < K=3 n'expose aucun compte.
   - Mesurer la distance floutage comme `ST_Distance(geom, ST_Centroid(geom_public))` (≈500-900 m), **pas** la distance au polygone (artefact qui descend à ~4 m — cf audit §4).

### Critères d'acceptation
- `pnpm test` passe avec **les nouveaux tests catch CRUD verts** (≥ 8 cas couvrant create/update/delete/upload, dont le rejet taille + type).
- Les fichiers `supabase/tests/rls_*.sql` existent, suivent le format des 2 SQL existants, et **passent** (exécutés via supabase-guard / SQL editor / `supabase db execute`). Chaque assertion de fuite GPS est explicite.
- Aucune régression : le total de tests Vitest **monte** (départ ~389) ; build + typecheck + lint verts.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** si faire tourner les tests SQL exige un stack local (Docker `supabase start`) vs exécution read-only contre la prod : proposer le plan, ne pas lancer d'écriture en prod.
- Ne pas modifier les policies/vues dans ce bloc (lecture + tests seulement). Tout changement de policy = WS-B.

---

## Bloc B — Durcissement DB (migration 047)

Trois items de l'audit §3/§4, regroupés dans **une** migration fichier `supabase/migrations/047_hardening_socle.sql`. **Lecture d'abord** (supabase-guard), écriture du fichier ensuite ; **application = manuel John**.

> **Connecteurs** : **supabase-guard** (RO) — confirmer : (a) le prochain n° = **047** ; (b) FK `feed_post_photos.user_id` toujours sans index ; (c) `get_spots_for_scoring` n'a bien que le cron comme appelant (déjà vérifié côté code : seul `lib/scoring/spot-scores-job.ts:41` l'appelle via le client **admin/service-role**) ; (d) relancer `get_advisors` après pour comparer.

### Tâches
1. **Index FK manquant** : `create index concurrently if not exists feed_post_photos_user_id_idx on public.feed_post_photos(user_id);` (advisor `unindexed_foreign_keys`).
2. **Révoquer l'EXECUTE de `get_spots_for_scoring`** à `anon` + `authenticated` : `revoke execute on function public.get_spots_for_scoring() from anon, authenticated;` — défense en profondeur (la RPC renvoie des `lng/lat` bruts sans gate de tier ; **confirmé** : seul le cron l'appelle via service-role, que le revoke n'affecte pas). Commenter le pourquoi dans la migration.
3. **(Conditionnel — voir D-2)** `catches_for_viewer` : si John tranche pour `security_invoker`, ajouter `alter view public.catches_for_viewer set (security_invoker = true);` + grants nécessaires, **et** un test de non-régression (un non-ami voit toujours le floutage, un ami voit le précis si `precise_for_friends`). Sinon, **documenter** le definer comme assumé (commentaire SQL + note RECAP), à l'image de `spots_for_viewer`.
4. Après application (John) : **régénérer `lib/types.ts`** + relancer `get_advisors`.

### Critères d'acceptation
- `supabase/migrations/047_hardening_socle.sql` existe, idempotent (`if not exists`, `or replace` le cas échéant), commenté, **non destructif**.
- En lecture post-application (supabase-guard) : l'index existe ; `anon`/`authenticated` n'ont plus l'EXECUTE sur `get_spots_for_scoring` (le cron tourne toujours) ; l'advisor FK ne liste plus `feed_post_photos.user_id`.
- Aucune autre fonction/policy modifiée hors périmètre.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT (D-2)** : `catches_for_viewer` en `security_invoker` (corrige l'advisor ERROR, aligne l'intention 031) **vs** definer assumé documenté. Recommandation : invoker + grants + test de non-régression floutage. **Ne pas appliquer sans go.**
- ⚠️ Ne JAMAIS exécuter la migration en prod depuis l'agent — fichier seulement (application = John, §20.4).
- `create index concurrently` ne peut pas tourner dans une transaction : le noter pour l'application manuelle.

---

## Bloc C — Hygiène pré-lancement (front / SEO / copy)

Restes de pré-lancement repérés sur le live (audit §5). Tout est cosmétique/SEO, zéro logique métier.

> **Connecteurs** : **qa-chrome** pour vérifier le rendu réel (og:image présent, JSON-LD valide, copy) ; **docs-researcher** pour l'API Next 15 `opengraph-image` / `metadata` si besoin.

### Tâches
1. **og:image sur les 6 fiches espèces** : `app/(marketing)/especes/[slug]/` — générer un OG dynamique (réutiliser le pattern `app/opengraph-image.tsx` / `app/og/...` déjà en place pour spots) afin que les previews sociales ne soient plus muettes.
2. **Copy « Bretagne » → couverture nationale réelle (24 dépts)** : home (`app/(marketing)/page.tsx` : « 157 SPOTS CURÉS · BRETAGNE ») et tarifs (`app/(marketing)/tarifs/page.tsx` : « on démarre en Bretagne… extension Atlantique »). Refléter Manche + Atlantique + **Méditerranée + Corse** sans surpromettre. Garder le ton (tutoiement, pas de mensonge).
3. **Harmonisation JSON-LD** : ajouter `ItemList` sur l'index `app/(marketing)/guides/page.tsx` (comme `/especes`) et `BreadcrumbList` sur le détail guide `app/(marketing)/guides/[slug]/page.tsx` (comme les fiches espèces).
4. **Accord de genre espèces** : corriger le template fiche (« Comment **le** pêcher » → « **la** » pour les espèces féminines, ex. dorade). Vérifier les 6.

### Critères d'acceptation
- Les 6 URLs `/especes/[slug]` exposent une balise `og:image` non nulle (vérifié qa-chrome / view-source).
- Plus aucune occurrence de « Bretagne » comme couverture exclusive sur home + tarifs ; la copy mentionne la couverture nationale réelle. (`grep -ri "bretagne" app/(marketing)/page.tsx app/(marketing)/tarifs/page.tsx` ne renvoie plus de promesse de périmètre.)
- `/guides` a un `ItemList`, `/guides/[slug]` a un `BreadcrumbList` (JSON-LD valide).
- La fiche dorade affiche « Comment **la** pêcher ».

### Garde-fous
- Ne pas toucher au gating ni aux composants carte. Pur contenu/SEO.
- Ne pas inventer de chiffres : 157 spots / 24 départements sont les valeurs vérifiées.

---

## Bloc D — Audit précision marées Med/Corse

Sur le live, un spot corse affiche **Marée 0/35** dans la décomposition du score (audit §5). La marée pèse 35% ; si la donnée manque sur la façade Med, le score y est biaisé. Ce bloc **diagnostique** et tranche (corriger maintenant si trivial, sinon alimenter le Chantier C).

> **Connecteurs** : **supabase-guard** (RO) — `select payload from weather_cache where cache_key like '%<spot med>%'` pour voir si `sea_level_height_msl` est présent/plat en Méditerranée. **docs-researcher** → Context7 : Open-Meteo Marine, disponibilité de `sea_level_height_msl` en Med (faible marnage). **qa-chrome** : reproduire sur 3-4 spots Med/Corse + 2 spots Atlantique (contrôle).

### Tâches
1. Reproduire : la composante marée est-elle **0 légitime** (marnage Méditerranée très faible → marée peu discriminante, ce qui est correct) ou **donnée absente** (Open-Meteo ne renvoie pas le niveau pour ces points) ?
2. Rendre un **verdict écrit** dans `docs/sprint-21/marees-med.md` : (a) si donnée présente mais marnage faible → ajuster l'**affichage**/pondération en Med (ne pas afficher un « 0/35 » trompeur ; ex. repondérer solunar/vent quand le marnage < seuil) ; (b) si donnée absente → marquer le besoin **SHOM/WorldTides** pour le Chantier C (P3), avec estimation.

### Critères d'acceptation
- `docs/sprint-21/marees-med.md` livré avec preuves (payloads, captures) et une reco claire go/no-go SHOM.
- Si correctif trivial d'affichage retenu : implémenté + testé (la fiche Med n'affiche plus un « 0/35 » trompeur). Sinon : ticket clair pour le Chantier C.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** d'engager un changement de fournisseur de marées (budget, cf décision roadmap §6). Ce bloc **diagnostique et recommande**, il ne bascule pas SHOM tout seul.

---

## Bloc E — Mise à jour de la doc (`CLAUDE.md`)

`CLAUDE.md` §2 (état) et §9 (roadmap) sont figés au sprint 11.6 (un bandeau de correction a déjà été posé en tête de §2 le 2026-06-23). On réécrit pour de bon.

> **Connecteurs** : **supabase-guard** (RO) pour les chiffres exacts (157 spots, migrations → 046, tables) ; s'appuyer sur `docs/audits/AUDIT-2026-06-23.md`.

### Tâches
1. Réécrire `CLAUDE.md` **§2** : état réel au 2026-06-23 (sprints 1→20 + carte v2 livrés/déployés ; features réelles ; 157 spots / 24 dépts ; pré-lancement ~5 prises). Garder la généalogie en annexe condensée, pas en corps principal.
2. Réécrire `CLAUDE.md` **§9** : remplacer la roadmap périmée par les Chantiers 0/A→G + phases P1→P5 (renvoi à `docs/ROADMAP-2026-H2.md`).
3. Mettre à jour le **§7 (schéma BDD)** si des tables récentes manquent (notifications, feed_post_photos, weather_cache, spots sources, quality cells…) — au moins lister les migrations 023→046.

### Critères d'acceptation
- `CLAUDE.md` §2/§9 ne contiennent plus d'affirmation périmée (plus de « 38 spots », plus de « sprint 11.6 = état courant », plus de « carte v2 non déployée »).
- Les chiffres correspondent à l'audit (migrations → 046, 157 spots, 24 dépts).

### Garde-fous
- Ne pas supprimer les décisions produit verrouillées (§8) ni les règles (§11, §15). Édition additive/correctrice, pas de réécriture des invariants.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** : `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build` (Node 24), puis revue croisée indépendante du `git diff main...HEAD` contre les critères d'acceptation ci-dessus (cocher ✅/❌ avec preuve).
2. **Passe anti-régression** ciblée : floutage GPS (les nouveaux tests RLS le prouvent), gating de tier intact, fil social 100% gratuit, RLS activé partout, pas de secret commité, copy FR/tutoiement.
3. Vérifier que **rien n'a été appliqué/poussé en prod** par les agents (migration 047 = fichier seulement ; aucune suppression de données prod).
4. Livrer `docs/sprint-21/RECAP.md` : fait / comment tester / **reste manuel John** (ci-dessous).

---

## Reste manuel John (post-sprint)

1. **Relire** la branche, puis merge → `main` + déploiement Vercel.
2. **Vercel** : ajouter `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` à l'env **Preview** (débloque tous les builds de PR + la CI E2E ; prod non affectée — traîne depuis le sprint 11).
3. **Appliquer la migration 047** en prod (SQL editor / CLI), en notant que `create index concurrently` tourne hors transaction. Puis **régénérer `lib/types.ts`** + relancer `get_advisors`.
4. **Réconcilier l'historique migrations** : `supabase migration repair --status applied 025 026 027 044` (DDL déjà en prod, juste l'historique à enregistrer — cf audit §4).
5. **Purger le seed de test en prod** (donnée, pas code) : supprimer les posts « [test]… » / auteur « Pêcheur test » du fil. ⚠️ Suppression de données → à faire/confirmer par John (ou agent avec go explicite).
6. **Git** : supprimer les ~17 branches déjà mergées (locales + remotes) ; committer le `lib/types.ts` régénéré.
7. **Décision D-2** : trancher `catches_for_viewer` (invoker vs definer assumé) → conditionne le point 3 du Bloc B.
8. **deploy-watch** après déploiement : confirmer Sentry `JAVASCRIPT-NEXTJS-4` (upload photo) ne réapparaît plus ; zéro régression runtime.

---

## Décisions pré-arbitrées / à trancher

- **D-1 (tests RLS)** : format = **SQL dans `supabase/tests/`** (cohérent avec l'existant). Exécution locale (Docker) vs read-only prod = à confirmer par John si besoin (garde-fou Bloc A).
- **D-2 (`catches_for_viewer`)** : ⚠️ à trancher par John (Bloc B). Recommandation : `security_invoker` + grants + test de non-régression floutage.
- Numéro de migration : **047** (à confirmer supabase-guard ; 046 = dernier sur disque).

*Brief produit le 2026-06-23. Suit `docs/BRIEF-TEMPLATE.md` (mode ultracode/xhigh). À exécuter quand John lance la ligne ci-dessus.*
