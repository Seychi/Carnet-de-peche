# Bloc D — Cartographie bugs mobile (Sprint 16)

> READ-ONLY. Aucune modification applicative. Cible 390 px sauf #6 (360 px).
> Date : 2026-06-22. Branche HEAD : sprint-14-home (3a67636).

---

## Bug #1 — Image vide dans le fil (PostGallery + catchPhotoUrl)

### Chemins concernés

- `components/feed/PostCard.tsx` — `PostGallery` (l.393-425) + `CatchEmbed` (l.427-485)
- `lib/feed/media.ts` — `attachPostMedia` (l.17-57)
- `app/actions/feed.ts` — `getFeedPage` l.636-707 (appel à `attachPostMedia`)

### Diagnostic

**PostGallery** (`PostCard.tsx` l.413-414) :

```tsx
<img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="size-full object-cover" />
```

L'`<img>` n'a ni `onError` ni skeleton. Si l'URL signée est expirée ou `undefined`
filtrée en amont, le navigateur affiche une image cassée ou un espace vide (le
`bg-sand-100` du bouton parent est le seul fallback visuel).

**CatchEmbed** (`PostCard.tsx` l.443-445) :

```tsx
<img src={photoUrl} alt={species} className="max-h-72 w-full object-cover" />
```

Même absence d'`onError`. Si `catchPhotoUrl` est non-null mais invalide (URL signée
révoquée en 1 h), le `<div relative>` garde sa hauteur mais affiche un brisé.

**Cause racine — `attachPostMedia`** (`lib/feed/media.ts` l.53-56) :

```ts
photoUrls: (p.photo_paths ?? [])
  .map((path) => photoSigned.get(path))
  .filter((u): u is string => Boolean(u)),
```

`createSignedUrls` peut retourner un objet partiel si un path n'existe pas en
Storage (fichier orphelin, suppression manuelle). Dans ce cas `photoSigned` n'a
pas le path → il est filtré → `photoUrls` est plus court que `photo_paths`. Le
composant ne sait pas que l'URL manque, il reçoit juste moins d'images. En
revanche si la clé est présente mais que l'URL est déjà expirée côté CDN (cache
aggressif), l'URL est présente mais retourne 403 au navigateur.

Pour `catchPhotoUrl` (bucket `catches`) : même mécanique, `catchSigned.get` peut
retourner `undefined` → `catchPhotoUrl: null` → `CatchEmbed` n'affiche pas de
photo (comportement correct). Le vrai bug se produit quand l'URL est signée mais
expirée côté client (TTL 3 600 s, post resté ouvert longtemps).

### Correctif

**a) PostGallery — skeleton + masquage erreur** (`PostCard.tsx` l.413-414)

Avant :
```tsx
<img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="size-full object-cover" />
```

Après (state `errored` par index sur le composant parent ou inline `onError`) :
```tsx
<img
  src={url}
  alt={`Photo ${i + 1}`}
  loading="lazy"
  className="size-full object-cover"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
/>
```
Ou mieux : ajouter un état `Set<number>` `failedIdx` dans `PostGallery`, masquer la
tuile si `failedIdx.has(i)` (évite l'espace vide résiduel du bouton `bg-sand-100`).

**b) CatchEmbed** (`PostCard.tsx` l.443) — même `onError` → fallback sur le bloc
sans photo (encart navy compact).

**c) `attachPostMedia`** (`lib/feed/media.ts`) — pas de modification urgente ;
le filtrage actuel est correct. Enrichir éventuellement les logs côté serveur si
`data.length < paths.length` pour détecter les orphelins Storage.

**Chevauchement Bloc A** : Bloc A traite la galerie lightbox et la composition
photo du composer — ne pas modifier `PostGallery` en conflit avec les changements
Bloc A sur `PhotoGalleryLightbox`.

---

## Bug #2 — Filtres /spots pleine largeur mobile

### Chemin

`app/(marketing)/spots/spot-filters.tsx` l.57

### Diagnostic

```tsx
<div className="flex flex-col sm:flex-row gap-3 flex-wrap">
```

En mobile (< `sm` = < 640 px), `flex-col` empile correctement les deux blocs.
**Le bug est dans le `<select>` département** (l.59-68) : aucune contrainte de
largeur → il prend `100%` de son bloc flex-col, correct. MAIS sur 390 px le `<select>`
natif a un padding `px-4 py-2.5` et son texte peut déborder si le label du
département est long (« 64 — Pyrénées-Atlantiques »).

