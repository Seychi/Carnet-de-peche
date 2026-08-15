# Sprint 79 — Brief d'exécution
## Le tunnel qui s'ouvre

> Rédigé le **2026-08-15**. Durée cible : **1 semaine**.
> Contexte : `docs/sprint-78/AUDIT-MOBILE-2026-08-15.html` (audit mobile + QA du S78),
> `docs/roadmaps/ROADMAP-CONVERSION-2026-08-15.md` (§S79), `docs/sprint-78/RECAP.md`.
> **Décisions John 2026-08-15, verrouillées** :
> 1. **Le score reste gratuit, assumé.** On ne le regate nulle part. Local se vendra sur les
>    alertes par port, les coordonnées précises et le hors-ligne (sprint 83).
> 2. **La phase mobile (Expo) reste gatée** derrière la conversion web. Aucune dépendance RN
>    dans ce sprint ni dans les suivants jusqu'au gate.

**Préalable avant de démarrer (manuel John)** : merger et déployer le sprint 78 s'il ne l'est
pas entièrement. ⚠️ Les correctifs 1 et 2 du Bloc 1 du S78 sont **bien en production** (vérifié
le 15/08), mais le RECAP du S78 dit « rien n'est poussé » — la vérité est HEAD de `main`,
pas la ligne de statut du RECAP. **Vérifier git avant de conclure quoi que ce soit.**

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-79/BRIEF.md`. Lance les workstreams A, B, C,
> D et E en parallèle dès maintenant, respecte les dépendances du tableau, et termine par le
> workstream VERIF avant de me rendre la main. Chaque défaut de ce brief a été mesuré en
> production : reproduis-le avant de le corriger, et prouve-le après. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher PostHog, Next 15 App Router, `@supabase/ssr` | **docs-researcher** → Context7 | L'API de capture serveur PostHog et les règles d'hydratation Next 15 ne se codent pas de mémoire (leçon du S78 : `value` contrôlé vs `max` attribut). |
| Bloc 0 uniquement, en lecture | **supabase-guard** → Supabase (RO) | Vérifier d'où part `signup_completed`. **Aucune migration n'est attendue dans ce sprint** : si tu en proposes une, tu as mal lu le brief. |
| Blocs 1, 2, 3, 4 — reproduction et preuve | **qa-chrome** → Claude in Chrome + Playwright | **Obligatoire.** Chaque défaut se reproduit en émulation iPhone 13 (390 × 664, fr-FR, Europe/Paris) AVANT correctif et se re-teste APRÈS. Le mode desktop ne montre aucun de ces défauts. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Le Bloc 3 touche l'hydratation : c'est exactement la famille d'erreurs qui remonte dans Sentry. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

Qu'un pêcheur arrivé de Google sur un téléphone puisse créer un compte sans rencontrer un seul
obstacle mécanique, et que `signup_wall_clicked / signup_wall_viewed` sur mobile passe de
**0,83 % à plus de 3 %**.

---

## Le chiffre qui commande ce sprint

Sur 90 jours, mobile, comptes de test exclus : **242 murs d'inscription vus, 2 cliqués.**
Ce n'est pas un problème de copie ni de désir. Trois des cinq défauts ci-dessous rendent le
CTA **physiquement inatteignable ou trompeur**. Les deux autres cassent le parcours juste après.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallèle jour 1 |
|----|---------|-------|-----------|------------------|
| **A** | Bloc 0 — mesure minimale | 0,5 j | — | ✅ |
| **B** | Blocs 1 + 2 — `/carte` | 0,5 j | — | ✅ |
| **C** | Bloc 3 — `/carnet/nouvelle` | 1 j | — | ✅ |
| **D** | Bloc 4 — brouillon + rappel | 1 j | C (même page) | ⚠️ démarrer l'analyse jour 1, l'écriture après C |
| **E** | Blocs 5 + 6 — paywall, vérité, canonicals | 1 j | — | ✅ |
| **VERIF** | Revue finale | 0,5 j | tous | ❌ toujours en dernier |

---

## Bloc 0 — La mesure minimale, sans quoi rien n'est évaluable

`signup_completed` (27 sur 90 j) et `onboarding_finished` (21) sont émis **côté serveur** et
arrivent dans PostHog **sans `$device_type`**. Conséquence : aucun funnel mobile ne peut se
terminer, et « 0 compte mobile » est en partie un artefact. On ne peut donc pas prouver qu'un
correctif mobile a marché. C'est le prérequis de tous les témoins de cette roadmap.

> **Connecteurs** : **docs-researcher** (Context7) sur l'API de capture serveur `posthog-node`
> ou l'API `/capture` selon ce qui est utilisé — vérifier la forme exacte des propriétés avant
> d'écrire. **supabase-guard** en lecture seule si la capture part d'un webhook ou d'une action.

### Tâches

1. Localiser les points d'émission de `signup_completed` et `onboarding_finished` (chercher
   depuis `lib/analytics.ts` et les Server Actions d'`app/actions/`).
2. Y joindre `$device_type`, `$os`, `$browser` — dérivés du `User-Agent` de la requête, ou
   repris du `distinct_id` client si la session est déjà liée.
3. **Alternative acceptable et plus simple** : capter en plus un `signup_completed_client`
   côté navigateur au retour du callback d'auth, qui portera naturellement les propriétés
   PostHog. Dans ce cas, **documenter lequel des deux fait foi** pour éviter un double comptage
   dans six semaines.
4. Vérifier que `catch_log_started`, `catch_log_abandoned`, `pending_catch_started` et
   `pending_replayed` portent bien `$device_type` (`catch_log_abandoned` n'apparaît qu'en
   Desktop sur 90 j — soit il ne se déclenche pas sur mobile, soit il perd sa propriété : les
   deux cas sont un bug à corriger).

### Critères d'acceptation

- Une inscription faite depuis un navigateur en émulation mobile produit un événement avec
  `$device_type = "Mobile"`, vérifiable dans PostHog dans les 5 minutes.
- Le funnel `$pageview → signup_wall_viewed → signup_wall_clicked → signup_completed`
  filtré sur `$device_type = Mobile` **retourne une valeur non nulle à la dernière étape**
  pour un parcours de test.
- Aucun événement dupliqué : une inscription = une occurrence de l'événement qui fait foi.

### Garde-fous

- ⚠️ Aucune donnée identifiante supplémentaire. On ajoute trois propriétés techniques, pas un
  profil. `person_profiles: 'identified_only'` reste tel quel.
- Ne pas toucher au consentement dans ce sprint : c'est le sprint 81.

---

## Bloc 1 — `/carte` : le bandeau de consentement recouvre 92 % du CTA d'inscription

Le correctif n° 3 du Bloc 1 du sprint 78 a été appliqué aux fiches de spots, **où il fonctionne
parfaitement** (vérifié : barre 413→482, bandeau 482→652, zéro chevauchement). Il n'a jamais
été appliqué à `/carte`, où le défaut est intact.

**Mesuré le 15/08 en émulation iPhone 13, viewport 390 × 664 :**

| Élément | Fichier | z-index | Position verticale |
|---|---|---|---|
| Barre « Crée ton carnet, c'est gratuit » | `components/map/SignupBanner.tsx:229` | 40 | 514 → 664 px |
| Colonne de boutons flottants (géoloc, recentrage) | `components/map/MapShell.tsx:727` | 50 | 516 → 640 px |
| **Bandeau de consentement** | `components/consent/CookieBanner.tsx` | **60** | **482 → 652 px** |

**Recouvrement : 138 px sur 150, soit 92 %.** Test de clic :
`document.elementFromPoint()` au centre du CTA ne renvoie pas le CTA. Il est **inatteignable au
doigt** pour tout visiteur qui n'a pas encore répondu au bandeau, c'est-à-dire tout nouveau venu.

**Et même après acceptation**, la colonne de boutons flottants (z-50) recouvre encore le CTA
secondaire « C'est gratuit » (107 × 32 px) — `elementFromPoint()` échoue toujours.

> ### ★ Pourquoi c'est le défaut n° 1 du site
> **`/carte` déclenche 106 des 242 murs d'inscription mobiles, soit 44 %.** C'est la première
> surface d'inscription du produit, et elle est masquée par défaut. C'est aussi la page au plus
> fort taux de rebond parmi les entrées mobiles (**40 %**).

> **Connecteurs** : **qa-chrome** obligatoire, avant et après. Le mécanisme correctif existe
> déjà et est documenté dans `app/globals.css` lignes 407-425 — **le lire avant d'écrire quoi
> que ce soit**, il ne s'agit pas d'en inventer un second.

### Tâches

1. Lire le mécanisme existant : `CookieBanner` publie sa hauteur réelle (ResizeObserver) dans
   `--consent-banner-height` et pose `data-consent-pending` sur `<html>`
   (`components/consent/CookieBanner.tsx:44-61`). La règle consommatrice est
   `app/globals.css:423` :
   ```css
   [data-consent-pending] .sticky-bottom-bar {
     bottom: calc(var(--consent-banner-height, 0px) + 0.75rem);
   }
   ```
2. Appliquer la **même** classe `.sticky-bottom-bar` (ou une classe sœur partageant la règle) au
   conteneur fixe de `components/map/SignupBanner.tsx:229` **et** à celui de
   `components/map/UpsellBanner.tsx:33`, qui occupe le même emplacement.
3. Remonter la colonne de boutons flottants (`components/map/MapShell.tsx:727`) **au-dessus** de
   la barre d'inscription plutôt que par-dessus : son `bottom` doit s'adosser à la hauteur de la
   barre, elle-même adossée au bandeau. Empiler, ne pas superposer.
4. ⚠️ Ne pas se contenter d'augmenter le z-index de la barre : passer la barre d'inscription
   au-dessus du bandeau de consentement rendrait le refus des cookies inaccessible. **On empile
   verticalement, on ne se dispute pas le z-index.**

### Critères d'acceptation

- En émulation iPhone 13 sur `/carte`, **sans cookie de consentement** :
  `document.elementFromPoint(cx, cy)` au centre géométrique du bouton « Créer mon carnet »
  renvoie ce bouton (ou l'un de ses descendants).
- Même test **avec** `cdp-analytics-consent=granted` : idem pour les **deux** CTA de la barre.
- Le bandeau de consentement reste entièrement visible et ses deux boutons cliquables.
- Aucune régression sur `/spots/[slug]` : la barre collante des fiches reste au même endroit
  (vérifier sur une fiche curée **et** une fiche générée `*-osm*`).
- Test automatisé ajouté : un test qui échoue si un élément fixe de `z-index > 40` chevauche
  verticalement la barre d'inscription en 390 × 664.

### Garde-fous

- Ne pas toucher : `lib/consent.ts`, la logique d'affichage du bandeau, `PostHogProvider`.
  Le consentement est le sujet du sprint 81.
- Ne pas toucher au gating de tier ni à `lib/gating/wall.ts` au-delà du Bloc 2.

---

## Bloc 2 — `/carte` : le CTA d'inscription mène à une page de connexion

`components/map/MapShell.tsx:697` :

```tsx
href="/auth/login?tab=register"
```

Le visiteur qui clique sur une promesse de gratuité atterrit sur une page dont le `<title>` est
« Connexion · Carnet de Pêche » et dont le **H1 est « Connexion à ton carnet »**. Partout
ailleurs sur le site, le même geste mène à `/auth/register`.

Ça se voit dans les données : **`/auth/login` est la 2ᵉ page d'entrée mobile du site**
(15 visiteurs, 47 vues sur 30 j), devant la page d'accueil.

> **Connecteurs** : aucun. C'est une ligne.

### Tâches

1. Remplacer par `buildSignupHref(currentPath)` — la fonction existe déjà et fait exactement le
   bon travail (`lib/gating/wall.ts:215`, retourne `/auth/register?redirect=…` avec
   `safeInternalPath`). Le second CTA de la même barre l'utilise déjà correctement.
2. Chercher toute autre occurrence de `tab=register` dans un `href` de composant et appliquer le
   même traitement. ⚠️ **Ne pas casser** la route `/auth/login?tab=register` elle-même : des
   liens indexés en dépendent (`app/auth/register/page.tsx:33` le documente).
3. Ajouter `signup_wall_clicked` sur ce CTA s'il n'y est pas — sans quoi le témoin du sprint ne
   verra pas l'amélioration.

### Critères d'acceptation

- `grep -rn 'auth/login?tab=register' components/` ne retourne plus aucun `href` de CTA
  d'inscription (les commentaires et tests peuvent rester).
- Un clic sur « C'est gratuit » depuis `/carte` mène à une page dont le H1 est « Crée ton
  carnet », avec `?redirect=%2Fcarte`.
- L'ancienne URL `/auth/login?tab=register` répond toujours 200.

---

## Bloc 3 — `/carnet/nouvelle` renvoie l'anonyme vers la connexion, après hydratation

Le middleware est correct (`middleware.ts`, `PUBLIC_APP_ROUTES = ["/carnet/nouvelle"]`) et le
serveur rend bien le formulaire. **C'est le client qui redirige après hydratation.**

**Reproduit le 15/08, deux fois :**

```
GET /carnet/nouvelle
  → titre après SSR   : « Nouvelle prise — Carnet de Pêche »
  → titre après 6 s   : « Connexion · Carnet de Pêche »
  → URL finale        : /auth/login?redirect=%2Fcarnet%2Fnouvelle

