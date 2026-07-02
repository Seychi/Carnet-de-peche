# API Lock — MapLibre 5.24 · MapTiler · IntersectionObserver

> Verrouillé le 2026-06-22. Versions réelles du repo : `maplibre-gl@5.24.0` (package.json L37).
> Context7 documente v5.19.0 — API identique sur tous les points traités ci-dessous.

---

## 1. MapLibre GL JS 5.24 — préchauffage + resize au load

### 1.1 `prewarm()` — préchauffer les WebWorkers avant l'init de la Map

**Signature exacte** (fonction globale exportée) :
```ts
import { prewarm, clearPrewarmedResources } from 'maplibre-gl'
prewarm(): void
clearPrewarmedResources(): void
```

Initialise les WebWorkers partagés (tile parsing, etc.) avant que `new Map()` soit appelé.
À appeler dans un `useEffect` au montage du layout parent de la carte (par ex. `MapShell.tsx`) ou dans le `useEffect` de `MapView.tsx` juste avant `import('maplibre-gl')`.

**Piège** : `prewarm()` doit être appelé APRES `setWorkerUrl()` / `setWorkerCount()` si tu les utilises — sinon ces options n'ont aucun effet.

### 1.2 `map.resize()` — appel fiable au load

Le repo a déjà `scheduleReliableResize` dans `lib/map/resize.ts` (2 rAF successifs) + `resizeIfSized` (guard taille > 0). C'est la bonne approche.

**Ce qu'il faut NE PAS faire** : appeler `map.resize()` directement dans le handler `'load'` sans attendre que le conteneur flex soit dimensionné — c'est le bug BUG-06 déjà fermé.

**Pattern actuel correct** (`MapView.tsx:427`) :
```ts
map.on('load', () => {
  cancelResize?.()
  cancelResize = scheduleReliableResize(map, () => containerRef.current)
  // ...
})
```
Ne pas changer. Pour le Sprint 16, si la carte est dans une Sheet/Dialog qui s'ouvre après le mount, ajouter un appel `resizeIfSized(map, container)` dans le handler `onOpenChange` de la Sheet.

### 1.3 Préchauffer les tuiles autour du centre initial — via `transformRequest` + fetch manuel

MapLibre 5.x n'expose **pas** de méthode `prefetchTiles()` publique. La technique documentée est de déclencher des `fetch()` sur les URLs de tuiles calculées avant l'init de la map, en réutilisant le cache HTTP du navigateur.

**Pattern** :
```ts
// Avant new Map() — calcule les tuiles Z6 autour de la France entière
// pour qu'elles soient dans le cache HTTP quand MapLibre les demande.
function prefetchTilesAround(
  center: [number, number],
  zoom: number,
  maptilerKey: string,
) {
  const [lng, lat] = center
  // Convertit lat/lng en index de tuile XYZ
  const z = Math.floor(zoom)
  const x = Math.floor(((lng + 180) / 360) * 2 ** z)
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z,
  )
  // Prefetch la tuile centrale + 8 voisines (grille 3x3)
  const tiles: Array<[number, number, number]> = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      tiles.push([z, x + dx, y + dy])
    }
  }
  for (const [tz, tx, ty] of tiles) {
    // Style allégé mobile → pbf vector tiles
    fetch(
      `https://api.maptiler.com/tiles/v3/${tz}/${tx}/${ty}.pbf?key=${maptilerKey}`,
      { priority: 'low' } as RequestInit,
    ).catch(() => {/* silencieux : prefetch best-effort */})
  }
}
```

**Quand l'appeler** : dans le `useEffect` de `MapView.tsx`, juste avant `const init = async () => {…}`.

**Piège** : le prefetch ne sert que si la tuile est dans le cache HTTP (`Cache-Control` de MapTiler). Les tuiles MapTiler vector v3 ont `max-age=86400` — ça marche. Les tuiles raster ont souvent `no-cache` — inutile de les préfetcher.

---

## 2. MapTiler — URL de style allégé pour mobile

### 2.1 Pattern d'URL style allégé

MapTiler propose plusieurs styles. Pour mobile (réduction du nombre de layers et des glyphs chargés) :

```
// Style complet actuel (MapView.tsx:381)
https://api.maptiler.com/maps/streets-v2/style.json?key=KEY

// Styles alternatifs allégés (moins de POI, moins de labels)
https://api.maptiler.com/maps/basic-v2/style.json?key=KEY        // minimal, pas de POI
https://api.maptiler.com/maps/topo-v2/style.json?key=KEY         // topo, utile pêche
https://api.maptiler.com/maps/outdoor-v2/style.json?key=KEY      // outdoor (moins de bâtiments)
```

**Pattern conditionnel mobile** (à injecter dans `MapView.tsx`) :
```ts
const isMobile = typeof navigator !== 'undefined'
  && /Mobi|Android/i.test(navigator.userAgent)

const styleUrl = isMobile
  ? `https://api.maptiler.com/maps/basic-v2/style.json?key=${maptilerKey}`
  : `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`
