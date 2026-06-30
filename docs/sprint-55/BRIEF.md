# 🎯 Sprint 55 — « Le partage, beau » (cartes OG)

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §8.
> **Prod = HEAD `7c23f5c` (sprint-50).** Objectif : rendre le partage **réellement partageable** (munition virale de César). Le moteur OG est bien fait (template marin, thèmes, footer @handle, photo du poisson, payloads géo-free) ; il faut **réparer le rendu** (débordement story + polices plates) et **étendre le SEO** des images. **Aucune migration** (code + assets).

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 55 (docs/sprint-55/BRIEF.md). WS-A layout story (déborde) + glitch « 1 » (même cause), WS-B polices dans les 5 ImageResponse (lib/og/fonts.ts), WS-C emoji /c → Lucide, WS-D OG SEO (peche/[...slug] + dates schema espèces). WS-A+B se font ensemble (métriques de police ↔ layout). Finis par WS-E (QA VISUELLE de CHAQUE kind × og/story). Esprit critique : vérifie le rendu réel, pas juste le code. NE PUSH PAS sans validation.
```

**Prérequis** : dépôt local réparé. **Effort visuel** : ce sprint se valide à l'œil (rendu des PNG), pas seulement au build.

---

## Posture & invariants

Effort max + critique. **Edge runtime** : tout le code OG tourne en `runtime='edge'` (pas de Node API). Satori-safe (pas de `<mask>`, `display:flex` explicite, `border*` décomposés). Invariants : **zéro coordonnée dans les payloads** (déjà tenu, ne pas casser), **pas de tiret cadratin dans la copy visible**, marque toujours présente sur la carte (acquisition). Pas de push sans John.

---

## WS-A — Réparer le layout (story qui déborde + glitch « 1 ») 🟠 [findings G + G2]

**Cause racine (une seule pour les deux)** : `OgFrame` a `overflow:'hidden'` (`lib/og/template.tsx`, conteneur racine). Quand un élément de contenu dépasse la largeur utile (cadre − padding), il est **rogné au bord** :
- en **paysage** (1200×630), un élément déborde à droite et se rogne en un **« 1 » résiduel** au-dessus de « cm » (vu live sur `/og/card/HSEwOyRMAe2F`),
- en **story** (1080×1920), les chips de la `ConditionsCard` débordent (« au pr… », « le me… ») et le titre chevauche le sous-titre, avec ~70 % de cadre vide (vu live `?format=story`).

Le moteur réutilise la **structure paysage** pour le story (mêmes composants, juste des `fontSize` plus grands via `story ?`), sans layout pensé pour le 9:16.

**Correctifs** (`app/og/card/[slug]/route.tsx` + `lib/og/template.tsx`) :
1. **Contraindre toutes les largeurs.** Chaque bloc texte/chip doit tenir dans `width = OG_DIMENSIONS[format].width − 2×padding`. Ajouter `maxWidth`/`width:'100%'` + gestion du dépassement (`overflowWrap:'break-word'` ou troncature). Cibles connues :
   - `CatchCard` rangée héro (`route.tsx:329`, `display:flex, alignItems:baseline, flexWrap:wrap`) : espèce (`:332`) + taille (`:343`) + unité (`:346`) — borner la largeur, autoriser le wrap propre (c'est là que naît le « 1 » passage).
   - `ConditionsCard` titre (`:422`, `maxWidth: story?900:1000`) + sous-titre (`:432`) : vérifier `lineHeight`/marges (chevauchement) ; chips colonne (`:441-480`) : `width:'100%'` + valeur qui **tronque** (`…`) ou wrappe au lieu de déborder.
   - Idem `OutingCard` (`:493`), `GearboxCard`, `RecapCard`, `RecordsCard` (si présents).
2. **Taille de police adaptative.** Réduire la taille du titre/de l'espèce quand le texte est long (ex. « DORADE ROYALE » vs « BAR »), ou tronquer proprement. Pas de `fontSize` fixe non borné sur du contenu de longueur variable.
3. **Distribuer le contenu sur le 9:16.** En story, le contenu est tassé en haut. Soit centrer verticalement (`justifyContent:'center'` du bloc contenu), soit agrandir le héro/la photo, soit ajouter de l'air maîtrisé — pas 70 % de vide. Le `OgFrame` contenu principal est `flex:1` (`template.tsx`), exploiter cet espace.

**Critères d'acceptation** : pour CHAQUE kind (`catch`, `conditions`, `outing`, `recap`, `records`, `gearbox`) et CHAQUE format (`og` 1200×630, `story` 1080×1920), **aucun texte ne touche/déborde le bord**, pas de chevauchement titre/sous-titre, pas de « 1 » résiduel, vide maîtrisé. Validation **visuelle** (naviguer les PNG `/og/card/<slug>` et `?format=story` avec des slugs réels + un cas « espèce longue »).

---

## WS-B — Charger de vraies polices dans l'image OG 🟠 [finding H]

**Constat** : aucun des 5 `new ImageResponse(...)` ne passe `fonts:` (`route.tsx:981`, `og/spot/[slug]/route.tsx:67`, `opengraph-image.tsx:34`, `og/spots/route.tsx:48`, `especes/[slug]/opengraph-image.tsx:34`). Satori n'embarque qu'un seul poids d'une seule police → tous les `fontWeight:700/800` retombent en regular **plat**. `MONO_STYLE` (`template.tsx`) est un fallback système assumé (commentaire « évite un fetch/500 en edge »).

**Correctif robuste** :
1. **Ajouter les fichiers de police** (`.ttf`, sous-ensemble latin) : **Space Grotesk 700** (titres/espèce), **Inter 400/600/700** (labels/corps), **JetBrains Mono 500/700** (chiffres). Self-host dans `public/fonts/` (recommandé, edge-stable) plutôt qu'un fetch Google distant.
2. **`lib/og/fonts.ts`** : charge les `.ttf` (via `fetch(new URL('../public/fonts/...', import.meta.url))` ou un import binaire compatible edge), **mémoïse**, et **try/catch avec fallback** (si le chargement échoue → tableau `fonts` vide, l'image rend en fallback actuel, **jamais de 500**). Retourne le tableau `fonts: { name, data, weight, style }[]`.
3. **Câbler** : passer `fonts` aux 5 `ImageResponse`. Mettre à jour `template.tsx` : `OgFrame` `fontFamily:'Inter'` (au lieu de `'sans-serif'`), `MONO_STYLE.fontFamily:'JetBrains Mono'`, titres (`OgKicker`, héros des cards) en `'Space Grotesk'`.

**Critères d'acceptation** : les gras rendent vraiment gras, les chiffres en JetBrains Mono (règle DA « tout chiffre en mono ») ; si le fetch police échoue, l'image rend quand même (pas de 500). Validation visuelle avant/après.

> **Coupler WS-A et WS-B** : les métriques de police changent la largeur du texte → faire le layout (A) **avec** les vraies polices (B) chargées, sinon on re-déborde. Un seul agent sur l'image OG.

---

## WS-C — Page de partage `/c/[slug]` : icônes au lieu d'emoji 🟢 [finding N]

`app/(marketing)/c/[slug]/page.tsx` : `CatchRecap`/`OutingRecap`/`GearboxRecap` utilisent des emoji bruts comme icônes de ligne — 📏 (`:377`), ⚖️ (`:381`), 🗓️ (`:394,493,578`), 🌊 (`:405,585`), 🌡️ (`:419`), 🎣 (`:425,504,571`), 🐟 (`:480,558`) — rendu incohérent vs les icônes Lucide déjà importées (`ArrowRight, Award, Fish, MapPin, TrendingUp, Wind`, `:5`).

**Correctif** : remplacer chaque emoji par une icône Lucide cohérente (importer `Ruler`, `Scale` ou `Weight`, `Calendar`, `Waves`, `Thermometer`) au style des `RecapRow` existants (`Wind size={14} className="text-ink-400"`). 📏→`Ruler`, ⚖️→`Scale`/`Weight`, 🗓️→`Calendar`, 🌊→`Waves`, 🌡️→`Thermometer`, 🎣→`Fish` (ou une icône leurre), 🐟→`Fish`.

**Critères** : la page de clic (premier écran que voit le partagé) a des icônes homogènes, plus d'emoji plateformes-dépendants.

---

## WS-D — SEO des images : `peche/[...slug]` + dates des fiches 🟡

**D.1 — La plus grosse surface SEO partage une carte générique.**
`app/(marketing)/peche/[...slug]/page.tsx:62` : `openGraph` **sans `images`** ; aucun fichier `opengraph-image.tsx` sous `peche/` → des centaines de pages (espèce×technique×dépt) tombent sur l'OG de marque. **Correctif** : ajouter `app/(marketing)/peche/[...slug]/opengraph-image.tsx` (runtime edge, calqué sur `especes/[slug]/opengraph-image.tsx`) rendant espèce + technique + département via le template OG. + bloc `twitter` si absent.

**D.2 — Schema Article des fiches espèces : date figée.**
`especes/[slug]/page.tsx:116` : `dateModified: '2026-06-21'` en dur (toutes les fiches, déjà périmé), sans `datePublished` ni `image`. **Correctif** : stocker une date par `EspeceContent` (réutiliser la date de vérification réglementaire déjà présente, ex. « vérifié le 24/06/2026 ») → émettre `datePublished` + `dateModified` réels ; ajouter `image` pointant vers l'OG par espèce (`/especes/<slug>/opengraph-image`).

**Critères** : Rich Results Test : Article avec dates cohérentes + image ; les pages `/peche/...` exposent une OG image dédiée (vérifier la meta `og:image` live).

---

## WS-E — Vérification (obligatoire, en dernier) ✅

1. **QA VISUELLE** (le cœur de ce sprint) : pour chaque kind × {og, story}, ouvrir le PNG (`/og/card/<slug>` et `?format=story`) avec des slugs réels (créer 1 carte de chaque kind si besoin via le flux de partage) **+ un cas espèce/texte long** → aucun débordement, polices nettes, vide maîtrisé. Capturer avant/après.
2. **`/verif-sprint`** : Vitest vert, `pnpm build` OK (les routes edge compilent avec `fonts:`), lint + types OK.
3. **Anti-régression** : aucun payload de carte ne contient de coordonnée (re-vérifier après refactor) ; fallback police testé (simuler échec de fetch → pas de 500) ; les 4 autres routes OG (spot, default, spots, especes) rendent toujours.
4. **NE PAS PUSH** : laisser à John.

---

## Récap

| WS | Findings | Fichiers clés | Migration |
|---|---|---|---|
| A | G (story déborde) + G2 (« 1 » glitch) | `app/og/card/[slug]/route.tsx`, `lib/og/template.tsx` | — |
| B | H (aucune police) | `lib/og/fonts.ts` (nouveau), `public/fonts/*`, les 5 routes OG, `template.tsx` | — |
| C | N (emoji recap) | `app/(marketing)/c/[slug]/page.tsx` | — |
| D | peche OG + dates Article | `peche/[...slug]/opengraph-image.tsx` (nouveau), `especes/[slug]/page.tsx`, `EspeceContent` | — |

**Décisions ouvertes** :
1. **Polices** : self-host `public/fonts/` (reco) vs fetch distant ; quels poids exacts (proposé : Space Grotesk 700, Inter 400/600/700, JetBrains Mono 500/700).
2. **Wrapped / records** : les cartes `recap` (« Mon année ») et `records` sont **câblées mais dormantes** (0 créée en base). Une fois le layout réparé (A), les **promouvoir** (CTA visible sur `/carnet`, `/profil`) maintenant ou plus tard ? *Reco : promouvoir après ce sprint (elles deviennent enfin belles).*
3. **D2** : ajouter un champ date à `EspeceContent` ou réutiliser la date de vérif réglementaire existante (reco : réutiliser).

**Parallélisme** : **WS-A + WS-B ensemble** (même surface, 1 agent) ‖ WS-C (indépendant) ‖ WS-D (indépendant). Puis WS-E (QA visuelle). Effort ~3-4 j. Aucune dépendance aux sprints 51-54 (mais WS-D §K « 17 . » du Sprint 52 rend la description déjà propre).

---

*Brief Sprint 55 rédigé le 2026-06-29. Vérifié contre HEAD `7c23f5c` : `template.tsx` (OG_DIMENSIONS, OgFrame overflow:hidden, MONO_STYLE, thèmes, footer @handle), `route.tsx` (CatchCard/ConditionsCard, story scaling, 5e ImageResponse:981), absence de `fonts:` dans les 5 routes, absence de `public/fonts`, emoji `/c/[slug]` (lignes 377-585), `peche/[...slug]` sans OG, `especes` Article dateModified figée. Prochain : Sprint 56 sur demande.*
