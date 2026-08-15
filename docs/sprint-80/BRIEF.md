# Sprint 80 — Brief d'exécution
## La première réponse

> Rédigé le **2026-08-15**, pendant l'exécution du sprint 79. Durée cible : **1,5 semaine**.
> **Amendé le 2026-08-15** — décision John : les cinq sprints s'enchaînent **sans attente entre
> eux**. Le préalable §2 ci-dessous a été réécrit en conséquence, et la règle générale est au
> §3.1 de la roadmap. C'est la version amendée qui fait foi.
> Contexte : `docs/roadmaps/ROADMAP-CONVERSION-2026-08-15.md` (§S80 **et §3.1**),
> `docs/sprint-78/AUDIT-MOBILE-2026-08-15.html`, `docs/sprint-79/RECAP.md` (à lire en premier).
> **Décisions John du 2026-08-15, toujours en vigueur** : le score reste gratuit et n'est pas
> regaté ; la phase mobile Expo reste gatée derrière le §4 de la roadmap.

---

## ⛔ Préalable bloquant — lire avant toute chose

### 1. Ce sprint part de `main` APRÈS le sprint 79, jamais d'avant

Le sprint 79 a été rédigé et lancé avant celui-ci. **Il touche cinq fichiers que ce brief touche
aussi.** Toute branche ouverte avant le merge du S79 produira un conflit ou, pire, réintroduira
un défaut déjà corrigé.

| Fichier | Ce que le S79 y fait | Ce que le S80 y fait |
|---|---|---|
| `components/map/MapShell.tsx` | Bloc 1 : la colonne de boutons flottants (`:727`) s'adosse à la barre. Bloc 2 : le `href` (`:697`) passe à `buildSignupHref()` | **Bloc 3** : le centre et le zoom par défaut de la carte |
| `app/(marketing)/spots/[slug]/page.tsx` | Bloc 5 : bascule paywall → mur d'inscription pour les anonymes | **Bloc 1** : réordonnancement du premier écran |
| `components/marketing/home-v3/` | Bloc 6 : compteur « 607 spots », meta description | **Blocs 2 et 4** : contenu du premier écran, carte du hero |
| `components/map/SignupBanner.tsx`, `UpsellBanner.tsx` | Bloc 1 : classe `.sticky-bottom-bar` | Aucun — **ne pas y toucher** |
| `app/globals.css` | Bloc 1 : règles d'empilement collant | **Bloc 5** : tailles de cibles tactiles uniquement |

> **Consigne** : `git log --oneline -15` et vérifier que le RECAP du sprint 79 existe et que ses
> critères sont cochés. Si le S79 n'est pas mergé, **s'arrêter et le dire à John.** Ne pas
> « anticiper » en dupliquant son travail.

### 2. Le sprint 79 doit être prouvé **fonctionnellement**, pas encore statistiquement

> **Décision John du 15/08 : on enchaîne. Ce sprint démarre dès que le S79 est mergé et déployé,
> sans attendre son relevé à J+14.** La version d'origine de ce brief conditionnait le départ au
> témoin `signup_wall_clicked / viewed > 3 %` à quatorze jours. Ce paragraphe le remplace.

**Deux preuves, que la roadmap d'origine confondait :**

| | Ce qu'elle établit | Quand elle est disponible |
|---|---|---|
| **Preuve mécanique** | Le défaut est corrigé : le CTA reçoit le clic, la page ne redirige plus, le brouillon part avec l'espèce seule | **Immédiatement après le déploiement.** Elle se rejoue à la main en dix minutes |
| **Preuve comportementale** | Le corriger a changé le comportement des visiteurs — le fameux 3 % | **14 jours**, quoi qu'on fasse. C'est le temps qu'il faut au trafic, pas au code |

Le S80 a besoin de la première. Attendre la seconde pour réordonner un premier écran, c'était
payer quatorze jours d'arrêt pour une information qui ne change rien à ce qu'il y a à faire ici.

### Ce qui bloque toujours ce sprint

1. **Le S79 est mergé sur `main` et déployé.** Pas « code-complet sur une branche » : déployé.
   Sans déploiement, rien ne se mesure et le Bloc 0 de ce sprint n'a pas de sens.
