# Sprint Carte-v2 / C2 — RECAP (multi-source des spots)

> Exécuté le 2026-06-22 sur la branche **`carte-v2-c2`** (worktree `C:\Users\johns\Carnet-de-peche-c2`), **en parallèle de C1** (carte vivante, worktree `Carnet-c1`).
> Migration : **`043_spots_sources.sql`** (renumérotée depuis 041 — collision : C1 a appliqué 040/041/042 en parallèle, enregistrées par slug). **APPLIQUÉE + vérifiée en prod le 2026-06-22** via `apply_migration` ; `lib/types.ts` régénéré depuis prod. Reste : merge C1/C2, import OSM, QA navigateur.

## Objectif tenu
Un pêcheur peut **proposer un spot** (modéré, dédupliqué, anti-spot-burning), on **importe en masse** les structures publiques OSM, et la carte distingue **curé / communautaire / importé** — avec le badge « Vérifié » réservé aux curés. Cap mis vers 1000+.

---

## État de vérification (passe `/verif-sprint`)
| Check | Résultat |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `next lint` (projet entier) | ✅ 0 warning / 0 error |
| `vitest run` | ✅ **358 tests** verts (350 existants + 8 nouveaux `propose-schema`) |
| `next build` | ✅ exit 0 — routes `/spots/proposer`, `/spots/mes-propositions`, `/moderation` compilées |
| Revue SQL adversariale (supabase-guard RO vs schéma prod) | ✅ **GO** — aucun bug bloquant (détail ci-dessous) |

> Note worktree : le hook `lint-changed` a « bloqué » chaque édition avec `File ignored because outside of base path` — **faux positif** : le hook lance ESLint depuis le repo principal, qui ignore les fichiers du worktree voisin. Le lint réel (`next lint` depuis le worktree) est **clean**. Les éditions ont toutes été appliquées.

---

## Bloc A — Migration `041_spots_sources.sql` (le keystone)
Modèle 3-sources + modération + dédup + anti-fuite. **Une seule migration** (le brief proposait 2 colonnes en plus, voir déviations).

- **Colonnes** : `spots.source` (`curated|community|imported`, default `curated`), `spots.moderation_status` (`pending|approved|rejected`, default `approved`). Les **157 spots existants** deviennent `curated/approved` par les defaults (zéro backfill explicite). CHECK `verified ⇒ source='curated'` (badge « Vérifié » verrouillé aux curés).
- **`submitted_by` NON ajouté** — on réutilise `created_by` (déjà FK profiles, ON DELETE SET NULL) qui porte exactement cette sémantique. *(Déviation assumée vs brief.)*
- **Anti-fuite pending (cœur sécurité)** — un `community/pending` n'est visible que de son auteur + modérateurs :
  - RLS `spots_select_visible` réécrite : `(approved ET visible-selon-tier) OR owner OR is_moderator()`.
  - Les **5 RPC SECURITY DEFINER** filtrent `moderation_status='approved'` (`get_spot_by_id/by_slug/for_map`, `nearby_spots` — filtre **dans** la CTE `matched` avant `limit/rn`, `get_spots_for_scoring`). Gating de tier 029 + floutage **inchangés**.
  - Vue `spots_for_viewer` (SECURITY DEFINER) : filtre dans le WHERE (parenthésé).
- **Anti auto-approbation** — `anon/authenticated` ont les grants table INSERT/UPDATE → tout repose sur la RLS :
  - `spots_insert_community` WITH CHECK épingle `source='community' AND moderation_status='pending' AND verified=false AND visibility='public' AND created_by=auth.uid()`.
  - `spots_update_own` (USING `owner AND status<>'approved'`, WITH CHECK pin pending/community/non-vérifié) + `spots_update_moderator` (is_moderator). Un owner non-mod **ne peut pas** s'auto-approuver ni s'auto-`verified`.
  - `spots_delete_own` (owner, non-approuvé) + `spots_delete_moderator`.
