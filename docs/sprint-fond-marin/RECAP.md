# Sprint « Fond marin — Fiabilité & perf » — RECAP

> Exécuté le 2026-06-26 sur la branche `sprint-fond-marin` (depuis `main`). **Non poussé.**
> Mode ultracode : fan-out recherche (route binaire+cache / erreurs WMS / carte code) → implémentation boucle principale → 2 revues indépendantes.
> Périmètre : **WS A (proxy + fallback)** + **WS B (cache + perf)**. **WS C (self-host PMTiles) NON fait** (sur ta demande : « seulement si je le dis »).

## TL;DR

Les tuiles raster « Fond marin » ne partent **plus en direct** du navigateur vers EMODnet : elles passent par un **proxy server-side** (`/api/seabed/tiles`) qui neutralise les erreurs (tuile transparente, jamais une erreur) et **cache au CDN**. Résultat visé : **0 erreur console**, plus rapide, indépendant des aléas EMODnet — **rendu visuel inchangé**.

**Gate VERIF** : `tsc` 0 · `next lint` 0 · **Vitest 568/568** (+14) · `next build` OK · revue sécurité/anti-régression **GO (6/6)** · revue correction **0 bloquant** (2 retouches mineures appliquées).

---

## Décisions (toi)

- **D1 — Tier de la couche = Local** (aligné `/tarifs` + CLAUDE.md §8). La bathy est désormais accessible **Local ET Itinérant** (avant : Itinérant seul, ce qui contredisait `/tarifs`). Centralisé dans `lib/map/bathy-config.ts` (`hasBathyAccess`). **`/tarifs` + CLAUDE.md §8 annonçaient déjà Local → aucune doc à corriger.** Le **popup au clic** (`/api/seabed`) passe lui aussi Local (cohérence).
- **D2 — Bloc « Fond & profondeur » fiche spot = gratuit (teaser)** → **non touché**.
- **Proxy public vs gating strict** : tu as choisi **proxy public + cache CDN plein**. Les tuiles EMODnet sont des **données publiques** (CC-BY 4.0, WMS ouvert) ; le cache CDN partagé (but de WS B) est incompatible de façon fiable avec une vérif de tier par cookie. Le gating produit reste sur le **toggle UI** (Local+) et le **popup** (gaté Local). Whitelist EMODnet stricte = **pas d'open proxy**.

---

## WS A — Proxifier + fallback gracieux ✅

