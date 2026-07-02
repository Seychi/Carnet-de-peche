# Sprint 41 — RECAP
## « La carte dense » (F6 : zones actives k-anon + densification catalogue + lisibilité des sources)

> Exécuté le 2026-06-27 (ultracode). **Pas poussé** (John relit + merge + **insère les seeds à la main**). Migrations **069/070 appliquées en prod** + `lib/types.ts` régénéré.
>
> ⚠️ **Numérotation** : 059→068 consommées (sprints 37-40) → ce sprint = **069_active_zones** + **070_department_stats**.

---

## Décisions John (recos retenues)
- **D1 = grille de cellules** cliquables (dénombrable, distincte de la heatmap), pas heatmap continue.
- **D2 = comptes séparés** « N spots + M zones actives » (jamais fondre zones et spots → honnêteté).
- **D3 = import OSM généré complet, livré par façade** pour la revue de John.

---

## Fait (code complet, VERIF verte)

### Migrations
- **069_active_zones.sql** — RPC `get_active_zones(bbox, p_zoom, species_filter, technique_filter, p_days=90)` → `(lng, lat, catch_count, fishers_count, rank, dominant_species)`. **Clone adversarial de `get_catch_heatmap`** : K-anon **K=3** (catch≥3 ET pêcheurs≥3), cellule plancher **0.01°**, **`geom_public` only** (jamais `geom`), `privacy='public'`, SECURITY DEFINER, **grant anon/authenticated** (gratuit tous tiers). `dominant_species` exposée seulement si elle-même k-anon.
- **070_department_stats.sql** — RPC `get_department_stats()` → par dépt : `spot_count` + détail `curated/community/imported` + `active_zone_count` (cellules k-anon via le spot de la prise). Non gaté, **0 geom**, `btrim(department)` (CHAR paddé).

### WS A — couche « Zones actives » (grille)
`lib/map/active-zones.ts` + `lib/map/useActiveZonesLayer.ts` (calqué `useCatchHeatmap`/`useQualityLayer`) : grille de cellules `fill`+`line`+`symbol` GPU, insérée **sous les marqueurs spots** (`beforeId`), debounce 350 ms + refetch `moveend`, popup « N prises récentes, M pêcheurs » (+ espèce dominante si k-anon). Toggle dans `MapLayerSelector` (**default OFF**), câblé dans `MapShell` (fenêtre 90 j). **Visuel daltonien-safe** distinct de la heatmap et de la couche qualité (carré pointillé + label « Np », pas la teinte seule).

### WS C — lisibilité des sources + comptes
`MapView` + `lib/map/utils.ts` : marqueurs distincts par source (`community` = `~`, `imported` = `◦`, **jamais le ✓** réservé à `curated`), doublés en `title`/`aria-label`, contour distinct en mode cluster. `MapLegend` : **4 natures** (curé vérifié / communauté / importé / zone active). `DepartmentStats.tsx` (lazy) : « N spots · M zones actives » par dépt + détail par source, **comptés séparément (D2)**.

### WS B — densification catalogue (LANE OPS, **rien inséré en base**)
- `supabase/seed-spots-import-osm-02.sql` : **1471 candidats OSM** (24 dépts), tous `source='imported'` + `verified=false` + `moderation_status='approved'`, dédup 150 m intra-lot + contre l'existant, **ODbL** attribué, structures nommées only.
- `supabase/seed-spots-lot-7.sql` (30 spots Méditerranée) + `supabase/seed-spots-lot-8.sql` (28 spots Atlantique sud) : lots curés proposés, `source` omis (→ `curated`), `verified=false`, sourcés (OSM/Géoportail/guides), **aucune invention**, slugs uniques sans collision prod.
- `docs/sprint-41/osm-review-note.md` : candidats par façade (Manche 161 / Atlantique 711 / Méditerranée 599), doublons écartés, sources, flags d'accès, total projeté.