- **Dédup géo** : fonction `find_spot_duplicate(lng,lat,radius=150)` (SECURITY DEFINER, **ne renvoie aucune coordonnée**) + trigger `enforce_spot_dedup` (BEFORE INSERT, **community only**, ST_DWithin 150 m) → backstop même en PostgREST direct.
- **Anti-spam** : trigger `enforce_spot_proposal_rate_limit` (max **5 propositions community / 24 h / user**).
- **Notifications** : CHECK `type` étendu (`spot_approved`, `spot_rejected`) + `target_type` (`spot`) + index `notifications(actor_id)` (advisor 11.5). *(Noms de contraintes `notifications_type_check`/`notifications_target_type_check` confirmés exacts en prod.)*
- **Grants** : `GRANT SELECT (source, moderation_status)` à anon/authenticated (jamais `geom` — verrou 028 intact). Re-grants EXECUTE après DROP+CREATE de `get_spots_for_map`/`get_spot_by_slug`. `get_spots_for_scoring` **non** re-granté à anon (025 préservé).
- **`lib/types.ts`** patché à la main (colonnes spots + retours RPC + `find_spot_duplicate`) pour que le worktree compile. **À régénérer proprement** après application (voir Reste John).

## Bloc B — Proposer un spot
- `lib/spots/propose-schema.ts` (zod, réutilise `catchSpeciesEnum`/`catchTechniqueEnum`, dépt côtier, `isInFranceMetro`, case « lieu public » obligatoire).
- `app/actions/spots.ts` : `proposeSpot` (zod → rate-limit → anti-doublon RPC → insert RLS-forcé community/pending) + `checkSpotDuplicate` (live, sans coordonnée).
- `components/spots/ProposeSpotForm.tsx` (RHF + zodResolver, chips, picker carte lazy, check doublon live, toast) + `SpotLocationPicker.tsx` (instance MapLibre **autonome** — ne touche pas MapView).
- Pages : `app/(app)/spots/proposer/page.tsx` + `app/(app)/spots/mes-propositions/page.tsx` (statut « En attente / Validé / Refusé » = label + icône, **colorblind-safe**).

## Bloc C — Modération des spots
- `/moderation` étendu : onglet **« Spots en attente »** (`?tab=spots`, SSR) — approuver / **doublon (fusion)** / rejeter, réservé `is_moderator`.
- Actions `moderateApproveSpot` / `moderateRejectSpot` / `moderateMergeSpot` (gate `is_moderator` + RLS backstop) → **notifient le proposant** (in-app). Page `notifications` gère les 2 nouveaux types (icône + lien `/spots/mes-propositions`).
- *Décision* : on ne notifie PAS les modérateurs à chaque proposition (ils consultent la file) — évite le spam. Fusion = suppression de la proposition + notif (la fusion fine des données vers le canonique est hors v1).

## Bloc D — Import OSM
- `scripts/import-osm-spots.ts` (Node, `fetch` natif, **aucune dépendance**) : Overpass par **bbox/département côtier**, User-Agent identifiant, backoff 429/504, pause 3 s, `out center tags`. Tags `man_made=pier/breakwater/groyne/quay` + `natural=cape`. **Structures NOMMÉES uniquement** (anti spot-burning), exclut `access=private/customers/no`. Piège ordre coords géré (`[lon,lat]`).
- Sortie = `supabase/seed-spots-import-osm-01.sql` (**revue avant insertion**) : `INSERT…SELECT … WHERE NOT EXISTS ST_DWithin(150)` → dédup contre l'existant à l'insertion ; `source='imported'`, `moderation_status='approved'`, `verified=false`. Dédup intra-lot (haversine) côté script.
- **ODbL** : header d'attribution dans le SQL + « © OpenStreetMap contributors » sur la carte (légende + contrôle d'attribution MapLibre). `source='imported'` permet d'isoler l'OSM d'un futur export public.

## Bloc E — Carte différenciée par source (palette **cividis intacte**)
- Badge « **Vérifié** » (✓, forme — pas la teinte seule) sur le **marker des curés uniquement** + chip de provenance dans le popup (`SpotPopup`) et la fiche spot (`/spots/[slug]`).
- Filtre **Provenance** (vérifiés / communautaires / importés) : `filters-schema` + `filter-url(.server)` + `MapFilters` + `MapShell.filterSpots`.
- Légende : provenance + **attribution OSM/ODbL** (lien `/copyright`).
- `QUALITY_MARKER_COLORS` (cividis) **jamais touché** — les badges sont un canal forme/icône/label orthogonal au score (exigence daltonisme).

