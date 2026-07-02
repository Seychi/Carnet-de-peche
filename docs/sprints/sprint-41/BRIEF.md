# Sprint 41 — Brief d'exécution
## « La carte dense » (F6 densifier : curation sourcée et vérifiée un par un + zones actives k-anon + lisibilité des sources · ~5-6 j)

> Rédigé le 2026-06-27. Dernier sprint de la roadmap offensive (`docs/ROADMAP-OFFENSIVE-2026-06-27.md` §8). On ne peut pas rester squelettique face aux 10 000 spots revendiqués par spot-de-peche : on densifie **sans** trahir nos principes (qualité curée + anonymat k-anon).
> Contexte : `spots.source` (curated/community/imported) + le badge « vérifié » existent déjà ; le k-anon des prises (`get_catch_heatmap` K=3, `get_quality_cells`) est rodé. Net-neuf = une **couche « zones actives »** générée à partir des prises publiques, des **lots de curation** supplémentaires (sourcés et vérifiés un par un, au format existant), et la **lisibilité des sources**.
> Décisions John 2026-06-27 : séquencement équilibré. Trois décisions ouvertes (D1-D3).

**⚠️ État du repo (à vérifier en premier)** : les migrations sur disque vont jusqu'à **`068_outing_chat.sql`** (les sprints 37-40 ont consommé `059`→`068`). Les **prochains numéros libres = `069`/`070`**. **`supabase-guard` confirme le dernier numéro réel avant de créer** (le repo bouge vite, ne pas supposer). `CLAUDE.md` est périmé là-dessus (dit « 58 » / « 057 »).

