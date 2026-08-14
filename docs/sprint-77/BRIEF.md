# Sprint 77 — Brief d'exécution
## « Trois paliers qui se voient » : donner enfin une raison de créer un compte

> Rédigé le 2026-08-13. Durée : 2 semaines (14/08 → 28/08).
> Contexte : QA du sprint 76 en prod (voir §« Ce que la QA a mesuré »), et constat John du 13/08 : « les gens ont déjà accès à tout sans créer de compte ».
> Sprint précédent : `docs/sprint-76/BRIEF.md` + son RECAP. Mergé sur `main` (`879c0d8`), déployé, vérifié.
> Décisions John 2026-08-13 :
> - Échelle à **trois paliers** : anonyme < compte gratuit < abonné.
> - Pour un anonyme, « certains spots » s'applique **à la carte et à la liste uniquement**. Les 416 fiches restent accessibles par URL et indexables. Décision verrouillée : aucun bloc de ce sprint ne réduit l'inventaire indexable.
> - Le score / « meilleurs moments » passe au palier compte gratuit.

**Préalable avant de démarrer** : aucun. `main` est à jour, le sprint 76 est en prod.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-77/BRIEF.md`. Lance les workstreams
> A, C, D, E en parallèle dès maintenant, enchaîne B après A, et termine par le
> workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 1 (migration 110) | **supabase-guard** → Supabase (RO) | Relire `get_spots_for_map`, `nearby_spots` et `get_spot_by_slug` en SQL AVANT d'écrire la migration. Trois RPC `SECURITY DEFINER` : une erreur de palier ouvre des données payantes. `get_advisors` après migration. |
| Blocs 2 et 3 | **docs-researcher** → Context7 | Next 15.5 : rendu serveur conditionnel et `<details>` natif. Le contenu doit rester dans le HTML servi. |
| Après implémentation | **qa-chrome** → Claude in Chrome | Rejouer la QA du sprint 76 en **390 px, cookies vidés**, dans les trois états : anonyme, compte gratuit, abonné. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Ce sprint touche les RPC de gating. Zéro régression tolérée. |
| Clôture | **`/verif-sprint`** | Tests + build + typecheck + lint + revue indépendante. |

---

## Objectif du sprint en une phrase

Faire qu'un compte gratuit débloque quelque chose de visible — aujourd'hui il ne débloque **rien** sur une fiche de spot — et qu'il débouche sur une **première prise loguée et publique**, sans réduire d'une seule page l'inventaire que Google indexe.

## Le but, et où la chaîne casse aujourd'hui

But de John : attirer un maximum de visiteurs, les convertir en comptes, les amener à loguer leurs prises, et faire du site un vrai réseau social de pêcheurs. La chaîne compte quatre maillons, et **elle casse aux trois derniers**. Mesuré en base le 13/08 :

| Maillon | État réel | Commentaire |
|---|---|---|
| Visiteurs | 691 clics Google / semaine, en hausse de 153 % | ✅ le seul maillon qui fonctionne |
| → Comptes | 15 comptes / semaine | le sprint 76 vient d'attaquer ce maillon |
| → Première prise | **5 comptes sur 32 en 60 jours, soit 16 %** | 84 % des inscrits ne loguent jamais rien |
| → Réseau social | **7 prises publiques sur tout le site** | 26 prises loguées, dont 18 privées et 1 « amis » |

Le total du site, depuis toujours : **42 comptes, 26 prises, 12 abonnements entre pêcheurs, 10 favoris.**

Et la cause du dernier maillon est une seule ligne de schéma : la colonne `catches.privacy` a pour valeur par défaut **`'private'`**. Chaque prise loguée est donc invisible pour tout le monde, sauf si le pêcheur va lui-même changer le réglage. Un réseau social dont le contenu est privé par défaut n'a pas de fil, pas de raison de revenir, et prive au passage les fiches de spots de leur seule matière fraîche et unique — celle qui les fait ranker et qui sert de preuve sociale.

**Conclusion qui commande les Blocs 7 à 10 : doubler le nombre de comptes ne sert à rien tant que 84 % d'entre eux ne loguent rien et que 73 % de ce qui est logué reste invisible.**

---

## Le constat qui commande ce sprint

Vérifié en base et en navigateur le 13/08 :

| Fait | Preuve |
|---|---|
| Anonyme et compte gratuit reçoivent **les mêmes données** sur une fiche de spot | `get_spot_by_slug` ne contient pas le mot `anonymous` ; sa seule condition de précision porte sur `itinerant` / `local` / propriétaire |
| Anonyme et compte gratuit voient **les mêmes 3 spots par département** sur la carte | `get_spots_for_map` finit par `where tier in ('local','itinerant') or rn <= 3` |
| `/spots` liste **416 spots à tout le monde**, anonyme compris | Mesuré en navigation anonyme : `nbSpotsListes: 416`, page de 68 459 px |
| Aucune section de la fiche n'est conditionnée à `user` | Seul `user && personalTendencies` l'est |

Trois promesses fausses en découlent, toutes dans la copie des murs :

1. « Les marées et la météo de ce spot » — déjà lisibles gratuitement, plus haut sur la même page.
2. « Les prises déclarées ici » — déjà affichées par `SpotActivitySection`, sans condition.
3. « 3 spots par département sur la carte » — un anonyme les a déjà.

Le mur fait **1,3 % de clic**. Il promet à un visiteur ce qu'il vient de recevoir.

---

## Ce que la QA du sprint 76 a mesuré (base de ce sprint)

Testé en prod, en anonyme, viewport 594 px :

- ✅ CTA collant : « Voir les conditions à Pointe de Penvins, gratuit » → `/auth/register?redirect=…`, en `position: fixed`, premier écran.
- ✅ Mur d'inscription à **48 %** de la page (critère : < 60 %).
- ✅ `/spots` : mur après le premier groupe de département, à 1,7 écran.
- ✅ Titre `Pêche à Pointe de Penvins (56) : Bar, Dorade royale` — 51 caractères.
- ✅ JSON-LD : `Place` + `BreadcrumbList`.
- ✅ Maillage : 830 liens sur les 416 fiches, **0 lien mort** (vérifié en base sur la totalité).
- ⚠️ Non concluant : collision des blocs fixes (bandeau cookies déjà répondu sur le navigateur de test) et viewport réel de 594 px au lieu de 390.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 1 (migration 110, les 3 RPC) | 1,5 j | — | ✅ |
| B | Blocs 2, 3 (fiche + liste) | 3 j | A | ❌ |
| C | Bloc 4 (copie des murs et de `/tarifs`) | 1 j | — | ✅ |
| D | Bloc 5 (les deux défauts de la QA) | 1 j | — | ✅ |
| E | Bloc 6 (mesure + garde-fou SEO) | 0,5 j | — | ✅ |
| F | Bloc 7 (inscription différée) | 2 j | — | ✅ |
| G | Bloc 8 (activation + confidentialité) | 1,5 j | — | ✅ |
| H | Bloc 9 (`/especes`, assurance CTR) | 1,5 j | — | ✅ |
| I | Bloc 10 (coût d'inscription : lien magique, alertes) | 1 j | — | ✅ |
| VERIF | revue finale | 1 j | tous | ❌ (toujours en dernier) |

> ⚠️ **Le sprint est chargé : 10 blocs.** Si la fin de sprint déborde, l'ordre de sacrifice est explicite et il ne se discute pas : **Bloc 10, puis Bloc 9, puis Bloc 5.** Les Blocs 7 et 8 ne se sacrifient jamais — ce sont eux qui portent le but de John, et ils sont indépendants du reste. Si tu ne devais en garder qu'un seul de tout le sprint, ce serait le **Bloc 7**.

---

## La matrice, source unique de vérité du sprint

Tout bloc qui s'en écarte est en erreur. À recopier telle quelle dans `docs/sprint-77/RECAP.md`.

| | Anonyme | Compte gratuit | Abonné |
|---|---|---|---|
| **Carte** | 3 spots / département *(inchangé)* | **tous les spots** ← le changement | tous |
| **Liste `/spots`** | extrait visible par département, **tous les liens dans le HTML** | liste dépliée | dépliée |
| **Fiche : accès** | **toutes, par URL, indexables** | toutes | toutes |
| **Fiche : description, espèces, dangers, accès** | oui | oui | oui |
| **Fiche : marées et météo** | **jour même** | **7 jours** | 7 jours |
| **Fiche : score / meilleurs moments** | **score du jour** | **frise 7 jours** | 7 jours |
| **Fiche : prises déclarées** | **2 dernières** | **toutes** (k-anon inchangé) | toutes |
| **Fiche : spots proches** | oui | oui | oui |
| **Coordonnées GPS précises** | non | **non** | **oui** |
| **Filtres avancés, couches carte** | non | non | oui |
| **Carnet, favoris, alertes** | non | oui | oui |

> ⚠️ **La règle qui prime sur tout le reste** : ce qu'un anonyme ne voit pas doit rester **absent du DOM**, jamais masqué en CSS ni retiré par JS. Et le contenu socle (description, espèces, dangers, accès, marée du jour, score du jour) reste **entièrement dans le HTML servi** — c'est lui qui fait ranker les fiches à 7,4 % de CTR. Bot et humain reçoivent le même HTML : pas de branche `user-agent`, jamais.

---

## Bloc 1 — Migration 110 : le compte gratuit ouvre la carte

Aujourd'hui `get_spots_for_map` se termine par `where tier in ('local','itinerant') or rn <= 3`. Anonyme et `discovery` tombent tous les deux dans le `rn <= 3`. C'est ce qui rend le compte gratuit invisible.

> **Connecteurs** : **supabase-guard** en lecture d'abord. Relire les trois fonctions en entier avant d'écrire quoi que ce soit — elles sont `SECURITY DEFINER`, elles contournent la RLS, et la migration 109 a déjà dû réparer ce type d'erreur sur `get_top_spots_for_species`.

### Tâches

1. Nouveau fichier `supabase/migrations/110_tier_ladder.sql`. **Jamais** de modification d'une migration existante.
2. `get_spots_for_map` : remplacer la clause finale par `where tier <> 'anonymous' or rn <= 3`. Un `discovery` reçoit alors tous les spots. **La gate de précision (`is_precise`) est strictement inchangée** : `discovery` continue de recevoir le centroïde de `geom_public`.
3. `nearby_spots` : même correction, même clause. Un compte gratuit doit voir de vrais voisins et non le remplissage alphabétique (cf Bloc 5).
4. `get_spot_by_slug` : ajouter la distinction de palier pour la profondeur de contenu. Ne pas y mettre de logique de présentation — la fonction expose ce que le palier autorise, la page décide de l'affichage.
5. Régénérer `lib/types.ts` après migration. Lancer `get_advisors`.

### Critères d'acceptation

- En SQL, pour un `uid` de compte gratuit : `select count(*) from get_spots_for_map(null,null,null)` renvoie **416**, et `count(*) filter (where is_precise)` renvoie **0**.
- Pour un anonyme : **72** lignes au plus (3 × 24 départements), toutes avec `is_precise = false`.
- Pour un abonné `itinerant` : 416 lignes, `is_precise = true`.
- Aucune policy RLS modifiée : `git diff` sur `supabase/` ne montre que le fichier 110.
- `get_advisors` : aucune nouvelle alerte de sécurité.

### Garde-fous

- ⚠️ Ne **jamais** ouvrir `is_precise` à `discovery`. Les coordonnées précises restent le cœur de l'abonnement, décision John maintenue.
- Les spots `visibility = 'subscriber'` restent réservés aux abonnés, clause inchangée.
- Une migration ne se modifie pas : si le test échoue, écrire `111`, pas retoucher `110`.

---

## Bloc 2 — La fiche de spot, trois profondeurs

La fiche donne tout à tout le monde. Elle doit servir trois versions du même document, avec le socle SEO identique dans les trois.

> **Connecteurs** : **docs-researcher** sur le rendu conditionnel en Server Component. Le contenu servi ne doit dépendre que du palier, jamais du client.

### Tâches

1. Dans `app/(marketing)/spots/[slug]/page.tsx`, remplacer le booléen `showSignupWall = !user` par le palier réel issu de `getUserTier()`. La page a trois états, pas deux.
2. **Marées et météo** (`SpotConditionsSection`) : anonyme → le jour même ; `discovery` et plus → 7 jours. Le jour même reste dans le HTML pour tous.
3. **Score / meilleurs moments** (`SpotBestMomentsSection`) : anonyme → le score du jour, seul ; `discovery` et plus → la frise 7 jours. ⚠️ Le score du jour est un contenu frais et unique, il **reste indexable** : c'est la condition qui rend cette décision sûre pour le SEO.
4. **Prises déclarées** (`SpotActivitySection`) : anonyme → les 2 dernières, puis une ligne « N autres prises déclarées ici » qui ouvre le mur. `discovery` et plus → toutes. Le k-anon K=3 reste appliqué à l'identique.
5. À chaque coupure, un mur contextualisé qui nomme **ce qui est derrière** : « Vois les 7 prochains jours à {spot} » plutôt qu'un CTA générique. Réutiliser `SignupWall` avec `spotName`.
6. Émettre `signup_wall_viewed` avec une `surface` distincte par coupure : ajouter `spot_tides`, `spot_score`, `spot_catches` à `SIGNUP_WALL_SURFACES`. **Ajout seulement**, jamais de renommage.

### Critères d'acceptation

- Le HTML servi à un anonyme contient : la description, les espèces, les dangers, l'accès, la marée du jour, le score du jour, les spots proches, le `BreadcrumbList`. Vérifié sur le build de prod, pas en dev.
- Il ne contient **pas** : les jours 2 à 7 de marée, la frise de score, les prises au-delà de la 2<sup>e</sup>. Absents du DOM, pas masqués.
- Un compte gratuit voit les 7 jours et toutes les prises, et **aucune coordonnée précise** (rejouer la passe anti-fuite du sprint 75 §6).
- Les trois nouvelles `surface` remontent dans PostHog après déploiement.
- Le titre, le canonical et le JSON-LD sont **identiques** dans les trois états.

### Garde-fous

- Ne pas toucher au k-anon ni à `catches_for_viewer`.
- Ne pas rendre la page dynamique : `revalidate = 1800` doit tenir. Si le palier casse le cache, `⚠️ DEMANDER À JOHN AVANT` — c'est un arbitrage coût CPU contre gating, et le CPU est déjà un sujet ouvert.

---

## Bloc 3 — `/spots` : un extrait qui reste crawlable

Décision John : la liste est une surface de découverte, elle peut être réduite pour un anonyme. **Mais elle est aussi le seul endroit du site qui donne à Google 416 liens internes.** Les deux exigences se concilient d'une seule façon.

### Tâches

1. Pour un anonyme, n'afficher que les **5 premiers spots par département**, puis un `<details>` natif « Voir les 100 autres spots du Morbihan » contenant **tous les liens restants**.
2. Le `<details>` est du HTML natif : les liens sont dans le document servi, Google les suit, l'humain voit un extrait. Même HTML pour tous — c'est ce qui distingue ce motif du cloaking. Le sprint 75 utilise déjà ce procédé pour la prose des fiches espèces.
3. Ajouter, après le premier département, un `SignupWall surface="spots_list"` contextualisé : « Ouvre la carte entière, c'est gratuit ».
4. Pour `discovery` et plus : liste dépliée, aucun `<details>`.
5. **Au passage** : la page fait **68 459 px** de haut et rend 416 fiches en une fois. Mesurer le coût serveur avant/après. Si le `<details>` ne réduit pas le travail de rendu, le noter dans le RECAP — la question CPU est ouverte et ce sprint ne doit pas l'aggraver.

### Critères d'acceptation

- Le HTML servi à un anonyme contient toujours **416** `href="/spots/…"`. C'est le critère non négociable de ce bloc.
- L'écran anonyme affiche au plus 5 spots par département avant dépliage.
- Aucun contenu monté au clic : `curl` sur le build de prod retrouve les 416 liens.
- Le sitemap continue de déclarer les 416 fiches.

### Garde-fous

- ⚠️ Ne jamais retirer un lien du DOM pour un anonyme. Réduire l'inventaire indexable est la seule chose que ce sprint a interdiction de faire.
- Pas de pagination : ce serait un changement d'URL, donc un risque SEO, hors périmètre.

---

## Bloc 4 — Arrêter de promettre ce qui est déjà donné

Trois promesses fausses aujourd'hui, listées en tête de brief. Une fois les Blocs 1 à 3 livrés, deux deviennent vraies mécaniquement — mais la copie doit dire ce qui est réellement derrière.

### Tâches

1. `lib/gating/wall.ts` : réécrire `SIGNUP_WALL_BENEFITS` autour de ce qui devient exclusif au compte gratuit — la carte entière, les 7 jours de conditions, toutes les prises, le carnet, les favoris et alertes. **Retirer** toute mention de « 3 spots par département », qui décrit ce qu'un anonyme a déjà.
2. Une variante de copie par surface de coupure (`spot_tides`, `spot_score`, `spot_catches`), qui nomme précisément ce qui est derrière le mur.
3. `/tarifs` : la table de comparaison doit refléter les **trois** paliers. Vérifier qu'elle ne présente pas comme payant ce qui devient gratuit.
4. Repasser `node scripts/lint-copy-dashes.mjs`.

### Critères d'acceptation

- Aucune chaîne de `SIGNUP_WALL_*` ne décrit une capacité déjà accessible à un anonyme. À vérifier ligne par ligne contre la matrice.
- `/tarifs` liste trois colonnes cohérentes avec la matrice.
- Tutoiement, zéro tiret cadratin, aucune promesse fausse.

---

## Bloc 5 — Les deux défauts trouvés en QA

### Tâches

1. **La mini-carte ne charge pas.** En anonyme sur `/spots/pointe-de-penvins`, le composant affiche « La carte n'a pas répondu, réessaie » et le visuel d'en-tête reste vide. Reproduire, diagnostiquer (console, réseau, CSP), corriger. C'est sur la page qui porte 80 % des clics.
2. **Le maillage tombe dans l'alphabet.** `fetchDepartmentSpots` fait `.order('name').limit(12)` : tous les spots d'un département se renvoient vers les mêmes voisins alphabétiquement premiers. Mesuré : **seuls 217 spots sur 416, soit 52 %, sont atteignables par le maillage**. Constaté en direct sur Penvins, qui propose Hoëdic et Belle-Île en remplissage.
   Remplacer le tri alphabétique par un tri déterministe **dépendant du spot d'origine** — par exemple une rotation sur le hash du slug, ou les plus proches par `geom_public` au-delà du rayon de `nearby_spots`. Aucune migration : la donnée nécessaire est déjà là.

### Critères d'acceptation

- La mini-carte s'affiche en anonyme sur 5 fiches tirées au hasard.
- **Plus de 85 %** des 416 spots reçoivent au moins un lien entrant. Requête de contrôle à écrire et à consigner dans le RECAP.
- Toujours **zéro lien mort** : rejouer la vérification exhaustive du sprint 76 (830 liens, 0 cible non approuvée).

---

## Bloc 6 — Le garde-fou SEO, non négociable

Ce sprint restreint du contenu sur les pages qui portent 80 % des clics, et il est livré **sans feature flag** (décision John). Le seul filet est la mesure.

### Tâches

1. Consigner dans `docs/sprint-77/METRIQUES.md` la base de départ, **avant déploiement** :

   | Repère | Base 13/08 | Seuil d'alerte |
   |---|---|---|
   | CTR `/spots` (GSC) | **7,4 %** | **< 6 % → revenir en arrière** |
   | Impressions / jour | ~2 000 | < 1 400 sur 3 jours consécutifs |
   | Position moyenne | 7,4 | > 9 |
   | Pages indexées (relevé manuel GSC) | à relever avant déploiement | en baisse |
   | CTR `/especes` (GSC) | **1,05 %** | doit **monter** vers 2 % (Bloc 9) |
   | Comptes créés / semaine (`auth.users`) | **15** | — |
   | Taux de clic du mur | 1,3 % | — |
   | **Comptes ayant logué ≥ 1 prise** | **16 %** (5 / 32 sur 60 j) | cible > 35 % |
   | **Prises publiques sur le site** | **7** (sur 26 loguées) | cible > 60 % des nouvelles |
   | Abonnements entre pêcheurs | 12 | — |

   Requête de contrôle de l'activation, à rejouer telle quelle :
   ```sql
   with comptes as (select id, created_at from auth.users where created_at >= now() - interval '60 days'),
        prises as (select user_id, count(*) nb from catches group by user_id)
   select count(*) as comptes, count(p.user_id) as ont_logue,
          round(100.0*count(p.user_id)/nullif(count(*),0)) as pct_actives
   from comptes c left join prises p on p.user_id = c.id
   ```

2. Noter la **date et l'heure exactes** du déploiement : sans flag, c'est le seul moyen de démêler l'effet de ce sprint de celui du sprint 76, sorti quelques heures plus tôt.
3. Relire à J+3, J+7 et J+14. **À J+7, si le CTR de `/spots` est sous 6 %, revenir en arrière sans attendre J+14.**

### Critères d'acceptation

- Le fichier existe et est rempli **avant** le déploiement, pas après.

---

## Bloc 7 — L'inscription différée : demander le compte APRÈS avoir donné

**Le bloc le plus important du sprint.** Aujourd'hui on demande le compte *avant* de rien donner : le visiteur doit croire une promesse. On inverse. Il agit d'abord, on lui demande le compte au moment de **sauvegarder** ce qu'il vient de faire.

Deux raisons de croire que ça marche ici mieux qu'ailleurs. L'aversion à la perte est beaucoup plus motrice qu'une promesse de bénéfice — « tu vas perdre ce spot » bat « tu auras accès à » à tous les coups. Et ton onboarding a **100 % de complétion** : 11 entrées, 11 sorties. Ton problème n'a jamais été de convaincre les gens d'aller au bout, il est de leur faire faire le premier geste.

> **Connecteurs** : **docs-researcher** sur les cookies `SameSite` en Server Actions Next 15.5. Aucune migration : le brouillon vit en cookie, pas en base.

### Tâches

1. **Rendre le bouton favori cliquable pour un anonyme.** `FavoriteSpotButton` exige un compte aujourd'hui. Pour un anonyme, écrire le slug dans un cookie `pending-favorites` (7 jours, `SameSite=Lax`, 5 spots au maximum) et afficher immédiatement l'étoile pleine. Le geste réussit, visiblement.
2. Au 2<sup>e</sup> favori posé, ou au départ de la page, ouvrir le mur avec la copie de perte : **« Tu as mis 2 spots de côté. Crée ton carnet pour les garder, c'est gratuit. »** Nouvelle surface `pending_favorite`.
3. **Même chose pour la prise**, qui est le vrai but. Rendre `/carnet/nouvelle?spot_id=…` accessible en anonyme jusqu'à l'étape finale : espèce, taille, date se remplissent, tout est gardé en cookie `pending-catch`, et le compte n'est demandé qu'au moment d'enregistrer. Surface `pending_catch`.
4. **À l'inscription, rejouer les brouillons** : le favori et la prise en attente sont créés dans la foulée, avant l'onboarding, et le visiteur revient sur le spot d'où il venait. Un brouillon perdu à cette étape est pire que pas de brouillon du tout.
5. Instrumenter `pending_favorite_created`, `pending_catch_started`, `pending_replayed`.

### Critères d'acceptation

- Un anonyme peut mettre un spot en favori et voit l'étoile se remplir, sans rechargement ni redirection.
- Après inscription, le favori et la prise en attente existent bien en base, rattachés au nouveau compte, et le visiteur atterrit sur la fiche d'origine.
- Le cookie ne contient **aucune donnée personnelle** : des slugs et des identifiants de spot, rien d'autre. Il est écrit sans consentement analytics, car il est fonctionnel et non traçant : le documenter comme tel.
- Un anonyme qui ne s'inscrit pas ne crée **aucune ligne** en base. Vérifier qu'aucun compte fantôme n'est produit.

### Garde-fous

- ⚠️ Ne jamais créer d'utilisateur anonyme en base. Le brouillon est côté client, point.
- Ne pas laisser croire que la prise est enregistrée avant qu'elle le soit : la copie dit « brouillon », jamais « enregistré ».
- Ne pas dégrader le HTML servi : ce bloc est du comportement client, le contenu indexable ne bouge pas.

---

## Bloc 8 — Le maillon cassé : de la première prise au fil

**16 % des comptes loguent une prise. 7 prises publiques sur tout le site.** Ce bloc attaque les deux.

### Tâches

1. **Changer la valeur par défaut de `catches.privacy` de `'private'` à `'public'`** (migration 110, même fichier que le Bloc 1). Le choix reste visible et modifiable **au moment de loguer**, jamais enterré dans les réglages : trois options claires, « Public / Amis / Privé », publique présélectionnée.
   ⚠️ **Aucune reprise rétroactive.** Les 18 prises déjà privées le restent, définitivement. Changer la visibilité de données passées sans accord explicite serait une faute, quelle que soit la valeur produit.
2. Rappeler dans l'interface ce qui protège déjà le pêcheur, parce que c'est vrai et que ça lève la vraie objection : la position exacte n'est jamais publiée, le k-anon K=3 s'applique, et le spot est flouté. Un pêcheur ne cache pas sa prise, il cache **son coin** — et son coin est déjà protégé.
3. **Amener à la première prise.** Aujourd'hui `onboarding/fini` renvoie sur `/home`. Le faire déboucher sur un geste unique : « Logue ta première prise » pré-rempli avec le spot d'où venait le visiteur — ou son favori en attente (Bloc 7). Le délai moyen entre inscription et première prise est de **13,4 h** chez ceux qui le font : le bon moment est tout de suite.
4. **Relance à J+2** pour un compte sans prise, via `lifecycle_email_sent` qui existe déjà. Un seul email, une seule action, désinscription en un clic.

### Critères d'acceptation

- Une prise loguée par défaut est `public`, et l'écran de saisie montre les trois options sans avoir à ouvrir un menu.
- Les 18 prises privées existantes sont **inchangées** : `select count(*) from catches where privacy='private'` renvoie toujours 18 après migration.
- `/onboarding/fini` propose un geste unique de log, pré-rempli quand un contexte de spot existe.
- Repère à J+14 : part des comptes ayant logué au moins une prise, **16 % aujourd'hui, cible > 35 %**.

### Garde-fous

- ⚠️ DEMANDER À JOHN AVANT toute modification rétroactive de `privacy` sur des lignes existantes. La réponse par défaut est non.
- Ne pas toucher au k-anon ni au floutage des coordonnées : ce sont eux qui rendent le passage en public acceptable.

---

## Bloc 9 — `/especes` : l'assurance qui finance le risque du sprint

Ce sprint restreint du contenu sur les fiches de spots, sans flag. Il faut une source de clics qui monte pendant que celle-là est sous surveillance. Elle existe : `/especes` consomme **2 771 impressions par semaine pour 29 clics, soit 1,05 %**, quand `/spots` fait 7,4 %. Trois pages à elles seules — `mulet` (571 impressions, 3 clics), `tassergal` (548 / 8), `congre` (404 / 6) — brûlent 1 500 impressions par semaine. Et `/especes/bar` fait **89 impressions et zéro clic**.

Passer ce répertoire de 1,05 % à 3 % vaut **+54 clics par semaine**, soit +8 % du total du site. C'est plus que ce que le gating peut coûter.

### Tâches

1. Relever dans GSC les requêtes réelles par page `/especes` et les classer en deux intentions : **identification** (« congre poisson », « bluefish », « barracuda méditerranée ») et **pêche** (« maille du maigre 2026 », « appât mulet »).
2. Pour les pages à intention d'identification, ajouter en tête un bloc **« Où pêcher le {espèce} près de chez toi »** listant 5 spots réels avec lien. `SpeciesTopSpots` existe déjà depuis le sprint 75 : il s'agit de le remonter, pas de l'écrire.
3. Réécrire les titres des 3 pages les plus déficitaires pour porter l'intention pêche plutôt que la définition.
4. Vérifier que les liens produits pointent vers des spots approuvés : réutiliser le garde-fou `lib/especes/programmatic-links.ts` du sprint 75.

### Critères d'acceptation

- Les 5 liens de chaque bloc répondent 200, zéro toléré.
- Aucun titre au-dessus de 60 caractères, aucun doublon.
- Repère à J+14 : CTR de `/especes` **de 1,05 % vers > 2 %**.

---

## Bloc 10 — Baisser le coût du compte, et donner une raison de revenir

### Tâches

1. **Sortir le lien magique du repli.** Il est implémenté et fonctionnel, caché derrière un bouton. Le présenter au même niveau que Google : email seul, sans mot de passe, un champ. Google fait déjà **33 % des inscriptions** ; le lien magique attaque le reste.
2. **Alerte de conditions sur un spot favori** : « préviens-moi quand le coefficient dépasse 90 à {spot} ». Ça exige un compte par nature, ça crée une raison de revenir, et ça s'appuie sur `favorite_spots` et `lifecycle_email_sent`, tous deux existants. Opt-in explicite, désinscription en un clic.
3. Ajouter l'alerte à la copie du mur (Bloc 4) : c'est le seul bénéfice de la liste qui soit **impossible** sans compte, et il vaut mieux que « 7 jours au lieu d'1 ».

### Critères d'acceptation

- Trois chemins d'inscription au même niveau visuel : Google, lien magique, email + mot de passe.
- Une alerte posée déclenche bien un email au franchissement du seuil, et une seule fois par événement.

### Garde-fous

- ⚠️ Ne pas augmenter la cadence d'emails sans arbitrage : une alerte est demandée par l'utilisateur, une relance ne l'est pas. Le Bloc 8 tâche 4 en ajoute déjà une.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` complet, puis **deploy-watch**.
2. Cocher chaque critère des Blocs 1 à 6 avec preuve.
3. **Passe gating, la plus importante de ce sprint** — le tester dans les **trois** états, pas deux :
   - anonyme : 3 spots/dept sur la carte, 0 coordonnée précise, contenu socle complet dans le HTML ;
   - compte gratuit : 416 spots sur la carte, **0 coordonnée précise**, 7 jours et toutes les prises ;
   - abonné : tout, coordonnées précises.
   Aucune donnée d'un palier supérieur ne doit fuiter dans le HTML d'un palier inférieur — absence du DOM, pas masquage.
