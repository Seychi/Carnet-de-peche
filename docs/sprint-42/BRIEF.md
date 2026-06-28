# Sprint 42 — Brief d'exécution
## « Réparer la carte » (correctif post-import OSM · ~3-4 j)

> Rédigé le 2026-06-28. Sprint **correctif** suite à l'audit `docs/audits/AUDIT-2026-06-28-POST-37-41.md`. L'import OSM massif (942 spots bruts) a fait timeout le cron de scoring (plus de scores ni de couleurs, même sur les anciens curés), posé des points sans espèces/techniques, et été inséré à moitié (06/Corse manquants).
> Objectif : remettre une carte propre AVANT le curage (sprint 43). On NE touche PAS au rendu (il est sain), on corrige la **donnée** et le **périmètre du scoring**.
> Décision John : Chemin A retenu (masquer les imports bruts jusqu'au curage). Une décision reste flippable (D1).

**⚠️ État à vérifier d'abord** : migrations sur disque à **070**, prochains libres **071/072/073** (`supabase-guard` confirme). Working tree avec ~20 fichiers M non commités (à committer ou jeter avant de démarrer).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-42/BRIEF.md`. **Vérifie le dernier numéro de migration** (071/072). Lance **WS A (cron scoring) et WS D (notifs/badge) en parallèle dès maintenant**, puis WS B (masquage imports). Le rendu de la carte est **sain, ne le touche pas** : on corrige la donnée. Migrations en fichiers numérotés, applique, régénère `lib/types.ts`. Termine par **VERIF** (carte propre : tout ce qui s'affiche est scoré/coloré/avec espèces). **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migrations `071`/`072`, RPC scoring, filtre moderation | **supabase-guard** → Supabase (RO d'abord) | Reprendre le corps EXACT de `get_spots_for_scoring` (043:338-354), CREATE OR REPLACE en préservant les grants ; regen types. |
| QA carte (scores de retour, couleurs, imports masqués) | **qa-chrome** → Claude in Chrome | Vérifier visuellement avant/après + console. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Le cron finit dans les temps, 0 erreur. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types. |

## Objectif en une phrase
Restaurer scores + couleurs sur les spots curés (en sortant les 942 imports bruts du périmètre du scoring **et** de la carte publique), router les notifs de sortie, sans rien régresser.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | 🔴 Cron scoring : `071` scope curated+community + maxDuration + purge | 1 j | — | ✅ |
| B | Masquer les imports bruts : `072` imports→pending + script | 0,5 j | — | ✅ |
| D | Routage notifs de sortie (UI) + badge (décision) | 0,5 j | — | ✅ |
| VERIF | revue + QA carte avant/après | 0,5 j | tous | ❌ |

**Parallèle jour 1 : A + B + D** (indépendants). Le **réimport 06/Corse** est une étape ops de John (cf Reste manuel), à faire AVANT que `072` flippe tout en pending.

---

## WS A — 🔴 Cron de scoring (la régression principale)

Le cron score TOUS les spots approuvés un par un avec un appel météo chacun (`maxDuration=60`) : à 1158 spots il timeoute → 336 spots sans score → markers gris. On le restreint aux spots qui en ont l'usage.

> **Connecteurs** : supabase-guard (corps exact de la RPC + grants).

### Tâches
1. `supabase/migrations/071_scope_spot_scoring.sql` : `CREATE OR REPLACE FUNCTION public.get_spots_for_scoring()` en reprenant **le corps courant `043_spots_sources.sql:344-353`** (SELECT id/lng/lat, WHERE `visibility='public' AND moderation_status='approved' AND geom is not null`, `ORDER BY s.id`) **+ ajout `AND s.source IN ('curated','community')`**. ⚠️ CREATE OR REPLACE **préserve** les grants existants (EXECUTE réservé `service_role` via `025`/`047`) : **ne PAS re-grant** `anon`/`authenticated`.
2. **Purge des scores d'imports** (cohérence) : `DELETE FROM public.spot_scores WHERE spot_id IN (SELECT id FROM public.spots WHERE source='imported');` (dans la même migration ou en SQL ops) — enlève les 621 scores d'imports désormais hors périmètre.
3. **Filet de sécurité maxDuration** : `app/api/crons/compute-spot-scores/route.ts:7` (`export const maxDuration = 60`) — monter à la valeur max permise par le plan (Hobby ≈ 60 reste la borne ; documenter que 215 spots tiennent largement dedans). Le job (`lib/scoring/spot-scores-job.ts:41` `rpc('get_spots_for_scoring')`, batch 10, upsert `onConflict:'spot_id'` `:59-71`) n'a **rien d'autre à changer** : il consommera la RPC réduite.
4. Régénérer `lib/types.ts`.

### Critères d'acceptation
- Après un run du cron : **0 spot `curated` sans `spot_scores` frais** (`select count(*) from spots s where source in ('curated','community') and visibility='public' and moderation_status='approved' and not exists (select 1 from spot_scores sc where sc.spot_id=s.id)` = 0).
- Le run termine **sous 60 s** (vérif logs Vercel / Sentry, pas de timeout).
- Les couleurs reviennent sur la carte (qa-chrome avant/après).

### Garde-fous
- Ne pas re-grant la RPC à anon/authenticated (verrou `025`/`047`).
- Ne rien changer au rendu (`MapView`/`utils.ts` : sains).

---

## WS B — Masquer les imports bruts jusqu'au curage (Chemin A · D1)

Les 942 imports OSM sont insérés `moderation_status='approved'` (donc publics, squelettiques). `get_spots_for_map` filtre `moderation_status='approved'` (`043:481`) → **les passer en `pending` les masque automatiquement** (carte, fiche, nearby, vue : tous filtrent approved). Ils deviennent un backlog propre pour le sprint 43.

> **Connecteurs** : supabase-guard (bascule + vérif que la carte ne les montre plus).

### Tâches
1. `supabase/migrations/072_imports_to_curation_backlog.sql` : `UPDATE public.spots SET moderation_status='pending' WHERE source='imported' AND moderation_status='approved';`. (À jouer **après** le réimport 06/Corse de John, sinon les nouveaux entreront approved et resteront visibles ; cf ordering.)
2. **Script d'import** `scripts/import-osm-spots.ts:205` : remplacer le littéral `'approved'` par `'pending'` (et le commentaire d'en-tête `:181`) → les futurs lots OSM entrent directement en backlog.
3. Vérifier qu'aucune autre lecture ne montre les imports pending (les RPC `get_spots_for_map:481`, `nearby_spots`, `get_spot_by_slug`, vue `spots_for_viewer` filtrent tous `approved` — donc OK sans modification).

