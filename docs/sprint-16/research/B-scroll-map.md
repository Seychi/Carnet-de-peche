# Bloc B — Cartographie scroll / flash blanc

> READ-ONLY — aucun fichier applicatif modifié. Date : 2026-06-22.

---

## Fichiers clés lus

| Fichier | Rôle |
|---|---|
| `components/ui-v2/scroll-reveal.tsx` | Composant ScrollReveal — IntersectionObserver, armed/shown state |
| `app/(marketing)/page.tsx` | Home — 8 usages de ScrollReveal |
| `app/globals.css` | Tokens, animations, prefers-reduced-motion |
| `components/layout/AppShell.tsx` | Shell app — sticky wrapper header+instruments, TabBar |
| `components/layout/AppHeader.tsx` | Header blanc `bg-white`, sticky via parent |
| `components/layout/AppInstruments.tsx` | Bandeau instruments (`bg-navy-950`), sticky via parent |
| `components/ui-v2/instruments-bar.tsx` | Rendu InstrumentsBar |
| `components/layout/TabBar.tsx` | Tab bar `fixed inset-x-0 bottom-0 z-40 bg-white` |
| `app/(app)/layout.tsx` | AppLayout — passe AppHeader + AppInstruments à AppShell |

---

## Cause racine probable : deux mécanismes combinés

### 1. ScrollReveal déclenché trop tard → flash du fond de section

`scroll-reveal.tsx:36–47` :
```ts
{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
```

- `threshold: 0.12` = l'élément doit être **12 % visible** avant de démarrer la révélation.
- `rootMargin: '0px 0px -8% 0px'` = la zone de détection est **réduite de 8 %** en bas → le déclenchement est encore repoussé vers le bas.
- Au scroll rapide sur mobile, l'élément entre dans le viewport **avant** que le callback IO s'exécute (`requestIdleCallback`/microtask). Pendant ce délai, le `div` est en `opacity: 0 translate-y-4` sur fond `bg-white` ou `bg-sand-50` — ce fond nu est perçu comme un flash blanc.
- La garde `getBoundingClientRect().top < window.innerHeight * 0.9` (ligne 34) protège les éléments déjà visibles **au montage**, mais pas ceux qui entrent en scroll rapide.

**Sur mobile, l'IO callback peut arriver 100–300 ms après l'entrée dans le viewport** (thread principal chargé) → pendant ce temps, l'élément est invisible sur fond blanc = flash.

### 2. Repaint plein écran du bloc sticky header + bandeau

`AppShell.tsx:41–44` :
```tsx
<div className="sticky top-0 z-40">
  {header}
  {instruments}
</div>
```

- Le `<div sticky>` qui enveloppe header (`bg-white h-16`) et InstrumentsBar (`bg-navy-950 h-9`) n'a **aucune propriété de promotion de couche** (`transform`, `will-change`). Le navigateur peut le re-composite avec le contenu scrollant → repaint du fond blanc au scroll.
- `TabBar.tsx:52` : `fixed inset-x-0 bottom-0 z-40 bg-white` — idem, fond blanc sans layer isolation.
- Sur mobile Blink/WebKit, une `position: sticky` sans `transform: translateZ(0)` ou `will-change: transform` sur le conteneur **n'est pas toujours promu en couche GPU**. Lors du scroll, un repaint partiel du header sur le fond de page peut s'interpréter comme un flash blanc (~1 frame blanc entre deux positions de scroll).

### 3. Hydratation (contributeur secondaire)

- `ScrollReveal` est `'use client'`. Le SSR rend le contenu **visible** (ligne 9 du composant : « SSR rend le contenu VISIBLE »). Au montage React, si `getBoundingClientRect` retourne top > `innerHeight * 0.9`, `setArmed(true)` est appelé en `useEffect` → React re-rend le `div` avec `opacity-0 translate-y-4`. Ce re-rendu se produit en microtask après hydratation, provoquant un **éclair opacity 1 → 0** sur les éléments hors-fold. Ce n'est pas le flash principal (car la home est ISR / statique) mais contribue sur les pages app SSR.

---

## Plan de correctif précis

### Fix 1 — ScrollReveal : déclencher plus tôt (ou désactiver mobile)

**Fichier** : `components/ui-v2/scroll-reveal.tsx`

Option A — déclencher plus tôt (recommandée desktop + mobile) :
```ts
// Ligne 37–46 actuel :
{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' }

// Remplacer par :
{ threshold: 0.01, rootMargin: '0px 0px 80px 0px' }
// threshold=0.01 : déclenche dès le 1er pixel visible
// rootMargin positif en bas : déclenche AVANT que l'élément entre dans le viewport (80 px d'avance)
```

Option B — désactiver sous le breakpoint mobile (`--breakpoint-desk = 60rem = 960px`) :
```ts
// Après la garde prefers-reduced-motion (ligne 32), ajouter :
if (window.innerWidth < 960) return   // pas d'armed sur mobile → contenu toujours visible
```