Le **vrai problème pleine largeur** est que le bloc de chips espèces (l.71-86) avec
`flex flex-wrap gap-2` est correctement wrappant, mais l'ensemble
`<div className="flex flex-col sm:flex-row gap-3 flex-wrap">` n'a pas de
`w-full` explicite ni de `max-w` → sur des layouts parent qui ne forcent pas
`width:100%` il peut s'étaler.

Aussi : le `<select>` n'a pas `w-full` → sur iOS Safari, un `<select>` dans un
flex-col sans `w-full` peut ne pas s'étirer.

### Correctif

`app/(marketing)/spots/spot-filters.tsx` l.59 et l.62 :

Avant :
```tsx
<div className="flex flex-col sm:flex-row gap-3 flex-wrap">
  <select
    ...
    className="px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
```

Après :
```tsx
<div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
  <select
    ...
    className="w-full px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent sm:w-auto"
```

`w-full` sur le wrapper + `w-full sm:w-auto` sur le select → pleine largeur mobile,
taille naturelle desktop.

---

## Bug #3 — Bandeau instruments : fondu/affordance scroll horizontal

### Chemins

- `components/ui-v2/instruments-bar.tsx` (l.51) — rendu du bandeau
- `components/layout/AppInstruments.tsx` — Server Component wrapper (l.53-115)

### Diagnostic

`InstrumentsBar` (`instruments-bar.tsx` l.51) :

```tsx
<div className="mx-auto flex h-9 max-w-[1180px] items-center gap-4 overflow-x-auto px-4 whitespace-nowrap sm:gap-7 sm:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
```

- `overflow-x-auto` + scrollbar masquée : le scroll fonctionne mais **aucun
  indicateur visuel** (pas de dégradé de fondu sur le bord droit).
- Sur 390 px avec toutes les données (PM · BM · MARÉE ▲ · VENT · HOULE · TON CRÉNEAU)
  le contenu peut dépasser 390 px → le bord droit est tronqué net sans affordance.

**`AppInstruments.tsx`** est un Server Component pur, il ne rend que `<InstrumentsBar />` ;
le fix se fait dans `InstrumentsBar`.

### Correctif

`components/ui-v2/instruments-bar.tsx` l.43-52 :

Ajouter un wrapper `relative` avec `after:` pseudo-élément dégradé droit :

Avant (l.44-52) :
```tsx
<div
  data-slot="instruments-bar"
  className={cn(
    'bg-navy-950 font-mono text-[11px] tracking-[0.05em] text-white sm:text-[12px]',
    className,
  )}
>
  <div className="mx-auto flex h-9 max-w-[1180px] items-center gap-4 overflow-x-auto px-4 whitespace-nowrap sm:gap-7 sm:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
```

Après :
```tsx
<div
  data-slot="instruments-bar"
  className={cn(
    'relative bg-navy-950 font-mono text-[11px] tracking-[0.05em] text-white sm:text-[12px]',
    className,
  )}
>
  {/* Fondu droit = affordance scroll sur mobile */}
  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-navy-950 to-transparent sm:hidden" aria-hidden="true" />
  <div className="mx-auto flex h-9 max-w-[1180px] items-center gap-4 overflow-x-auto px-4 whitespace-nowrap sm:gap-7 sm:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
```

Le gradient `from-navy-950` sur `w-8` couvre les 32 px de droite sans intercepter
les events (`pointer-events-none`). Caché sur sm+ (`sm:hidden`) car le bandeau y
est rarement scrollable.

**Chevauchement Bloc B** : Bloc B porte sur `AppInstruments` (bandeau instruments
global). Ce correctif touche `InstrumentsBar` (le composant rendu), cohérent avec
Bloc B mais limité à l'affordance visuelle, pas au contenu des données.

---

## Bug #4 — Header « Nouvelle prise » contraste clair sur navy

### Chemins

- `app/(app)/carnet/nouvelle/page.tsx` l.48-59 — header `bg-navy-950 text-white`
- `components/catches/CatchForm.tsx` — PAS de header propre ; le header est dans la page

### Diagnostic

`nouvelle/page.tsx` l.48-59 :

```tsx
<header className="sticky top-0 z-40 bg-navy-950 text-white">
  <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
    <h1 className="font-display text-[17px] font-semibold">Nouvelle prise</h1>
    <Link
      href="/carnet"
      aria-label="Fermer et revenir au carnet"
      className="flex size-11 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      <X size={20} />
    </Link>
  </div>
</header>
```

