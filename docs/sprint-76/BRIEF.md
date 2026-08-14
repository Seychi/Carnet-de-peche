# Sprint 76 — Brief d'exécution
## « Le clic qui manque » : transformer les 691 clics Google hebdomadaires en comptes

> Rédigé le 2026-08-13. Durée : 2 semaines (13/08 → 27/08).
> Contexte : analyse croisée GSC + PostHog + audit de code du 2026-08-13 (rapport `docs/audits/ANALYSE-2026-08-13.html`, à ouvrir dans un navigateur), qui mesure les 4 premiers jours de vie du sprint 75 en prod.
> Sprint précédent : `docs/sprint-75/RECAP.md` (Blocs 1, 2, 3, 4, 5 livrés, mergés sur `main`, migration 109 en prod).
> Décisions John 2026-08-13 :
> - Périmètre = **conversion + SEO structurel**. La lane curation des 4 018 spots `pending` reste hors sprint.
> - Le champ « Code fondateur » est **masqué derrière un lien**, pas retiré. Le programme fondateurs continue à l'identique.

**Préalable : levé.** `INVITE_ONLY` n'est **pas** actif en production, c'est vérifié en base et non sur parole : sur 21 jours, **5 comptes ont été créés via Google** (2 le 09/08, 2 le 10/08, 1 le 30/07). Le bouton Google est conditionné par `{!inviteOnly && …}` : s'il produit des comptes, c'est que le gate est ouvert. Aucun compte récent n'a consommé de code fondateur. Le Bloc 3 s'exécute donc dans sa forme nominale.

**Rien d'autre à faire avant de démarrer** : `main` est à jour (`fe31f5c`, merge `sprint-75`), aucune migration en attente.

**Deux faits établis au passage, qui changent le brief :**

1. **La confirmation d'email est désactivée** côté Dashboard Supabase. Les 22 comptes des 21 derniers jours ont `email_confirmed_at = created_at` à 0,1 seconde près. `signUp` renvoie donc directement une session et l'utilisateur file sur l'onboarding : **il n'y a aucune friction de confirmation d'email à corriger.**
2. **Google pèse déjà 33 % des inscriptions récentes** (4 comptes sur 12 depuis le 9 août) alors que le bouton est relégué **sous** le formulaire email, après trois champs. C'est le signal le plus encourageant du sprint : le chemin le plus court est déjà le plus utilisé, à contre-emploi de la hiérarchie visuelle. Le Bloc 3 en tire les conséquences.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-76/BRIEF.md`. Lance les workstreams
> A, C, D, E en parallèle dès maintenant, enchaîne B après A, et termine par le
> workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique, cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher `generateMetadata`, le JSON-LD ou les Server Components | **docs-researcher** → Context7 | Next 15.5 : API `Metadata`, `alternates`, streaming des Server Components. Ne pas coder de mémoire. |
| Blocs 2 et 4 (compteurs de spots, espèces, départements) | **supabase-guard** → Supabase (RO) | Ancrer en lecture le nombre réel de spots `approved` par espèce et la valeur de `is_precise` servie à `anon`. Aucun DDL n'est prévu ce sprint. |
| Bloc 2 après implémentation | **qa-chrome** → Claude in Chrome + Playwright | Captures 390 px et 1280 px de `/spots/pointe-de-penvins` en anonyme : le CTA et le mur doivent être dans le premier écran mobile. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Les fiches de spots sont 80 % des clics : zéro régression runtime tolérée. |
| Clôture | **`/verif-sprint`** | Tests + build + typecheck + lint + revue croisée indépendante + passe anti-régression. |

**Aucune migration n'est prévue ce sprint.** Si un bloc semble en exiger une, c'est qu'il sort du périmètre : `⚠️ DEMANDER À JOHN AVANT`.

---

## Objectif du sprint en une phrase

Faire passer le taux de clic du mur d'inscription de **1,3 % à plus de 6 %**, la couverture du mur sur les fiches de spots de **42 % à plus de 90 %**, et la part de sessions à une seule page de **54 % à moins de 45 %** — sans toucher au gating des données.

---

## Le constat qui commande ce sprint

Le sprint 75 est en prod depuis le 9 août. Les 4 premiers jours de données disent :

| Mesure | Valeur observée | Source |
|---|---|---|
| Clics Google, semaine du 6 au 12 août | 691 (+153 %) | GSC |
| Impressions | 12 362 (+112 %) | GSC |
| Murs d'inscription affichés | 225 | PostHog |
| Clics sur le CTA du mur | **3** (1,3 %) | PostHog |
| Visiteurs de fiches de spots | 156 | PostHog |
| … qui ont vu un mur | 65 (**42 %**) | PostHog |
| Comptes créés | 10 | PostHog |
| Onboarding : entrées → sorties | 11 → 11 (**100 %**) | PostHog |

