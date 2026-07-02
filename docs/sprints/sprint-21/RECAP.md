# 📒 Sprint 21 — RECAP (Socle & Vérité / Chantier 0)

> Exécuté le 2026-06-23, mode `ultracode` / effort `xhigh`, branche **`sprint-21`** (partie de `main` = `5a17509`).
> **Rien n'a été poussé, déployé, ni appliqué en prod.** Aucune migration jouée, aucune donnée supprimée. Tout est dans « Reste manuel John ».

---

## TL;DR

Les 5 workstreams + la passe VERIF sont faits. Les **2 zones critiques (catch CRUD + RLS) sont désormais testées**, la migration de durcissement est écrite (047, non appliquée), les restes de pré-lancement sont nettoyés (OG espèces, copy « Bretagne », JSON-LD guides, accord de genre), l'audit marées Med rend un verdict (**NO-GO SHOM**), et `CLAUDE.md` reflète la réalité. **Zéro régression** de gating/floutage (prouvé par les nouveaux tests RLS + revue adversariale).

| WS | Livrable | État |
|----|----------|------|
| A | Tests catch CRUD (19) + tests RLS SQL (2 fichiers, vérifiés live) | ✅ |
| B | Migration `047_hardening_socle.sql` (fichier, non appliquée) | ✅ |
| C | OG espèces + copy nationale + JSON-LD guides + accord de genre | ✅ |
| D | Verdict marées Med `docs/sprint-21/marees-med.md` (NO-GO SHOM) | ✅ |
| E | `CLAUDE.md` §2/§7/§9 réécrits | ✅ |
| D-2 | `catches_for_viewer` → **definer assumé** (décidé, étayé) | ✅ |
| VERIF | build + tests + lint + types + revue indépendante 3-lentilles | ✅ (voir §Vérification) |

---

## Détail par workstream

