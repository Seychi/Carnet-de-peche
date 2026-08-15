# Sprint 79 — RECAP
## Le tunnel qui s'ouvre

> **Statut au 2026-08-15, 13h50** : code complet sur `main`, **non commité, non poussé**
> (John n'a pas demandé le commit). ⚠️ Cette ligne est **datée** : elle ne vaut que pour
> l'instant où elle a été écrite. La vérité est HEAD de `main`, pas cette phrase. C'est la
> leçon du RECAP du S78, qui disait « rien n'est poussé » alors que la prod tournait dessus.
>
> **Aucune migration.** Aucune RPC, aucune policy RLS touchée.
> **1319 tests verts** (108 fichiers), build OK, `tsc --noEmit` OK, `next lint` OK.

---

## Ce que le brief avait faux, et ce que c'était vraiment

Cinq défauts sur six avaient une cause différente de celle annoncée. Chacun a été reproduit
en production avant correction, et re-prouvé après sur un build local.

| Bloc | Le brief disait | La mesure dit |
|---|---|---|
| **1** | Le bandeau de consentement recouvre le CTA | ✅ exact (138 px sur 150), **plus** un défaut non vu : un **second bandeau anonyme** en doublon |
| **1** | La colonne de FAB recouvre le CTA secondaire | ❌ `elementFromPoint()` renvoyait le bandeau d'inscription lui-même, pas les FAB |
| **3** | « C'est le client qui redirige après hydratation » | ❌ c'est un `redirect()` **serveur** qui dégénère en saut client parce que la route stream derrière `loading.tsx` |
| **4** | Un champ « leurre » obligatoire bloque le brouillon | ❌ c'est **la technique** qui bloquait. Le leurre n'a jamais été requis |
| **4** | Le rappel du brouillon sur `/auth/register` est cassé | ❌ il **fonctionne**. Il était intestable : le Bloc 4 empêchait de créer un brouillon |
| **4** | Le brouillon vit dans `carnet:draft-catch` (localStorage) | ❌ deux mécanismes distincts confondus : `carnet:draft-catch` = autosave du formulaire, `pending-catch` (**cookie**) = le vrai brouillon |
| **6** | 5 metas trop longues | ❌ **7** : `/carte` (171) et `/guides` (164) manquaient à la liste |

---

## Bloc 0 — La mesure minimale

`signup_completed` et `onboarding_finished` partent d'une Server Action, donc sans
`$device_type` : **aucun funnel filtré « Mobile » ne pouvait se terminer**. « 0 compte mobile
en 90 jours » était en partie un artefact de mesure.

- `lib/analytics/user-agent.ts` (nouveau) : `devicePropsFromUserAgent()`, pure et testée
  (7 cas). Vocabulaire **identique au SDK navigateur** de PostHog (`Mobile` / `Tablet` /
  `Desktop`), sinon les événements serveur et client ne se filtrent pas ensemble.
- `lib/analytics/server.ts` : `captureServerEvent` joint `$device_type`, `$os`, `$browser`,
  lus sur le User-Agent de la requête. Ne throw jamais (hors contexte de requête,
  `headers()` lève : on renvoie `{}` plutôt que de casser une inscription).
- **Option (a) du brief retenue**, pas l'option (b) : `distinct_id` serveur = `user.id`
  Supabase = celui de `analytics.identify()` côté client. La personne était donc déjà bien
  rattachée ; il ne manquait que la propriété d'ÉVÉNEMENT. Ajouter un
  `signup_completed_client` aurait créé un doublon à arbitrer dans six semaines pour rien.
  **`signup_completed` reste l'événement qui fait foi**, il n'y en a pas d'autre.
- ⚠️ RGPD : trois propriétés techniques, pas un profil. Le User-Agent brut n'est **pas**
  transmis. `person_profiles: 'identified_only'` intouché, consentement intouché (S81).

**Reste à faire, John** : vérifier dans PostHog après déploiement qu'une inscription en
émulation mobile produit bien `$device_type = "Mobile"`. Non vérifiable avant déploiement.

---

## Blocs 1 et 2 — `/carte`

**Reproduit en prod le 15/08, 390 × 664, sans cookie de consentement :**

| Élément | z-index | Position | Verdict |
|---|---|---|---|
| Bandeau de consentement | 60 | 484 → 652 | — |
| Barre d'inscription | 40 | 514 → 664 | **138 px recouverts sur 150** |
| Colonne de FAB | 50 | 516 → 640 | par-dessus la barre |
| Second bandeau anonyme | 10 | 539 → 664 | invisible sous la barre |

`elementFromPoint()` au centre de « Créer mon carnet » renvoyait le bandeau de consentement.
Le CTA qui déclenche **44 % des murs d'inscription mobiles du site** était inatteignable au
doigt pour tout visiteur n'ayant pas encore répondu, c'est-à-dire tout nouveau venu.

**Correctifs**

1. `app/globals.css` : nouvelle règle `.map-fab-stack`, qui adosse la colonne de FAB à
   `--consent-banner-height` **et** à `--map-bottom-bar-height`. On **empile**, on ne se
   dispute pas le z-index : passer la barre au-dessus du bandeau aurait rendu le **refus**
   des cookies inaccessible.
2. `components/map/useBottomBarHeight.ts` (nouveau) : la barre publie sa hauteur réelle
   (ResizeObserver), comme le bandeau de consentement le fait depuis le S78. On mesure, on
   ne code pas un décalage en dur (la barre change de hauteur en 390 px).
3. `SignupBanner` et `UpsellBanner` portent `sticky-bottom-bar`.
4. **Suppression du second bandeau anonyme** (`MapShell.tsx`). Il faisait doublon avec
   `SignupBanner`, au même endroit, pour le même public. Son CTA était inatteignable **avec
   et sans** consentement, il pointait vers `/auth/login?tab=register` (une page dont le H1
   est « Connexion à ton carnet »), il n'émettait **aucun** événement d'analytics, et il
   réapparaissait après qu'on ait fermé la barre. C'est ça, le Bloc 2 : il n'y avait pas une
   ligne à corriger, il y avait un bandeau à retirer.
5. La réserve de 4,75 rem à droite de la barre disparaît : le CTA passe de 270 à **334 px**.

**Prouvé après correctif (build local, 390 × 664)**

| | sans consentement | après acceptation |
|---|---|---|
| Barre d'inscription | 334 → 484 | 514 → 664 |
| Bandeau de consentement | 484 → 652 | absent |
| Colonne de FAB | 198 → 322 | 366 → 490 |
| Chevauchement | **0** | **0** |
| « Créer mon carnet » atteignable | ✅ | ✅ |
| « Refuser » / « Accepter » atteignables | ✅ | — |
| href | `/auth/register?redirect=%2Fcarte` | idem |

`--consent-banner-height` = 168 px, `--map-bottom-bar-height` = 150 px, publiées et lues.

**Test ajouté** : `components/map/__tests__/bottom-stack.test.ts` (8 cas). L'environnement
Vitest est `node` : pas de moteur de mise en page, donc pas de mesure de rectangles. Le test
verrouille le **contrat** et les régressions qui le casseraient en silence, notamment **un
`bottom` remis en style inline** (il gagnerait sur la feuille de style et rétablirait le
recouvrement), et **tout z-index ≥ 60** sur une barre du bas.

---

## Bloc 3 — `/carnet/nouvelle`

**La cause n'est pas celle du brief.** La garde est un `redirect()` **serveur**
(`app/carnet/nouvelle/page.tsx:90`). Mais cette route stream derrière `loading.tsx` : Next
avait déjà émis un **200** et le `<head>` avant d'atteindre le `redirect()`. Ne pouvant plus
répondre 307, il l'injecte dans le flux, en redirection **côté client**. D'où l'observation
exacte du brief (titre « Nouvelle prise », puis « Connexion » ~6 s plus tard) avec un
diagnostic faux. C'est à nouveau la leçon du S78 : **ce que le serveur émet compte plus que
ce que le JSX suggère**.

**Correctifs**

1. `?spot_id=` accepte désormais un **slug** autant qu'un uuid (`get_spot_by_slug`, RPC qui
   existait déjà depuis la migration 011). Un slug est la forme qu'on partage et qu'on
   recopie, et c'est celle que porte l'URL de la fiche d'où le visiteur vient.