2. **Ses critères d'acceptation sont cochés avec preuve** dans `docs/sprint-79/RECAP.md`.
3. **Le parcours de sortie du S79 se rejoue à la main et va au bout** (Bloc 0, point 2). C'est la
   preuve mécanique. **Si le CTA de `/carte` ne reçoit toujours pas le clic en 390 × 664 sans
   cookie de consentement, on s'arrête** — là, ce n'est pas une question de délai, c'est que le
   correctif n'a pas tenu, et embellir l'entrée d'un tunnel encore fermé ne sert à rien.

### Ce qui ne bloque plus

Le relevé `signup_wall_clicked / signup_wall_viewed > 3 %` à J+14. Il **se fait quand même** — il
tombera pendant le sprint 81 (§3.1 de la roadmap). S'il est mauvais, il ouvre une reprise du
tunnel **dans le sprint en cours**, il ne fait pas reculer le calendrier.

> ### ⚠️ La contrepartie, non négociable
> Enchaîner ne marche que si **chaque sprint est mergé et déployé dès qu'il est vert**, avant de
> lancer le suivant. Cinq sprints empilés sur une branche et déployés d'un bloc à la fin, c'est
> six semaines de travail sans un seul témoin — exactement ce que cette roadmap reproche au
> sprint 78. Le calendrier de relevés du §7 de la roadmap suppose un déploiement à la fin de
> chaque sprint.

### 3. Une correction à l'audit, à ne pas propager