L'onboarding ne perd personne. Le formulaire non plus, en proportion. **Tout se joue entre la lecture de la fiche et le clic sur « Créer mon carnet ».** Et les 3 seuls clics de la semaine viennent de `map_filters`, la seule surface où le mur interrompt une intention au lieu de décorer une colonne. C'est le fil conducteur du sprint.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 1 (copie du mur, `lib/gating/wall.ts`) | 0,5 j | — | ✅ |
| B | Blocs 2, 4, 5 (`app/(marketing)/spots/[slug]/page.tsx`) | 3 j | A pour la prop `spotName` ; Blocs 4 et 5 démarrables tout de suite | ⚠️ partiel |
| C | Bloc 3 (parcours d'inscription, `app/auth/*`) | 2 j | préalable `INVITE_ONLY` | ✅ |
| D | Bloc 6 (`lib/seo/programmatic.ts`) | 0,5 j | — | ✅ |
| E | Blocs 7, 8 (attribution + mesure) | 1,5 j | — | ✅ |
| F | Bloc 9 (`app/(marketing)/spots/page.tsx`) | 0,5 j | — | ✅ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

> ⚠️ **Règle anti-conflit** : les Blocs 2, 4, 5 et 10 touchent **le même fichier**, `app/(marketing)/spots/[slug]/page.tsx`. Ils sont volontairement regroupés dans le seul workstream B et exécutés **en séquence à l'intérieur** : 5 (metadata) → 4 (JSON-LD) → 2 (corps de page) → 10 (maillage). Ne jamais les confier à des agents concurrents. Le Bloc 9 touche `app/(marketing)/spots/page.tsx`, un fichier différent : il part en parallèle sans risque.

---

## Bloc 1 — La copie du mur parle du spot, pas du produit

La copie actuelle de `lib/gating/wall.ts` liste des bénéfices de **rétention** (« Le fil de ton département en entier », « Ton carnet de prises, illimité ») à quelqu'un qui vient de lire la fiche d'**un** spot et qui n'a rien à loguer. Pire, sur la fiche de spot, l'intro passée en prop commence par ce que le visiteur **n'aura pas** : « Les coordonnées précises sont réservées aux abonnés ». C'est ce qui tue le clic avant le CTA.

Ce bloc ne change **que des chaînes et une signature de composant**. Aucun gating, aucune RPC, aucune donnée.

> **Connecteurs** : aucun. Bloc purement local. Lire `docs/sprint-75/RECAP.md` §2 pour ne pas défaire la séparation `signup` / `upsell` / `none` établie au sprint 75, qui reste la règle.

### Tâches

1. Dans `lib/gating/wall.ts`, ajouter une variante contextualisée exportée à côté de la copie générique existante (ne pas supprimer la générique, elle sert aux surfaces carte) :
   - `SIGNUP_WALL_TITLE_SPOT = (spotName: string) => \`Suis ${spotName}, c'est gratuit\``
   - `SIGNUP_WALL_BENEFITS_SPOT` : `['Les marées et la météo de ce spot, tous les jours', 'Les prises déclarées ici, en temps réel', 'Ton carnet de prises, illimité']`
   - `SIGNUP_WALL_NOTE` devient `'Sans carte bancaire, en 30 secondes.'`
2. Dans `components/map/SignupBanner.tsx`, ajouter au composant `SignupWall` une prop optionnelle `spotName?: string`. Quand elle est fournie : titre et bénéfices contextualisés, sinon comportement actuel strictement inchangé.
3. **Supprimer** l'intro passée depuis la fiche de spot (traité au Bloc 2, tâche 4) : plus aucune phrase du mur ne doit ouvrir sur une restriction.
4. Étendre `lib/gating/__tests__/wall.test.ts` (le fichier existe déjà) : un test qui vérifie qu'aucune chaîne de `SIGNUP_WALL_*` ne contient de tiret cadratin (`—`), conformément à `CLAUDE.md` §6, et un test qui vérifie que la variante spot interpole bien le nom.

### Critères d'acceptation

- `SignupWall` sans prop `spotName` rend exactement le même DOM qu'avant (test de non-régression).
- `SignupWall` avec `spotName="Pointe de Penvins"` affiche « Suis Pointe de Penvins, c'est gratuit ».
- `grep -n "—" lib/gating/wall.ts` ne remonte aucune occurrence dans une chaîne de copy.
- `pnpm test` vert.

### Garde-fous

- Ne pas toucher `getWallKind()` ni `buildSignupHref()` : la règle de sprint 75 reste la source unique.
- Ne pas promettre les coordonnées précises : le compte gratuit ne les débloque pas. La copie ne doit contenir aucune promesse fausse.

---

## Bloc 2 — La fiche de spot demande enfin l'inscription

Trois défauts cumulés sur `app/(marketing)/spots/[slug]/page.tsx`, la page qui reçoit **80 % des clics Google** :

1. Le CTA collant mobile, seul élément que 100 % des visiteurs mobiles voient, dit « + Loguer une prise ici ». Pour un visiteur venu de Google et sans compte, cette phrase ne veut rien dire.
2. Le `<SignupWall surface="spot_page">` est rendu **dans la branche `!spot.is_precise`** (ligne ~932). Sur les fiches où les coordonnées sont servies, le visiteur anonyme n'a aucun mur. C'est l'origine mesurée de l'écart 156 → 65.
3. Le mur vit dans le `<aside>`, donc tout en bas sur mobile, après les dangers, la météo et les marées. 82 % du trafic est mobile.

> **Connecteurs** : **supabase-guard** en lecture pour confirmer ce que vaut `is_precise` pour le rôle `anon` sur un échantillon de spots (la valeur est gatée par la RPC ; ne pas la supposer). **qa-chrome** après implémentation pour les captures 390 px.

### Tâches

1. **CTA collant mobile** (bloc `md:hidden fixed bottom-0`, ligne ~969) : si `!user`, remplacer le libellé et la cible par le CTA d'inscription, `href={buildSignupHref(\`/spots/${slug}\`)}`, libellé **« Voir les conditions à {spot.name}, gratuit »** (tronquer le nom au-delà de 22 caractères pour tenir sur 360 px). Si `user`, comportement actuel strictement inchangé (« + Loguer une prise ici », `ctaHref`).
2. **Instrumenter ce CTA** avec `analytics.signupWallClicked({ surface: 'spot_page' })` et émettre `analytics.signupWallViewed({ surface: 'spot_page' })` une seule fois par page, pas une fois par surface montée. ⚠️ Aujourd'hui deux surfaces peuvent coexister sur une même fiche : garantir **un seul** `signup_wall_viewed` par vue de page, sinon le taux de clic est mécaniquement divisé.
3. **Sortir le mur de la branche `!spot.is_precise`** : rendre `<SignupWall surface="spot_page" spotName={spot.name} redirectTo={\`/spots/${slug}\`} />` pour tout visiteur anonyme, quelle que soit la précision du spot. La branche `spot.is_precise` continue d'afficher les coordonnées ; le mur devient un bloc **frère**, pas une alternative.
4. **Remonter le mur dans le flux mobile** : l'insérer dans la colonne principale, juste après le bloc conditions/marées et **avant** les dangers, et non plus seulement dans le `<aside>`. Utiliser la prop `track` déjà prévue par `SignupWall` pour n'émettre l'event que depuis l'instance réellement visible (`track={false}` sur l'instance masquée en CSS), sinon le funnel est gonflé. Supprimer la prop `intro` (cf Bloc 1, tâche 3).
5. **Le bloc « upsell abonnement » reste inchangé** pour les inscrits gratuits : la branche `showSignupWall ? … : <div>Coordonnées précises … /tarifs</div>` conserve son comportement actuel pour `user` non abonné.

### Critères d'acceptation

- En navigation privée sur `https://<preview>/spots/pointe-de-penvins` en 390 px : le CTA d'inscription est visible **sans scroller**, et le mur apparaît avant 60 % de la hauteur de page (mesure Playwright, à consigner comme au sprint 75 §5).
- Sur un spot dont `is_precise` est vrai pour `anon`, le mur est **présent** (c'était le bug).
- Une vue de fiche par un anonyme émet **exactement un** `signup_wall_viewed` avec `surface: 'spot_page'`. Vérifier avec :
  ```sql
  SELECT properties.$session_id AS sid, count() AS n
  FROM events
  WHERE event = 'signup_wall_viewed' AND properties.surface = 'spot_page'
    AND timestamp >= now() - INTERVAL 1 DAY
  GROUP BY sid HAVING n > 1
  ```
  → doit renvoyer 0 ligne.
- Connecté : le CTA collant redit « + Loguer une prise ici » et pointe sur `ctaHref`. Aucun mur d'inscription.
- **Régressions interdites** : gating des coordonnées intact (aucun `lat`/`lng` précis dans le HTML servi à un anonyme, passe anti-fuite identique à `docs/sprint-75/RECAP.md` §6), limite de 3 spots par département sur la carte intacte, `paywall_viewed` toujours réservé aux inscrits gratuits.

### Garde-fous

- Ne toucher **aucune** RPC, aucune policy RLS, aucun appel à `current_tier`. Ce bloc est 100 % présentation.
- Ne pas transformer la fiche en page bloquée : le contenu SEO (description, marées, meilleurs moments, guides liés) reste **entièrement dans le HTML servi**, sinon on casse les 80 % de clics. Aucun contenu monté au clic.

---

## Bloc 3 — Le parcours d'inscription : 4 champs et une page « Connexion »

Mesuré cette semaine : **28 personnes sur `/auth/login`, 8 sur `/auth/register`, 10 comptes créés.** Deux causes dans le code :

- `app/auth/register/page.tsx` est un `redirect()` serveur vers `/auth/login?tab=register`. Le visiteur clique « Créer mon carnet » et atterrit sur une URL qui dit *login*.
- Le formulaire d'inscription (`app/auth/login/login-client.tsx`, ~ligne 500-600) demande **4 champs** : email, mot de passe, confirmation, code fondateur. Le champ « Code fondateur (optionnel) » signale « c'est fermé » exactement au moment où il faut rassurer.

> **Connecteurs** : **docs-researcher** → Context7 sur `@supabase/ssr` 0.10 avant de toucher aux Server Actions d'auth. Ne pas réécrire `signupAction` de mémoire.

### Tâches

1. **`/auth/register` devient une vraie page**, qui rend le formulaire d'inscription directement au lieu de rediriger. Conserver **intégralement** la normalisation de contexte existante (`plan`, `interval`, `next` → `redirect` validé par `safeInternalPath`) : c'est le correctif BUG-10, il ne doit pas être perdu. `/auth/login?tab=register` continue de fonctionner (liens externes déjà indexés).
2. **Supprimer le champ « Confirme le mot de passe »**. Le composant `PasswordInput` a déjà un bouton d'affichage ; c'est le standard et ça retire un champ. Adapter `signupSchema` et `signupAction` (`app/auth/login/actions.ts`, la comparaison ligne ~213) en conséquence, et retirer les tests devenus caducs plutôt que de les neutraliser.
3. **Masquer le champ « Code fondateur »** derrière un `<button type="button">` discret « J'ai un code fondateur » qui le déplie. Décision John : le champ **reste dans le formulaire**, le programme fondateurs est inchangé. Si `inviteOnly` vaut `true`, le champ reste **déplié et obligatoire** comme aujourd'hui.
4. **Remonter « Continuer avec Google » au-dessus du formulaire email**, avec un séparateur « ou avec ton email » en dessous. Justification chiffrée : Google fait déjà **33 % des inscriptions depuis le 9 août** (4 sur 12) alors qu'il est aujourd'hui placé **après** trois champs de saisie. On ne fait que remettre la hiérarchie visuelle dans le sens de l'usage constaté. Ne pas toucher au gate `{!inviteOnly && …}` lui-même : `⚠️ DEMANDER À JOHN AVANT` toute modification de cette condition.
5. Ajouter un titre de page explicite sur `/auth/register` : `Créer ton carnet de pêche, gratuit · Carnet de Pêche`.
6. **Ne pas toucher au flux de confirmation d'email** : il est désactivé côté Dashboard et `signUp` renvoie une session directe. La branche « pas de session » de `signupAction` (`app/auth/login/actions.ts` ~ligne 321) doit rester en place — elle couvre le cas où la confirmation serait réactivée — mais elle n'est pas le chemin nominal aujourd'hui et **ne doit pas être optimisée à l'aveugle**.

### Critères d'acceptation

- `GET /auth/register` renvoie **200** avec le formulaire d'inscription, plus de 3xx vers `/auth/login`.
- `GET /auth/register?plan=local&interval=annual&next=/tarifs` : les trois valeurs sont toujours transportées jusqu'à `signupAction` (test unitaire sur la normalisation).
- Le formulaire visible par défaut compte **2 champs** (email, mot de passe), avec le bouton Google **au-dessus** d'eux.
- Une inscription de bout en bout aboutit à `signup_completed` puis à `/onboarding/1`, avec et sans code fondateur.
- Un code fondateur valide saisi via le champ déplié active toujours l'abonnement Local offert (RPC `redeem_comp_code` inchangée).
- `pnpm test` vert, y compris `app/auth/login/__tests__/actions.test.ts` mis à jour.

### Garde-fous

- ⚠️ DEMANDER À JOHN AVANT : toute modification du comportement quand `INVITE_ONLY=true`, et toute modification de la condition `{!inviteOnly && …}` qui porte le bouton Google.
- Ne pas toucher à `emailRedirectTo` ni au lien magique.
- Ne pas assouplir la règle de mot de passe (8 caractères dont 1 chiffre).
- Ne pas ajouter de champ « pseudo » ou « département » à l'inscription : ces informations se collectent à l'onboarding, qui a un taux de complétion de 100 %.

---

## Bloc 4 — Le fil d'Ariane sur les fiches de spots

Sur 28 jours, GSC ne remonte **qu'une seule impression** de résultat enrichi (PRODUCT_SNIPPETS). En cause pour la partie qui compte : `BreadcrumbList` est présent sur `/especes`, `/guides`, `/peche` et `/declarer-ses-prises`, mais **absent de la fiche de spot**, qui fait 80 % des clics. Elle n'émet qu'un schéma `Place`, non éligible à l'affichage enrichi.

Sur 7 488 impressions hebdomadaires, un fil d'Ariane vaut typiquement 1 à 3 points de CTR, soit **75 à 220 clics de plus par semaine**, sans écrire une ligne de contenu.

> **Connecteurs** : reprendre à l'identique le modèle déjà en place dans `app/(marketing)/especes/[slug]/page.tsx` lignes 144-155. Ne pas inventer un format.

### Tâches

1. Dans `app/(marketing)/spots/[slug]/page.tsx`, étendre le `jsonLd` existant (ligne ~444) en tableau `@graph` de deux objets : le `Place` actuel, **inchangé**, et un `BreadcrumbList`.
2. Fil d'Ariane à 4 niveaux : `Accueil` (`/`) → `Spots` (`/spots`) → `{DEPARTMENT_LABELS[dept]}` (`/spots?dept={code}`) → `{spot.name}` (URL canonique de la fiche). Importer `DEPARTMENT_LABELS` depuis `@/lib/geo/departments`, déjà utilisé par `lib/seo/programmatic.ts`.
3. Conserver la condition existante `spot.visibility !== 'private'`.
4. Ajouter un test qui valide la forme du `@graph` sur un spot de fixture : deux nœuds, positions 1 à 4 contiguës, aucune URL relative.

### Critères d'acceptation

- Le HTML servi de `/spots/pointe-de-penvins` contient un `application/ld+json` avec `BreadcrumbList` et 4 `ListItem`.
- Les 4 `item` sont des URLs absolues en `https://www.carnet-de-peche.com`, et le niveau 3 pointe vers une page qui répond **200** (les facettes `/spots?dept=` sont déclarées au sitemap, à revérifier).
- Validation manuelle sur le test de résultats enrichis de Google : 0 erreur, 0 avertissement.
- Le schéma `Place` existant est inchangé, octet pour octet.

### Garde-fous

- Aucune coordonnée supplémentaire dans le JSON-LD. Le `Place` actuel contient déjà des `geo` : **ne pas les modifier**, et vérifier qu'elles servent bien la valeur gatée et non `spot.geom`.
- Ne pas ajouter de `FAQPage` : Google ne l'affiche plus que pour les sites institutionnels, ce serait du bruit.

---

## Bloc 5 — Des titres qui tiennent dans le SERP

Les titres servis font **66 à 90 caractères**, Google coupe autour de 60. La liste d'espèces, qui est ce qui déclenche le clic, passe à la trappe.

| Titre actuel | Car. |
|---|---|
| Pêche à Sausset-les-Pins — digues du port (13) — Dorade royale, Sar, Bar · Carnet de Pêche | 90 |
| Pêche à Gravelines — Petit-Fort-Philippe (59) — Bar, Maquereau, Seiche · Carnet de Pêche | 88 |
| Pêche à Pointe de Penvins (56) — Bar, Dorade royale, Sar · Carnet de Pêche | 74 |

Deux causes : le gabarit ajoute un tiret cadratin, et **`spot.name` en contient déjà un** pour les spots à précision (« Sausset-les-Pins — digues du port »). D'où le double tiret, contraire à `CLAUDE.md` §6 qui n'en tolère qu'un comme séparateur de `<title>`.

> **Connecteurs** : **supabase-guard** en lecture pour récupérer les 416 `spots` `approved` et mesurer la longueur du titre généré sur **la donnée réelle**, pas sur trois exemples.

### Tâches

1. Dans `generateMetadata` de `app/(marketing)/spots/[slug]/page.tsx` (ligne ~130), nouveau gabarit :
   `Pêche à {nom court} ({dept}) : {2 espèces}` — sans suffixe de marque, sans tiret cadratin.
2. « nom court » = `spot.name` tronqué au premier tiret cadratin s'il y en a un (« Sausset-les-Pins — digues du port » → « Sausset-les-Pins »). Écrire ce helper dans le fichier, testé.
3. Si le titre dépasse encore 60 caractères, retomber sur **une** espèce, puis sur zéro (`Pêche à {nom court} ({dept})`). Dégradation pure, jamais de troncature au milieu d'un mot.
4. La `description` reste inchangée (elle fait 158 caractères max et fonctionne).
5. Test sur les 416 spots réels : aucun titre au-dessus de 60 caractères, aucun titre vide, aucun doublon exact, aucun tiret cadratin.

### Critères d'acceptation

- `pnpm test` inclut un test qui itère sur la liste réelle des spots `approved` et assert `title.length <= 60` pour 100 % d'entre eux.
- Aucun `—` dans les titres générés.
- Le canonical, l'OG et le Twitter card sont **inchangés** (l'OG a le droit d'être long, il n'est pas tronqué).

### Garde-fous

- Ne pas modifier les slugs ni les URLs. Un changement d'URL coûterait tout le capital SEO acquis.
- Ne pas toucher aux titres de `/especes/*` : ils font 51 à 60 caractères et ont été calibrés au sprint 75 (`lib/especes/seo.ts`).

---

## Bloc 6 — « Pêche du dorade royale » : une faute sur 125 pages

`lib/seo/programmatic.ts` lignes 290 et 293 construisent le titre avec un article masculin **en dur** :

```ts
if (!p.deptCode) return `Pêche du ${species.toLowerCase()} ${technique} en France`
return `Pêche du ${species.toLowerCase()} ${technique} ${deptPreposition(p.deptCode)}${dept}`
```

Résultat servi en ce moment dans Google : « Pêche **du** dorade royale au surfcasting dans la Manche » (75 impressions, 0 clic), « Pêche **du** orphie à la flottante… ».

L'objet `SPECIES` du même fichier contient déjà le champ `articleDe`, correctement renseigné (`'de la '` pour la dorade royale, `"de l'"` pour l'orphie, `'du '` pour les masculins). Il n'est simplement pas appelé ici, alors que le même soin a été mis dans la table `DEPT_PREPOSITIONS` juste en dessous.

**Portée** : dorade royale (3 techniques × 25 pages) + orphie (2 × 25) = **125 pages sur 337**. Et comme `programmaticTitle()` sert aussi au H1 (`app/(marketing)/peche/[...slug]/page.tsx` ligne 146), la faute est dans le titre Google **et** sur la page.

> **Connecteurs** : aucun. Bloc local, 10 minutes de code, un test qui vaut plus que le code.

### Tâches

1. Remplacer `Pêche du ${species.toLowerCase()}` par `Pêche ${SPECIES[p.species].articleDe}${SPECIES[p.species].labelLower}` aux deux endroits.
2. Vérifier que la même faute n'existe pas ailleurs : `grep -rn "Pêche du \|pêche du " --include=*.ts --include=*.tsx lib app components` et corriger toute occurrence construite dynamiquement (les occurrences en dur sur une espèce masculine sont correctes, les laisser).
3. Test paramétré sur **les 337 pages** de `getAllProgrammaticPages()` : le titre commence par `Pêche du `, `Pêche de la ` ou `Pêche de l'` **selon `articleDe` de l'espèce**, et jamais autrement.
4. Vérifier au passage la longueur : les titres programmatiques mesurés font 36 à 59 caractères, et l'article féminin en ajoute 3. Le plus long connu (« Pêche du maquereau à la flottante dans les Bouches-du-Rhône », 59) est masculin donc non affecté, mais la marge est mince : ajouter l'assertion `<= 60` au même test pour verrouiller.

### Critères d'acceptation

- `/peche/dorade-royale/surfcasting/manche` sert le titre « Pêche de la dorade royale au surfcasting dans la Manche » et le même H1.
- `/peche/orphie/flottante/corse-du-sud` sert « Pêche de l'orphie à la flottante en Corse-du-Sud ».
- Les 212 pages des espèces masculines sont **strictement inchangées** (test de non-régression sur le titre).
- Aucun titre au-dessus de 60 caractères sur les 337.

### Garde-fous

- Ne pas changer les URLs : `programmaticUrl()` ne bouge pas.
- Ne pas ajouter d'espèces au programmatique : `SPECIES_TECHNIQUES` reste à 6 espèces, c'est le garde-fou anti-pages-creuses du sprint 57.

---

## Bloc 7 — Réparer l'attribution, sinon rien de tout ça n'est mesurable

Google compte **691 clics** sur la semaine ; PostHog n'attribue que **293 pages vues** à « Organic Search ». En parallèle, **53 % du trafic PostHog est classé « Referral » avec pour référent `www.carnet-de-peche.com`** (461 vues) : de l'auto-référencement, c'est-à-dire une session qui se casse en cours de navigation. Deux hôtes apparaissent aussi dans les données (`www.carnet-de-peche.com` et `carnet-de-peche.com`, 43 vues).

Bonne nouvelle vérifiée : **côté Google, un seul hôte est indexé** (`www`, https). Le problème est donc de mesure, pas de SEO. Mais tant qu'il dure, l'effet des Blocs 1 à 6 sera illisible.

**Hypothèse principale, à confirmer avant de coder.** L'init vit dans `components/analytics/PostHogProvider.tsx` et pose, à raison, `opt_out_capturing_by_default: true` (garde-fou RGPD du sprint 26) et `capture_pageview: false` (pageviews émis à la main par `PageViewTracker`, App Router oblige). Conséquence mécanique : **rien n'est capturé tant que le visiteur n'a pas accepté le bandeau cookies.** S'il accepte sur sa deuxième page, le premier `$pageview` enregistré lit `document.referrer` à cet instant, qui vaut alors la page interne d'où il vient, pas Google. D'où l'auto-référencement à 42 %, et d'où une partie de l'écart 691 clics / 293 pages vues.

Si c'est bien la cause, le correctif n'est **pas** de capturer plus tôt (ce serait illégal), mais de **mémoriser la source d'entrée sans rien émettre**, puis de l'attacher au premier event capturé après consentement.

> **Connecteurs** : **docs-researcher** → Context7 sur `posthog-js`, en particulier la gestion de `$referrer` / `$referring_domain` / `$set_once` et les propriétés d'entrée de session (`$entry_referring_domain`), avant d'écrire quoi que ce soit. Ne pas coder de mémoire sur cette API.

### Tâches

1. **Diagnostiquer avant de corriger.** Confirmer ou infirmer l'hypothèse ci-dessus, et écarter les deux autres pistes (apex vs www, navigation client non capturée). Livrer `docs/sprint-76/research/attribution.md` avec la cause identifiée et sa preuve (requête HogQL ou trace réseau). **Aucun code avant ce livrable.**
2. Si l'hypothèse est confirmée : au tout premier chargement, mémoriser `document.referrer` et les paramètres UTM **en mémoire ou en `sessionStorage`, sans aucune émission réseau**, puis les passer explicitement en propriétés du premier `$pageview` capturé après `opt_in_capturing()`. Le gate de consentement reste strictement intact : rien ne part avant le clic.
3. Vérifier au passage que `PageViewTracker` n'émet pas de `$pageview` en double sur les changements de `searchParams` (la carte et `/spots` en poussent beaucoup), ce qui gonflerait le dénominateur de tous les taux du Bloc 8.
4. Redirection 301 `carnet-de-peche.com` → `www.carnet-de-peche.com`. ⚠️ Cela se règle **dans le dashboard Vercel** (Domains → domaine apex → Redirect to www), pas dans le code : le noter dans « Reste manuel John » plutôt que d'ajouter un `redirects()` dans `next.config.ts` qui ferait doublon.

### Critères d'acceptation

- `docs/sprint-76/research/attribution.md` livré, cause identifiée, preuve à l'appui.
- Après correctif et 48 h de données : la part de `$referring_domain = 'www.carnet-de-peche.com'` sur les `$pageview` passe sous **5 %** (42 % aujourd'hui), et la part « Organic Search » remonte en proportion.
- Aucune requête réseau vers `eu.i.posthog.com` avant acceptation du bandeau. **À vérifier dans l'onglet Réseau, c'est le critère non négociable de ce bloc.**
- Un rechargement de `/spots?dept=29` puis un changement de filtre n'émettent pas plus de `$pageview` qu'aujourd'hui (pas de régression de comptage).

### Garde-fous

- Ne pas retirer, ni assouplir, ni contourner `opt_out_capturing_by_default: true`. Le sprint 26 a posé ce garde-fou, il ne s'ouvre pas pour améliorer une métrique.
- Ne pas viser un ratio 1:1 entre clics GSC et visiteurs PostHog : les visiteurs qui refusent le bandeau ne seront **jamais** comptés, c'est le prix assumé du RGPD. Le sprint 74 avait déjà mesuré un facteur ~2. **Documenter le facteur résiduel** dans `METRIQUES.md` plutôt que d'essayer de le faire disparaître.
- Ne pas ajouter de nouvel outil de mesure. PostHog + GSC suffisent.

---

## Bloc 8 — Les repères à relire dans 14 jours

Ce sprint change des taux, pas des volumes. Sans repères écrits, on ne saura pas s'il a marché.

> **Connecteurs** : aucun pour écrire, le connecteur PostHog pour relire à J+14.

### Tâches

1. Créer `docs/sprint-76/METRIQUES.md` avec la base de départ figée au 2026-08-13 :

   | Repère | Base 13/08 | Cible J+14 |
   |---|---|---|
   | Taux de clic du mur (`signup_wall_clicked` / `signup_wall_viewed`) | **1,3 %** (3 / 225) | > 6 % |
   | Couverture du mur (personnes mur vu / visiteurs de fiches spots) | **42 %** (65 / 156) | > 90 % |
   | Complétion du formulaire (comptes / visiteurs `/auth/*`) | **≈ 28 %** (10 / 36, PostHog) | > 50 % |
   | Comptes créés par semaine — **source `auth.users`** | **15** (07 au 13/08) | 30 à 50 |
   | Part de Google dans les inscriptions | **33 %** (4 / 12 depuis le 09/08) | à surveiller après remontée du bouton |
   | CTR `/spots` (GSC) | **7,4 %** | > 8,5 % après breadcrumb + titres |
   | CTR `/especes` (GSC) | **1,05 %** | à surveiller, hors périmètre |
   | Référent interne dans PostHog | **42 %** | < 5 % |
   | Sessions à une seule page | **54 %** (167 / 308) | < 45 % après Bloc 10 |
   | Pages indexées sur les 416 fiches (GSC, relevé manuel) | à relever | en hausse après Bloc 10 |

2. Y consigner les deux requêtes HogQL de suivi (reprendre celles de `docs/sprint-75/RECAP.md` §7, plus celle du Bloc 2 sur le doublon d'event).
3. **Le volume d'inscriptions se lit dans `auth.users`, jamais dans PostHog.** Mesuré le 13/08 : la base compte **15 comptes** sur 7 jours quand PostHog en voit **10**, soit un facteur **1,5** (le sprint 74 estimait ~2, c'est meilleur que prévu, mais l'écart est réel et vient du gate de consentement). Requête de référence :
   ```sql
   select date_trunc('day', created_at)::date as jour,
          coalesce(raw_app_meta_data->>'provider','inconnu') as provider,
          count(*) as comptes
   from auth.users
   where created_at >= now() - interval '14 days'
   group by 1, 2 order by 1 desc
   ```
   PostHog sert aux **ratios entre étapes** (mur vu → mur cliqué → compte), la base sert aux **volumes**. Ne jamais mélanger les deux dans une même division.

### Critères d'acceptation

- Le fichier existe, chaque repère a une base chiffrée, une **source nommée** (`auth.users` ou PostHog ou GSC) et une requête qui permet de la recalculer.

---

## Bloc 9 — `/spots` est la première page de sortie et n'a aucun mur

`app/(marketing)/spots/page.tsx` est la **2e page la plus vue du site** (36 visiteurs, 138 vues sur 7 jours), la **1re source de sortie** (13 sorties pour 114 vues), et elle reçoit **514 impressions et 32 clics Google** en direct. Un `grep SignupWall app/(marketing)/spots/page.tsx` ne renvoie **rien** : cette page n'a aucune surface de conversion, ni bandeau, ni encart.

C'est le trou le plus simple à boucher du sprint : la page liste déjà 416 spots par département, le visiteur y est manifestement en train de chercher où pêcher, et on ne lui propose rien.

> **Connecteurs** : aucun. Réutiliser `SignupWall` tel quel, la copie générique de `lib/gating/wall.ts` convient ici (le visiteur n'est pas sur un spot précis).

### Tâches

1. Ajouter `'spots_list'` à `SIGNUP_WALL_SURFACES` dans `lib/gating/wall.ts`. ⚠️ **Ajouter, ne jamais renommer** les entrées existantes : elles portent le suivi du funnel depuis le sprint 75.
2. Insérer un `<SignupWall surface="spots_list" />` pour les visiteurs anonymes, **après le premier groupe de département** et non en pied de page : la liste est longue, un encart en bas ne sera jamais vu.
3. Sur une facette (`?dept=` ou `?species=`), contextualiser le titre du mur avec le libellé de la facette, en réutilisant `buildH1(dept, species)` déjà présent dans le fichier. Exemple : « Suis les spots du Morbihan, c'est gratuit ».
4. `redirectTo` = l'URL courante, query comprise, pour que le visiteur revienne sur sa facette après inscription.

### Critères d'acceptation

- `/spots` en anonyme : le mur est visible sans scroller au-delà du premier écran et demi en 390 px.
- `/spots?dept=56` en anonyme : le mur reprend le libellé du département.
- Connecté : aucun mur d'inscription sur `/spots` (l'upsell abonnement existant, s'il y en a un, est inchangé).
- Un `signup_wall_viewed` avec `surface: 'spots_list'` remonte dans PostHog après déploiement.

### Garde-fous

- Ne pas toucher à `fetchPublicSpots` ni à `fetchSpotFacets` : la liste passe par la RLS et sert déjà exactement les 416 spots approuvés. **Vérifié le 13/08, ne pas « corriger » ce qui n'est pas cassé.**
- Ne pas paginer la liste ce sprint : ce serait un changement d'URL, donc un risque SEO, hors périmètre.

---

## Bloc 10 — Les fiches de spots sont des culs-de-sac

Les liens sortants d'une fiche de spot sont aujourd'hui : `/spots` (la liste), `/especes/*`, `/carte`, `/guides/*`, `/tarifs`, et le CTA. **Aucun lien vers une autre fiche de spot.** Les 416 fiches ne se maillent pas entre elles.

C'est un double problème, et c'est le plus structurant du sprint :

- **Conversion** : 54 % des sessions ne voient qu'une seule page (167 sur 308). Un visiteur qui arrive de Google sur la Pointe de Penvins lit, et repart. On ne lui donne aucune raison de rester, donc aucune raison de créer un compte.
- **SEO** : 416 pages sans maillage horizontal ne se transmettent aucune autorité et dépendent entièrement du sitemap pour être découvertes. C'est très exactement le profil « Découverte, actuellement non indexée » que tu vois dans GSC.

**Aucune migration n'est nécessaire**, et c'est vérifié : la RPC `nearby_spots(lat, lng, radius_km)` existe depuis la migration 004 (redéfinie en 024), elle est `SECURITY DEFINER` **et elle filtre bien `moderation_status` et `visibility`**. Test réel du 13/08 autour de la Pointe de Penvins sur 40 km : 3 spots renvoyés, **0 non approuvé, 0 non public**. Elle ne peut donc pas produire les liens morts que la migration 109 avait dû corriger sur `get_top_spots_for_species`. Le type `NearbySpot` et `lib/spots/nearby.ts` existent déjà, et `components/map/NearbyPanel.tsx` les consomme côté carte.

> **Connecteurs** : **supabase-guard** en lecture pour reconfirmer la signature de `nearby_spots` et le fait qu'elle n'expose aucune coordonnée précise à un anonyme **avant** de l'appeler depuis une page publique. C'est le point sensible du bloc.

### Tâches

1. Ajouter une section « Autres spots à moins de X km » en bas de `app/(marketing)/spots/[slug]/page.tsx`, alimentée par `nearby_spots` autour du spot courant, 6 entrées maximum.
2. **Repli obligatoire** : la densité est faible sur la plupart des façades (3 spots seulement dans 40 km autour de Penvins). Si `nearby_spots` renvoie moins de 3 résultats, compléter avec d'autres spots **du même département**, libellé « Autres spots du {département} ». Vérifié le 13/08 : chaque département compte au moins 3 spots approuvés (de 3 dans le Nord à 105 dans le Morbihan), le repli aboutit donc toujours.
3. Chaque entrée est un `<Link>` vers `/spots/{slug}`, avec le nom, la distance si elle vient de `nearby_spots`, et les 2 premières espèces. Aucune coordonnée.
4. Rendu **côté serveur**, dans le HTML servi : c'est un bloc de maillage interne, il n'a aucune valeur s'il est monté au clic.
5. Instrumenter avec un event `spot_to_spot_clicked` (`from_slug`, `to_slug`) dans `lib/analytics.ts`, sur le modèle de `species_to_spot_clicked` livré au sprint 75.

### Critères d'acceptation

- Le HTML servi de `/spots/pointe-de-penvins` contient au moins 3 liens `href="/spots/…"` vers d'autres fiches, et **tous répondent 200** (script de vérification à lancer sur un échantillon de 20 fiches tirées au hasard : **zéro 404 toléré**).
- Aucune paire `lat`/`lng` supplémentaire dans le HTML servi à un anonyme (rejouer la passe anti-fuite).
- Sur une fiche d'un département à 3 spots (Nord, `/spots/digue-carnot-boulogne` par exemple), la section s'affiche quand même via le repli département.
- Repère à relire à J+14 : la part de sessions à une seule page passe sous **45 %** (54 % aujourd'hui).

### Garde-fous

- ⚠️ Ne **jamais** construire une URL de spot à la main. Ne lier que des slugs renvoyés par la RPC ou par une requête passant par la RLS. C'est la leçon de la migration 109 et des 941 URLs mortes du sitemap : sur nos meilleures pages, un lien interne mort coûte plus cher qu'un lien manquant.
- Ne pas appeler `nearby_spots` avec un rayon supérieur à 50 km : au-delà, « autres spots à proximité » devient un mensonge.
- Coût DB : +1 appel RPC par fiche, à lancer **en parallèle** des requêtes existantes dans le `Promise.all` déjà présent. Pas de N+1.

---

## Workstream VERIF (obligatoire, agent indépendant)

L'agent qui exécute VERIF **n'a écrit aucun des blocs**.

1. Lancer `/verif-sprint` : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + passe anti-régression. Puis **deploy-watch** après déploiement.
2. Relire chaque critère d'acceptation des Blocs 1 à 10 et cocher ✅/❌ **avec preuve** (commande, requête, capture).
2bis. **Passe liens morts** (nouvelle, imposée par le Bloc 10) : tirer 20 fiches de spots au hasard, extraire tous les `href="/spots/…"` du HTML servi, vérifier que chacun répond 200. **Zéro 404 toléré.** C'est la régression la plus coûteuse que ce sprint puisse introduire, sur les pages qui font 80 % des clics.
3. **Passe sécurité, la plus importante de ce sprint** : ce sprint touche la page la plus exposée du site.
   - Aucune coordonnée précise dans le HTML servi à un anonyme. Rejouer la passe anti-fuite de `docs/sprint-75/RECAP.md` §6 (recherche de paires lat/lng, en excluant la chaîne décorative connue de `components/layout/Footer.tsx:166`).
   - `current_tier`, les RPC spots et les policies RLS : **aucune modification**. Le vérifier par `git diff --stat` sur `supabase/`.
   - Limite de 3 spots par département et floutage `geom_public` intacts.
4. **Passe copy** : tutoiement partout, messages zod en français, aucun tiret cadratin dans une chaîne visible (lancer `node scripts/lint-copy-dashes.mjs`), aucune promesse produit fausse. Vérifier en particulier qu'aucun mur d'inscription ne laisse croire que le compte gratuit donne les coordonnées précises.
5. **Passe SEO anti-régression** : le contenu indexable de la fiche de spot (description, marées, meilleurs moments, guides liés, spots proches) est toujours **entièrement dans le HTML servi**. Le vérifier sur le build de prod, pas en dev.
6. Livrer `docs/sprint-76/RECAP.md` : fait / comment tester / reste manuel John, en distinguant clairement ce qui est **mesuré** de ce qui est **attendu**.

---

## Reste manuel John (post-sprint)

1. ~~Confirmer `INVITE_ONLY`~~ — **fait le 13/08**, vérifié en base (5 comptes Google sur 21 jours). Rien à faire.
2. Redirection 301 apex → www dans le dashboard Vercel (Bloc 7, tâche 3).
3. Vérifier dans GSC que `https://www.carnet-de-peche.com/sitemap.xml` est bien soumis sur la propriété `sc-domain:carnet-de-peche.com` : l'API n'en remonte aucune donnée, ce qui suggère qu'il ne l'est pas.
4. Passer les nouveaux titres de fiches de spots au test de résultats enrichis de Google et à l'onglet **Améliorations** de GSC (l'API n'expose ni la couverture d'indexation ni les enrichissements).
5. Merge `sprint-76` → `main` et déploiement.
6. Relire `docs/sprint-76/METRIQUES.md` à J+14 (27/08) et à J+30 (12/09).

---

## Ce qui est explicitement HORS périmètre

- **La curation des 4 018 spots `pending`** (décision John du 13/08). C'est le levier de croissance le plus mécanique du projet, mais c'est une lane de contenu, pas un sprint de code. Elle continue en parallèle via `docs/contenu/curation-spots/PLAYBOOK.md`.
- **Le redressement d'intention des fiches `/especes`** (2 771 impressions pour 29 clics). Le sprint 75 a déjà refondu ces pages ; il faut mesurer son effet à 90 jours avant d'y retoucher. À arbitrer au sprint 77.
- **Le référencement des guides** (207 impressions par semaine pour 7 guides). Chantier éditorial, pas technique.
- **L'écart de position mobile / desktop** (6,9 contre 11,3). **La piste performance est éliminée**, mesurée le 13/08 sur 14 jours de `$web_vitals` : LCP p75 à 1 494 ms en mobile et 1 220 ms en desktop, INP p75 à 132 et 72 ms, CLS p75 à 0. Tout est dans le vert Google, et le desktop est **plus rapide** que le mobile. L'écart de position vient donc de la concurrence dans les SERP desktop, pas du site. Rien à corriger : ne pas ouvrir de chantier performance ce sprint.
- **Toute migration SQL.** Si un bloc en réclame une, c'est qu'il déborde : `⚠️ DEMANDER À JOHN AVANT`.