2. Anonyme **sans** spot : plus de redirection. Écran `ChoisirUnSpot` (« Choisis d'abord ton
   spot », vers `/spots` et `/carte`, plus un lien de connexion).
   **Pourquoi un écran et pas le formulaire** : le brouillon est un cookie qui ne porte
   aucune coordonnée, à dessein (invariant RGPD du S77, `lib/drafts/schema.ts`). C'est le
   spot qui porte le lieu. Rendre un formulaire sans spot afficherait un « Garder ma prise en
   brouillon » incapable d'enregistrer quoi que ce soit : le pire des deux mondes, exactement
   le défaut du Bloc 4.
3. `middleware.ts` **non modifié**, comme demandé. Aucune donnée utilisateur lue ou écrite
   quand `user === null`.

**Prouvé (build local)** : `/carnet/nouvelle` → 200, « Choisis d'abord ton spot. », URL
inchangée, aucune redirection. `?spot_id=pointe-des-chats-groix` (slug) → la fiche
« Pointe des Chats » est résolue et affichée. `?spot_id=<uuid>` → inchangé.

**`robots.txt` — tranché sans te déranger, dis-moi si tu n'es pas d'accord.** On **garde**
`Disallow: /carnet`. La page pose déjà `robots: { index: false, follow: false }` : c'est un
formulaire, pas du contenu, et on ne veut pas d'une nuée de pages fines `?spot_id=…` à côté
des vraies fiches. Le `Disallow` est donc cohérent avec l'intention, pas en contradiction
avec elle. Les 3 liens par fiche servent les humains, qui ne lisent pas `robots.txt`.