L'audit du 15/08 signalait le lien « Aller au contenu » rendu à **1 × 1 px** sur toutes les pages
comme un défaut d'accessibilité. **C'est faux.** `app/layout.tsx:78-82` utilise
`sr-only focus:not-sr-only` — c'est le motif correct d'un skip-link, et 1 × 1 px est exactement
ce que `sr-only` produit au repos. **Ne rien corriger là.** Le reste des cibles tactiles du
Bloc 5 reste valide.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-80/BRIEF.md`. Commence par le préalable
> bloquant : vérifie que le sprint 79 est mergé ET déployé, que ses critères sont cochés avec
> preuve, et rejoue son parcours de sortie à la main en 390 × 664. Arrête-toi seulement si ce
> parcours échoue — **le relevé à J+14 n'est pas une condition de départ, on enchaîne.** Puis
> lance les workstreams A, B, C et D en parallèle, et termine par le workstream VERIF. Ce sprint
> est un travail de RÉORDONNANCEMENT, pas de refonte : chaque bloc dit explicitement ce qu'il ne
> faut pas toucher. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 1, avant de déplacer quoi que ce soit | **supabase-guard** → Supabase (RO) | Les conditions du jour viennent déjà de la base et des API marée/météo. Vérifier **ce qui est déjà chargé** sur la fiche avant d'ajouter une requête : le but est de remonter de l'existant, pas d'en refetch. |
| Blocs 2 et 4, avant de toucher MapLibre | **docs-researcher** → Context7 | `maplibre-gl` : cycle de vie, `remove()`, gestion des requêtes en vol. Le défaut du Bloc 4 est très probablement une course au démontage. |
| Tous les blocs | **qa-chrome** → Claude in Chrome + Playwright | **Obligatoire, 390 × 664.** Ce sprint se juge au premier écran : la seule preuve valable est une capture du viewport, pas un diff. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Le Bloc 1 touche la page qui apporte 12 894 impressions/mois. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Que les trois surfaces d'entrée du site — la fiche de spot, l'accueil et la carte — répondent
dans le **premier écran d'un téléphone** à la question qui a amené le visiteur, au lieu de la
lui faire chercher.

---

## Le chiffre qui commande ce sprint

`/spots` apporte **12 894 impressions et 7,2 % de CTR à la position 7,1** : c'est le meilleur
actif du site. Le visiteur arrive en cherchant *« est-ce que ça mord à tel endroit »*.
**Le premier écran mobile d'une fiche ne contient ni marée, ni météo, ni score, ni description.**
Il contient un fil d'Ariane, deux badges, un nom, la mention « ZONE APPROCHÉE », une note sur 5
et trois pastilles d'espèces.

On ne va pas chercher plus de trafic. On va répondre à celui qui arrive.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallèle jour 1 |
|----|---------|-------|-----------|------------------|
| **—** | Bloc 0 — préalable et preuve mécanique | 0,5 j | S79 mergé **et déployé** | ❌ **bloque tout le reste** |
| **A** | Bloc 1 — la fiche de spot | 3 j | Bloc 0 | ✅ après Bloc 0 |
| **B** | Blocs 2 + 4 — l'accueil et sa carte | 2,5 j | Bloc 0 | ✅ |
| **C** | Bloc 3 — le cadrage de `/carte` | 1 j | Bloc 0 | ✅ |
| **D** | Blocs 5 + 6 — cibles tactiles, liens morts, libellés | 1,5 j | Bloc 0 | ✅ |
| **VERIF** | Revue finale | 0,5 j | tous | ❌ toujours en dernier |

---

## Bloc 0 — La preuve mécanique, puis on construit

Ce bloc remplace l'ancien « bloc de gate ». Il ne mesure plus un taux, **il rejoue un parcours** :
c'est ça, la preuve dont le S80 a besoin pour démarrer.

> **Connecteurs** : **qa-chrome** pour rejouer le parcours du S79 ; PostHog pour consigner le
> témoin (consigner, pas décider).

### Tâches

1. `git log --oneline -15` : le sprint 79 est mergé. `docs/sprint-79/RECAP.md` existe et ses
   critères sont cochés avec preuve. ⚠️ **Vérifier aussi qu'il est déployé** (Vercel, ou une
   requête sur la prod) — un RECAP qui dit « rien n'est poussé » ne prouve rien dans un sens
   comme dans l'autre, c'est la leçon du S78. La vérité est HEAD de `main` et la prod.
2. **La preuve mécanique.** Rejouer le parcours de sortie du S79 en 390 × 664, **sans cookie de
   consentement** : `/carte` → le CTA « Créer mon carnet » reçoit bien le clic → arrive sur une
   page dont le H1 est « Crée ton carnet ». Puis, dans la foulée, les trois autres correctifs :
   `/carnet/nouvelle` sans session **ne redirige pas** après hydratation · un brouillon part avec
   **l'espèce seule** · un parcours anonyme sur `/carte` et `/spots/[slug]` **ne montre aucun
   prix**. **Si l'un des quatre échoue, s'arrêter et le dire à John** — c'est le seul cas d'arrêt
   de ce sprint.
3. **Consigner, pas décider.** Relever `signup_wall_clicked / signup_wall_viewed` sur mobile
   depuis le déploiement du S79 et l'écrire dans le RECAP de ce sprint, **avec le nombre de jours
   écoulés en regard**. À J+2 ou J+3 la valeur ne veut encore rien dire statistiquement (2 clics
   sur 242 en 90 jours : le volume quotidien est minuscule) — **ne pas en tirer de conclusion, ne
   pas s'arrêter dessus.** C'est une base de comparaison pour le relevé à J+14, qui tombera
   pendant le S81.
4. Prendre les **captures « avant »** des quatre surfaces de ce sprint, en 390 × 664 :
   `/` (haut), `/carte`, `/spots/pointe-des-chats-groix` (haut), `/especes/bar` (section
   « OÙ PÊCHER BAR »). Les joindre au RECAP en regard des « après ». Sans avant/après, ce
   sprint n'est pas évaluable.

### Critères d'acceptation

- Les quatre correctifs du S79 sont rejoués et **prouvés en production** (capture ou sortie de
  `elementFromPoint()` à l'appui pour le CTA).
- Les quatre captures « avant » existent dans `docs/sprint-80/`.
- Le taux de clic du mur est consigné **avec sa fenêtre d'observation**, sans conclusion tirée.

---

## Bloc 1 — La fiche de spot répond dans le premier écran

C'est le bloc le plus important du sprint, et **le plus dangereux** : cette page ranke.

### Ce qui est mesuré aujourd'hui

Le hero navy (`app/(marketing)/spots/[slug]/page.tsx`, section commençant vers la ligne 665)
occupe la quasi-totalité du premier écran en 390 × 664 et contient, dans cet ordre :

1. Fil d'Ariane (`SPOTS > Bretagne > MORBIHAN · 56`)
2. Badges de provenance (`OPENSTREETMAP`) et de précision marée (`MARÉES ±8 MIN · CALÉ SHOM`)
3. `<h1>` + étoile favori
4. `ZONE APPROCHÉE · POINTE ROCHEUSE`
5. Étoiles de difficulté + pastilles d'espèces

Puis, seulement, le corps de page démarre par `SpotMiniMap` (hauteur 280 px, ligne ~775).

**Deux problèmes distincts :**

- **On mène avec une limitation.** « ZONE APPROCHÉE » est la première information de contenu que
  lit le visiteur. C'est honnête et ça doit rester sur la page — mais ce n'est pas ce qu'il est
  venu chercher, et c'est la première chose qu'on lui dit.
- **La réponse est trois écrans plus bas.** Marée, vent, score du jour : tout est déjà calculé et
  déjà sur la page. Il faut scroller pour l'atteindre.

> **Connecteurs** : **supabase-guard** en lecture pour confirmer d'où viennent les conditions du
> jour sur cette page. ⚠️ **Objectif : remonter ce qui est déjà chargé.** Si tu ajoutes un fetch,
> tu as raté le bloc — et tu dégrades le LCP de la page la plus rentable du site.

### Tâches

1. Composer une **bande « conditions du jour »** compacte, lisible en un coup d'œil sur 390 px :
   marée (prochaine pleine/basse + heure), vent (force + direction), score du jour. Trois
   informations, une ligne ou deux, pas un tableau.
2. La placer **immédiatement sous le `<h1>`**, au-dessus de la difficulté et des espèces.
   En Méditerranée, la marée cède la place au vent et à l'état de la mer — `facadeOf()` existe
   déjà et la logique de dégradation est écrite dans le générateur de fiches du S78 : la
   réutiliser, ne pas la réinventer.
3. Descendre `ZONE APPROCHÉE` et les étoiles de difficulté **sous** cette bande.
4. Réduire la hauteur du hero pour que la bande de conditions soit **visible sans scroll** en
   390 × 664. Cible : le premier pixel de la bande au-dessus de **560 px**.
5. ⚠️ **Ne pas toucher au `<h1>`, au fil d'Ariane, aux JSON-LD (`Place` + `BreadcrumbList`), aux
   balises `<title>` / `description` / canonique, ni au maillage interne.** C'est ce qui ranke.
   Le DOM sémantique bouge, le contenu textuel indexé ne change pas.
6. Corriger le **cadrage de `SpotMiniMap`** : sur `pointe-des-chats-groix`, la carte affiche
   l'intérieur des terres (Locmaria, Praceline) avec la mer au bord droit du cadre. Pour un spot
   de pêche, le poste doit être centré et la mer visible. Vérifier le zoom et l'offset sur au
   moins un spot de chaque type de poste (plage, pointe rocheuse, digue, cale, estuaire).

### Critères d'acceptation

- En 390 × 664 sur `/spots/pointe-des-chats-groix` (fiche curée) **et**
  `/spots/plage-de-bodri-osm113823751` (fiche générée) : marée ou vent, et le score, sont
  **visibles sans scroll**. Preuve : capture du viewport.
- Sur une fiche méditerranéenne, la bande **ne présente aucun argument de marée** et parle de
  vent, d'état de la mer et de lumière.
- Le `<title>`, la meta description, la balise canonique et les blocs JSON-LD sont **strictement
  identiques** avant/après (diff sur le HTML servi, hors bande ajoutée).
- **Aucune requête réseau supplémentaire** au chargement de la fiche : `performance.getEntriesByType('resource').length` ne
  progresse pas.
- LCP p75 mobile de `/spots/[slug]` **ne se dégrade pas** — mesure via `deploy-watch` à J+3.
- La mini-carte montre la mer et le poste centré sur les 5 types de poste testés.

### Garde-fous

- ⚠️ **Réordonner, pas refondre.** Toute modification qui change le texte indexé est hors
  périmètre.
- ⚠️ Ne pas retirer « zone approchée » : c'est une information honnête sur le floutage, elle
  descend, elle ne disparaît pas.
- Ne pas toucher au gating des coordonnées précises, au floutage, ni au k-anon K=3.
- Vérifier sur une fiche **générée** et une fiche **curée** systématiquement : elles n'ont pas
  les mêmes badges de provenance.

---

## Bloc 2 — L'accueil montre quelque chose dans le premier écran

**Mesuré :** en 390 × 664, le premier écran contient le logo, le bouton d'en-tête, un sur-titre,
un `<h1>` sur trois lignes qui occupe la moitié de la hauteur, une phrase et demie de paragraphe
— puis le bandeau de consentement (170 px). **Zéro preuve visuelle, zéro chiffre, zéro CTA dans
le corps de la page.**

**Témoin :** `home_cta_clicked` = **10 clics sur mobile en 90 jours**.

> **Connecteurs** : **qa-chrome**. Le seul juge de ce bloc est une capture du viewport.
> ⚠️ Le sprint 79 Bloc 6 a modifié le compteur et la meta description de cette page :
> partir de son état post-merge.

### Tâches

1. Resserrer le `<h1>` en 390 px : deux lignes maximum. Le texte ne change pas, sa taille et son
   interlignage oui.
2. Faire remonter **un CTA dans le corps** au-dessus de la pliure — pas seulement celui de
   l'en-tête. Il doit émettre `home_cta_clicked` (`components/marketing/home-v3/TrackedCta.tsx`
   le fait déjà).
3. Faire remonter **une preuve** au-dessus de la pliure : le compteur de spots corrigé au S79,
   ou une donnée réelle du jour (une marée, un score). Pas un argument, une donnée.
4. Vérifier le comportement avec **et** sans bandeau de consentement : ⚠️ si le sprint 81 fait
   disparaître le bandeau, la mise en page doit rester correcte dans les deux cas.

### Critères d'acceptation

- En 390 × 664, sans cookie de consentement : un CTA du corps de page **et** une donnée
  chiffrée réelle sont visibles sans scroll. Preuve : capture.
- Idem avec consentement accordé.
- `home_cta_clicked` est bien émis par le nouveau CTA (vérifiable dans PostHog).
- Aucun changement du `<h1>` textuel ni des JSON-LD (`WebSite`, `Organization`, `FAQPage`).

---

## Bloc 3 — `/carte` s'ouvre sur la France, pas sur la Bretagne

`lib/map/utils.ts:86-87` :

```ts
export const COASTAL_DEFAULT_CENTER: [number, number] = [-2.5, 47.0]
export const COASTAL_DEFAULT_ZOOM = 6
```

`[-2.5, 47.0]` est au large de la Vendée. En **portrait 390 × 664**, à ce zoom, le cadre visible
est haut et étroit : il montre Brest, Nantes et La Rochelle — **et laisse la Méditerranée hors
champ** (longitudes 3 → 9, latitudes 41 → 43,5).

> ### ★ Pourquoi ça compte maintenant
> Le sprint 78 a fait passer la Méditerranée de **19 % à 44,6 %** de l'inventaire publié. C'était
> l'objectif du Bloc 3, atteint en base. **À l'écran, ces 191 fiches n'existent pas.** Un pêcheur
> varois qui ouvre la carte voit un site breton — exactement le déséquilibre que le brief 78
> voulait corriger.

> **Connecteurs** : **docs-researcher** sur `fitBounds` / `padding` MapLibre si tu passes par des
> bornes plutôt que par un centre.

### Tâches

1. Remplacer le centre et le zoom par défaut de façon à ce que **les deux façades soient dans le
   cadre en portrait 390 × 664**. Deux approches acceptables, choisir la plus robuste :
   bornes explicites France métropolitaine littorale + `fitBounds` avec `padding`, ou centre
   recalculé (~`[2.4, 46.6]`) et zoom adapté au ratio du viewport.
2. ⚠️ **Le desktop ne doit pas régresser** : le zoom qui marche en portrait n'est pas celui qui
   marche en paysage. Adapter au ratio, pas une valeur en dur.
3. Si un département est détecté (géolocalisation accordée, ou filtre déjà posé),
   `getCenterForDepartment()` garde la priorité — comportement actuel préservé.
4. Vérifier que la Corse est dans le cadre : elle porte 311 spots éligibles à elle seule
   (2A + 2B).

### Critères d'acceptation

- En 390 × 664 sans géolocalisation, au chargement de `/carte` : des marqueurs sont visibles
  **en Méditerranée et sur la façade atlantique** dans le même écran. Preuve : capture.
- La Corse est dans le cadre.
- En 1440 × 900, le cadrage reste au moins aussi bon qu'avant. Preuve : capture avant/après.
- Un département détecté ou filtré recentre toujours dessus (non-régression).

---

## Bloc 4 — La carte du hero de l'accueil échoue et affiche la Cornouailles

**Mesuré le 15/08 sur `/`, depuis une connexion résidentielle française :**

```
FAIL https://api.maptiler.com/maps/dataviz-dark/sprite@2x.json  :: net::ERR_ABORTED
FAIL https://api.maptiler.com/tiles/v3/tiles.json?key=…         :: net::ERR_ABORTED
FAIL https://api.maptiler.com/maps/dataviz-dark/sprite@2x.png   :: net::ERR_ABORTED
```

Et le rendu affiche **« Truro »** — une ville des Cornouailles britanniques — en fond d'un site de
pêche française.

Deux causes distinctes, à traiter séparément :

| Symptôme | Piste |
|---|---|
| `ERR_ABORTED` sur trois ressources | `components/marketing/home-v3/HeroMap.tsx:38-70` monte la carte dans un `requestIdleCallback`, avec un drapeau `cancelled` et un `raf`. `ERR_ABORTED` est la signature d'un `map.remove()` ou d'un démontage pendant que les requêtes sont en vol — typiquement un double montage en StrictMode, ou un cleanup qui part trop tôt. |
| Cadrage sur la Cornouailles | `HeroMap.tsx:66-75` : `zoom: 7.4`, `pitch: 40`, `bearing: -18`. Le centre vient de `hero.position` (`lib/marketing/home-data.ts:285`), qui est un vrai spot — mais avec cette inclinaison et cette rotation, le cadre visible dérive nettement vers le nord. |

> **Connecteurs** : **docs-researcher** (Context7) sur le cycle de vie `maplibre-gl` et
> `map.remove()`. **qa-chrome** pour lire le réseau et le rendu.

### Tâches

1. Reproduire les trois `ERR_ABORTED` en 390 × 664 sur `/`, et identifier lequel du `cancelled`,
   du cleanup de `useEffect` ou d'un double montage les provoque.
2. Corriger de sorte qu'un chargement de l'accueil ne produise **aucune requête MapTiler
   annulée**.
3. Corriger le cadrage : avec `pitch: 40` et `bearing: -18`, compenser par un offset de centre ou
   réduire l'inclinaison, de sorte que **le cadre visible reste sur la façade française** du spot
   choisi. Vérifier sur au moins trois régions différentes de `hero.position`.
4. Prévoir la dégradation propre si MapTiler ne répond pas : un fond statique acceptable plutôt
   qu'un carré vide. Vérifier aussi le cas `NEXT_PUBLIC_MAPTILER_KEY` absent (déjà géré dans
   `MapView.tsx:459`, s'en inspirer).

### Critères d'acceptation

- Chargement de `/` en 390 × 664 : **zéro requête `api.maptiler.com` en `ERR_ABORTED`** ou en
  statut ≥ 400.
- Aucun toponyme étranger dominant dans le cadre du hero, sur trois régions testées.
- Si MapTiler est injoignable (bloquer le domaine dans le test), le hero reste présentable.
- Le LCP de `/` ne se dégrade pas.

---

## Bloc 5 — Les cibles tactiles et les deux liens morts

### 5a — Deux liens rendus à 0 × 0 pixel sur les fiches de spots

Relevé dans le DOM de `/spots/pointe-des-chats-groix` :

| Libellé | Cible | Taille rendue |
|---|---|---|
| `Créer mon carnet` | `/auth/register?redirect=%2Fspots%2Fpointe-des-chats-groix` | **0 × 0** |
| `+ Loguer une prise ici` | `/carnet/nouvelle?spot_id=<uuid>` | **0 × 0** |

Ils existent dans le HTML, ils sont invisibles et incliquables. Probablement des variantes
`md:`-only dont le conteneur mobile est réduit à zéro plutôt que retiré. **Deux issues de
conversion mortes sur la page la plus visitée du site.**

**Tâche :** identifier la cause, puis soit les afficher correctement sur mobile, soit les retirer
du DOM mobile. ⚠️ **Ne pas les laisser dans le DOM en 0 × 0** : un lien présent et incliquable
est le pire des trois états.

### 5b — Cibles sous 44 px

⚠️ **Le lien « Aller au contenu » à 1 × 1 px n'est PAS un défaut** — voir le préalable §3.

| Page | Élément | Taille | Fichier |
|---|---|---|---|
| `/especes/bar` | Liens de spots (× 15) | 308 × **37** | `components/especes/species-top-spots.tsx` |
| Fiches | « Comment le score est calculé » | **14 × 14** | `spots/[slug]/page.tsx` |
| Fiches | « Logue ta prise ici → » | 124 × **20** | idem |
| Fiches | Pastilles d'espèces | 46–117 × **32** | idem |
| `/auth/*` | Onglets Connexion / Inscription | 144 × **38** | `app/auth/login/login-client.tsx` |
| `/auth/*` | « Afficher le mot de passe » | **16 × 16** | idem |
| `/carte` | « Ouvrir les filtres » · « Retour » | 36 × 36 · 36 × 32 | `components/map/MapShell.tsx` |
| Bandeau | « Refuser » · « Accepter » · « En savoir plus » | 99 × 38 · 107 × 36 · 85 × **16** | `components/consent/CookieBanner.tsx` |

**Priorité : `/especes/bar` d'abord.** C'est la liste de spots que le sprint 78 vient de remonter
en tête de page pour qu'elle serve — et elle est à 37 px de haut. Le travail du Bloc 4 du S78 ne
produira pas son effet tant qu'on ne peut pas viser ses liens.

**Tâche :** porter chaque cible à **44 × 44 px minimum** de surface tactile. La zone de clic peut
dépasser le visuel (pseudo-élément, padding négatif) — l'esthétique n'a pas à changer.

### Critères d'acceptation

- Aucun élément interactif visible ne mesure moins de 44 px dans l'une des deux dimensions sur
  `/especes/bar`, `/spots/[slug]`, `/carte`, `/auth/login`, `/auth/register` — hors éléments
  `sr-only`.
- Test automatisé : un test qui échoue si une cible interactive visible passe sous 44 px sur ces
  cinq gabarits.
- Aucun lien rendu à 0 × 0 dans le DOM mobile des fiches.
- Aucun changement visuel notable : preuve par captures avant/après.

---

## Bloc 6 — Les libellés qui promettent à côté

La barre collante des fiches annonce **« Voir les conditions à Pointe des Chats, gratuit »** et
mène à `/auth/register`. **Les conditions sont déjà sur la page, gratuitement** — et le Bloc 1 de
ce sprint vient précisément de les remonter dans le premier écran.

Après le Bloc 1, ce libellé devient factuellement faux : il propose d'aller voir ce que le
visiteur a déjà sous les yeux, et livre un formulaire d'inscription.

> **Connecteurs** : lire `lib/gating/wall.ts` (`SIGNUP_WALL_CTA`, `wallCopyForSurface`) — la copie
> des murs y est centralisée depuis le S75/S76. La changer là, pas dans les composants.

### Tâches

1. Réécrire ce CTA pour qu'il promette ce qu'il livre. Ce que l'inscription apporte réellement à
   cet endroit : garder ce spot en favori, être prévenu quand les conditions y deviennent bonnes,
   loguer une prise. **Pas** « voir les conditions ».
2. Repasser par motif sur les libellés de CTA du site et vérifier qu'aucun autre ne promet un
   contenu déjà gratuit. C'est la méthode du §2.3 du S78, appliquée aux **libellés d'action**
   cette fois et non à la copie descriptive.
3. Copie : tutoiement, **aucun tiret cadratin dans la copie visible**
   (`node scripts/lint-copy-dashes.mjs`).

### Critères d'acceptation

- Aucun CTA du site ne promet l'accès à une information déjà affichée gratuitement sur la même
  page.
- `signup_wall_clicked` reste émis par le CTA modifié (le témoin ne doit pas disparaître avec le
  libellé).
- Le lint de copie passe.

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint`, revue
   croisée indépendante, passe anti-régression. Puis **deploy-watch**.
2. Relire **chaque** critère d'acceptation et cocher ✅ / ❌ **avec preuve**.
3. **Passe « premier écran »** (`qa-chrome`, 390 × 664, fr-FR, Europe/Paris), sans cookie de
   consentement puis avec. Pour chacune des quatre surfaces — `/`, `/carte`,
   `/spots/pointe-des-chats-groix`, `/spots/plage-de-bodri-osm113823751` — produire la capture
   **après** en regard de la capture **avant** du Bloc 0, et répondre par écrit à une seule
   question :
   > *Un pêcheur qui arrive ici depuis Google obtient-il une réponse utile sans scroller ?*
4. **Passe anti-régression SEO**, la plus importante de ce sprint. Sur trois fiches (une curée,
   une générée atlantique, une générée méditerranéenne) : `<title>`, `<meta description>`,
   canonique, JSON-LD et texte indexé **strictement inchangés** hors bande de conditions ajoutée.
   Diff du HTML servi à l'appui.
5. **Passe performance** : nombre de requêtes réseau et LCP p75 mobile sur `/`, `/carte` et
   `/spots/[slug]` — aucun des trois ne se dégrade. Relevé à J+3 via PostHog Web Vitals.
6. **Passe sécurité** : aucune RPC ni policy modifiée, floutage GPS et k-anon K=3 intacts, gating
   de tier des coordonnées précises inchangé. Ce sprint est de la présentation : si un fichier de
   `supabase/migrations/` apparaît dans le diff, c'est une erreur.
7. **Passe non-régression S79** : rejouer intégralement le parcours du Bloc 0, point 2. Les
   correctifs du sprint précédent doivent tenir.
8. Livrer `docs/sprint-80/RECAP.md` : fait / comment tester / reste manuel John, avec les
   captures avant/après appariées.

---

## Reste manuel John (post-sprint)

1. **Merger et déployer tout de suite**, puis enchaîner le S81 — c'est la contrepartie du
   préalable §2. Un sprint non déployé ne produit aucun témoin, et cinq sprints déployés d'un
   bloc à la fin, c'est six semaines à l'aveugle.
2. **QA sur un vrai téléphone** — les quatre surfaces, pouce compris. L'émulation mesure les
   pixels, elle ne mesure pas si une cible de 44 px se vise en marchant.
3. **Relevé J+14** des trois témoins de sortie du sprint 80 — il tombera **pendant le S82** :
   - rebond `/carte` mobile **< 30 %** *(base 40 %)*
   - `home_cta_clicked` **> 15/mois** *(base 3,3)*
   - `species_page_cta_clicked` **> 8/mois** *(base 0,3)*

   Mauvais relevé ⇒ on ouvre une reprise dans le sprint en cours, on ne fait pas reculer le
   calendrier. Voir §3.1 de la roadmap.
4. ⚠️ **Surveiller le CTR `/spots` à J+7 et J+14.** C'est le témoin de sortie global de la
   roadmap et ce sprint touche cette page. **Sous 6 %, on revient en arrière sur le Bloc 1**
   avant toute autre chose. ⚠️ **Ce frein-là n'est pas dégaté** : c'est un retour en arrière,
   pas une attente.
5. **Envoyer l'export GSC des impressions par page `/especes/*`** — la lane contenu est toujours
   bloquée dessus depuis le sprint 78, et le Bloc 5 rend justement `/especes/bar` utilisable.
6. ⚠️ **À lancer PENDANT ce sprint, pas après : la relecture juridique du Bloc 1 du S81**
   (PostHog en comptage sans cookie pour les anonymes). C'est le seul point de toute la chaîne
   dont le délai ne dépend pas de nous. Si elle n'est pas prête quand le S81 démarre, le S81
   commence par ses Blocs 2 à 5 et le Bloc 1 se déploie dès l'avis rendu — mais ⚠️ **le Bloc 2
   (disparition du bandeau) dépend du Bloc 1**, il glisse avec lui.