4. **Passe SEO** : les 416 liens présents dans `/spots` en anonyme ; le socle de la fiche dans le HTML servi ; titre, canonical et JSON-LD identiques dans les trois états ; aucune branche sur le `user-agent` dans tout le diff.
5. **Passe QA navigateur** avec **qa-chrome**, en **390 px et cookies vidés** — les deux points que la QA du sprint 76 n'a pas pu établir : la collision entre bandeau cookies, CTA collant et `SignupBanner`, et le rendu à la largeur réelle d'un téléphone.
6. **Passe inscription différée** (Bloc 7) : parcourir le chemin complet en anonyme — poser un favori, commencer une prise, s'inscrire — et vérifier que les deux brouillons sont bien rejoués et que le retour se fait sur la fiche d'origine. Vérifier aussi qu'un anonyme qui abandonne ne laisse **aucune ligne** en base.
7. **Passe confidentialité** (Bloc 8) : `select privacy, count(*) from catches group by privacy` avant et après migration. Les 18 privées et la 1 « amis » doivent être **identiques**. Toute variation est un échec du sprint, pas un détail.
8. Livrer `docs/sprint-77/RECAP.md`, avec la matrice recopiée et l'état réel de chaque case.

---

## Reste manuel John (post-sprint)

1. Relever le nombre de pages indexées dans GSC **avant** le déploiement (l'API ne l'expose pas).
2. Noter l'heure de déploiement dans `METRIQUES.md`.
3. Redirection 301 apex → www dans Vercel, toujours en attente depuis le sprint 76.
4. Soumettre le sitemap sur `sc-domain:carnet-de-peche.com`.
5. Relire `METRIQUES.md` à J+3, J+7, J+14.

---

## Hors périmètre

- **La question CPU / Vercel Pro** (7 h 34 consommées pour 4 h incluses au 05/08, 503 servis aux crawlers). Reportée par John. ⚠️ Ce sprint ne doit pas l'aggraver : le Bloc 3 mesure le coût de rendu de `/spots` avant/après.
- **La curation des 4 018 spots en attente.** Lane contenu, en parallèle.
- **Le redressement des fiches `/especes`** (2 771 impressions pour 29 clics).
- **Toute ouverture des coordonnées précises à un palier non payant.**
