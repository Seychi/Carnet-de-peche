# RECAP — Sprint Carte-v2 / C3a (bathymétrie + nature du fond)

> Exécuté le 2026-06-22 en parallèle de C1 (carte vivante) et C2 (spots). Branche
> **`carte-v2-c3a`** (worktree `C:/Users/johns/Carnet-de-peche-c3a`, base `pre-pub-fixes`).
> **Non poussé, non mergé** (consigne John). Brief : `sprint-C3a-bathymetrie-fond.md`.

## En une phrase

La carte a une couche activable **« Fond marin » (profondeur + nature du fond)**, et un
clic en mer renvoie un popup **« Fond : Sable · Profondeur : ≈ 5,5 m »** — le tout en
**CC-BY commercial** via EMODnet, **sans hébergement de tuiles** (0 €), gated **Itinérant**.

## Décision d'architecture (le cœur)

Deux voies documentées ; on **ship la voie 1** maintenant, la voie 2 est l'upgrade :

1. **Zéro hébergement (v1, livré)** : sources raster **WMS EMODnet en direct** (profondeur
   `emodnet:mean` + substrat `eusm2025_subs_full`). Vérifié live : `200 image/png`, **CORS `*`**
   → rendu navigateur OK. Popup = lookup **serveur** `/api/seabed` (depth_sample + GetFeatureInfo).
   **Aucune migration**, **aucun coût**, **aucune dépendance Docker**.
2. **Self-host (upgrade, scripté)** : pipeline **GDAL → MBTiles → PMTiles → Cloudflare R2**
   (`scripts/bathy/`) pour s'affranchir des quotas/uptime EMODnet, faire de l'offline, ou une
   palette daltonien-safe maison + la HR côtière SHOM Litto3D. Bascule via env (1 variable).

**Pourquoi pas le SHOM d'emblée** : sa **sédimentologie est CC BY-SA NON-commerciale** →
interdite dans notre produit. EMODnet (CC-BY) fournit profondeur ET fond, commercial OK.
Détail licences : `data-sources.md`.

## Ce qui a été fait (par bloc)

| Bloc | Livrable | Fichier |
|---|---|---|
| A | Sources + licences vérifiées en direct, attribution, NO-GO SHOM, DEMANDER À JOHN | `docs/carte-v2/data-sources.md` |
| B | Pipeline GDAL→PMTiles reproductible (Docker) + README + substrat vecteur (option) | `scripts/bathy/build-bathy-tiles.sh`, `scripts/bathy/README.md` |
| C | Module couche MapLibre (lazy, zoom≥9, opacité) + contrôle autonome | `lib/map/bathymetry-layer.ts`, `components/map/BathyLayerControl.tsx`, `components/map/MapShell.tsx` |
| D | Lookup substrat (GetFeatureInfo) + route point + popup clic + « Fond » sur la fiche | `lib/conditions/bathymetry.ts`, `app/api/seabed/route.ts`, fiche `spots/[slug]` |
| E | Gating Itinérant (route 403 + contrôle verrouillé/upsell) + perf | route + `BathyLayerControl.tsx` |
| Tests | substrateToFr (mapping FR) + buildSeabedPopupHTML (popup, XSS, hors-couverture) — 8 tests | `lib/conditions/__tests__/`, `lib/map/__tests__/` |

## Endpoints vérifiés EN DIRECT le 2026-06-22 (curl, pas de mémoire)

- `rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(-4.79 48.04)` → `avg:-34.79964` ✅
- `ows.emodnet-seabedhabitats.eu/.../wms` GetFeatureInfo `eusm2025_subs_full` + `propertyName=substrate`
  → Raz `"Rock or other hard substrata"`, Concarneau `"Sand"` (réponse allégée `{substrate}`) ✅
- `ows.emodnet-bathymetry.eu/wms` GetMap `emodnet:mean` → `200 image/png`, **CORS `*`** ✅
- `ows.emodnet-seabedhabitats.eu/.../wms` GetMap `eusm2025_subs_full` → `200 image/png` RGBA, **CORS `*`** ✅

## Critères d'acceptation du brief

- [x] Couche activable profondeur + nature du fond (grille colorée) — 2 rasters EMODnet, toggle + opacité.
- [x] Popup « Fond : X · Profondeur : Y m » au clic en mer (ou « indisponible » honnête hors couverture).
- [x] Rendu cohérent avec la réalité (Bretagne pilote : profondeurs/substrats réels vérifiés).
- [x] S'active/désactive, opacité réglable, **n'alourdit pas le 1er load** (lazy + zoom≥9).
- [x] Gating **Itinérant** + aperçu (contrôle verrouillé → tarifs) pour l'upsell.
- [x] Attribution SHOM/EMODnet visible (via source MapLibre + fiche + popup).
- [x] Licences documentées (`data-sources.md`).

## Perf (anti-régression « 8 s »)

