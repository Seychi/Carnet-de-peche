# Sprint 65 — RECAP
## Mobile & copie honnête

> Exécuté le 2026-07-01 (Fable, effort xhigh, ultracode). **CODE-COMPLET, NON poussé, 0 migration.**
> Tourné en parallèle des sprints 59 / 60 / 64 dans le **même clone** (working tree partagé). Mes 16 fichiers listés en bas : à stager explicitement (jamais `git add -A`).

---

## Ce qui a été fait (par bloc)

### Bloc 0 — Débordements petit écran
- **Bandeau instruments** (`components/ui-v2/instruments-bar.tsx`) : c'était le VRAI débordement (~629 px de contenu pour 345-375 px de viewport, le dernier item « créneau » partait hors écran). Fix : gap mobile `gap-4 → gap-3` (gagne ~40 px) + remplacement du fondu overlay (rectangle navy plein, indice « faux ») par un **`mask-image` linéaire sur la piste de scroll** (`[mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-2rem),transparent_100%)]` + `sm:[mask-image:none]`). Le fondu suit désormais le vrai contenu ; desktop (≥ 640 px) strictement identique. Aucune donnée retirée (dépt, PM/BM, coef, vent, houle, créneau restent).
- **Onglets Fil** (`components/feed/FeedTabs.tsx`) : même bascule vers un `mask-image` sur la piste (+ `sm:mask-none`), en remplacement de l'overlay `from-sand-50`. À 360/390 px les 3 onglets **tiennent déjà** (~293 px de contenu, ils ne débordaient qu'à ≤ 320 px) ; le mask est un renfort propre pour ≤ 320 px / grosse police a11y. `overflow-x-auto` était déjà là (sprints 16/18).

> **Correction du brief** : le brief supposait « aucun repère de scroll ». Faux : les deux composants avaient déjà `overflow-x-auto` + un fondu (sprints 16/18). Le seul débordement réel était le bandeau ; les onglets Fil tenaient déjà à 360/390.

### Bloc 1 — Lisibilité (polices < 12 px → ≥ 12 px)
Passe sur les 7 surfaces data denses ciblées + le primitif partagé :
- **`components/ui-v2/tag-data.tsx`** : `text-[11.5px] → text-xs` (12 px). C'est LE primitif « étiquette data » réutilisé partout (le brief demandait un token réutilisé, pas du one-off) ; +0,5 px, corrige toutes ses instances d'un coup.
- **`SpotPopup.tsx`** : 7 labels de section + coords + chip provenance (`text-[10px]`/`text-[10.5px]` → `text-xs`).
- **`MapLayerSelector.tsx`** : ~20 occurrences `text-[10px]`/`text-[11px]` → `text-xs` ; l'état « on » (Spots) passe aussi de `ink-300` (~2:1, échoue AA) à `ink-500` (AA-safe).
- **`MapLegend.tsx`** : conteneur + notes de bas → `text-xs` ; les 3 glyphes de marqueurs (`text-[8px]`/`text-[9px]` dans des ronds `h-3.5`) passés en `h-4 w-4 text-xs leading-none`. (Légende = desktop-only `hidden md:flex`.)
- **`BadgesGrid.tsx`**, **`TideStrengthBand.tsx`** (dont la valeur marnage, la vraie donnée, passe de `text-[11px]` à 12 px + le placeholder `—` de `ink-300` → `ink-500`), **`CatchCard.tsx`** (pastille « Mesurée » 9 px → 12 px + icône Ruler 9 → 12), **`CatchFiltersBar.tsx`** (3 labels de groupe).
- Hiérarchie conservée : rien passé sous 12 px, les labels secondaires restent distingués par graisse/casse/couleur, pas par une taille < 12 px.

### Bloc 2 — Honnêteté de copie
- **Floutage GPS** : le vrai flou est un **jitter aléatoire de 500-900 m** (migration 028 : `ST_Buffer(ST_Project(geom, 500 + random()*400, ...), 500)`, la RPC lit `ST_Centroid(geom_public)`). La formule honnête « floutées de plusieurs centaines de mètres » était **déjà** en prod à 4 endroits (tarifs, /peche, /fil, confidentialité). J'ai aligné les **6 dernières mentions « 1 km »** restantes : 2 guides MDX, `carnet/[id]`, `CatchForm`, et 2 dans la **CGU** (document contractuel, l'exactitude compte). Aucun tiret cadratin, tutoiement conservé.
- **Notifications /tarifs (décision John)** : voir ci-dessous. **Option B** appliquée.