---

## ⚠️ Points de merge avec C1 (à résoudre au merge, ne pas écraser)
C1 et C2 modifient les mêmes fichiers carte. Mes ajouts sont **additifs + balisés** par un commentaire `⟢ MERGE C2` :
- **`components/map/MapView.tsx`** : badge « Vérifié » dans `createPinElement` + `source` dans les properties du feature cluster. (C1 ajoute la source/layer heatmap ailleurs.)
- **`components/map/MapLegend.tsx`** : bloc provenance + attribution OSM ajouté sous la légende qualité. (C1 ajoute la légende heatmap.)
- **`components/map/MapShell.tsx`** : `filterSpots` (source), entrées « Proposer un spot », import `MapPinPlus`. (C1 ajoute potentiellement le sélecteur de couches.)
- **`lib/map/utils.ts`** : champ `source?` sur `SpotMarker` + mapping `toSpotMarker`. (C1 n'y touche pas a priori.)
- `MapFilters.tsx`, `SpotPopup.tsx`, `app/globals.css` : ajouts C2 isolés (peu de risque).

---

## Fait par Claude (2026-06-22)
- ✅ **Migration `043` appliquée en prod** (`apply_migration`) + **vérifiée** : 157 spots curated/approved, 9 verified préservés, 6 policies spots, RPC retournent `source`, **`nearby_spots` garde le floutage anti-trilatération 039**, CHECK notifications étendus, **verrou `geom` anon intact** (false), **scoring anon révoqué** (false).
- ✅ **`lib/types.ts` régénéré depuis prod** (inclut C2 + les migrations C1).
- ℹ️ Réconciliation `migration repair 025/026/027` non nécessaire ici (043 appliquée par `apply_migration`/slug, pas par `db push`) — à faire seulement si un futur `db push` est lancé.

## Reste manuel John
1. **Import OSM** : lancer `pnpm tsx scripts/import-osm-spots.ts`, **relire** `supabase/seed-spots-import-osm-01.sql` (façades, doublons évidents), puis insérer par lots.
2. **Merger `carte-v2-c1` puis `carte-v2-c2`** → résoudre les points de merge ci-dessus (`⟢ MERGE C2`). Déployer.
3. Re-passer `get_advisors` (security+perf) — la vue `spots_for_viewer` reste DEFINER (advisor ERROR **assumé**, pas un nouveau).
4. **QA navigateur** (qa-chrome) sur preview/prod : flux « proposer un spot » (doublon/spam bloqués, pending non public), badges curé/communautaire/importé, attribution OSM visible.
5. **deploy-watch** après déploiement (corréler build/runtime Vercel + Sentry + advisors).

## 🟠 Décision à confirmer (1 seule)
**Badge « Vérifié » = `source='curated'`** (les 157 curés l'affichent), et je **n'ai pas touché** la colonne `verified` (9 spots `verified=true` préservés). Le brief était contradictoire (« badge Vérifié réservé aux curés » vs « verified reste distinct »). Choix sûr et réversible : le badge UI s'appuie sur `source`, `verified` reste dispo pour une future distinction « audité terrain ». **Si tu préfères « curé ⇒ verified=true » partout**, un `UPDATE spots SET verified=true WHERE source='curated'` suffit (le CHECK l'autorise) — dis-le.

## Garde-fous validés (passe anti-abus)
✅ pending jamais public (RLS + vue + 5 RPC) · ✅ pas d'auto-approbation (WITH CHECK) · ✅ dédup ST_DWithin 150 m (RPC + trigger) · ✅ rate-limit 5/24h · ✅ anti-spot-burning (case obligatoire + structures nommées) · ✅ verrou `geom` 028 intact · ✅ attribution ODbL · ✅ palette cividis intacte.