GET /carnet/nouvelle?spot_id=cap-de-la-croisette-osm8811707251   (un SLUG)
  → même redirection

GET /carnet/nouvelle?spot_id=092bf5a4-7099-4deb-9e79-710c23b87076   (un UUID)
  → reste sur le formulaire ✅
```

Trois conséquences, par ordre de gravité :

1. Toute entrée directe sur `/carnet/nouvelle` (lien partagé, historique, saisie, menu) tombe
   sur un mur de connexion — alors que la page affiche elle-même **« Remplis d'abord, le compte
   vient après »**. C'est la promesse du sprint 77, contredite dans le navigateur.
2. Un `spot_id` en **slug** au lieu d'UUID déclenche la même redirection, silencieusement.
3. Le `?redirect=` **perd le `spot_id`** : même après connexion, le contexte du spot est perdu.

> **Connecteurs** : **qa-chrome** pour reproduire (le défaut est invisible en SSR : `curl` renvoie
> le bon formulaire). **docs-researcher** sur les règles d'hydratation et les garde d'auth
> client de Next 15 — la leçon du S78 vaut ici : *ce que le serveur émet compte plus que ce que
> le JSX suggère*.

### Tâches

1. Trouver la garde côté client qui déclenche la redirection. Chercher dans `app/carnet/nouvelle/`,
   `components/catches/CatchForm.tsx`, et tout `useEffect` qui lit la session Supabase et appelle
   `router.replace('/auth/login…')`. ⚠️ **Ne pas supposer où elle est : la trouver.**
2. La rendre tolérante à `user === null`, conformément au commentaire du middleware :
   « chaque entrée est une page qui doit tolérer `user === null` de bout en bout, sans jamais
   lire ni écrire de donnée utilisateur ».
3. Accepter un `spot_id` en **slug** aussi bien qu'en UUID : résoudre le slug côté serveur, ou
   dégrader proprement (formulaire sans spot pré-rempli) plutôt que rediriger.
4. Si une redirection reste nécessaire dans un cas précis, **préserver la query complète** dans
   le `?redirect=`, pas seulement le pathname.
5. Trancher `robots.txt` : il contient `Disallow: /carnet`, alors que chacune des 607 fiches
   pointe désormais 3 liens vers `/carnet/nouvelle`. Soit on ouvre `/carnet/nouvelle`
   spécifiquement (c'est une surface publique assumée depuis le S77), soit on assume le
   `Disallow` et on le documente. ⚠️ **DEMANDER À JOHN AVANT** si le choix n'est pas évident
   une fois le reste du bloc fait.

### Critères d'acceptation

- En émulation iPhone 13, **sans session**, chargement de `/carnet/nouvelle` : le titre est
  « Nouvelle prise — Carnet de Pêche » **avant et 10 secondes après** hydratation, et l'URL n'a
  pas changé.
- Idem avec `?spot_id=<slug>` : le spot est résolu et affiché, ou le formulaire s'affiche sans
  spot — jamais de redirection.
- Idem avec `?spot_id=<uuid>` : comportement actuel préservé (non-régression).
- Un utilisateur **connecté et non onboardé** est toujours redirigé vers `/onboarding/1`
  (règle du middleware inchangée).
- Aucune nouvelle erreur d'hydratation dans Sentry après déploiement (**deploy-watch**).

### Garde-fous

- ⚠️ **Ne pas modifier `middleware.ts`** : il est correct. Le défaut est dans le client.
- Ne jamais lire ni écrire de donnée utilisateur sur cette page quand `user === null`.
- Ne pas retirer `/carnet` de `APP_ROUTES` : les autres sous-routes de `/carnet` doivent rester
  protégées.

---

## Bloc 4 — Un brouillon doit pouvoir se sauver avec l'espèce seule

**Reproduit le 15/08 :** sélectionner « Bar » puis « Leurres » fait apparaître un champ
supplémentaire obligatoire (« Leurre depuis ta boîte / Ou saisis-le à la volée »). Tant qu'il
n'est pas rempli, le bouton « Garder ma prise en brouillon » ne produit rien de visible.

Le brouillon **est** bien écrit en local (`carnet:draft-catch` en `localStorage`, avec `spot_id`
et coordonnées) — le sprint 77 fonctionne sur ce point. Mais le geste que le visiteur croit
accomplir n'aboutit pas.

> ### ★ Le fond du sujet
> Ce formulaire demande à un inconnu, arrivé de Google il y a 40 secondes, **le modèle de son
> leurre** pour enregistrer un brouillon. Mesure : **9 `catch_log_started` sur mobile en
> 90 jours, 0 compte au bout.**

**Et le correctif n° 4 du Bloc 1 du sprint 78 n'est pas reproductible** : avec un
`carnet:draft-catch` vivant en `localStorage` contenant le spot « Pointe des Chats » et
l'espèce « Bar », `/auth/register` affiche le texte générique « Logue ta première prise en
2 minutes ». Ni la prise, ni le spot, ni les favoris ne sont nommés — contrairement à ce
qu'annonce le RECAP.

> **Connecteurs** : **qa-chrome** pour rejouer le parcours complet en 390 × 664. Lire
> `lib/drafts/schema.ts` et `lib/drafts/client.ts` avant de toucher à la validation.

### Tâches

1. Au stade **brouillon**, ne rendre obligatoire que **l'espèce** (et le lieu, déjà pré-rempli
   depuis la fiche). Technique, modèle de leurre, taille, poids, sortie de l'eau : tous
   facultatifs. Les demander **après** la création du compte, sur la prise réelle.
2. Si un champ reste bloquant, afficher un message d'erreur **visible et ancré au champ** :
   aujourd'hui le clic ne produit rien à l'écran, ce qui est le pire des deux mondes.
3. Réparer le rappel du brouillon sur `/auth/register` (`app/auth/register/page.tsx`) : nommer
   la prise, le spot et le nombre de favoris en attente, à partir de `carnet:draft-catch`.
   ⚠️ C'est un composant client : le brouillon est en `localStorage`, il n'est pas lisible en SSR.
4. Vérifier le trajet complet : brouillon → inscription → prise reportée dans le carnet, avec
   le bon spot et la bonne espèce. `pending_replayed` doit se déclencher.
5. Émettre `catch_log_abandoned` sur mobile aussi (aujourd'hui il n'apparaît qu'en Desktop).

### Critères d'acceptation

- En émulation iPhone 13, anonyme : ouvrir une fiche → « Loguer ma prise » → choisir « Bar » →
  cliquer « Garder ma prise en brouillon » **aboutit**, sans autre saisie.
- `/auth/register` avec ce brouillon vivant affiche une phrase qui contient **le nom du spot**
  et **le nom de l'espèce**.
- Après inscription, la prise apparaît dans le carnet avec le bon spot et la bonne espèce, et
  `pending_replayed` est émis.
- Un champ manquant produit un message d'erreur visible **sans scroll** depuis le bouton.
- Non-régression : un utilisateur **connecté** garde le formulaire complet et ses validations.

### Garde-fous

- ⚠️ Ne pas assouplir la validation de la **prise réelle** enregistrée par un compte : c'est le
  **brouillon** qu'on assouplit, pas la donnée finale.
- Ne pas stocker de photo dans le brouillon (le produit le dit déjà à l'écran, et c'est le bon
  choix).
- Ne pas toucher aux règles de confidentialité de la prise (`public` / `friends` / `private`) ni
  à leurs valeurs par défaut.

---

## Bloc 5 — Le paywall après le compte, jamais avant

**158 `paywall_viewed` sur mobile en 90 jours, pour 4 abonnés payants au total.** Un visiteur
sur deux qui rencontre un mur rencontre un mur **payant**. Or le RECAP du sprint 78 l'établit :
**le score n'est plus gaté nulle part**, ni sur la fiche ni sur la carte. Le paywall vend donc
quelque chose de déjà donné.

**Décision John du 15/08 : le score reste gratuit, assumé.** Local se reconstruira sur les
alertes par port au sprint 83. D'ici là, le paywall n'a rien à vendre à un anonyme.

> **Connecteurs** : lire `lib/gating/wall.ts` et `components/map/UpsellBanner.tsx` avant de
> toucher. Le mur d'inscription et l'upsell sont déjà deux composants distincts depuis le S75 :
> le travail est un arbitrage d'affichage, pas une refonte.

### Tâches

1. Sur toute surface, un visiteur **anonyme** voit le **mur d'inscription** (`SignupBanner`),
   jamais l'upsell abonnement (`UpsellBanner`, encarts de prix). Vérifier que la bascule est
   effective partout : `MapFilters.tsx`, `MapShell.tsx`, `ScorePanel.tsx`, `NearbyPanel.tsx`,
   `SpotPopup.tsx`, `app/(marketing)/spots/[slug]/page.tsx`, `app/(marketing)/spots/page.tsx`.
2. Un **inscrit gratuit** continue de voir l'upsell : c'est lui la cible, et il a un carnet à
   faire grandir.
3. Retirer le score de tout argument de vente restant, en cohérence avec le nettoyage des
   7 surfaces du S78 §2.3. Chercher par motif sur tout le dépôt, pas seulement dans les fichiers
   déjà connus — **c'est la leçon explicite du sprint 78**.

### Critères d'acceptation

- Un parcours anonyme sur `/carte`, `/spots`, `/spots/[slug]` et `/especes/bar` ne fait
  apparaître **aucun prix** et **aucune mention de Local ou d'Itinérant**.
- `paywall_viewed` n'est plus émis pour un `distinct_id` sans compte (vérifiable dans PostHog
  après déploiement).
- Un inscrit gratuit voit toujours l'upsell : non-régression explicite à tester.
- Aucune donnée payante libérée : les coordonnées précises restent gatées par `current_tier`,
  le floutage et les RPC sont intouchés.

### Garde-fous

- ⚠️ **Ne pas regater le score.** La décision est prise. Reprendre une valeur déjà donnée coûte
  plus que ce qu'elle rapporte.
- ⚠️ **Ne toucher à aucune RPC ni policy RLS.** Ce bloc est purement de la présentation.
  Si tu te retrouves dans `supabase/migrations/`, tu es hors périmètre.

---

## Bloc 6 — La vérité des chiffres, et deux balises manquantes

Le sprint 78 a passé son §2.3 à traquer la promesse fausse sur 7 surfaces. **Il en a créé une
nouvelle au passage.**

| Surface | Ce qui est faux |
|---|---|
| Compteur animé de l'accueil | **« 607 spots curés & vérifiés »** — 191 de ces 607 ont été générés par machine et **n'ont reçu aucune relecture humaine**. Le RECAP du S78 le dit lui-même : *« Pas de relecture humaine des 20 fiches. »* |
| Meta description + un bloc de texte de l'accueil | **« 200+ spots curés et vérifiés »** — périmé dans l'autre sens, dans la même page |
| Meta description de l'accueil | **266 caractères** — Google en affiche ~155, sur 2 100 impressions/mois |
| `/fil`, `/declarer-ses-prises`, `/tarifs` | 204, 183 et 180 caractères — toutes tronquées |
| `/especes` | `<title>` de **76 caractères** — viole le critère d'acceptation du Bloc 4 du S78 (« aucun titre > 60 ») |
| `/auth/register`, `/auth/login` | **Aucune balise canonique**, alors que les deux sont en `Allow` dans `robots.txt` et que `/auth/login` est la 2ᵉ page d'entrée mobile |

> **Connecteurs** : **supabase-guard** en lecture pour ancrer le vrai décompte
> (`select count(*) from spots where moderation_status='approved' and generation_batch is null`
> → doit valoir **416**) plutôt que de recopier un chiffre.

### Tâches

1. Trancher le libellé du compteur. Deux options honnêtes : **« 607 spots »** sans « vérifiés »,
   ou **« 416 spots vérifiés »** si le mot est conservé. ⚠️ **DEMANDER À JOHN** lequel — c'est un
   arbitrage de positionnement, pas de code.
2. Supprimer les « 200+ » résiduels, meta description comprise.
3. Ramener toutes les meta descriptions listées sous **155 caractères**, sans perdre le mot-clé
   d'entrée.
4. Ramener le `<title>` de `/especes` sous 60 caractères.
5. Ajouter les balises canoniques sur `/auth/register` et `/auth/login`.

### Critères d'acceptation

- Aucune page ne contient de chiffre de spots contredit par la base.
- `<title>` : aucun au-dessus de 60 caractères sur les pages marketing. Test automatisé de
  préférence — c'est la deuxième fois que ce critère saute.
- `<meta name="description">` : aucune au-dessus de 155 caractères.
- `/auth/register` et `/auth/login` ont chacune une balise canonique pointant sur elles-mêmes.
- Copie : tutoiement, **aucun tiret cadratin dans la copie visible** (`node scripts/lint-copy-dashes.mjs`).

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint`,
   revue croisée indépendante, passe anti-régression. Puis **deploy-watch** après déploiement
   (le Bloc 3 touche l'hydratation).
2. Relire **chaque** critère d'acceptation de ce brief et cocher ✅ / ❌ **avec preuve**
   (commande, URL, capture, requête).
3. **Passe QA mobile dédiée** (`qa-chrome`, 390 × 664, fr-FR, Europe/Paris), dans cet ordre,
   **sans cookie de consentement** puis **avec** :
   `/` → `/carte` → clic sur le CTA → `/auth/register` → retour → `/spots/pointe-des-chats-groix`
   → « Loguer ma prise » → brouillon avec l'espèce seule → `/auth/register`.
   **Le parcours doit aller au bout sans un seul obstacle.** Captures à chaque étape.
4. Passe sécurité : aucune RPC ni policy modifiée, floutage GPS et k-anon K=3 intacts, aucun
   secret commité, gating de tier des coordonnées précises inchangé.
5. Passe témoin : le funnel PostHog mobile complet retourne une valeur non nulle à
   `signup_completed` pour le parcours de test du point 3.
6. ⚠️ **Passe anti-régression sur le témoin de sortie** : le CTR `/spots` ne doit pas être
   affecté. Aucun changement de ce sprint ne devrait toucher au rendu de `/spots` — le vérifier
   plutôt que le supposer.
7. Livrer `docs/sprint-79/RECAP.md` : fait / comment tester / reste manuel John.
   ⚠️ **Ne pas y écrire « rien n'est poussé » sans dater la ligne** : c'est ce qui a rendu le
   RECAP du S78 trompeur.

---

## Reste manuel John (post-sprint)

1. **Trancher le libellé du compteur d'accueil** (Bloc 6, tâche 1).
2. **Trancher `robots.txt`** sur `/carnet/nouvelle` si l'agent le remonte (Bloc 3, tâche 5).
3. Merger, déployer, puis **QA mobile sur un vrai téléphone** — le parcours du point 3 du VERIF.
   L'émulation ne remplace pas un doigt sur un écran, et c'est la leçon du chantier carte
   annulé au S71.
4. **Envoyer l'export GSC des impressions par page `/especes/*`** — la lane contenu est bloquée
   dessus depuis le sprint 78.
5. **Relevé J+3** puis **J+14** : `signup_wall_clicked / signup_wall_viewed` sur mobile.
   Gate du sprint 80 : **> 3 %**. Si c'est toujours zéro à J+3, le correctif n'est pas déployé
   ou pas suffisant — ne pas enchaîner.