`bg-navy-950` (#04141C) + `text-white` : ratio WCAG ≈ 18:1 → pas de problème de
contraste ici. **Le bug signalé est probablement le bouton X** : `text-white/60` =
blanc à 60 % d'opacité sur navy-950, ratio ≈ 7:1 (AA ok mais perceptivement faible
sur mobile en plein soleil).

Autre hypothèse : sur iOS Safari avec Dark Mode forcé, `bg-navy-950` peut être
remplacé par la couleur système si l'app n'a pas `color-scheme: only light` —
le fond devient blanc et le titre blanc disparaît.

### Correctif

**a) Bouton X** — `nouvelle/page.tsx` l.53 :

Avant : `className="... text-white/60 ..."`
Après : `className="... text-white/80 ..."` (ratio ≈ 12:1, AA large)

**b) Protéger contre Dark Mode iOS** — dans `<header>` ajouter `style={{ colorScheme: 'dark' }}` ou s'assurer que `<meta name="color-scheme" content="only light">` est présent dans le layout root. À vérifier dans `app/layout.tsx`.

Note : si le brief vise un vrai fond clair (sand-50) sur le header de la page
« Nouvelle prise », c'est un changement de design intentionnel, pas un correctif
de contraste — à clarifier avec John avant de toucher `bg-navy-950`.

---

## Bug #5 — Checkboxes/radios teal (accent-color)

### Chemin

`app/(app)/profil/profile-form.tsx` l.218 et l.257

### Diagnostic

Checkboxes (l.218) :
```tsx
className="w-4 h-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500"
```

Radios (l.257) :
```tsx
className="w-4 h-4 border-ink-300 text-teal-600 focus:ring-teal-500"
```

`text-teal-600` sur un `<input type="checkbox">` ou `<input type="radio">` **ne
fait rien** : Tailwind l'utilise pour shadcn Radix (checkbox custom), mais sur un
input HTML natif c'est la propriété CSS `accent-color` qui contrôle la couleur.
Sans `accent-color`, iOS/Android affichent la couleur système (bleu iOS, vert
Android) au lieu du teal de la charte.

### Correctif

`app/(app)/profil/profile-form.tsx` l.218 et l.257 :

Avant (checkbox) :
```tsx
className="w-4 h-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500"
```

Après :
```tsx
className="w-4 h-4 rounded border-ink-300 accent-teal-600 focus:ring-teal-500"
```

Avant (radio) :
```tsx
className="w-4 h-4 border-ink-300 text-teal-600 focus:ring-teal-500"
```

Après :
```tsx
className="w-4 h-4 border-ink-300 accent-teal-600 focus:ring-teal-500"
```

`accent-teal-600` est supporté par Tailwind v4 (propriété `accent-color`). Vérifier
que le token `teal-600` est défini dans `app/globals.css` (@theme) — il l'est
(`teal-300` est nommé dans la charte ; `teal-500`/`teal-600` à confirmer).

---

## Bug #6 — Onglets du fil débordent ≤ 360 px

### Chemin

`components/feed/FeedTabs.tsx` l.17-38

### Diagnostic

```tsx
<nav className="flex gap-1 border-b border-ink-100 overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  {TABS.map((t) => (
    <Link
      ...
      className={`whitespace-nowrap min-h-11 flex items-center px-2.5 sm:px-3 text-[13px] sm:text-[14px] font-semibold border-b-2 -mb-px transition-colors ...`}
    >
      {t.label}
    </Link>
  ))}
</nav>
```

Les trois labels sont :
- « Ton département » ≈ 120 px
- « Tes follows » ≈ 78 px
- « Tous les départements côtiers » ≈ 196 px

Total ≈ 394 px + `gap-1` (2 × 4 px) + `px-2.5` (2 × 10 px × 3) = ≈ 464 px.

Sur 360 px : débordement de ~104 px. `overflow-x-auto` + `whitespace-nowrap`
permettent le scroll mais **sans affordance**. Sur 390 px, le troisième onglet est
partiellement visible (~196 - (464-390) = ~122 px visible), ce qui est encore
acceptable mais le `pr-4` (16 px) ne suffit pas comme indicateur.

Sur 360 px le premier onglet lui-même commence à gauche sans padding-start → le
bord du texte « Ton » peut toucher le bord de l'écran.

### Correctif

`components/feed/FeedTabs.tsx` l.17 et l.27 :

**a) Réduire le padding des onglets sur très petit écran** :

Avant l.27 :
```tsx
className={`whitespace-nowrap min-h-11 flex items-center px-2.5 sm:px-3 text-[13px] sm:text-[14px] ...`}
```

Après :
```tsx
className={`whitespace-nowrap min-h-11 flex items-center px-2 xs:px-2.5 sm:px-3 text-[12px] xs:text-[13px] sm:text-[14px] ...`}
```