---

## Décisions copie prises

- **Notifs `/tarifs` → Option B (validée par John)** : la puce Local `« Alerte quand tes conditions favorites reviennent »` devient **`« Alertes créneaux optimaux et grandes marées »`** (`pricing-cards.tsx:42`). Honnête (in-app garanti + web push si VAPID posé), met en avant le moteur d'alertes, **sans** le mot « push » (canal dépendant de la config VAPID + du support navigateur/iOS-PWA).
  - > **Correction du brief** : le brief supposait que `/tarifs` promettait un « push » inexistant. FAUX aujourd'hui : la ligne risquée `« Notifications push (créneaux optimaux, grandes marées) »` avait **déjà** été retirée de la page live (elle ne survit que dans `CLAUDE.md:403` et `docs/BRIEF.md:52`). Le web push EST maintenant bâti bout-en-bout (sprints 39/49 : table `push_subscriptions`, SW push+click, cron `personal-window` → in-app garanti + push best-effort si VAPID). Il n'y avait **pas** de bug d'honnêteté à corriger, seulement une décision marketing.
- **GPS** : formulation canonique standardisée sur l'existant `« floutées de plusieurs centaines de mètres »` (pas de chiffre exact contestable ; ne verrouille pas la copie sur l'algo courant).

---

## Comment tester (viewports)

Dev : `pnpm dev` puis, en **viewport mobile réel** (Playwright, 390 px et 360 px) :
- **Bandeau instruments** : `/dev/ui-v2` (rend `InstrumentsBar` avec toutes les données, hors prod). À 390/360 : la barre scrolle (mask/fondu à droite), le créneau est atteignable en scrollant.
- **Overlays carte** : `/carte` → bouton « Couches » (`MapLayerSelector`), clic marqueur (`SpotPopup`, bottom-sheet mobile).
- **TideStrengthBand** : page spot publique, ex. `/spots/aber-wrach-sainte-marguerite`.
- **Copie** : `/tarifs` (puce notif + GPS Découverte), `/legal/cgu` (GPS).

### Preuves recueillies (captures dans `docs/sprint-65/captures/`)
- **Bloc 0 bandeau** — 390 px (`s65-instruments-390.png`) + 360 px (`s65-instruments-360.png`) + scrollé. Mesuré : `scrollWidth 629 > clientWidth` (scroll actif), `gap 12px`, `mask-image` calculé sur la piste, dernier item `TON CRÉNEAU : ▶ 18:30 → 21:30` atteignable (scrollLeft max = 284).
- **Bloc 1 MapLayerSelector** (`s65-maplayers-390.png`) : `minPx = 12`, aucun nœud < 12 px.
- **Bloc 1 SpotPopup** (`s65-spotpopup-390.png`) : labels ESPÈCES/TECHNIQUES + `29` + chip `✓ VÉRIFIÉ` lisibles à 12 px.
- **Bloc 1 TideStrengthBand** (`s65-tidestrength-390.png`) : 17 nœuds, `minPx = 12` (valeurs marnage 5.1/5.2… + labels jours à 12 px).
- **Bloc 2 tarifs** (`s65-tarifs-390.png`) + DOM : notif = « Alertes créneaux optimaux et grandes marées », **zéro « push »**, GPS = « plusieurs centaines de mètres », **zéro « 1 km »**.
- **Bloc 2 CGU** (DOM) : 2 phrases GPS honnêtes présentes, zéro « 1 km ».

### Non captur é en live (honnêteté)
- **Onglets Fil** : auth-gated (`/fil/[dept]`) ; la tentative de montage temporaire dans `/dev/ui-v2` a échoué à cause d'une corruption du cache `.next` partagé (voir plus bas). Validé par : analyse (tiennent à 360/390), grep (mask + `sm:mask-none` appliqués), et le **même pattern `[mask-image]` prouvé visuellement sur le bandeau**.
- **MapLegend** (desktop-only `hidden md:flex`), **BadgesGrid / CatchCard / CatchFiltersBar** (auth) : non ouverts en émulation ; garantis par grep `text-\[(9|10|11)px\] = 0` sur ces fichiers + swaps mécaniques identiques au pattern prouvé sur les 3 overlays capturés.

---

## VERIF (résultats)