### Critères d'acceptation
- `select count(*) from spots where source='imported' and moderation_status='approved'` = **0** après bascule.
- La carte publique ne montre plus que curés + communautaires (qa-chrome : plus de points `◦` gris importés).
- `get_department_stats` reflète la baisse des imports approuvés (normal).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : confirmer le Chemin A (masquer). Alternative B (garder visibles + défauts par structure + scorer) = ne PAS jouer `072`, et à la place enrichir le script d'import + élargir le scoring. Reco : A.
- Idempotent (le WHERE cible `approved`).

---

## WS D — Routage des notifs de sortie (UI) + badge

> **Connecteurs** : qa-chrome (cliquer une notif de sortie → atterrir sur `/sorties`).

### Tâches
1. **Aucune migration** : les types `outing_join/outing_accepted/outing_full/outing_cancelled/outing_message/outing_reminder` + `spot_verified` sont **déjà whitelistés en DB** (`067_outings_matching.sql:82-90`). Travail 100% UI dans `app/(app)/notifications/page.tsx` :
   - `describe()` (`:18`, switch `:20`, cases `:21-36`, default `:37-38`) : ajouter les cases manquants avec icône + libellé clair (ex. `outing_join` → « a demandé à rejoindre ta sortie », `outing_message` → « nouveau message dans la sortie », `outing_reminder` → « ta sortie est demain »). Importer des icônes lucide adaptées (`Users`, `CalendarClock`, ligne `:3`).
   - `hrefFor()` (`:76`, routes `:77-91`) : router `if (n.target_type === 'outing') return '/sorties'` ; `spot_verified` → `/spots/mes-propositions` ; `recfishing_reminder` → `/carnet`.
2. **Badge ✓ (décision)** : aujourd'hui `MapView.tsx:148` keye le `✓` sur `source==='curated'` (les imports reçoivent déjà `◦`, pas `✓` : pas de bug côté imports). Reste le cas cosmétique d'un curé legacy `verified=false` qui affiche quand même `✓`. **Reco** : laisser tel quel pour ce sprint (le curage posera `verified=true` partout). À trancher (D2, mineur).

### Critères d'acceptation
- Une notif de sortie affiche un libellé spécifique et **mène à `/sorties`** (pas `/fil`).
- 0 type tombant sur le générique « a interagi avec toi » parmi les types existants.