Les deux options respectent `prefers-reduced-motion` (la garde ligne 32 reste intacte).

**⚠️ Note** : la garde ligne 34 (`top < innerHeight * 0.9`) protège les éléments au-dessus du fold mais pas la transition armed/unvisible → il faut aussi éviter le flash de désarmement. Ajouter `style={{ opacity: 1 }}` SSR-stable jusqu'au premier IO callback (ref `showDefault = true` avant `setArmed`) est l'approche la plus robuste, mais l'Option A / B suffisent pour le flash visible.

### Fix 2 — Couches fixes : isoler header sticky + TabBar

**Fichier** : `components/layout/AppShell.tsx` — ligne 41 :
```tsx
// Actuel :
<div className="sticky top-0 z-40">

// Remplacer par :
<div className="sticky top-0 z-40 will-change-transform">
// OU (plus léger — uniquement si le repaint est confirmé) :
<div className="sticky top-0 z-40" style={{ transform: 'translateZ(0)' }}>
```

**Fichier** : `components/layout/TabBar.tsx` — ligne 52 :
```tsx
// Actuel :
className="fixed inset-x-0 bottom-0 z-40 ... bg-white ..."

// Ajouter will-change-transform dans la className :
className="fixed inset-x-0 bottom-0 z-40 will-change-transform ... bg-white ..."
```

**Règle** : `will-change-transform` (ou `transform: translateZ(0)`) sur l'élément lui-même, pas sur des ancêtres globaux. **Ne pas mettre `will-change` sur `body` ou un wrapper global** — ça annule le bénéfice et consomme de la mémoire GPU inutilement.

### Fix 3 — globals.css : rien à changer

`globals.css` ne contient pas de règle `content-visibility` ni d'animation de fond qui causerait un flash. Les blocs `prefers-reduced-motion` existants (lignes 181, 272, 336) sont corrects et couvrent tous les cas. **Aucun changement nécessaire sur globals.css pour le Bloc B.**

---

## Chevauchements avec Bloc C et Bloc D

### globals.css (partagé avec Bloc C)

- Bloc C peut ajouter un skeleton « carte » — il s'appuiera sur `.animate-pulse` (ligne 338 : déjà gardé `prefers-reduced-motion`).
- **Séquence conseillée** : Bloc B ne touche **pas** globals.css → pas de conflit. Bloc C peut éditer globals.css librement en parallèle.

### AppInstruments.tsx (partagé avec Bloc D)

- Bloc D, point #3 : « fondu/affordance de scroll horizontal » sur le bandeau instruments → `components/layout/AppInstruments.tsx` + `components/ui-v2/instruments-bar.tsx`.
- Bloc B n'a **pas** besoin d'éditer AppInstruments.tsx (le sticky wrapper est dans AppShell.tsx).
- **Séquence** : Bloc B édite `AppShell.tsx` (wrapper sticky) ; Bloc D édite `AppInstruments.tsx` (contenu). Pas de conflit à condition que les deux n'éditent pas la même ligne du même fichier.
- **Vérifier avant de merger** : le `will-change-transform` sur le wrapper AppShell ne crée pas de stacking context qui cacherait le fondu de Bloc D (inspecter z-index si le fondu est absolu/pseudo).

### AppShell.tsx (Bloc B seul)

AppShell.tsx n'est touché que par Bloc B → pas de conflit.

### scroll-reveal.tsx (Bloc B seul)

scroll-reveal.tsx n'est touché que par Bloc B → pas de conflit.

### TabBar.tsx (Bloc B seul)

TabBar.tsx n'est touché que par Bloc B → pas de conflit.

---

## Résumé des fichiers à éditer (Bloc B uniquement)

| Fichier | Changement | Risque |
|---|---|---|
| `components/ui-v2/scroll-reveal.tsx:37-46` | `threshold 0.01 + rootMargin +80px` (ou désactivation mobile) | Faible — seulement OpacityIO |
| `components/layout/AppShell.tsx:41` | `will-change-transform` sur `div.sticky` | Faible — crée un stacking context : vérifier z-index overlay/modales |
| `components/layout/TabBar.tsx:52` | `will-change-transform` dans la className | Faible — idem z-index |

**globals.css** : pas de modification nécessaire pour Bloc B.
**AppInstruments.tsx** : pas de modification pour Bloc B (réservé Bloc D).

---

## Ordre des éditions recommandé (éviter les conflits de merge)

1. **Bloc B** : `scroll-reveal.tsx` → `AppShell.tsx` → `TabBar.tsx`
2. **Bloc C** : `globals.css` (skeleton) en parallèle, sans conflit
3. **Bloc D** : `AppInstruments.tsx` / `instruments-bar.tsx` après Bloc B mergé (vérifier stacking context)
