# Sprint « Fond marin — Fiabilité & perf » — Brief d'exécution
## Proxifier, cacher et optimiser la couche bathymétrie / nature du fond

> Rédigé le 2026-06-26 (révisé : périmètre resserré sur **fiabilité + perf**, pas d'enrichissement/légende — décision John).
> Contexte : audit `docs/audits/AUDIT-2026-06-26-authentifie.md` (B1). La couche **fonctionne** (vérifié par John) mais ses **tuiles raster partent en direct du navigateur** vers EMODnet → erreurs console `Failed to fetch (ows.emodnet-seabedhabitats.eu) (0)` (CORS/instabilité) + `The source image could not be decoded` (réponse non-image traitée comme tuile) + **zéro cache**.
> Objectif : **0 erreur console, plus rapide, indépendant des aléas EMODnet** — sans rien changer au rendu visuel ni au gating GPS.
> Séquencement : carte-related, à jouer après/avec le S36 « Carte instantanée ». Pas de dépendance bloquante.

**État du code (vérifié 2026-06-26)** — rien n'est proxifié côté tuiles :
- Tuiles **profondeur** : `https://ows.emodnet-bathymetry.eu/wms?...&layers=emodnet:mean&...&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}` — `lib/map/bathymetry-layer.ts:45-48`.
- Tuiles **substrat** : `https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms?...&layers=eusm2025_subs_full&...` — `lib/map/bathymetry-layer.ts:50-53`.
- Les deux = **raster MapLibre direct navigateur**, `tileSize:256`, `minzoom:9`, **pas de `maxzoom`**, **pas de proxy, pas de cache**, attribution EMODnet CC-BY 4.0 (`:38-40`).
- Toggle/gating : `useBathyLayer` (`lib/map/useBathyLayer.ts`), activé `enabled: userTier === 'itinerant'` (`components/map/MapShell.tsx:242`), UI `components/map/MapLayerSelector.tsx:220-261`.
- Seul le **popup au clic** passe déjà par `app/api/seabed/route.ts` (gaté Itinérant, `unstable_cache` 30 j) — bon modèle à répliquer pour les tuiles.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-fond-marin/BRIEF.md`. WS A (proxy+fallback) puis WS B (cache+perf) ; WS C (self-host PMTiles) **seulement si je le dis**. **Ne push pas.** Décision produit ouverte (gating Local/Itinérant, self-host) → `⚠️ DEMANDER À JOHN`, tu t'arrêtes.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Route handler Next (proxy tuiles, `Cache-Control`, runtime) | **docs-researcher** → Context7 | Syntaxe Next 15.5 + cache CDN Vercel. |
| WMS EMODnet (paramètres GetMap, réponses d'erreur) | **docs-researcher** → web | Confirmer le format des `ServiceException` à intercepter. |
| QA couche (toggle, console avant/après, réseau, cache) | **qa-chrome** → Claude in Chrome | Prouver la disparition des erreurs + le cache hit. |
| Phase 2 self-host : R2 / PMTiles | **docs-researcher** + `scripts/bathy/README.md` | Pipeline déjà documenté, jamais câblé. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + anti-régression. |

---

## Objectif en une phrase
La couche « Fond marin » se charge **sans aucune erreur console** et **plus vite** (tuiles proxifiées + cachées + 512 + maxzoom), avec une **dégradation gracieuse** quand EMODnet flanche — rendu visuel et gating inchangés.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de |
|----|------|-------|-----------|
| A | Proxifier les tuiles + fallback gracieux (FIABILITÉ) | 1-1,5 j | — |
| B | Cache CDN + tileSize 512 + maxzoom (PERF) | 0,5 j | A |
| C | **Phase 2 option** : self-host PMTiles R2 (indépendance totale + offline) | 2-3 j | A |
| VERIF | revue finale | 0,5 j | A-B |

---

## WS A — Proxifier les tuiles raster + fallback gracieux (la fiabilité)

Aujourd'hui les GetMap partent **en direct** du navigateur → CORS instable (`Failed to fetch ... (0)`) et, quand EMODnet renvoie une `ServiceException` XML au lieu d'un PNG, MapLibre tente de la décoder → `The source image could not be decoded`. On route tout par notre domaine et on **neutralise les erreurs**.

> **Connecteurs** : docs-researcher (route handler + cache) ; qa-chrome (console avant/après).

### Tâches
1. Créer un route handler **`app/api/seabed/tiles/route.ts`** (param `?layer=depth|substrate` + bbox/width/height, ou segment `[layer]`) : fait le **GetMap server-side** vers l'endpoint EMODnet correspondant (`ows.emodnet-bathymetry.eu/wms` → `emodnet:mean` ; `ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms` → `eusm2025_subs_full`), avec **timeout court** (ex. 6 s) + **1 retry**.
2. **Fallback gracieux** : si EMODnet répond une erreur, un non-200, un `Content-Type` non-image, ou timeout → renvoyer une **tuile PNG transparente 1×1** (ou 256×256 vide) en `200`, **jamais** une erreur qui ferait planter MapLibre. → tue à la fois `Failed to fetch` ET `source image could not be decoded`.
3. **Whitelist stricte** : n'autoriser QUE les 2 couples endpoint+layer EMODnet ci-dessus, valider la bbox (EPSG:3857, dans l'emprise FR), ignorer toute autre URL → pas d'open proxy.
4. **Gating** : conserver le gating **Itinérant** au niveau du proxy (réutiliser `getUserTier()` comme `app/api/seabed/route.ts:20-25`). En profiter pour **centraliser** la constante de tier dans `lib/map/bathy-config.ts` (`BATHY_TIER`) — aujourd'hui `'itinerant'` est codé en dur à 3 endroits (`MapShell.tsx:242`, `route.ts:21`, `MapLayerSelector.tsx:84`).
5. Brancher les sources MapLibre sur le proxy : dans `lib/map/bathymetry-layer.ts` (`:45-53`), remplacer les URLs EMODnet directes par l'URL **du proxy** en gardant le token `{bbox-epsg-3857}`. Conserver l'attribution EMODnet.

### Critères d'acceptation
- qa-chrome (connecté Itinérant) : activer **Fond marin**, paner/zoomer sur plusieurs zones → **0 occurrence** de `Failed to fetch ows.emodnet-*` **et 0** `source image could not be decoded` dans la console.
- Les tuiles transitent par `carnet-de-peche.com/api/seabed/tiles/...` (vérif onglet réseau).
- Quand EMODnet est indisponible, la carte reste propre (tuiles vides), **pas d'erreur**.
- Rendu visuel identique à avant (profondeur + substrat) quand EMODnet répond.

### Garde-fous
- Proxy **whitelisté** (jamais relayer une URL arbitraire).
- Gating Itinérant préservé (un non-abonné ne doit pas obtenir les tuiles via le proxy).
- Ne pas casser le popup existant (`/api/seabed`) ni le bloc fiche spot.

---

## WS B — Cache CDN + tileSize 512 + maxzoom (la perf)

### Tâches
1. **Cache** sur le proxy WS A : `Cache-Control: public, s-maxage=2592000, stale-while-revalidate=86400` (les fonds marins ne bougent pas) → le CDN Vercel sert les tuiles, EMODnet n'est touché qu'une fois par tuile/période. (Le fallback transparent, lui, doit être **non caché** ou caché court — `s-maxage` faible — pour réessayer plus tard.)
2. **`tileSize` 256 → 512** (`bathymetry-layer.ts:78,98`) + `width=512&height=512` côté proxy → **÷4 le nombre de requêtes** par déplacement.
3. **`maxzoom`** sur les sources/layers raster (~13-14, résolution EMODnet ~115 m) → évite les requêtes/sur-échantillonnage inutiles au zoom rapproché (la heatmap borne déjà à `maxzoom:12`, `useCatchHeatmap.ts:61`).
4. Garder `minzoom:9` (anti « 8 s de chargement au large », commenté `:28-29`).

### Critères d'acceptation
- 2ᵉ visite d'une même zone = **cache hit** (header `age` / `x-vercel-cache: HIT`).
- Mesure qa-chrome : **moins de requêtes de tuiles** par pan/zoom à viewport égal (effet 512).
- Pas de bande floue excessive au zoom max (effet maxzoom). Aucune régression visuelle.

---

## WS C — Phase 2 (OPTIONNELLE, seulement si John le dit)

**Self-host des tuiles (PMTiles sur R2)** : câbler le pipeline déjà documenté (`scripts/bathy/README.md`, « non câblé en v1 »). On pré-tuile la bathy + le substrat une fois, on les sert depuis R2/CDN → **indépendance totale d'EMODnet** (plus de quota, plus d'instabilité runtime) + base pour le **mode hors-ligne** (Local/Itinérant). Variables d'env déjà prévues : `NEXT_PUBLIC_BATHY_DEPTH_TILES_URL` / `NEXT_PUBLIC_BATHY_SUBSTRATE_TILES_URL` (`bathymetry-layer.ts:55-60`).
- C'est la version « fiabilité maximale » de ce sprint. WS A+B suffisent pour tuer les erreurs et accélérer ; WS C supprime carrément la dépendance.

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` (tests + build + lint + types + revue croisée + anti-régression).
2. qa-chrome (connecté Itinérant) : toggle Fond marin → **console 100 % propre** (avant : 8 erreurs), tuiles via proxy, cache hit au 2ᵉ passage, opacité OK, toggle OFF retire la couche proprement. Simuler EMODnet down (bloquer le domaine) → carte reste propre.
3. **Anti-régression** : floutage GPS intact, gating des autres couches intact, **perf `/carte` non dégradée**, CSP report-only non cassée (les 2 domaines EMODnet ne sont plus appelés côté navigateur → vérifier `connect-src`/`img-src self`).
4. Livrer `docs/sprint-fond-marin/RECAP.md` : fait / comment tester / décision gating / reste manuel John.

## Décisions pour John (à trancher)
- **D1 — Tier de la couche** : Local (ce que `/tarifs` + `CLAUDE.md` §8 annoncent) ou Itinérant (ce que le code fait) ? À aligner pendant la centralisation `BATHY_TIER` (WS A.4). *(Incohérence connexe : le bloc « Fond & profondeur » de la fiche spot `app/(marketing)/spots/[slug]/page.tsx:614-641` est gratuit — à assumer comme teaser ou gater.)*
- **D2 — Self-host PMTiles R2 (WS C)** : maintenant ou plus tard ?

## Sources (référence)
- Bathymetry WMS : `ows.emodnet-bathymetry.eu/wms` (`emodnet:mean`) — `lib/map/bathymetry-layer.ts:45-48`.
- Seabed Habitats WMS : `ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms` (`eusm2025_subs_full`) — `:50-53`.
- Pipeline self-host documenté : `scripts/bathy/README.md`.

---

> **Invariants (rappel) :** pas de push sans validation de John · proxy whitelisté (pas d'open proxy) · gating Itinérant préservé sur le proxy · ne pas régresser floutage GPS / gating / perf carte · rendu visuel inchangé.