### Garde-fous
- Ne pas inventer de type non whitelisté (s'en tenir aux 12 de `067:82-90`).

---

## WS E — Retirer la couche « Zones actives » → DÉPLACÉ au Sprint 42.1

> ℹ️ Ce workstream a été **sorti du sprint 42** (déjà terminé) et fait l'objet d'un **brief dédié : `docs/sprint-42.1/BRIEF.md`** (numéros de ligne à jour + migration `074`). Le contenu ci-dessous est conservé pour mémoire seulement.

Décision John : « Zones actives » (`get_active_zones`, sprint 41) fait **doublon** avec la heatmap « Zones de prises » (`get_catch_heatmap`, 040). Même donnée (prises publiques agrégées k-anon K=3, même cellule plancher 0.01°, même `geom_public`) ; seul le rendu diffère (heatmap continue vs cellules pointillées « Np »). On **supprime** « Zones actives » et on **garde la heatmap telle quelle**. Le réservoir étant vide (0 cellule aujourd'hui), retrait sans perte visible.

> **Connecteurs** : supabase-guard (drop RPC + vérif dépendances) ; qa-chrome (la heatmap marche toujours, plus de toggle Zones actives).

### Tâches
1. **Front — retirer le toggle + la couche** :
   - Supprimer les fichiers `lib/map/useActiveZonesLayer.ts` et `lib/map/active-zones.ts`.
   - `components/map/MapShell.tsx` : retirer l'import (`:33`), le state `activeZonesOn/setActiveZonesOn` (`:225`), l'appel `useActiveZonesLayer` (`:279-281`) et les 4 props passées au sélecteur (`:586-589`).
   - `components/map/MapLayerSelector.tsx` : supprimer le bloc « Zones actives » (`:346-392`), les 4 props correspondantes (`activeZonesOn`/`onActiveZonesToggle`/`activeZonesEmpty`/`activeZonesLoading`) de l'interface + signature, et l'import d'icône `Radar` s'il n'est plus utilisé.
   - **NE PAS toucher** au bloc « Zones de prises » (heatmap, `:146-200`) ni à « Qualité » : on les garde intacts.
2. **DB — migration `073_remove_active_zones.sql`** :
   - `DROP FUNCTION IF EXISTS public.get_active_zones(double precision,double precision,double precision,double precision,integer,text[],text[],integer);` (signature exacte de `069`).
   - Nettoyer `get_department_stats` : il calcule `active_zone_count` **en interne** (CTE `zone_cells/zone_kanon/zone_counts`, il **n'appelle PAS** `get_active_zones` → le drop ne le casse pas), mais la colonne devient inutile. **DROP puis CREATE** `get_department_stats` **sans** `active_zone_count` ni ses CTE (le type de retour change → pas de `CREATE OR REPLACE` possible), en **préservant** le `grant execute ... to anon, authenticated`.
   - Régénérer `lib/types.ts`.
3. **`components/map/DepartmentStats.tsx`** : retirer l'affichage « M zones actives » et la lecture de `active_zone_count` (n'afficher que les comptes de spots).

### Critères d'acceptation
- Plus de toggle « Zones actives » dans le sélecteur ; la heatmap « Zones de prises » fonctionne **exactement comme avant**.
- `grep -ri "active_zones\|activeZones\|useActiveZonesLayer\|get_active_zones"` (hors migrations historiques `069`/`073`) ne renvoie plus aucune référence applicative.
- `get_active_zones` n'existe plus en base ; `get_department_stats` renvoie les comptes spots **sans** `active_zone_count` ; `lib/types.ts` régénéré ; **build + typecheck OK**.

### Garde-fous
- Ne pas supprimer `get_catch_heatmap` (040) ni `get_quality_cells` (044) : **seules** les « Zones actives » partent.
- Vérifier qu'aucun autre consommateur de `active_zone_count`/`get_active_zones` ne subsiste (`DepartmentStats` est le seul connu).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : tests + build + typecheck + lint + revue croisée.
2. **QA carte avant/après (qa-chrome)** : scores de retour sur les curés (popup ≠ « — / 100 »), couleurs de retour, imports masqués, 0 erreur console, gating 3/dépt et floutage intacts.
3. **Passe données (supabase-guard)** : 0 curé sans score frais ; 0 import approved ; le cron termine sans timeout.
4. **Passe anti-régression** : rendu carte inchangé (aucune modif `MapView`/`utils.ts`) ; RPC lecture carte non modifiées (juste le scoring + un UPDATE de statut) ; notifs existantes intactes.
5. **Passe copy** : tutoiement, libellés notif clairs, pas de tiret cadratin en prose.
6. **deploy-watch** après déploiement.
7. Livrer `docs/sprint-42/RECAP.md` : fait / comment tester / reste manuel John / statut D1-D2.

---

## Décisions pour John
- **D1 (masquer les imports ?)** — Reco **Chemin A** : `072` les passe en `pending` (masqués jusqu'au curage). Alternative B : les garder visibles avec espèces/techniques par défaut par structure + scoring élargi (carte plus dense, qualité moindre). **À confirmer avant WS B.**
- **D2 (badge ✓)** — laisser keyé sur `source` (reco, le curage régularisera) ou keyer sur `verified` (1 ligne `MapView.tsx:148`). Mineur.

## Reste manuel John (post-sprint, ordering important)
1. **Réimporter 06/Corse AVANT la bascule** : rejouer l'intégralité de `supabase/seed-spots-import-osm-02.sql` (idempotent via `ST_DWithin 150m`) pour récupérer 06/2A/2B/85 (~500 manquants). 
2. **Puis** appliquer `072` (flippe tous les imports → pending). Vérifier `select trim(department), count(*) from spots where source='imported' group by 1`.
3. Committer/jeter le working tree, merger `sprint-42` → `main`, déployer, **forcer un run du cron** et re-QA la carte.

---

> **Invariants (rappel)** : pas de push sans validation · RLS jamais désactivé · migrations = nouveaux fichiers (`071`/`072`/`073`) + regen `lib/types.ts` · **ne pas re-grant `get_spots_for_scoring`** · **ne pas toucher au rendu carte** (sain) · gating 3/dépt + floutage GPS intacts · copy sans tiret cadratin.