Nécessite le breakpoint `xs` (375 px) dans `tailwind.config` ou `globals.css`. Si
non disponible : garder `text-[12px]` fixe sur mobile (pas de responsive) et
`px-2`.

**b) Affordance scroll** (même mécanique que #3) — ajouter sur le `<nav>` :

Avant l.17 :
```tsx
<nav className="flex gap-1 border-b border-ink-100 overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
```

Après (wrapper relatif + fondu) :
```tsx
<div className="relative border-b border-ink-100">
  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
  <nav className="flex gap-1 overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
```

Supprimer `border-b` du `<nav>` (porté par le wrapper). `from-white` car le fond
du fil est blanc.

---

## Bug #7 — Titres de section formulaires : échelle réduite mobile

### Chemin

`components/catches/CatchForm.tsx` — composant `SectionTitle` l.952-965

### Diagnostic

```tsx
function SectionTitle({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
      {children}
      {required && <span className="text-coral-500 ml-0.5">*</span>}
    </p>
  )
}
```

`text-[11px]` fixe, monospace, uppercase + tracking élevé. Sur 390 px ce style
passe (c'est la DA v2 : les labels de section sont intentionnellement discrets).

**Le vrai problème signalé** est probablement que `text-[11px]` est illisible sur
un écran 360 px avec une densité de pixels faible (DPR 2 × = 22 px CSS), surtout
sur Android mid-range. La taille CSS minimale lisible est 12 px selon WCAG 2.1
(AA pour le texte décoratif).

Secondairement : dans `profile-form.tsx`, les titres de section (`h2`) sont :

```tsx
<h2 className="font-semibold text-navy-900">Informations</h2>
<h2 className="font-semibold text-navy-900">Ta pratique</h2>
```

Sans taille fixe → héritent du `text-sm` (14 px) du form. Cohérent mais pas
explicitement mobile-scaled.

### Correctif

**a) `SectionTitle` dans `CatchForm.tsx` l.960** :

Avant :
```tsx
<p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
```

Après :
```tsx
<p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 sm:text-[12px]">
```

`11.5px` est un compromis DA v2 (reste discret) + lisibilité 360 px. Tailwind v4
accepte les fractions en px dans les classes arbitraires.

**b) `profile-form.tsx` l.136 et l.204** : les `<h2>` sont déjà à `text-sm`
(14 px), ce qui est suffisant. Pas de changement requis.

---

## Tableau récapitulatif

| # | Fichier principal | Ligne(s) clé | Type de fix | Bloc overlap |
|---|---|---|---|---|
| 1 | `components/feed/PostCard.tsx` | 414, 443 | `onError` img + fallback state | Bloc A (lightbox) |
| 1b | `lib/feed/media.ts` | 53-56 | Log orphelins (non bloquant) | — |
| 2 | `app/(marketing)/spots/spot-filters.tsx` | 57, 62 | `w-full` wrapper + select mobile | — |
| 3 | `components/ui-v2/instruments-bar.tsx` | 44-52 | Dégradé fondu droit `sm:hidden` | Bloc B |
| 4 | `app/(app)/carnet/nouvelle/page.tsx` | 53 | `text-white/80` + color-scheme | — |
| 5 | `app/(app)/profil/profile-form.tsx` | 218, 257 | `accent-teal-600` (CSS accent-color) | — |
| 6 | `components/feed/FeedTabs.tsx` | 17, 27 | Wrapper + fondu + `px-2` à 360 px | — |
| 7 | `components/catches/CatchForm.tsx` | 960 | `text-[11.5px]` SectionTitle | — |

## Chemins validés (existent bien dans HEAD)

Tous les chemins du brief correspondent au code réel. Aucun chemin obsolète détecté.

- `app/(marketing)/spots/spot-filters.tsx` ✓ (non `app/(app)/spots/…`)
- `components/layout/AppInstruments.tsx` ✓ (Server Component, rend `InstrumentsBar`)
- `components/ui-v2/instruments-bar.tsx` ✓ (fichier séparé du layout)
- `lib/feed/media.ts` ✓ (à distinguer de `lib/catches/media.ts` qui gère le profil)

## Note `lib/catches/media.ts` vs `lib/feed/media.ts`

Le brief liste `lib/catches/media.ts` comme nouveau fichier (`??` dans git status).
Ce fichier gère les photos du profil public (grille catches), pas les photos du fil.
Pour le bug #1 (photos du fil), le fichier pertinent est `lib/feed/media.ts`.