---

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts** · `pnpm build` **OK** (`/carte`).
- `lint-copy-dashes` : 0 nouvelle violation de prose (1 match = `console.warn` pré-existant, toléré).
- **Anti spot-burning (NON négociable) — garanti au niveau RPC** : `get_active_zones` impose **K=3** (vérifié dans la déf) + cellule **0.01°** + **`geom_public` only** ; appel de contrôle sur toute la France → **0 cellule** (réservoir trop petit pour K=3 → **rien ne fuit sub-K**). Le front ne peut pas exposer ce que la RPC ne renvoie pas. `get_department_stats` = comptes only, 0 geom, zones k-anon.
- **Gating intact** : `get_spots_for_map` (3 spots/dépt) et la garde anti-bypass `app/(map)/carte/page.tsx:141-142` **non touchés**. Badge ✓ = `source='curated'` **uniquement** (un importé ne le porte jamais).
- Advisors = **2 `security_definer_view`** (baseline) ; les 2 nouvelles RPC apparaissent dans le bucket WARN `*_function_executable` (attendu, identique à `get_catch_heatmap`), aucune nouvelle catégorie ERROR.
- **Perf** : couche zones GPU, default OFF, `DepartmentStats` lazy → pas de fetch/long task au mount.

### QA carte live — à faire par John (post-déploiement)
Inspection de la réponse RPC `get_active_zones` en compte gratuit (0 coord), rendu de la grille, légende des sources, gating 3/dépt, perf TBT non régressée → **qa-chrome post-merge** (chrome-devtools était indisponible cette session). Le socle est vérifié au niveau base.

---

## Reste manuel John (LE gros morceau de ce sprint)
1. **Revoir et insérer les seeds à la main** (jamais rejoués, slugs uniques) :
   - `seed-spots-import-osm-02.sql` : revoir **par façade**, **filtrer** les ~102 « Ponton% » (fingers de marina) et les caps en cœur de parc (Calanques), recaler/insérer la façade validée.
   - `seed-spots-lot-7.sql` (Med) + `seed-spots-lot-8.sql` (Atlantique sud) : valider spot par spot, **recaler chaque coord au satellite**, insérer, passer `verified=true` au fil.
   - Trancher les spots à risque légal écartés (documentés dans la note).
2. Relire le diff code, merger `sprint-41`, déployer, **QA carte** (zones gratuit sans coord, légende, comptes, gating, perf).
3. Vérifier le **nombre de spots final** : 158 actuels → **~950-1100 projetés** (216 curés lots 7/8 inclus + import OSM filtré) → **objectif 400+ largement dépassé**.

---

## ⚠️ Findings / questions pour John
1. **Fenêtre « zones actives » = 90 j en dur** (sémantique « actif récent »). Ajouter un sélecteur de fenêtre = ajout trivial si tu veux.
2. **Import OSM brut** : ~102 lignes « Ponton A/B/C » peu pêchables + quelques caps en cœur de parc → à filtrer en revue. L'agent peut préparer un `DELETE` de nettoyage (sans l'exécuter) si tu veux.
3. **Cosmétique** : l'en-tête généré du fichier OSM dit encore « -01 » (chaîne du script) ; casse de `region` propre vs slug minuscule dans les lots curés. Harmonisation avant insertion ?
4. **Zones actives à 0 aujourd'hui** : normal (réservoir < K=3 partout). La couche se remplira quand le réservoir de prises publiques grossira (amorçage).

---

> **Invariants tenus** : k-anon **K≥3** + cellule **≥ 0.01°** + **`geom_public` only** (vérifié, 0 fuite sub-K) · **gating 3 spots/dépt intact** · badge vérifié = curé only · OSM `source='imported'` + dédup 150 m + ODbL · **aucune invention de spot** (sources vérifiables, validation John) · **seeds jamais insérés par l'agent** (revue + insert John) · advisors baseline (2 SDV) · copy sans tiret cadratin · **pas de push**.