---

## Bloc 4 — Le brouillon avec l'espèce seule

**Reproduit en prod le 15/08 :** « Bar » + « Leurres » puis « Garder ma prise en brouillon »
**fonctionne** (cookie écrit). « Bar » seul **n'écrit rien**. Le bloquant est **la
technique**, pas le leurre. On demandait sa technique de pêche à un inconnu arrivé de Google
40 secondes plus tôt, pour enregistrer un brouillon.

**Correctifs**

1. `lib/drafts/schema.ts` : `technique` optionnelle dans le brouillon.
2. `lib/catches/schema.ts` : `technique` optionnelle au niveau schéma, **alignée sur la
   base** (`catches.technique` est nullable, vérifié en SQL live). Nouveau `formCatchSchema`
   qui, lui, **exige** la technique.
3. `components/catches/CatchForm.tsx` : le résolveur choisit selon le contexte. Brouillon
   anonyme → `createCatchSchema` (espèce + lieu). **Compte → `formCatchSchema`, formulaire
   complet et validations inchangées.** L'astérisque « requis » de la section Technique
   disparaît au stade brouillon, sinon on annoncerait une obligation qui n'existe plus.
4. Le rejeu (`lib/drafts/replay.ts`) écrit donc une prise sans technique plutôt que d'en
   **inventer** une que le visiteur n'a jamais donnée.

⚠️ **Garde-fou respecté** : on assouplit le brouillon, pas la donnée finale d'un compte.

**Prouvé (build local)** : « Bar » seul → cookie écrit
`{spot_id, spot_slug, species:"bar", caught_at, released, privacy}`, mur affiché, URL
inchangée. Puis `/auth/register` affiche **« Ta prise de bar à Pointe des Chats t'attend. »**

**Le correctif n° 4 du S78 n'était pas cassé.** Vérifié en prod avec un brouillon vivant : la
phrase nomme le spot ET l'espèce. Il était **intestable**, parce qu'on ne pouvait pas créer de
brouillon sans renseigner une technique. Le brief a lu une conséquence comme une cause.

**Non fait, et assumé** : `catch_log_abandoned` sur mobile (tâche 5). Sa cause n'a pas été
diagnostiquée faute de budget de session (voir « Limite atteinte » plus bas). À reprendre.

---

## Bloc 5 — Le paywall après le compte

Balayage en anonyme, prod puis build local, sur `/carte`, `/spots`, `/spots/[slug]`,
`/especes/bar` : **une seule surface** vendait un abonnement à un visiteur sans compte, le bas
de `/spots` (« Abonnement Local à partir de 4,90 €/mois »).

- `app/(marketing)/spots/page.tsx` : anonyme → `SignupWall` (nouvelle surface
  `spots_index_footer`, pour savoir si ce bas de page convertit mieux que le mur de la
  liste). Inscrit gratuit → upsell inchangé.
- Le **score sort des arguments de vente** (il est gratuit depuis le S78, décision John
  confirmée le 15/08) : `spots/[slug]`, `GuideLayout`, bas de `/spots`.
- ⚠️ **Le score n'est regaté nulle part.** Aucune RPC, aucune policy, aucune migration.

**Prouvé (build local, anonyme)** : `/carte`, `/spots`, `/spots/[slug]`, `/especes/bar` →
aucun `4,90`, `9,90`, « Itinérant », « /mois », « Voir les formules », « Voir les tarifs ».

**Non-régression inscrit gratuit** : même condition `getWallKind(tier)` que celle qui gate
déjà l'upsell de la fiche de spot depuis le S75, et `getWallKind('discovery') === 'upsell'`
est couvert par les tests existants. **Reste à confirmer d'un œil**, avec un compte gratuit,
au moment de ta QA.