**Préalable** (manuel John) : partir de `main` à jour. L'insertion des spots (lots curés) se fait **à la main par John** après revue et vérification un par un (process inchangé du sprint originel, cf §WS B).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-41/BRIEF.md`. **Vérifie d'abord le dernier numéro de migration** (disque à 068, prochains libres 069/070). Lance **WS A (couche zones actives) et WS C (lisibilité + comptes) en parallèle** ; WS B (densification par curation sourcée et vérifiée un par un, au format des lots existants) est une lane ops que tu prépares pour ma validation. Invariants durs : **k-anon K≥3**, **cellule jamais plus fine que 0.01°**, **zéro `geom` précis exposé**, **gating freemium 3 spots/dépt intact**. Migrations en fichiers numérotés, applique, régénère `lib/types.ts`. Termine par **VERIF** avec passe adversariale anti spot-burning. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| RPC PostGIS (snap grille, ST_DWithin), MapLibre 5 (couches GPU) | **docs-researcher** → Context7 | API version-correcte (PostGIS, MapLibre layers/sources). |
| Migrations `069`/`070`, k-anon, gating, seeds | **supabase-guard** → Supabase (RO d'abord) | Confirmer le dernier numéro, vérifier K≥3 et `geom_public` only, `get_advisors`, regen types. |
| QA carte (couche zones, lisibilité sources, gating gratuit/payant) | **qa-chrome** → Claude in Chrome + Playwright | Vérifier 0 coord au gratuit, badge vérifié = curé only, perf carte non régressée. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Carte sans erreur, RPC sans timeout. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

## Objectif en une phrase
Faire grandir le catalogue de spots **curés, sourcés et vérifiés un par un** (au format des lots existants) et ajouter une couche **zones actives générées k-anon** pour la densité, chaque source clairement étiquetée, **sans** exposer une coordonnée au gratuit ni casser le cap 3 spots/dépt.

## ⚠️ Garde-fous transverses (passe adversariale obligatoire)
1. **k-anon K≥3** : toute cellule agrégée ne sort que si `catch_count >= 3 AND fishers_count >= 3` (modèle `get_catch_heatmap` `040_catch_heatmap.sql:98`). **Jamais** descendre K.
2. **Plancher de cellule 0.01° (~1,1 km)** : jamais plus fin que le flou GPS (`040:54-62`). Agréger **`geom_public` uniquement**, jamais `geom` ni `catches_for_viewer`.
3. **Gating spots intact** : ne pas toucher le cap 3/dépt de `get_spots_for_map` (`043_spots_sources.sql:506`, origine `029:5-22`) ni la garde anti-bypass URL (`app/(map)/carte/page.tsx:141-142`). La couche « zones actives » est de l'agrégat → **gratuite tous tiers** (comme la heatmap), mais ne doit jamais permettre de reconstituer un spot sub-K.
4. **Badge « Vérifié » = `source='curated'` seulement** (contrainte `spots_verified_only_curated` `043:54-56`, rendu `MapView.tsx:135`). Ne jamais l'attacher à un spot importé/communautaire.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Couche « Zones actives » : RPC `069_active_zones` + hook + toggle carte | 2 j | — | ✅ |
| B | Densification par curation sourcée + vérifiée un par un (lots au format existant, validation John) | en continu | — | ✅ (lane ops) |
| C | Lisibilité des sources + comptes par dépt (`070`) | 1,5 j | — | ✅ |
| VERIF | revue + QA + passe anti spot-burning | 0,5 j | tous | ❌ |

**Parallèle jour 1 : A + B + C** (largement indépendants). C peut afficher le compteur de zones une fois A en place.

---

## WS A — Couche « Zones actives » (le cœur technique)

Une couche qui montre **où ça produit** (cellules k-anon des prises publiques), distincte des spots curés.

> **Connecteurs** : docs-researcher (PostGIS snap + MapLibre layer) ; supabase-guard (vérifier K≥3 + grant) ; qa-chrome (0 coord, perf).

### Tâches
1. `supabase/migrations/069_active_zones.sql` (vérifier le numéro libre d'abord) : RPC **`get_active_zones`** = **clone adversarial de `get_catch_heatmap`** (`040:31-109`). Mêmes garde-fous : bbox + `p_zoom`, taille de cellule plancher **0.01°** (`040:54-62`), filtre `privacy='public'` + **`geom_public`** (`040:77-82`), **K=3** (`040:98`), `SECURITY DEFINER` + grant `anon, authenticated` (`040:106-109`). Sortie enrichie « zone » : `lng, lat, catch_count, fishers_count, rank` (densité récente → rang), et **option** espèce dominante **uniquement si elle aussi k-anon** (sinon null). `p_days` récent (ex. 90 j) pour « actives ». Régénérer `lib/types.ts`.
2. Front : `lib/map/useActiveZonesLayer.ts` **calqué sur `lib/map/useCatchHeatmap.ts`** : `ensureLayers` insère **sous** les spots via `beforeId`/`SPOT_LAYER_IDS` (`useCatchHeatmap.ts:50-87`), `setVisible` (`:89-93`), `refresh` (bbox+zoom→RPC, debounce 350 ms, `:95-119`), refetch `moveend` (`:122-153`). Constantes dédiées `lib/map/active-zones.ts` (couleur/forme distinctes de la heatmap, cf D1). Rendu en **cellules `fill`+`label`** sur le modèle `useQualityLayer.ts:69-218` si D1 = grille (countable), sinon heatmap.
3. Toggle dans `components/map/MapLayerSelector.tsx` : nouveau bloc après le bloc « Qualité » (`:336`), `Switch activeZonesOn`/`onActiveZonesToggle`, props étendues (`:16-36`). Câblage state/hook/props dans `MapShell.tsx` (state `:206-216` modèle `qualityOn` `:215`, hook de rendu `:253-260`, passage props `:542-562`). **Default OFF** (éviter la surcharge au mount).

### Critères d'acceptation
- La couche « Zones actives » affiche des cellules d'activité **uniquement** ≥ K=3 (test SQL : aucune cellule avec `catch_count<3` ou `fishers_count<3`).
- **Gratuite tous tiers** (grant `anon`), aucune coordonnée précise ni `geom` exposé (passe qa-chrome : inspecter la réponse RPC).
- Default OFF ; activable au toggle ; rendu sous les marqueurs spots (pas par-dessus).
- Perf carte non régressée (pas de nouvelle long task au mount, couche en GPU).

### Garde-fous
- Réutiliser **strictement** les garde-fous de `040` (K, plancher, `geom_public`). Ne pas inventer une cellule plus fine.
- Pas de tier gating dans `get_active_zones` (agrégat = gratuit, principe « social/agrégé = gratuit »).

---

## WS B — Densification par curation sourcée et vérifiée un par un (méthode du sprint originel) — lane ops

On reprend **exactement** la méthode du sprint 10 : chaque spot est **sourcé** (référence vérifiable), **vérifié un par un**, puis ajouté dans **le même format de lot** que les précédents (`seed-spots-lot-N.sql`). Pas d'import en masse : la qualité prime sur le volume.

> **Connecteurs** : docs-researcher (sources/coordonnées) ; supabase-guard (dédup avant insert).

### Tâches
1. **Reprendre le process documenté** `docs/sprint-10/spots-curation.md` : règles qualité (`:8-15`), format colonnes (`:18-32`), workflow par lot (`:36`), répartition cible (`:38-47`), statut des lots (`:139-147`, lots 1→6 = 157 spots). On continue avec **lot 7, lot 8, …**.
2. **Sourcer chaque spot** : pour chaque candidat, fournir une **source vérifiable** de la position et de l'info (IGN/Géoportail, données portuaires officielles, structures nommées connues, guides locaux). Priorité aux **façades sous-couvertes** (Atlantique, Méditerranée) vs Bretagne déjà dense (`spots-curation.md:38-47`). **NE JAMAIS inventer** un spot ni une coordonnée.
3. **Vérifier un par un** : chaque spot est contrôlé individuellement (coordonnée juste, spot réel et pêchable du bord, accès public/légal) avant d'entrer dans le lot. C'est le contrôle qualité du sprint originel, désormais matérialisé par le badge « vérifié » (workflow F2 du sprint 37 : `verified_at`/`verified_by`).
4. **Écrire au même format** : fichier `supabase/seed-spots-lot-7.sql` (puis 8, …) **identique** aux lots existants (`seed-spots-lot-1.sql:33-45`) : `name, slug, department, region, geom (ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography), techniques[], species[], structure, difficulty, description, access_notes, hazards, visibility, verified`. **`source` omis** → default `curated`. `verified=false` à l'insert (passage à `true` au fil de la vérification). `geom_public` rempli par le trigger `blur_spot_geom`.
5. **Note de revue par lot** : tableau candidat → source citée → dédup (écarter tout point à < 150 m d'un spot existant, `ST_DWithin`) → prêt pour validation John.

### Critères d'acceptation
- Lot(s) `seed-spots-lot-N.sql` au **format identique** aux précédents ; chaque spot **sourcé** (référence citée) et **dédupliqué** (aucun à < 150 m d'un existant).
- `source` omis (→ `curated`), `verified=false` à l'insert ; aucune invention de spot ni de coordonnée.
- **Prêts pour validation + insertion par John** (l'agent ne joue pas les seeds), chaque spot vérifiable un par un.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT d'insérer** : les seeds se jouent à la main, jamais rejoués (collisions de slug `spots-curation.md:32`). John vérifie et insère lot par lot, et flippe `verified=true` au fil de la vérification.
- **Jamais inventer un spot ni une coordonnée** : sans source vérifiable, on ne propose pas. Pas d'import OSM en masse (au besoin, OSM sert seulement à repérer des structures nommées à **sourcer et vérifier ensuite** une par une, jamais à insérer en bloc).

---

## WS C — Lisibilité des sources + comptes par département (`070`)

Pour que l'utilisateur distingue un spot curé-vérifié d'un spot communautaire/importé ou d'une zone générée.

> **Connecteurs** : supabase-guard (RPC comptes) ; qa-chrome (rendu légende + comptes).

### Tâches
1. **Distinction visuelle** dans `components/map/MapView.tsx` : aujourd'hui seul `source==='curated'` porte le badge ✓ (`:135-142`). Ajouter un traitement visuel distinct pour `community` et `imported` (ex. pastille/teinte différente, jamais le ✓), cohérent avec `lib/map/utils.ts:toSpotMarker` (`source` `:137`). Mettre à jour la **légende** (couche `MapLayerSelector` ou légende carte) : curé-vérifié / communauté / importé / zone active.
2. **Comptes par département** (net-neuf, confirmé absent) : `supabase/migrations/070_department_stats.sql` → RPC `get_department_stats` (N spots **publics** par dépt + M **zones actives** k-anon), **non gatée** (comptes publics, aucun geom). Modèle de comptage : `lib/marketing/home-data.ts:65-82` (`getHomeCounts`) mais par département.
3. UI : afficher « N spots + M zones actives » par département (bandeau carte ou explorer). Honnête : si un dépt est encore maigre, le compte le dit.

### Critères d'acceptation
- Un spot importé ou communautaire ne porte **jamais** le badge « vérifié » ; la légende distingue les 4 natures.
- `get_department_stats` renvoie des comptes cohérents (vérif vs `select count(*) ... group by department`), sans exposer de geom.
- Le compteur « N spots + M zones actives » s'affiche par dépt.

### Garde-fous
- Ne pas faire passer un importé/communautaire pour un vérifié (contrainte + UI).
- Comptes = agrégat public, pas de gating, pas de coord.

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée.
2. **Passe anti spot-burning (NON négociable, qa-chrome + supabase-guard)** : `get_active_zones` ne renvoie **aucune** cellule sub-K (K≥3) ni `geom` précis ; cellule jamais < 0.01° ; agrège `geom_public` only ; **gating 3 spots/dépt intact** (`get_spots_for_map:506` + `carte/page.tsx:141-142` inchangés) ; un compte **gratuit** ne voit aucune coord précise ni via la nouvelle couche ni via les comptes.
3. **Passe sources** : badge ✓ = `source='curated'` only ; importés `verified=false` ; `spots_verified_only_curated` respectée ; advisors sans nouvelle alerte ; seeds non rejoués.
4. **Passe perf** : la couche zones actives est en GPU, default OFF, ne régresse pas le TBT de `/carte` (mesure qa-chrome).
5. **Passe copy** : tutoiement, zod en français, **aucun tiret cadratin en prose** (`node scripts/lint-copy-dashes.mjs`), comptes honnêtes (pas de gonflage).
6. **deploy-watch** (Vercel + Sentry) après déploiement.
7. Livrer `docs/sprint-41/RECAP.md` : fait / comment tester / **reste manuel John (revue + insertion des seeds)** / statut D1-D3 + nombre de spots atteint.

---

## Décisions pour John
- **D1 (rendu des zones actives)** — **grille de cellules** `fill`+`label` cliquables (modèle `useQualityLayer.ts`, countable → cohérent avec « M zones actives ») **ou** heatmap continue (modèle `useCatchHeatmap.ts`, plus léger) ? **Reco** : grille de cellules (lisible, dénombrable, distincte de la heatmap « zones de prises » existante). À trancher.
- **D2 (rythme de curation)** — la densification se fait par **lots sourcés et vérifiés un par un** (qualité avant volume, méthode du sprint originel) : plus lent qu'un import en masse, mais c'est le standard que tu veux. Les **zones actives** (WS A) portent la densité perçue en attendant. **Reco** : viser un objectif réaliste par lot (ex. +30-40 spots/lot sur les façades faibles) plutôt qu'un grand nombre d'un coup. Quel objectif de lot vises-tu ?
- **D3 (priorité des façades)** — par quelles façades sous-couvertes commencer ? **Reco** : prioriser les départements les plus maigres (cf répartition cible `spots-curation.md:38-47`), un lot par façade pour étaler ta vérification un par un.

## Reste manuel John (post-sprint)
- **Revoir, vérifier un par un et insérer** les lots curés proposés (`seed-spots-lot-7.sql`, …) à la main, jamais rejoués. Passer en `verified=true` chaque spot que tu valides.
- Relire le diff code, merger `sprint-41` → `main`, déploiement, QA carte (qa-chrome) : couche zones actives gratuite sans coord, légende des sources, comptes par dépt, gating 3/dépt intact, perf.
- Vérifier le **nombre de spots ajoutés** par lot (qualité avant volume).

---

> **Invariants (rappel)** : pas de push sans validation de John · RLS jamais désactivé · migrations = nouveaux fichiers (vérifier le numéro libre, ~`069`/`070`) + regen `lib/types.ts` · **k-anon K≥3 + cellule ≥ 0.01° + `geom_public` only** · **gating 3 spots/dépt intact** · badge vérifié = curé only · spots ajoutés par **curation sourcée et vérifiée un par un** au format des lots existants (`source` omis → `curated`, `verified=false` à l'insert, dédup 150 m) · **ne jamais inventer un spot ni une coordonnée** · seeds jamais rejoués · copy sans tiret cadratin.