```

**Options MapLibre complémentaires pour alléger le rendu mobile** à passer dans `new Map({...})` :
```ts
fadeDuration: 0,           // supprime le fade-in des labels (300ms par défaut) → moins de repaints
maxTileCacheSize: 20,      // réduit la RAM tile cache (défaut = auto, peut être > 100 sur desktop)
maxTileCacheZoomLevels: 3, // défaut = 5 → réduit le prefetch agressif des niveaux de zoom
renderWorldCopies: false,  // évite de rendre les copies du monde (inutile pour la France)
```

**Piège** : `fadeDuration: 0` supprime TOUS les fades de labels au load initial. Si le style a beaucoup de symbol layers (streets-v2), ça peut causer un flash de labels qui apparaissent tous d'un coup. Avec `basic-v2` (moins de symbols), c'est imperceptible.

---

## 3. IntersectionObserver — reveals plus tôt + prefers-reduced-motion

### 3.1 État actuel dans le repo

- `components/ui-v2/scroll-reveal.tsx:44` — `{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' }`
  - Effet : déclenche quand 12 % de l'élément est visible ET qu'il est encore 8 % avant le bas du viewport. Trop tardif pour des reveals fluides.
- `components/ui-v2/animated-counter.tsx:52` — `{ threshold: 0.5 }` — encore plus tardif.

### 3.2 `rootMargin` pour déclencher PLUS TÔT

`rootMargin` étend la zone de détection au-delà du viewport. Un `rootMargin` positif sur le bas signifie "commence à observer avant que l'élément atteigne le bas de l'écran".

```ts
// Déclenche 150 px AVANT que l'élément entre dans le viewport par le bas
{ threshold: 0, rootMargin: '0px 0px 150px 0px' }

// Déclenche quand l'élément est encore à 20 % de hauteur de viewport du bord bas
{ threshold: 0, rootMargin: '0px 0px 20% 0px' }
```

**Correction recommandée pour `scroll-reveal.tsx`** :
```ts
// Avant : { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
// Après (déclenche 120px avant le bord bas du viewport) :
{ threshold: 0, rootMargin: '0px 0px 120px 0px' }
```

**Correction recommandée pour `animated-counter.tsx`** :
```ts
// Avant : { threshold: 0.5 } — attend que 50 % soit visible
// Après :
{ threshold: 0.1, rootMargin: '0px 0px 80px 0px' }
```

### 3.3 Pattern canonique `prefers-reduced-motion`

La façon canonique est `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — c'est ce que fait déjà le repo (`scroll-reveal.tsx:32`, `animated-counter.tsx:31`). C'est correct.

**Ce qu'il ne faut PAS faire** : lire `prefers-reduced-motion` côté CSS uniquement (via `@media`) sans désactiver l'Observer JS — l'animation part quand même, elle est juste invisible.

**Pattern complet avec listener dynamique** (si l'utilisateur change la préférence en live) :
```ts
useEffect(() => {
  const el = ref.current
  if (!el) return

  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (mql.matches) return  // déjà réduit au montage → ne rien faire

  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        obs.disconnect()
      }
    },
    { threshold: 0, rootMargin: '0px 0px 120px 0px' },
  )
  obs.observe(el)

  // Optionnel : si l'utilisateur active "reduce" après le montage, stopper l'anim
  const onMotionChange = (e: MediaQueryListEvent) => {
    if (e.matches) { setShown(true); obs.disconnect() }
  }
  mql.addEventListener('change', onMotionChange)

  return () => {
    obs.disconnect()
    mql.removeEventListener('change', onMotionChange)
  }
}, [])
```

**Piège principal** : `rootMargin` en pixels absolus (ex. `120px`) est indépendant du zoom navigateur et préférable aux `%` qui sont relatifs à la taille du root container. Sur mobile en orientation paysage (viewport court), `120px` suffit ; les `%` peuvent devenir trop petits.

---

## Récap actionnable Sprint 16

| Item | Fichier cible | Action |
|---|---|---|
| `prewarm()` WebWorkers | `components/map/MapView.tsx` | Appel avant `const init = async` dans le `useEffect` |
| Prefetch tuiles 3x3 | `components/map/MapView.tsx` | Fonction `prefetchTilesAround()` avant `init()` |
| Style mobile allégé | `components/map/MapView.tsx:381` | URL conditionnelle `basic-v2` sur mobile |
| Options perf mobile | `components/map/MapView.tsx` new Map | `fadeDuration:0`, `maxTileCacheSize:20`, `renderWorldCopies:false` |
| `resize()` au load | `lib/map/resize.ts` + `MapView.tsx:427` | Déjà correct — ne pas changer |
| IO rootMargin scroll-reveal | `components/ui-v2/scroll-reveal.tsx:44` | `{ threshold: 0, rootMargin: '0px 0px 120px 0px' }` |
| IO rootMargin counter | `components/ui-v2/animated-counter.tsx:52` | `{ threshold: 0.1, rootMargin: '0px 0px 80px 0px' }` |
| prefers-reduced-motion | `scroll-reveal.tsx:32`, `animated-counter.tsx:31` | Pattern déjà correct ; ajouter listener dynamique si besoin |