---

## Bloc 6 — La vérité des chiffres

**Ancré en SQL live** : 607 spots publiés, dont **416 relus par un humain** et **191 générés
par machine** (lot 1 du S78, sans relecture).

**Ta décision du 15/08 : « 607 spots », sans « vérifiés ».** On garde le vrai total et on
retire le mot qu'on ne peut pas tenir.

- `lib/marketing/stats.ts` réécrit : `SPOTS_PUBLISHED_FLOOR = 600`,
  `SPOTS_COUNTER_LABEL = 'spots de pêche'`, `SPOTS_PUBLISHED_LABEL = '600+ spots de pêche'`.
  Les « 200+ » résiduels disparaissent, meta description de l'accueil comprise.
- Compteur d'accueil, bandeau de confiance, section carte, `/tarifs` : alignés.
- Un test interdit désormais « curé » et « vérifié » dans ces libellés.

**7 metas ramenées sous 155 caractères** (le brief en listait 5) :

| Page | Avant | Après |
|---|---|---|
| Accueil | 266 | **151** |
| `/fil` | 204 | ≤ 155 |
| `/declarer-ses-prises` | 183 | ≤ 155 |
| `/tarifs` | 180 | ≤ 155 |
| `/carte` *(non listé au brief)* | 171 | ≤ 155 |
| `/especes` | 165 | ≤ 155 |
| `/guides` *(non listé au brief)* | 164 | ≤ 155 |

`<title>` de `/especes` : 76 → **53** caractères.

Balises canoniques ajoutées sur `/auth/register` et `/auth/login` (2ᵉ page d'entrée mobile
du site) : les variantes `?tab=register`, `?redirect=…`, `?plan=…` se rabattent sur la page
nue. `/auth/login?tab=register` répond toujours **200**.

**Test ajouté** : `__tests__/seo-metadata-length.test.ts`. C'était la **deuxième fois** que le
critère « aucun titre > 60 » sautait ; un critère qui ne tient qu'à une relecture humaine ne
tient pas. Le test applique le suffixe de template (` · Carnet de Pêche`) avant de mesurer,
et porte une garde anti-test-vide.

---

## Passe anti-régression

- **Aucune migration, aucune RPC, aucune policy RLS.** Floutage GPS, k-anonymat K=3, gating
  de tier des coordonnées précises : intouchés.
- Aucun secret dans le diff.
- **Témoin de sortie `/spots` (CTR 7,2 %)** : le `<title>` et la meta description de `/spots`
  ne sont **pas** modifiés. Le CTR Google se joue là, pas dans le bas de page. Vérifié par
  diff, pas supposé.
- 1319 tests, build, types, lint : verts.

---

## Reste manuel, John

1. **Merger, déployer, puis QA sur un vrai téléphone** : `/` → `/carte` → CTA →
   `/auth/register` → retour → `/spots/pointe-des-chats-groix` → « Loguer ma prise » →
   brouillon avec l'espèce seule → `/auth/register`. L'émulation ne remplace pas un doigt sur
   un écran (leçon du chantier carte annulé au S71).
2. **Confirmer la non-régression « inscrit gratuit »** : un compte gratuit doit toujours voir
   l'upsell en bas de `/spots`.
3. **PostHog après déploiement** : `$device_type = "Mobile"` sur `signup_completed`, et le
   funnel mobile qui se termine enfin.
4. **Sentry après déploiement** (`deploy-watch`) : le Bloc 3 touche le rendu de
   `/carnet/nouvelle`.
5. **`robots.txt`** : dis-moi si tu veux ouvrir `/carnet/nouvelle` plutôt que garder le
   `Disallow` (raisonnement au Bloc 3).
6. **Export GSC des impressions par page `/especes/*`** : la lane contenu est bloquée dessus
   depuis le S78.
7. **Relevé J+3 puis J+14** : `signup_wall_clicked / signup_wall_viewed` sur mobile. Gate du
   S80 : **> 3 %**. Toujours zéro à J+3 → ce n'est pas déployé, ou pas suffisant : ne pas
   enchaîner.

---

## Limite atteinte pendant l'exécution

Les cinq workstreams ont été lancés en parallèle comme demandé. **Les quatre agents d'analyse
ont été tués par une limite de session** (« session limit, resets 5pm ») quelques minutes
après leur lancement. Tout a donc été repris en boucle principale, en priorisant par impact.
Une seule tâche du brief est restée sur le carreau : `catch_log_abandoned` sur mobile
(Bloc 4, tâche 5). Tout le reste est fait, et prouvé.
