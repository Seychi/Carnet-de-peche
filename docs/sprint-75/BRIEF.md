# Sprint 75 — Brief d'exécution
## « Le mur gratuit et la fiche qui convertit » : transformer 300 visiteurs Google par mois en comptes

> Rédigé le 2026-08-06. Durée cible : 2-3 sessions Fable. Prérequis : S74 mergé sur `main` (fait).
> Contexte : analyse SEO + conversion du 2026-08-06 (Google Search Console via Supermetrics sur 90 jours, PostHog 30 jours, lecture du code de gating). Lane : `docs/roadmaps/LANE-SEO-2026-08-05.md`.
> Ce sprint ne crée aucune feature. Il répare la conversion d'un trafic qui existe déjà et qui monte.

---

### Les chiffres qui commandent ce sprint (GSC 08/05 → 08/05, 90 jours)

| Type de page | Clics | Impressions | CTR | Position |
|---|---|---|---|---|
| `/spots/*` | 367 | 4 364 | **8,4 %** | 6,7 |
| `/peche/*` (programmatique) | 282 | 3 853 | **7,3 %** | 7,0 |
| racine (`/`, `/carte`, `/tarifs`…) | 140 | 1 842 | 7,6 % | 7,1 |
| **`/especes/*`** | **97** | **5 667** | **1,7 %** | 8,3 |
| `/guides/*` | 12 | 369 | 3,3 % | 8,1 |

**Total : 893 clics, 15 821 impressions, CTR 5,6 %, position 7,4.** Croissance nette depuis fin juillet.

Quatre faits structurants :

1. **`/especes` = 36 % des impressions du site pour 11 % des clics.** À 5 % de CTR (encore sous les autres formats), ce sont **+187 clics/trimestre** sans une seule position gagnée.
2. **`/spots` et `/peche` convertissent 5× mieux** (8,4 % et 7,3 %). Le format « où pêcher » est le format gagnant, la curation des spots est validée par les données.
3. **82 % du trafic est mobile** (732 clics sur 893, 12 848 impressions). Toute décision d'UI se prend sur mobile d'abord.
4. **92 % du trafic vient de requêtes anonymisées par Google** (`(unknown)` = 880 clics / 14 583 impressions) : c'est de la longue traîne pure, des milliers de micro-requêtes. La croissance vient donc du **volume de pages spécifiques**, pas de la conquête de head terms.

**Et le trou de conversion (PostHog, 30 j, sous-comptage RGPD assumé) : 94 visiteurs venus des moteurs → 35 paywalls vus (37 %) → 0 clic CTA → 1 seul compte créé.**