### WS-A — Tests des zones critiques
- **`lib/catches/__tests__/actions.test.ts`** (nouveau) — **19 cas** sur `lib/catches/actions.ts`, client Supabase mocké (factory locale capturant les payloads insert/update/delete) :
  - `createCatch` : insert valide + id ; **valeurs privacy par défaut** (`precise_for_friends=true`, `reveal_precise_to_public=false`, `privacy=private`, `released=false`) quand omises ; mapping `weight_kg→weight_g` + dénormalisation conditions (wind/tide) ; `geom` EWKT `POINT(lng lat)` ; rejet zod **message FR** (« Choisis une espèce… ») sans insert ; non authentifié ; erreur DB → message FR générique.
  - `updateCatch` : update partiel (pas d'écrasement des champs non soumis) ; **refus non-propriétaire** (aucun update) ; non authentifié ; mapping kg→g.
  - `deleteCatch` : id manquant ; **refus non-propriétaire** (aucun delete) ; succès `{ ok: true }` ; suppression de la photo Storage.
  - `uploadCatchPhoto` : fichier manquant ; **rejet > `MAX_SIZE_BYTES` (1,8 Mo)** ; **rejet type ≠ `image/webp`** (message FR) — verrouille le bug Sentry `JAVASCRIPT-NEXTJS-4` ; upload webp valide → chemin sous l'id user ; non authentifié.
- **`supabase/tests/rls_gps_floutage.sql`** + **`supabase/tests/rls_tier_gating.sql`** (nouveaux), format des tests existants (DO blocks, **aucune écriture**, idempotents) :
  - Floutage : `anon`/`authenticated` SANS SELECT sur `spots.geom`/`catches.geom` (autoritatif via `has_column_privilege`) + **attaque live en rôle `anon`** (denied) ; offset réel du centre flouté mesuré en **`ST_Distance(geom, ST_Centroid(geom_public))` (≈500-900 m)**, jamais la distance au polygone (artefact ~4 m, cf audit §4) ; `get_spots_for_map` non-abonné → centroïde flouté, jamais précis.
  - Gating : `get_spots_for_scoring` réservé `service_role`/`postgres` ; freemium **3 spots/dépt** + jamais précis pour non-abonné ; `get_quality_cells` perso **gaté Itinérant** + anonyme exclu ; **fil social sans gate d'abonnement** ; k-anon communauté K=3.
  - **Les deux fichiers ont été exécutés read-only contre la prod via le connecteur : tous les DO blocks passent.**

### WS-B — Durcissement DB (migration 047, NON appliquée)
- **`supabase/migrations/047_hardening_socle.sql`** : (1) `create index concurrently if not exists feed_post_photos_user_id_idx` ; (2) `revoke execute on get_spots_for_scoring from public, anon, authenticated` (défense en profondeur — déjà effectivement réservé `service_role`/`postgres`, vérifié) ; (3) bloc commenté documentant la **décision D-2** (cf ci-dessous). Idempotent, non destructif.
- ⚠️ Contient `CREATE INDEX CONCURRENTLY` → **doit être appliqué hors transaction** (note en tête du fichier).

### WS-C — Hygiène front / SEO
- **OG espèces** : `app/(marketing)/especes/[slug]/opengraph-image.tsx` (nouveau, convention Next 15 file-based, edge, charte DA v2, data 100 % statique `SPECIES` — pas de réseau). `generateMetadata` déclare déjà `openGraph` sans `images` → Next branche l'OG automatiquement. Fin des previews sociales muettes sur les 6 fiches.
- **Copy « Bretagne » → couverture réelle** : home (`page.tsx`, 2 fallbacks + 2 sous-titres) et tarifs (FAQ) ne promettent plus « Bretagne » / « extension Atlantique en cours ». Reflètent **24 départements côtiers (Manche, Atlantique, Méditerranée, Corse) · 157 spots** sans surpromettre. `grep "Bretagne|extension Atlantique|27 départements"` sur `app/(marketing)` = **0**.
- **JSON-LD** : `/guides` (index) reçoit `ItemList` + `BreadcrumbList` ; `/guides/[slug]` reçoit un `BreadcrumbList` (3 niveaux) ajouté à `buildJsonLd`.
- **Accord de genre** : champ `gender: 'm' | 'f'` ajouté aux 6 entrées `SPECIES` (`lib/seo/programmatic.ts`, sans toucher `article`/`articleDe` verrouillés par les tests) ; le `<h2>` de la fiche affiche « Comment **la** pêcher » pour dorade royale + orphie, « **le** » pour les autres.

### WS-D — Audit marées Med/Corse
- **`docs/sprint-21/marees-med.md`** : verdict étayé. Cause = **marnage faible légitime** (donnée Open-Meteo PRÉSENTE et correcte : Marseille 0,15 m, Ajaccio 0,16 m vs Brest 3,19 m). Le « 0/35 » est un **faux négatif structurel** : seuil d'étale `0.1 m` codé en dur dans `scoreTide` (`lib/solunar/scoring.ts:51`), pensé Atlantique. → **NO-GO SHOM/WorldTides** ; correctif = repondération sous seuil de marnage + garde-fou d'affichage = **ticket pour le Chantier C** (non implémenté ici : change le comportement du scoring, hors périmètre hygiène).

### WS-E — Doc
- **`CLAUDE.md`** : §2 réécrit (synthèse FAIT FOI de l'état réel 2026-06-23 ; détail historique démoté en **annexe généalogique** clairement marquée) ; §7 complété (47 migrations, tables récentes `notifications`/`feed_post_photos`/`weather_cache`/multi-source/quality cells, verrou colonne geom, `conditions_cache` droppée) ; §9 remplacé par les **Chantiers 0/A→G + phases P1→P5** renvoyant à `docs/ROADMAP-2026-H2.md`.

---

## Décision D-2 — `catches_for_viewer` : **definer ASSUMÉ** (pas d'invoker)

La reco initiale de l'audit était « invoker ». **Le schéma réel dit le contraire** : la vue calcule `COALESCE(catch_visible_geom(c.*), c.geom_public)`, donc référence la **ligne entière `c.*`** (incluant `geom`). Or depuis le verrou colonne 041, `anon`/`authenticated` n'ont AUCUN SELECT table sur `catches` ni sur `catches.geom`. En `security_invoker`, la vue tournerait avec les droits de l'appelant → **« permission denied for column geom » pour tout non-propriétaire → régression** (fil, fiches espèces live, profils publics). Les policies RLS de `catches` (own/public/friends) sont déjà reproduites par la clause WHERE de la vue. → **On garde le definer, assumé** (comme `spots_for_viewer`), documenté dans `047` §3. Aucune fuite démontrée ; c'est l'advisor qui est trop strict ici. *Si John veut quand même l'invoker, il faudra d'abord exposer `geom` à la vue via une fonction definer dédiée.*

---

## Comment tester

- **Unitaires** : `pnpm test` → **417 cas verts** (36 fichiers ; +19 vs ~389 avant).
- **Catch CRUD seul** : `pnpm exec vitest run lib/catches/__tests__/actions.test.ts`.
- **RLS SQL** : coller `supabase/tests/rls_gps_floutage.sql` puis `rls_tier_gating.sql` dans le SQL Editor (read-only, idempotents) → aucune exception = OK. (Déjà exécutés live pendant le sprint, tous verts.)
- **Types / lint / build** : `pnpm typecheck` · `pnpm lint` · `pnpm build` (cf §Vérification).
- **OG espèces** (après déploiement) : view-source d'une fiche `/especes/[slug]` → `og:image` non nulle ; ou ouvrir `/especes/bar/opengraph-image`.

---

## Vérification (workstream VERIF)

Passe complète + **revue croisée indépendante** (workflow `sprint21-verif`, 3 lentilles read-only) :

- ✅ `pnpm typecheck` — **0 erreur**.
- ✅ `pnpm test` — **417/417 verts** (36 fichiers ; +19 vs ~389 avant).
- ✅ `pnpm lint` (`next lint`) — **0 warning / 0 erreur**.
- ✅ `pnpm build` — **succès** (exit 0 ; route OG `especes/[slug]/opengraph-image` + pages especes/guides générées, confirmé dans `.next`).
- **Revue indépendante** : *Correctness* = **PASS** (0 bloquant), *Anti-régression/Sécurité* = **PASS** (floutage GPS non réexposé, gating intact, social gratuit, RLS jamais affaibli, 0 secret commité, D-2 validée par lecture du schéma live), *SEO/Copy/Doc* = **PASS après correctif**.

**Finding réel remonté par la revue (lentille SEO) — CORRIGÉ** : mon `grep` de contrôle « Bretagne » était scopé `app/(marketing)` et avait **raté `components/marketing/home-visuals.tsx`**, qui affichait encore un badge `… SPOTS CURÉS · BRETAGNE` + `aria-label="Carte de Bretagne"` (la chaîne exacte ciblée par l'audit §5). → Corrigé : `… SPOTS CURÉS · 24 DÉPTS CÔTIERS` + `aria-label="Carte des spots curés"`. Re-grep « Bretagne » sur **tout le repo** : ne restent que des occurrences légitimes (guide « spots de Bretagne », seed dev, références doc). C'est exactement la valeur de la passe adversariale.

**Anti-régression confirmée** : `git diff main` = **8 fichiers tracked** (contenu/SEO/doc) + **6 nouveaux** (tests/migration/OG/docs). Aucune RPC de gating ni composant carte modifié ; migration 047 non destructive ; **rien d'appliqué/poussé en prod**.

---

## Reste manuel John (post-sprint)

1. **Relire** la branche `sprint-21`, puis merge → `main` + déploiement Vercel.
2. **Vercel** : ajouter `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` à l'env **Preview** (débloque builds PR + CI E2E ; traîne depuis le sprint 11).
3. **Appliquer la migration 047** en prod **hors transaction** (`CREATE INDEX CONCURRENTLY`). Puis **régénérer `lib/types.ts`** + relancer `get_advisors` (l'advisor `unindexed_foreign_keys` sur `feed_post_photos.user_id` doit disparaître ; l'advisor `security_definer_view` sur `catches_for_viewer` **restera** — c'est la décision D-2 assumée).
4. **Réconcilier l'historique migrations** : `supabase migration repair --status applied 025 026 027 044` (DDL déjà en prod, juste l'historique à enregistrer).
5. **Purger le seed de test en prod** (donnée) : posts « [test]… » / auteur « Pêcheur test » du fil. ⚠️ Suppression de données → à faire/confirmer par John.
6. **Git** : supprimer les ~17 branches déjà mergées ; committer le `lib/types.ts` régénéré.
7. **D-2** : décision prise (definer assumé). Si désaccord, voir la note ci-dessus.
8. **deploy-watch** après déploiement : confirmer Sentry `JAVASCRIPT-NEXTJS-4` (upload photo) fermé ; zéro régression runtime.
9. **Ticket marées (Chantier C)** : repondération marée sous faible marnage + garde-fou d'affichage (cf `docs/sprint-21/marees-med.md`).

---

## Notes / findings

- **`get_spots_for_scoring` était DÉJÀ verrouillé** (ACL = `postgres` + `service_role` uniquement, ni PUBLIC ni anon/authenticated) — le `revoke` de 047 est une défense en profondeur explicite + idempotente, pas une correction d'un trou ouvert.
- **Floutage mesuré** (24 départements) : centre `geom_public` à **503–899 m** de `geom` ; la distance au **polygone** descend à ~4 m (06/66/76) → c'est l'artefact à NE PAS utiliser comme mesure de sécurité (les tests utilisent le centroïde).
- **Marées Med** : donnée présente, pas de besoin SHOM pour ce bug — le 0/35 est un seuil d'étale calibré Atlantique.