- **Nouveau** `app/api/seabed/tiles/route.ts` (route PUBLIQUE) : GetMap WMS server-side vers EMODnet, **timeout 6 s + 1 retry**, détection robuste d'erreur (`!res.ok || content-type ne commence pas par image/` → couvre la **ServiceException EMODnet renvoyée en HTTP 200 + XML**), **fallback PNG 1×1 transparent** en 200 (tue à la fois `Failed to fetch` ET `source image could not be decoded`).
- **Nouveau** `lib/map/seabed-tiles.ts` (logique PURE, testable) : whitelist stricte des **2 seuls** couples endpoint+layer EMODnet, **validation bbox** (4 nombres finis, non inversée, intersectant l'emprise FR EPSG:3857), build URL WMS 1.3.0 (CRS, STYLES vide). **Anti open-proxy** : impossible de lui faire requêter un host/URL arbitraire (testé : `GetCapabilities`, `#@evil.com`, path traversal, bbox hors-zone → tous rejetés → tuile transparente).
- **Nouveau** `lib/map/bathy-config.ts` : `BATHY_TIER='local'` + `hasBathyAccess(tier)` — remplace les **3** `'itinerant'` codés en dur (MapShell, MapLayerSelector, route popup).
- **Rewire** `lib/map/bathymetry-layer.ts` : les 2 sources MapLibre pointent vers le proxy (`/api/seabed/tiles?layer=depth|substrate&...&bbox={bbox-epsg-3857}`). Le navigateur ne tape plus EMODnet en direct. La surcharge env (`NEXT_PUBLIC_BATHY_*_TILES_URL`, pour le self-host WS C plus tard) est conservée.
- Gating UI : `MapShell.tsx` (`enabled: hasBathyAccess(userTier)`) + `MapLayerSelector.tsx` (nouvelle var `canUseBathy` **distincte** de `isItinerant` → la couche **Qualité** reste gatée Itinérant au clic, **non régressée**) + copy upsell « Local · … ».

## WS B — Cache CDN + perf ✅

- **Cache CDN** sur le proxy (succès) : `CDN-Cache-Control: public, s-maxage=2592000, stale-while-revalidate=86400` (directive CDN-only ; le client ne garde rien). Le **fallback transparent** est en `Cache-Control: no-store` (jamais figer un trou de données 30 j → on retente vite). Route publique sans cookie → cacheable de façon fiable.
- **`tileSize` 256 → 512** (sources) + `width=512&height=512` côté proxy → **÷4 le nombre de requêtes** par déplacement.
- **`maxzoom: 13`** sur les **sources** (overzoom au-delà ; EMODnet ~115 m → inutile de sur-échantillonner). Posé sur la source (≠ layer maxzoom, qui masquerait). `minzoom: 9` conservé.

## Tests ajoutés (+14)

- `lib/map/__tests__/seabed-tiles.test.ts` (11) : whitelist layer, validation bbox FR (Atlantique + Méditerranée + rejet hors-zone/malformée/inversée), build WMS 1.3.0, **rejet open-proxy**.
- `lib/map/__tests__/bathy-config.test.ts` (3) : gating Local+Itinérant = accès, Découverte/anonyme = refus.

---

## Comment tester (qa-chrome, connecté Local ou Itinérant)

1. Activer **Fond marin** sur `/carte`, paner/zoomer plusieurs zones → **0 occurrence** de `Failed to fetch ows.emodnet-*` **et 0** `source image could not be decoded` dans la console (avant : ~8 erreurs).
2. Onglet réseau : les tuiles transitent par `…/api/seabed/tiles?layer=…` (plus aucun appel direct à `ows.emodnet-*`).
3. **Cache** : 2ᵉ visite d'une même zone → header `age` / `x-vercel-cache: HIT` sur les tuiles. ⚠️ **À confirmer en prod/preview** (le CDN-Cache-Control doit être honoré par Vercel — c'est le point à valider en QA).
4. **EMODnet down** (bloquer les 2 domaines dans l'onglet réseau) → la carte reste **propre** (tuiles transparentes), aucune erreur.
5. Gratuit/Discovery : le toggle Fond marin affiche **« Débloquer »** (pas le switch).

---

## VERIF — anti-régression (2 agents indépendants, GO)

- **Floutage GPS intact** : 0 fichier DB/RLS/geom/blur touché (le sprint = carte/bathy + 1 route).
- **Anti open-proxy** : host EMODnet fixe + whitelist layer + bbox FR validée + ré-encodage `URLSearchParams` (un `&` dans bbox n'injecte pas de param WMS). Tentatives d'injection testées → toutes rejetées.
- **Gating cohérent** : Fond marin → Local+ (intentionnel) partout ; **Qualité** (Itinérant au clic) et **Score** (Local/isPaid) **non régressés**.
- **CSP (sprint 35, report-only)** : `next.config.ts` **non modifié** — les 2 domaines EMODnet ne sont plus appelés côté navigateur (proxy same-origin), donc les violations report-only EMODnet **disparaissent** ; aucune entrée connect-src/img-src à ajouter.
- **Perf `/carte` non dégradée** : lazy-load préservé (rien chargé tant que toggle OFF) ; tileSize 512 + maxzoom **réduisent** les requêtes.

---

## Reste manuel John

- Relire le diff, **merge `sprint-fond-marin` → `main`** + déploiement (auto Vercel) — quand tu veux.
- **QA prod (qa-chrome)** : les 5 points ci-dessus, en insistant sur le **cache HIT** (point 3) — c'est le seul élément non vérifiable hors prod.
- **WS C (self-host PMTiles R2)** : à lancer plus tard si tu veux l'indépendance totale + l'offline. Les vars d'env (`NEXT_PUBLIC_BATHY_*_TILES_URL`) sont déjà prêtes pour basculer sans toucher au code.
- Compromis assumé (documenté) : le cache CDN des tuiles est **public** (donnée EMODnet open-data) — un anonyme qui forge une URL de tuile récupère une donnée publique, pas une donnée privée. Le gating produit reste sur l'UI + le popup.

## Fichiers

Nouveaux : `app/api/seabed/tiles/route.ts`, `lib/map/seabed-tiles.ts`, `lib/map/bathy-config.ts`, 2 tests.
Modifiés : `lib/map/bathymetry-layer.ts`, `lib/map/useBathyLayer.ts`, `components/map/MapShell.tsx`, `components/map/MapLayerSelector.tsx`, `app/api/seabed/route.ts`.