Cause identifiée dans le code, `components/map/MapFilters.tsx:197` :
```ts
const isGated = userTier === 'anonymous' || userTier === 'discovery'
```
Un visiteur anonyme reçoit le même message qu'un inscrit gratuit : « Tu vois 3 spots par département. Passe en Local (4,90 €/mois) ». **On vend un abonnement à quelqu'un qui n'a pas encore de compte gratuit.**

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-75/BRIEF.md`. Lance les workstreams A, B et D en parallèle dès maintenant, puis C et E selon le tableau, et termine par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0 | **supabase-guard** → Supabase | Ancrer les données servies aux fiches (spots curés par département et par espèce) avant de coder le maillage. |
| Avant tout composant carte | **docs-researcher** → Context7 | MapLibre 5 / Next 15 : ne pas coder de mémoire sur le gating client. |
| Blocs A et B | **qa-chrome** | QA en viewport **390 px d'abord** (82 % du trafic), anonyme ET connecté gratuit, sur fiche espèce et sur carte. |
| Clôture | **`/verif-sprint`** puis **deploy-watch** | Standard. |

## Objectif du sprint en une phrase

Un visiteur Google anonyme qui atterrit sur une fiche espèce mobile obtient sa réponse en moins d'un écran, voit où pêcher cette espèce près de chez lui, et le premier mur qu'il rencontre lui propose de créer un carnet **gratuit** — jamais de payer.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Bloc 1 — Séparer le mur gratuit du mur payant | 1 j | — | ✅ |
| B | Bloc 2 — Fiches espèces mobile-first | 1,5 j | Bloc 0 (données) | ✅ (Bloc 0 est court) |
| C | Bloc 3 — Maillage espèce → spots → carte | 0,5 j | B | ❌ |
| D | Bloc 4 — Titles, metas et intentions | 0,5 j | — | ✅ |
| E | Bloc 5 — Mesure du funnel SEO → compte | 0,5 j | A, B | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Ancrage (lecture seule, livrable `docs/sprint-75/research/anchor.md`)

### Tâches
1. **Recenser toutes les surfaces de gating** qui appellent `analytics.paywallViewed` : `components/map/MapFilters.tsx` (l. 197-202), `MapLayerSelector.tsx` (93-95), `NearbyPanel.tsx` (98), `ScorePanel.tsx` (34), `UpsellBanner.tsx` (18), plus `SpotPopup.tsx` (285) et `MapShell.tsx` (203). Pour chacune : que voit un `anonymous` aujourd'hui, que voit un `discovery` ? Tableau dans `anchor.md`.
2. **SQL** : par espèce du carnet (26), combien de spots `approved` la mentionnent dans `species`, et dans quels départements. C'est la donnée du Bloc 3 : si une espèce n'a aucun spot publié, le bloc de maillage doit se comporter proprement.
3. Vérifier comment `/especes/[slug]` récupère ses données aujourd'hui (`app/(marketing)/especes/[slug]/page.tsx`, 494 lignes) : contenu statique (`lib/especes/content/*`) vs requêtes live, et ce qui est déjà rendu côté serveur.
4. Mesurer la longueur réelle du contenu d'une fiche espèce (mots, hauteur de page à 390 px) pour objectiver l'élagage du Bloc 2.

### Critères d'acceptation
- `anchor.md` : tableau des surfaces de gating (anonyme vs gratuit), table espèce → nb de spots publiés → départements, mesure de longueur.

---

## Bloc 1 — Séparer le mur « compte gratuit » du mur « abonnement »

Le levier n°1 du sprint. **Aucun changement du modèle économique** : ce qui est payant reste payant. On corrige uniquement **à qui on parle**. Un anonyme n'a rien à acheter, il a un compte à créer.

> **Connecteurs** : docs-researcher avant tout changement de composant carte ; qa-chrome pour les deux parcours.

### Tâches
1. **Introduire une distinction explicite** dans les composants de gating : `anonymous` → mur d'inscription ; `discovery` → upsell abonnement ; `local`/`itinerant` → rien. Remplacer les `isGated = anonymous || discovery` par deux états distincts (proposition : un helper partagé `lib/gating/wall.ts` exposant `getWallKind(userTier)` → `'signup' | 'upsell' | 'none'`, pour ne pas dupliquer la règle dans 7 composants).
2. **Copy du mur d'inscription** (tutoiement, honnête, sans promesse fausse) : titre du type « Crée ton carnet, c'est gratuit », corps qui dit ce que le compte gratuit donne **réellement** (carnet illimité, marées et météo, fil régional complet, 3 spots par département sur la carte) et CTA vers `/auth/register?redirect=…` qui **ramène l'utilisateur exactement où il était**. Aucune mention de prix dans ce mur.
3. **`UpsellBanner`** : ne s'affiche plus jamais pour un anonyme. Un composant `SignupBanner` prend sa place, même emplacement, même mécanique de dismiss 7 jours (cookie distinct).
4. **`SpotPopup`** : pour un anonyme, le CTA mène à l'inscription avec redirect vers la fiche spot (le comportement `buildLoginRedirect` existe déjà l. 285, le vérifier et l'uniformiser).
5. **Fiches spots publiques** (`app/(marketing)/spots/[slug]/page.tsx`) : un encart d'inscription contextuel remplace tout message d'abonnement pour les anonymes.
6. **Instrumentation** : nouvel événement `signup_wall_viewed { surface }` distinct de `paywall_viewed` (qui reste réservé aux inscrits gratuits), plus `signup_wall_clicked { surface }`. Sans ça, on ne saura pas si le sprint a marché.

### Critères d'acceptation
- Navigation anonyme sur `/carte` : **zéro mention de prix, zéro « 4,90 € »**, un mur d'inscription visible, cliquable, qui ramène au point de départ après création du compte.
- Navigation avec un compte `discovery` : l'upsell Local s'affiche comme aujourd'hui (non-régression du modèle éco).
- `local`/`itinerant` : aucun mur (non-régression).
- Le gating **des données** est inchangé : un anonyme ne voit toujours que 3 spots par département, coordonnées floutées, pas de score. **Aucune donnée payante n'est libérée par ce sprint.**
- Les deux événements PostHog partent avec la bonne `surface`.

### Garde-fous
- Ne pas toucher aux RPC ni aux policies RLS : ce bloc est 100 % présentation.
- Ne pas modifier `current_tier` ni la logique d'abonnement.

---

## Bloc 2 — Fiches espèces mobile-first (le gisement des 5 667 impressions)

Aujourd'hui : ~1 500 mots, le CTA « Créer mon carnet gratuit » est **ligne 478 sur 494**, soit après tout le contenu. Sur mobile (82 % du trafic), personne ne l'atteint. Et la réponse que les gens cherchent (maille, quota, saison en cours) est noyée entre 8 blocs de prose saisonnière et une section « Où se poster » de trois paragraphes génériques.

**Principe : réponse d'abord, preuve ensuite, produit au milieu.** On ne supprime pas le contenu de fond (il porte le référencement), on le hiérarchise et on le compacte.

> **Connecteurs** : qa-chrome en 390 px, avant/après, captures dans le RECAP.

### Tâches
1. **Bloc réponse en tête** (juste sous le titre, avant toute prose) : maille de l'espèce par façade, quota s'il existe, **statut du jour** (« pêche ouverte » / « pêcher-relâcher jusqu'au 31 mars » calculé, pas écrit en dur), date de vérification et source. C'est la réponse aux requêtes réellement observées (« maille du maigre 2026 », « bar maille », « barracuda taille minimum », « congre taille max »).
2. **Compacter les saisons** : les 8 blocs de prose (4 saisons × 2 façades) deviennent un tableau compact ou une frise, avec la saison en cours mise en avant. La prose détaillée d'une saison reste accessible au dépliement, pas par défaut.
3. **Élaguer « Où se poster selon les conditions »** : 3 paragraphes → 4 à 6 puces concrètes. Supprimer les formulations passe-partout qui n'apportent aucune information vérifiable. Règle : si une phrase reste vraie pour n'importe quelle espèce, elle dégage.
4. **CTA contextuel précoce** : après le bloc réglementation, un encart qui relie la lecture au produit (« Tu pêches le bar ? Logue tes prises, ton carnet te dira quand elles tombent »), et non pas un bandeau publicitaire. Le CTA final reste.
5. **Sticky mobile discret** : la barre existante en bas de fiche est conservée, mais vérifiée en 390 px (elle ne doit jamais masquer le contenu ni doubler le CTA contextuel).
6. **Ordre final des sections** : réponse → maillage vers les spots (Bloc 3) → techniques → saisons compactées → postes → FAQ → autres espèces.

### Critères d'acceptation
- En 390 px, le premier écran contient : nom de l'espèce, maille et statut du jour. Mesuré en capture.
- Un CTA produit est atteignable **avant 40 % de la hauteur de page** (mesuré, pas estimé).
- Le contenu de fond reste indexable : aucune section rendue uniquement au clic côté client sans être dans le HTML servi (vérifier avec `curl` ou l'inspection du HTML SSR, régression SEO interdite).
- Le JSON-LD et la FAQ existants restent valides (test Rich Results ou validation locale).
- Copy : tutoiement, aucun tiret cadratin (`node scripts/lint-copy-dashes.mjs`), aucune affirmation non sourcée.

---

## Bloc 3 — Maillage « où pêcher cette espèce » (relier le volume au format qui convertit)

C'est le pont entre les 5 667 impressions de `/especes` et les pages à 8 % de CTR. Une fiche espèce doit envoyer vers des spots réels.

### Tâches
1. **Bloc « Où pêcher le [espèce] »** sur chaque fiche espèce : liste des spots publiés qui mentionnent cette espèce, groupés par département, limitée à ~8 avec un lien « voir les N spots sur la carte » vers `/spots?species=[slug]` (landing déjà dans le sitemap). Nom et commune uniquement, **jamais de coordonnées**.
2. **Liens vers les pages programmatiques** `/peche/[espece]/[technique]/[departement]` correspondant aux techniques de l'espèce et aux départements où elle a des spots (ces pages font déjà 7,3 % de CTR, elles méritent des liens internes).
3. **Réciproque sur les fiches spots** : lien vers la fiche de chaque espèce citée (si ce n'est pas déjà le cas, le vérifier au Bloc 0).
4. **Cas vide honnête** : espèce sans spot publié → pas de bloc fantôme, pas de « bientôt », on n'affiche rien. La curation comblera.

### Critères d'acceptation
- Fiche `/especes/bar` : le bloc liste des spots réels du catalogue, les liens fonctionnent, aucune coordonnée exposée.
- Une espèce sans spot publié rend une page sans bloc et sans espace vide.
- Aucune requête N+1 ajoutée au rendu (mesurer le nombre de requêtes Supabase par page).

---

## Bloc 4 — Titles, metas et intentions réelles

Les requêtes observées montrent deux intentions distinctes que le site traite pareil : **« c'est quoi ce poisson »** (congre, barracuda, liche amie, pageot, marbré, tassergal — souvent en position 2-3 avec **0 % de CTR**, captées par les AI Overviews) et **« où / comment le pêcher »** (surfcasting morbihan, leurre lieu jaune, gravelines peche — celles qui cliquent).

**Décision : on ne se bat pas pour les requêtes-définitions.** On optimise pour l'intention pêche, qui est notre produit et notre différenciation.

### Tâches
1. **Titles des fiches espèces** : mettre en avant l'information actionnable et l'année quand elle est pertinente (la requête « maille du maigre 2026 » est en position 4). Modèle à valider : `[Espèce] : maille [X] cm, saisons et spots du bord · Carnet de Pêche`. Garder sous ~60 caractères.
2. **Meta descriptions** : une phrase qui promet la réponse concrète (maille, quota, saison en cours) plutôt qu'une description générique du site.
3. **Vérifier les pages à fort volume et faible CTR** en priorité : `/especes/maigre` (894 impressions, 1,9 %), `/especes/mulet` (834, 2,5 %), puis les autres fiches espèces.
4. **`/guides`** (12 clics, 369 impressions, 3,3 %) : les 6 guides existants sont bons mais orphelins. Les lier depuis les fiches espèces et les fiches spots concernées. Ne PAS écrire de nouveaux guides dans ce sprint (c'est la lane contenu).

### Critères d'acceptation
- Chaque fiche espèce a un title et une meta description spécifiques, sous les limites, sans tiret cadratin.
- Aucun canonical, aucune balise robots modifiés par erreur (régression SEO interdite, vérifier le HTML servi).

---

## Bloc 5 — Mesurer le funnel SEO → compte

Sans instrumentation, on ne saura pas si ce sprint a marché, et le prochain arbitrage se fera encore à l'intuition.

### Tâches
1. **Événements** (client, `lib/analytics.ts`) : `signup_wall_viewed` / `signup_wall_clicked` (Bloc 1), `species_page_cta_clicked { species, position: 'inline' | 'sticky' | 'footer' }`, `species_to_spot_clicked { species, spot_slug }`.
2. **Attribution d'entrée** : s'assurer que la première page vue et le `$referring_domain` sont bien attachés à la personne, pour pouvoir répondre à « combien de visiteurs Google arrivés sur une fiche espèce ont créé un compte ».
3. **Requête HogQL de suivi** documentée dans le RECAP : visiteurs moteurs → mur d'inscription vu → clic → `signup_completed`, par page d'entrée. À relancer à J+14 et J+30.
4. **Suivi SEO récurrent** : Supermetrics GSC est branché (compte `redkps4@gmail.com`, site `sc-domain:carnet-de-peche.com`). Documenter dans le RECAP les 3 requêtes utiles (par `pathlevel1`, par `query`, par `device`) pour rejouer l'analyse chaque mois sans repartir de zéro.

### Critères d'acceptation
- Les 4 événements partent avec les bonnes propriétés (test unitaire ou vérification live).
- La requête de suivi tourne et renvoie le funnel, même avec des zéros.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + passe anti-régression), puis **deploy-watch** après déploiement.
2. **Passe anti-régression modèle économique** (la plus importante de ce sprint) : un compte `discovery` voit toujours l'upsell Local ; aucune donnée payante (coordonnées précises, score, filtres, couches) n'est accessible à un anonyme ou à un gratuit ; `current_tier` intact.
3. **Passe SEO** : HTML servi comparé avant/après sur 3 fiches espèces (le contenu de fond doit rester présent), canonicals et JSON-LD inchangés ou valides, aucune page passée en `noindex` par accident.
4. **Passe mobile 390 px** (qa-chrome) : fiche espèce et carte, anonyme et connecté gratuit, captures avant/après dans le RECAP.
5. Passe copy : tutoiement, zod en français, lint tirets cadratins, aucune promesse produit fausse dans les nouveaux murs.
6. Livrer `docs/sprint-75/RECAP.md` : fait / comment tester / reste manuel John / requêtes de suivi.

## Reste manuel John (post-sprint)

- Merge `sprint-75` → `main`, déploiement, contrôle `deploy-watch`.
- **Décision Vercel toujours ouverte** : CPU Hobby dépassé (7 h 34 / 4 h), les 503 servis aux crawlers pénalisent un trafic qui monte. Pro (~20 $/mois) ou mini-sprint perf.
- À J+14 : relancer la requête de suivi (Bloc 5) et l'analyse Supermetrics, comparer le CTR de `/especes` avant/après.
- Lane contenu inchangée : la curation quotidienne continue (c'est elle qui alimente le format à 8,4 % de CTR), et les guides restent à écrire hors sprint.