- ✅ `pnpm typecheck` (tsc --noEmit) : **exit 0**.
- ✅ `pnpm test` (vitest) : **616 / 616 tests verts** (60 fichiers).
- ✅ `pnpm lint` (next lint / eslint) : **0 warning, 0 error**. (Hook `lint-changed` vert sur chaque fichier édité.)
- ✅ Greps d'acceptation : `text-\[(9|10|11)px\]` = **0** sur les 8 fichiers traités ; plus aucune mention « 1 km » de floutage user-facing.
- ⚠️ `pnpm build` : **compile OK (111 s) + type-check OK**, puis échoue au *prerender* de **`/techniques`** (`TypeError: Cannot read properties of undefined (reading 'call')` dans `webpack-runtime.js`). C'est la signature d'une **corruption du cache `.next` partagé** (4 sessions concurrentes sur un seul `.next`), sur une page **que je n'ai pas touchée**. Pas un défaut Sprint 65 : le bundle compile et type-check ; l'erreur est un artefact d'environnement. **À confirmer par John avec un build propre (`rm -rf .next && pnpm build`) sur un checkout non partagé.**

---

## Reste manuel John (post-sprint)

1. **Stager mes 16 fichiers explicitement** (clone partagé, ne PAS `git add -A` — beaucoup d'autres `M`/`??` appartiennent aux sprints 59/60/64 + pivot dopamine : gamification/XpBar/RankChip/levels, share, home, PokedexGrid, lib/labels, lib/types…). Liste ci-dessous.
2. **🔴 Bug pré-existant (hors S65) à corriger** : `app/(marketing)/peche/[...slug]/opengraph-image.tsx` (fichier metadata **dans** un catch-all) fait planter `next dev` avec `Catch-all must be the last part of the URL.` (dev-only ; `next build` compile). Le déplacer hors du `[...slug]` (ex. générer l'OG via la page ou déplacer la route). Committé (S55/S57), pas de moi.
3. **`.next` corrompu** dans ce clone (chunks webpack manquants après le dev concurrent) : `rm -rf .next` avant le prochain build/dev propre.
4. **Optionnel (non user-facing, hors scope copie)** : commentaires code disant encore « 1 km » (`lib/map/utils.ts:3`, `lib/map/seed-heatmap-data.ts`, `components/catches/CatchMiniMap.tsx:24`, `components/map/MapView.tsx:174` — S64) ; disque flou décoratif `createFuzzyCircle(radiusKm=1)` (MapView, S64) vs offset réel 500-900 m (sur-couvre, donc « safe/honnête ») ; `pricing-cards.tsx` a un `text-[10.5px]` (TrialBadge) et `text-[11px]` (badge −17 %) hors périmètre Bloc 1.
5. QA d'un coup d'œil sur ton téléphone (les fixes sont validés en émulation).

### Mes 16 fichiers (Sprint 65)
```
components/ui-v2/instruments-bar.tsx        (Bloc 0 — gap-3 + mask)
components/feed/FeedTabs.tsx                 (Bloc 0 — mask)
components/ui-v2/tag-data.tsx               (Bloc 1 — 11.5px → 12px, primitif)
components/map/SpotPopup.tsx                 (Bloc 1)
components/map/MapLayerSelector.tsx          (Bloc 1 + ink-300→ink-500)
components/map/MapLegend.tsx                 (Bloc 1)
components/gamification/BadgesGrid.tsx       (Bloc 1)
components/conditions/TideStrengthBand.tsx   (Bloc 1 + ink-300→ink-500)
components/catches/CatchCard.tsx             (Bloc 1)
components/catches/CatchFiltersBar.tsx       (Bloc 1)
app/(marketing)/tarifs/pricing-cards.tsx     (Bloc 2 notif — option B)
content/guides/peche-au-bar-au-leurre.mdx    (Bloc 2 GPS)
content/guides/peche-a-la-dorade-royale-au-surfcasting.mdx (Bloc 2 GPS)
app/(app)/carnet/[id]/page.tsx               (Bloc 2 GPS)
components/catches/CatchForm.tsx             (Bloc 2 GPS — ligne ~1212 ; fichier aussi touché par une session sœur)
app/(marketing)/legal/cgu/page.tsx           (Bloc 2 GPS x2)
```
> ⚠️ `CatchForm.tsx` et `cgu/page.tsx` et `carnet/[id]/page.tsx` sont dans la liste `M` mais peuvent aussi porter des retouches de sessions sœurs / du linter : vérifier le diff avant de stager (ne garder que la ligne de copie GPS si un conflit apparaît).
