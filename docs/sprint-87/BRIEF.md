# Sprint 87 — Brief d'exécution
## « Le pli mobile » — la réponse et le CTA avant le premier scroll, sur 488 pages SEO

> Rédigé le **2026-08-17**, après le sprint 86.
> Contexte : **`docs/PLAN-TRAFIC-2026-08-17.md` §2** (pages d'entrée organiques mesurées),
> `docs/sprint-84/RECAP.md` (le cache statique, invariant de sortie de ce sprint),
> `docs/sprint-86/BRIEF.md` (le parcours anonyme de log de prise, que ce sprint vient alimenter),
> et **le sprint 75 Bloc 2**, qui a déjà résolu ce problème sur `/especes` : la recette existe,
> elle n'a simplement jamais été portée ailleurs.
>
> **Décisions John 2026-08-17** :
> - périmètre = **3 gabarits** : `/peche/[...slug]`, `/guides/[slug]`, `/especes/[slug]` ;
> - sur `/peche`, **CTA inline + pied de page, PAS de barre collante** ;
> - `/spots` et les index (`/spots`, `/especes`, `/guides`) sont **hors périmètre** (déjà traités
>   aux sprints 76 / 77 / 79).

**Préalable avant de démarrer** : aucun. Ce sprint est **100 % applicatif** : aucune migration,
aucune action de dashboard, aucune variable d'environnement.

> ⚠️ **Une modification locale non commitée existe déjà** sur
> `app/(marketing)/peche/[...slug]/page.tsx` (session du 17/08 : titre réduit, L'ESSENTIEL remonté
> sous le hero, CTA inline ajouté). Elle est **le point de départ du Bloc 2, pas un acquis** :
> elle n'est ni instrumentée, ni reliée au spot de la page, ni factorisée, ni mesurée.
> **Le Bloc 0 doit mesurer l'avant sur la PRODUCTION** (qui ne porte pas cette modification),
> jamais sur le disque local.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-87/BRIEF.md`. Le Bloc 1 (les trois primitives)
> passe en premier et se livre en 30 minutes : les Blocs 2, 3 et 4 se lancent contre le contrat
> d'API écrit dans le Bloc 1, sans l'attendre. Le Bloc 0 tourne en parallèle et ne touche aucun
> fichier applicatif. Lis « Le piège de mesure » avant de coder le Bloc 5. Termine par le
> workstream VERIF. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0, mesure du pli | **qa-chrome** → Playwright (émulation iPhone 13, 390 × 844) | ⚠️ **Chrome desktop sur Windows refuse de descendre sous ~500 px** (constat sprint 86). La seule mesure valable à 390 px passe par l'émulation d'appareil de Playwright, pas par une fenêtre redimensionnée. |
| Bloc 0, volumes de l'avant | **PostHog** (lecture) | Figer le volume 90 j de `species_page_cta_clicked` par position, et acter que `/peche` et `/guides` n'émettent **rien**. |
| Avant de toucher au rendu statique | **docs-researcher** → Context7 (Next **15.5.x**) | Ce qui rend une route dynamique en App Router, et ce qu'un composant client change (ou non) au pré-rendu. Pas de code de mémoire : c'est exactement le piège qui a coûté des mois au sprint 84. |
| Bloc 2, contexte de spot | **supabase-guard** → Supabase (RO) | Vérifier en base qu'un `spots.id` est bien l'identifiant attendu par `/carnet/nouvelle?spot_id=`, et qu'il n'expose aucune coordonnée. Aucune écriture. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Aucune régression runtime, et **le cache du sprint 84 intact** (73 routes pré-rendues). |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

Sur un écran de **390 px**, faire que la **réponse** commence au-dessus de **400 px** et qu'un
**CTA** soit atteint en **un seul scroll** (< 1 000 px) sur les **488 pages** des trois gabarits
SEO, sans casser le rendu statique du sprint 84.

---

## Les faits (mesurés — à ne pas re-débattre)

| Fait | Source |
|---|---|
| **82 % du trafic est mobile** | GSC 90 j, sprint 75 (`CLAUDE.md` §9) |
| **`/peche/<espèce>/<technique>/<dépt>` = 455 pages** (26 nationales + 429 départementales) | Calculé depuis `SPECIES_TECHNIQUES` × `speciesDepartments()`, `lib/seo/programmatic.ts:215-323`. **À re-confirmer au Bloc 0 par `getAllProgrammaticPages().length`.** |
| **3 des 6 premières pages d'entrée organiques sont des pages `/peche`**, avec les **meilleurs rebonds du site (11-12 %)** | `docs/PLAN-TRAFIC-2026-08-17.md` §2 |
| Le `h1` global vaut **`clamp(32px, 8vw, 72px)`**, `line-height: 1.05` | `app/globals.css:377` |
| Le titre « Pêche de la dorade royale au surfcasting dans le Morbihan » fait **56 caractères** et tient en **4 lignes à 390 px** | Rendu du gabarit + capture John du 17/08 |
| `/peche` : **un seul CTA, en toute fin de page**, et **zéro `capture()`** dans le gabarit | `app/(marketing)/peche/[...slug]/page.tsx` (aucune occurrence de `analytics` / `capture`) |
| `/peche` : le CTA pointe `/carnet/nouvelle` **sans `spot_id`** → un visiteur sans compte tombe sur l'écran **« Choisis d'abord ton spot »**, qui le renvoie vers `/spots` ou `/carte` | `app/carnet/nouvelle/page.tsx:102-141` et `:173-176` |
| `/guides` : le seul CTA de l'article est **tout en bas**, libellé « Créer mon carnet gratuit » mais pointant **`/auth/login`** | `components/layout/GuideLayout.tsx:126-139` |
| `/guides` : le second CTA vend **`/tarifs` à des visiteurs sans compte** (anti-motif du sprint 75) et vit dans une sidebar **`hidden lg:block`**, donc **invisible pour les 82 % de mobile** | `components/layout/GuideLayout.tsx:142, 167-180` |
| `/especes` : la recette « réponse d'abord + CTA précoce » **existe déjà** (`SpeciesAnswer` + `SpeciesCtaLink` en `inline` / `sticky` / `footer`) | `app/(marketing)/especes/[slug]/page.tsx:212-243`, sprint 75 Bloc 2 |
| `/especes` : mais le `h1` reste **le clamp global**, sans surcharge | `app/(marketing)/especes/[slug]/page.tsx:208` |
| Ordre de grandeur du gain, mesuré sur une **maquette statique** reproduisant les métriques (390 × 714, en-tête 64 px) : haut de L'ESSENTIEL **1067 px → 339 px**, CTA **absent du premier tiers → 848 px** | Mesure du 17/08, **maquette et non production** : c'est précisément ce que le Bloc 0 remplace par du réel |

### Ce que ces faits disent

Le gabarit qui prend le trafic est **le seul des trois à n'avoir jamais reçu de travail de
conversion**. Le sprint 75 a réparé `/especes` (36 % des impressions, 1,7 % de CTR) ; les sprints
76, 77 et 79 ont réparé `/spots`. `/peche` a doublé de taille au sprint 83 (+118 pages) sans que
personne ne regarde son premier écran, et il est aujourd'hui **la meilleure porte d'entrée du
site** : 11-12 % de rebond, contre 22,4 % de moyenne.

---

## ★ Le piège de mesure, à écrire noir sur blanc AVANT de livrer

`/peche` et `/guides` n'émettent **aucun** événement de conversion aujourd'hui. Demain ils en
émettront.

**On ne pourra donc comparer aucun taux « avant / après » sur ces deux gabarits : la base n'est
pas un taux bas, c'est l'absence de mesure.** C'est le même piège que la discontinuité
`spot_page` du sprint 85 §3 et que l'inversion d'impressions du sprint 86 Bloc 0.

- **Le repère de succès est le volume absolu hebdomadaire de `seo_cta_clicked`**, pas un taux.
- Le seul ratio lisible dès le départ est **clics / pages vues du gabarit**, calculé des deux
  côtés à partir de PostHog, et il ne sera lisible qu'après **14 jours pleins**.
- `/especes` est le **seul** des trois à avoir un avant comparable (`species_page_cta_clicked`,
  3 positions). C'est donc le seul gabarit sur lequel une comparaison de taux a un sens, et il ne
  reçoit dans ce sprint qu'un **changement de taille de titre** : si son taux bouge, c'est
  attribuable, et ça vaut mesure.

⚠️ **Deux fenêtres de mesure sont toujours ouvertes** : sprint 83 jusqu'au **07/09** (titres et
maillage) et sprint 84 depuis le 17/08 15:36 (le cache ISR). Ce sprint touche au **rendu** des
mêmes pages : ne jamais attribuer à ce sprint un gain de trafic qui appartient à l'une des deux.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | **Bloc 0** — mesurer l'avant, pour de vrai | 0,5 j | — | ✅ |
| B | **Bloc 1** — les trois primitives `components/seo/` | 0,5 j | — | ✅ (à livrer en premier) |
| C | **Bloc 2** — ★ le gabarit `/peche` (le cœur) | 1,5 j | contrat d'API du Bloc 1 | ✅ |
| D | **Bloc 3** — `/guides` : un CTA que le mobile voit | 0,5 j | contrat d'API du Bloc 1 | ✅ |
| E | **Bloc 4** — `/especes` : le titre, et rien d'autre | 0,25 j | contrat d'API du Bloc 1 | ✅ |
| F | **Bloc 5** — instrumentation + garde-fou de non-régression | 0,75 j | C, D | ❌ |
| VERIF | revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

⚠️ Les Blocs 2 et 5 touchent le **même** fichier (`app/(marketing)/peche/[...slug]/page.tsx`).
Les confier au **même agent**, ou faire passer le Bloc 2 entièrement d'abord.

---

## Bloc 0 — Mesurer l'avant, pour de vrai

Le chiffre « 1067 px » cité plus haut vient d'une **maquette**, pas de la production. La leçon du
chantier carte (`CLAUDE.md` §2) est explicite : **un chiffre de perf ou de layout est une mesure
instrumentée ou un appareil réel, jamais une impression d'agent.** Ce bloc produit la vraie
mesure, et il doit tourner **avant** tout déploiement.

> **Connecteurs** : **qa-chrome** → Playwright en émulation iPhone 13 (390 × 844). **PostHog** en
> lecture pour les volumes. Aucune écriture, aucun fichier de `app/` ou `components/` modifié.

### Tâches

1. Écrire `scripts/measure-fold.mjs` : Playwright, `devices['iPhone 13']`, il prend une liste
   d'URL en argument (défaut : la liste ci-dessous), attend `networkidle`, et rend un tableau
   Markdown avec, **par URL** :
   - `y` du haut du **premier bloc de réponse** (`[data-fold="answer"]`, cf Bloc 1) ;
   - `y` du haut du **premier CTA** (`[data-fold="cta"]`) ;
   - hauteur du `h1` en px et **nombre de lignes** (hauteur ÷ `line-height` calculé) ;
   - hauteur totale du document ;
   - part du premier écran (714 px utiles : 844 moins ~130 px de chrome navigateur) occupée par
     le hero.
   ⚠️ Sur la production actuelle, ces attributs `data-fold` n'existent pas encore : le script doit
   **retomber sur des sélecteurs de repli** documentés en tête de fichier (le premier `a[href^="/carnet/nouvelle"]`,
   le premier `a[href^="/auth"]`, le bloc portant le texte « L'ESSENTIEL »), et le noter dans sa
   sortie. C'est ce repli qui mesure l'AVANT.
2. Lancer le script sur la **production** avec au minimum ces 8 URL :
   - `/peche/dorade-royale/surfcasting/morbihan` (le cas rapporté par John)
   - `/peche/bar/leurres/landes` (1re entrée organique du gabarit)
   - `/peche/bar/leurres/gironde`, `/peche/bar/leurres/finistere`
   - `/peche/sar/surfcasting` (page nationale, sans département)
   - `/guides/comment-lire-une-courbe-de-maree`
   - `/especes/dorade-royale`
   - `/especes/bar`
3. Calculer le **titre le plus long de la matrice** : `getAllProgrammaticPages()` +
   `programmaticTitle()`, trier par longueur, garder le premier. C'est lui qui sert de cas limite
   au critère « ≤ 3 lignes » du Bloc 2. Consigner l'URL et le titre.
4. Confirmer le compte de pages : `getAllProgrammaticPages().length` (attendu ~455) et le nombre
   de guides (`getAllGuides().length`, attendu 7) et d'espèces à fiche (26).
5. Relever dans PostHog, sur **90 jours** : le volume de `species_page_cta_clicked` **par
   position** (`inline` / `sticky` / `footer`), et les pages vues des trois gabarits. Acter
   explicitement que `/peche` et `/guides` sont à **zéro événement**.
6. Livrer `docs/sprint-87/BASELINE.md` : le tableau du script (sortie brute collée, pas
   reformulée), les comptes de pages, les volumes PostHog, et **le piège de mesure ci-dessus
   recopié tel quel**.

### Critères d'acceptation

- `docs/sprint-87/BASELINE.md` existe, porte des chiffres **rejoués** (sortie de script et de
  requête collée), pas recopiés de ce brief.
- `scripts/measure-fold.mjs` est rejouable : `node scripts/measure-fold.mjs <url…>` rend le même
  tableau. Il servira à mesurer l'après.
- Aucun fichier de `app/`, `components/` ou `lib/` modifié par ce bloc.

### Garde-fous

- Ne pas mesurer sur le disque local : la modification non commitée du 17/08 fausserait l'avant.
- Ne pas conclure d'un `y` isolé : consigner les 8 URL, le gabarit varie avec la longueur du titre
  et le nombre de puces.

---

## Bloc 1 — Les trois primitives (`components/seo/`)

Le fond du problème n'est pas une page, c'est qu'il n'existe **aucune définition partagée** du
premier écran d'une page SEO. `/especes` a sa recette dans son propre fichier, `/peche` n'en a
pas, `/guides` a la sienne dans un layout. Ce bloc crée le vocabulaire commun ; les blocs suivants
ne font que le consommer.

> **Connecteurs** : **docs-researcher** → Context7 (Next 15.5.x) pour confirmer qu'un composant
> client importé par une page statique **ne la rend pas dynamique** — c'est l'hypothèse porteuse
> de `SeoInlineCta`.

### ⚠️ Ce qu'on ne fait PAS : toucher au `h1` global

Il serait tentant de corriger `app/globals.css:377` une bonne fois. **Non.** Ce clamp habille
aussi le hero de la home (refonte sprint 34, WebGL + GSAP) et les index. Le modifier globalement
rouvrirait un chantier fermé, sans mesure, sur des pages hors périmètre. **Le titre SEO devient un
composant, le CSS global ne bouge pas.**

### Contrat d'API (à respecter à la lettre : les Blocs 2, 3 et 4 codent contre ce contrat)

```tsx
// components/seo/seo-title.tsx — SERVER component
export function SeoTitle(props: {
  children: React.ReactNode
  /** 'on-dark' = hero navy (défaut), 'on-light' = fond sable */
  tone?: 'on-dark' | 'on-light'
  className?: string
}): JSX.Element
// rend : <h1 data-fold="title" className={cn(
//   'font-display text-[clamp(25px,5.6vw,42px)] leading-[1.12]',
//   tone === 'on-dark' ? 'text-white' : 'text-navy-900', className)}>

// components/seo/key-facts.tsx — SERVER component
export function KeyFacts(props: {
  label: string            // ex. "L'ESSENTIEL · AU SURFCASTING"
  items: readonly string[]
  footnote?: React.ReactNode   // ex. <><strong>Quand :</strong> …</>
  className?: string
}): JSX.Element
// rend : <div data-fold="answer" className="rounded-[14px] border border-sand-200 bg-white p-5">
//   <TagData>{label}</TagData> + la liste à puces teal + le filet + la note

// components/seo/seo-inline-cta.tsx — 'use client'
export function SeoInlineCta(props: {
  template: 'peche' | 'guide' | 'espece'
  slug: string                  // identifiant public de la page (jamais une coordonnée)
  href: string
  label: string
  note?: string                 // rassurance courte sous le libellé
  position: 'inline' | 'footer'
  variant?: 'compact' | 'card'  // compact = bandeau clair ; card = bloc navy de fin de page
}): JSX.Element
// rend : <section data-fold="cta" data-position={position}> … </section>
// au clic : analytics.seoCtaClicked({ template, slug, position })  ← ajouté au Bloc 5
```

### Tâches

1. Créer les trois fichiers ci-dessus. Styles repris **à l'identique** de l'existant (la carte
   blanche vient de `app/(marketing)/peche/[...slug]/page.tsx`, le bloc navy de son CTA de fin) :
   ce bloc ne redessine rien, il déplace.
2. `SeoInlineCta` est un composant **client** (il lui faut le `onClick`). Tant que le Bloc 5 n'a
   pas livré `analytics.seoCtaClicked`, il appelle une fonction locale vide typée : les Blocs 2-4
   ne doivent pas être bloqués.
3. Attributs `data-fold` obligatoires sur les trois composants : c'est le contrat que mesurent
   `scripts/measure-fold.mjs` et le test de non-régression du Bloc 5.

### Critères d'acceptation

- `pnpm typecheck` et `pnpm test` verts.
- **Aucun** des trois fichiers n'importe `@/lib/supabase/server`, `next/headers`, ni ne lit de
  cookie, directement ou indirectement (invariant sprint 84, `CLAUDE.md` §6).
- `__tests__/marketing-layout-is-static.test.ts` reste vert.
- Les trois composants rendent des `data-fold` : `title`, `answer`, `cta`.

### Garde-fous

- Ne pas toucher `app/globals.css`.
- Ne pas créer de quatrième variante de bouton : réutiliser les classes teal existantes.

---

## Bloc 2 — ★ Le gabarit `/peche` (le cœur du sprint)

455 pages, le meilleur rebond du site, aucun travail de conversion à ce jour. Fichier :
`app/(marketing)/peche/[...slug]/page.tsx`.

> **Connecteurs** : **supabase-guard** → Supabase (RO) pour la tâche 4 (identifiant de spot).
> **qa-chrome** en fin de bloc, en **390 px émulé**, pas en fenêtre redimensionnée.

### Conception retenue (pré-arbitrée, ne pas re-débattre)

L'ordre du premier écran devient : **fil d'ariane → titre → chapô → L'ESSENTIEL → CTA → la prose
longue**. Ce n'est pas une préférence esthétique : L'ESSENTIEL **est** la réponse à la requête qui
a amené le visiteur, et la prose est le « pour creuser ».

### Tâches

1. **Hero resserré** : `pt-7 pb-8 sm:pt-10 sm:pb-11` (au lieu de `pt-10 pb-12`), fil d'ariane
   `mb-4 sm:mb-5`, chapô `text-[15px] sm:text-lg` et `mt-3 sm:mt-4`, bandeau des prises 30 j
   `mt-4`. Le `h1` passe par **`SeoTitle`**.
2. **L'ESSENTIEL remonte** : sortir le bloc de la section `prose` (il y vivait en `not-prose`,
   entre les paragraphes de technique) et le rendre via **`KeyFacts`** juste sous le hero. Les
   paragraphes de technique restent où ils sont, sous leur `h2`.
3. **CTA inline** juste après, via **`SeoInlineCta`** (`position="inline"`, `variant="compact"`).
4. ★ **Le CTA porte le contexte de spot.** Aujourd'hui il pointe `/carnet/nouvelle` nu, ce qui
   envoie un visiteur sans compte sur l'écran « Choisis d'abord ton spot »
   (`app/carnet/nouvelle/page.tsx:102`) — alors que **la page liste déjà jusqu'à 5 spots** et que
   tout le parcours anonyme des sprints 77 / 86 ne fonctionne **qu'avec** un spot en contexte.
   - si la page a au moins un spot : `href = /carnet/nouvelle?spot_id=${spots[0].id}` (convention
     déjà en place : `app/(marketing)/spots/[slug]/page.tsx:704`,
     `components/map/SpotPopup.tsx:427`), libellé **« Loguer une prise à {spots[0].name} »** ;
   - sinon : `href = /spots?species=${dbKey}`, libellé **« Trouver un spot à {espèce} »**. On
     n'envoie jamais un visiteur sur un écran qui lui demande de repartir chercher.
5. **CTA de fin conservé**, converti en `SeoInlineCta` (`position="footer"`, `variant="card"`),
   même copie et même bloc navy qu'aujourd'hui.
6. Reprendre et finir la modification locale non commitée du 17/08 : elle fait les tâches 1 à 3
   « à la main », sans les composants, sans le contexte de spot, sans instrumentation.

### Critères d'acceptation

Vérifiés par `node scripts/measure-fold.mjs` (Bloc 0) contre un `pnpm build && pnpm start` local,
en 390 × 844 émulé :

- sur `/peche/dorade-royale/surfcasting/morbihan` : `data-fold="answer"` commence **< 400 px** et
  `data-fold="cta"` **< 1 000 px** ;
- le `h1` tient en **≤ 3 lignes** pour le **titre le plus long de la matrice** relevé au Bloc 0 ;
- sur une page **sans spot**, le CTA pointe `/spots?species=…` et **jamais** `/carnet/nouvelle` nu
  (à vérifier sur la page nationale `/peche/sar/surfcasting`) ;
- sur une page **avec spots**, le `spot_id` du CTA est celui du **premier spot listé** dans la
  page (comparer les deux dans le HTML rendu).

Régressions interdites, à prouver :

- `revalidate = 86400`, `dynamicParams = true` et `generateStaticParams()` **inchangés** ;
- `pnpm check:prerender` : **4/4 témoins**, et le nombre de routes pré-rendues ne baisse pas
  (73 au sprint 84) ;
- le JSON-LD `BreadcrumbList` est **identique** (mêmes positions, mêmes URL) ;
- les 5 spots, les guides liés, le maillage « autrement » et « par département » sont intacts ;
- aucune lecture de cookie ni `createClient()` ajoutée : la page reste en `createAnonClient()`.

### Garde-fous

- **Ne pas ajouter de barre collante** (décision John du 17/08).
- Ne pas toucher au contenu éditorial : `lib/seo/content.ts` et `lib/seo/programmatic.ts` ne
  bougent pas dans ce bloc.
- Ne pas déplacer le bloc « Marées et conditions » ni les liens de maillage : ils portent le SEO
  interne mesuré au sprint 83.

---

## Bloc 3 — `/guides` : un CTA que le mobile voit

7 pages seulement, mais elles sont la couche « pour creuser » de tout le maillage, et elles sont
le gabarit le plus abîmé du lot. Fichier : `components/layout/GuideLayout.tsx`.

> **Connecteurs** : **qa-chrome** en 390 px émulé pour la vérification finale.

### Ce qui cloche exactement

1. Hero `pt-10 pb-14` (`:70`) et `h1` au clamp global (`:94`) : sur un titre de guide long, le
   premier écran ne contient que le titre.
2. Le seul CTA de l'article est **en toute fin** (`:126-139`), et il est libellé « Créer mon
   carnet gratuit » alors qu'il pointe **`/auth/login`**. La promesse et la destination ne
   coïncident pas.
3. Le second CTA (`:167-180`) vend **`/tarifs`** — un abonnement — à un lecteur qui n'a pas encore
   de compte : c'est exactement l'anti-motif corrigé au sprint 75 (`lib/gating/wall.ts:1-12`). Et
   il vit dans une sidebar **`hidden lg:block`** (`:142`), donc **invisible aux 82 % de mobile**.

### Tâches

1. Hero : `pt-7 pb-8 sm:pt-10 sm:pb-12`, `h1` via **`SeoTitle`**.
2. Ajouter un **`SeoInlineCta`** (`position="inline"`, `variant="compact"`) **juste après le
   chapô du guide**, avant le corps MDX.
3. **Destination pré-arbitrée** : `/spots?species=<slug>` quand le frontmatter du guide porte une
   espèce exploitable (`lib/guides/loader.ts:16-17`), sinon `/spots`. Raison : un lecteur de guide
   n'a **aucun spot en contexte**, et `/spots` porte déjà les surfaces d'inscription instrumentées
   (`spots_list`, `spots_index_footer`, sprints 76 et 79). On le branche sur un entonnoir qui
   existe au lieu d'en inventer un.
4. CTA de fin : corriger la destination `/auth/login` → **`/auth/register`** et le passer en
   `SeoInlineCta` (`position="footer"`, `variant="card"`). Le libellé « Créer mon carnet gratuit »
   devient enfin vrai.
5. Sidebar `/tarifs` : **retirer le CTA d'abonnement** et le remplacer par le même
   `SeoInlineCta` que la tâche 3. On ne vend pas un abonnement à quelqu'un sans compte.

### Critères d'acceptation

- Sur `/guides/comment-lire-une-courbe-de-maree` en 390 × 844 : un `data-fold="cta"` existe
  **< 1 000 px**, et le `h1` tient en **≤ 3 lignes**.
- Plus aucun lien vers `/tarifs` dans `GuideLayout.tsx`.
- Plus aucun libellé « Créer mon carnet » pointant vers `/auth/login` dans le gabarit.
- Les 7 guides construisent (`pnpm build`), leur `revalidate = 86400` et leur
  `generateStaticParams()` sont intacts, et `pnpm check:prerender` reste à 4/4.

### Garde-fous

- Ne pas toucher au contenu MDX des guides (`content/guides/*`).
- Ne pas retirer la sidebar « Lire aussi » : c'est du maillage interne.

---

## Bloc 4 — `/especes` : le titre, et rien d'autre

Ce gabarit a **déjà** la bonne structure depuis le sprint 75 (`SpeciesAnswer` remonté dans le
hero, `SpeciesCtaLink` en `inline`, `sticky`, `footer`). Le seul défaut restant est la taille du
titre. **C'est aussi le seul gabarit avec un avant mesurable** : tout autre changement rendrait sa
comparaison illisible.

> **Connecteurs** : aucun spécifique. **qa-chrome** en vérification.

### Tâches

1. `app/(marketing)/especes/[slug]/page.tsx:208` : passer le `h1` par **`SeoTitle`**.
2. Hero : `pt-7 pb-8 sm:pt-10 sm:pb-12`.
3. Ajouter `data-fold="answer"` sur le conteneur racine de `components/especes/species-answer.tsx`
   et `data-fold="cta"` sur le CTA `inline`, pour que le script de mesure lise ce gabarit comme
   les autres.

### Critères d'acceptation

- Le `h1` de `/especes/dorade-royale` tient en **≤ 2 lignes** à 390 px.
- `species_page_cta_clicked` est **toujours** émis avec ses trois positions : aucune modification
  de `lib/analytics.ts:88-92` ni de `components/especes/tracked-links.tsx`.
- Aucun autre changement de structure sur ce gabarit : le diff se limite au hero, au titre et aux
  deux attributs `data-fold`.

### Garde-fous

- ⛔ **Ne pas** toucher au CTA collant de `/especes` : il porte l'avant du sprint 75.
- ⛔ **Ne pas** renommer `species_page_cta_clicked` (le renommer casserait le suivi ouvert au
  sprint 75, cf `lib/gating/wall.ts:41-42` pour la même règle sur les surfaces).

---

## Bloc 5 — Instrumentation et garde-fou de non-régression

Sans ce bloc, on aura déplacé des pixels sans jamais savoir si ça convertit — et rien
n'empêchera la dérive de recommencer.

> **Connecteurs** : **PostHog** en lecture pour vérifier l'arrivée des premiers événements après
> déploiement (Bloc « reste manuel John »).

### Tâches

1. `lib/analytics.ts` : ajouter
   ```ts
   /** Clic sur un CTA d'une page SEO (sprint 87). `template` = gabarit, `slug` = page. */
   seoCtaClicked(props: {
     template: 'peche' | 'guide' | 'espece'
     slug: string
     position: 'inline' | 'footer'
   }): void { capture('seo_cta_clicked', props) }
   ```
   ⚠️ **Événement NOUVEAU, pas un renommage.** `species_page_cta_clicked` reste tel quel : deux
   événements coexistent sur `/especes`, et c'est voulu — l'ancien porte la continuité du sprint
   75, le nouveau porte la comparaison entre gabarits.
2. Brancher `SeoInlineCta` dessus (remplacer la fonction vide du Bloc 1).
3. **Le garde-fou** : `e2e/10-pli-mobile.spec.ts`, Playwright, `devices['iPhone 13']`, qui tourne
   contre le serveur de build local et **échoue** si, sur `/peche/dorade-royale/surfcasting/morbihan`,
   `/guides/comment-lire-une-courbe-de-maree` et `/especes/dorade-royale` :
   - `[data-fold="answer"]` a un `boundingBox().y ≥ 400`, ou
   - le premier `[data-fold="cta"]` a un `boundingBox().y ≥ 1000`, ou
   - le `h1` dépasse 3 lignes.
   Le test cite en commentaire la raison d'être : **le sprint 75 a corrigé `/especes`, et `/peche`
   a dérivé pendant 12 sprints sans que rien ne le signale.**

### Critères d'acceptation

- `pnpm e2e -- 10-pli-mobile` vert sur les 3 URL, et **rouge** si on remet `pt-10 pb-12` + le `h1`
  global sur `/peche` (à prouver en le cassant volontairement une fois, puis en rétablissant).
- `seo_cta_clicked` apparaît dans les schémas PostHog après le premier clic réel (vérification
  post-déploiement, pas en local).
- Aucun événement existant renommé ni supprimé : `grep -c "capture('" lib/analytics.ts` ne diminue
  pas.

---

## Ce qu'on ne fait PAS dans ce sprint

- Pas de barre collante sur `/peche` (décision John).
- Pas de modification du `h1` global dans `app/globals.css`.
- Pas de passe sur `/spots`, `/spots/[slug]`, ni les index (`/spots`, `/especes`, `/guides`) :
  trois sprints y sont déjà passés.
- Pas de réécriture éditoriale : `lib/seo/content.ts`, `lib/especes/content/*` et
  `content/guides/*` ne bougent pas.
- Aucune migration, aucune RPC, aucune policy.

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a écrit aucun de ces blocs)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` +
   revue croisée + passe anti-régression.
2. **`pnpm check:prerender`** : 4/4 témoins, et le compte de routes pré-rendues **≥ 73**. C'est
   l'invariant du sprint 84 : un seul composant serveur qui lit un cookie et **tout** le groupe
   `(marketing)` redevient dynamique, en silence.
3. `__tests__/marketing-layout-is-static.test.ts` vert.
4. Rejouer `node scripts/measure-fold.mjs` sur le build local et **cocher ✅/❌ chaque critère
   chiffré** des Blocs 2, 3 et 4 avec la sortie en preuve.
5. Passe sécurité : aucune coordonnée dans un attribut, un lien ou un événement (les `spot_id` et
   `slug` sont des identifiants publics, jamais une position) ; aucune donnée utilisateur dans un
   HTML mis en cache.
6. Passe copy : tutoiement partout ; **aucun tiret cadratin dans une chaîne de copie visible**
   (`node scripts/lint-copy-dashes.mjs`) ; aucune promesse fausse dans les nouveaux libellés de
   CTA (« gratuit » ne se dit que de ce qui l'est).
7. Livrer `docs/sprint-87/RECAP.md` : fait / comment tester / reste manuel John, avec le tableau
   avant-après du script de mesure.

---

## Reste manuel John (post-sprint)

1. Relire le diff, merger sur `main`, déployer (auto-deploy Vercel).
2. **Rejouer `node scripts/measure-fold.mjs` sur la production** après déploiement, et coller la
   sortie dans le RECAP : c'est l'après réel, celui qui compte.
3. Vérifier dans PostHog, sous 48 h, que `seo_cta_clicked` arrive avec ses trois `template`.
4. **Attendre 14 jours pleins** avant toute lecture de volume, et ne comparer que des volumes
   absolus sur `/peche` et `/guides` (cf « Le piège de mesure »).
5. Ne pas confondre avec les deux fenêtres ouvertes : sprint 83 jusqu'au 07/09, sprint 84 depuis
   le 17/08.