- Couche **lazy** : aucune source/tuile créée tant que l'utilisateur n'active pas le toggle.
- **`minzoom: 9`** sur les layers (la bathy fine n'a de sens qu'en zoom rapproché).
- **`raster-fade-duration: 0`** (≠ `fadeDuration` du constructeur, déjà à 0) → pas de flicker.
- maplibre-gl importé dynamiquement seulement à l'usage ; popup nettoyé au démontage.

## Point de merge avec C1 (sélecteur de couches)

C1 possède le squelette du **sélecteur de couches**. Ici, **tout est isolé dans
`components/map/BathyLayerControl.tsx`** (état + effets + UI), rendu une seule fois dans
`MapShell`. Au merge : **déplacer ce composant dans le sélecteur de C1** (rien d'autre à
défaire). La logique MapLibre pure vit dans `lib/map/bathymetry-layer.ts` (réutilisable tel
quel). Conflit potentiel minimal : seulement le bloc de rendu dans `MapShell.tsx`.

## Tests & vérif

- 8 tests unitaires ajoutés (mapping substrat FR + rendu popup + anti-XSS + hors-couverture).
- typecheck + eslint (`--max-warnings=0`) **verts** sur tous les fichiers touchés.
- _Suite complète + build + revue croisée : voir section « Vérification » ci-dessous._

> ⚠️ **Hook lint en worktree** : `lint-changed.mjs` tourne depuis le clone principal et
> rejette les chemins du worktree (« File ignored because outside of base path ») — **faux
> positif cosmétique**. Lint réel validé en lançant eslint avec `cwd` = le worktree (vert).

## Reste manuel John (hors outils Claude)

1. **Trancher le tier** Local vs Itinérant (constante `BATHY_TIER` — 1 ligne). Le brief dit
   Itinérant ; les tarifs mentionnent « bathymétrie » côté Local. Cf `data-sources.md §⚠️1`.
2. **Merge** : merger C1 d'abord, puis fondre `BathyLayerControl` dans son sélecteur de couches,
   puis merger `carte-v2-c3a`. Régénérer rien (pas de migration).
3. **(Optionnel) Self-host** : si on veut sortir d'EMODnet → lancer `scripts/bathy/` (Docker),
   héberger le `.pmtiles` sur R2, poser `NEXT_PUBLIC_BATHY_DEPTH_TILES_URL`. Décider quand.
4. **QA réelle** : `qa-chrome` sur preview/live (rendu de la couche + popup, desktop + mobile)
   — non faisable en local cette session (carte = clé MapTiler + WebGL navigateur).
5. **Vérifier sous charge** les quotas OWS EMODnet (mitigés par lazy + cache 30 j + gating).

## Limites assumées (honnêteté)

- **Pipeline GDAL non exécuté** cette session : le démon Docker n'était pas démarré + pas de
  GDAL local. Les scripts sont **écrits et relus**, pas exécutés. À jouer par John (Docker).
- **Pas de QA navigateur** du rendu live (idem : carte = WebGL + clé MapTiler).
- **`emodnet:mean`** par défaut (bleu séquentiel, daltonien-safe). `mean_multicolour` proscrit.
- Substrat = WMS GetFeatureInfo serveur (pas de table PostGIS) → simple, sans migration ;
  si perf insuffisante un jour, une table PostGIS prendrait un **numéro APRÈS C1 et C2**
  (à confirmer via supabase-guard quand C1/C2 auront posé leurs migrations — ne pas deviner).

## Vérification (faite)

- **Vitest** : `pnpm test` → **358 tests verts** (32 fichiers ; baseline 350 + 8 nouveaux, zéro régression).
- **`next lint`** (lint projet, bloquant depuis 11.5) : **« No ESLint warnings or errors »**.
- **`tsc --noEmit`** : **0 erreur**.
- **`next build`** : **succès** (arbre de routes compilé, dont `/api/seabed` et la fiche spot).
- **Revue croisée indépendante** (agent typescript-reviewer, adversariale) : verdict **GO**.
  Points critiques confirmés OK : gating 403 sans bypass, XSS échappé (escapeHtml + test),
  axes WMS cohérents (4326 lat,lon serveur / 3857 token client), perf lazy+zoom+fade, daltonisme
  (`emodnet:mean`), découplage C1, robustesse fiche. **3 findings mineurs :**
  - 🟠 popup `setHTML` post-fetch sur une popup fermée par l'utilisateur → **CORRIGÉ** (garde
    `stale()` ajoutée : `!popup.isOpen()`).
  - 🟡 cast `as unknown as [number,number]` inutile → **CORRIGÉ** (handler typé `MapMouseEvent`).
  - 🟠 ordre d'insertion des layers → **NON retenu (faux positif)** : l'analyse même du
    reviewer montre que le substrat finit AU-DESSUS de la profondeur (= l'intention « substrat
    en overlay »). Le correctif proposé (insérer substrat en premier) inverserait à tort. Laissé
    en l'état ; réglage fin d'opacité/ordre à valider en `qa-chrome`.

> Note : le hook `lint-changed` a faux-positivé à chaque édition (chemin worktree « outside of
> base path ») — sans incidence : `next lint` et eslint avec `cwd`=worktree sont verts.
