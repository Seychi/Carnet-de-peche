# Sprint 76 — RECAP

> Exécuté le 2026-08-14 sur la branche `sprint-76` (partie de `fe31f5c`).
> **Non poussé, non mergé** (consigne John). **Aucune migration SQL**, comme prévu au brief.
> Brief : `docs/sprint-76/BRIEF.md` · Diagnostic attribution : `research/attribution.md` · Repères : `METRIQUES.md`

## Résultat de la passe de vérification

| Contrôle | Résultat |
|---|---|
| `npx vitest run` | **1218 tests verts / 100 fichiers** (1147 avant le sprint) |
| `npx next build` | **OK**, compilé en 25 s, lint + types inclus |
| `npx tsc --noEmit` | **OK** |
| ESLint | **OK** (hook `lint-changed` sur chaque fichier touché, `max-warnings 0`) |
| `git diff --stat -- supabase/` | **vide** : aucune migration, aucune RPC, aucune policy RLS touchée |
| Liens morts (Bloc 10) | **0 sur 1050 liens** candidats, sur 20 fiches tirées au hasard |
| `scripts/lint-copy-dashes.mjs` | **aucune occurrence nouvelle** (les 16 restantes sont préexistantes) |

## Ce qui est fait, bloc par bloc

### Bloc 1 — la copie du mur parle du spot
`lib/gating/wall.ts` : `SIGNUP_WALL_TITLE_SPOT(nom)`, `SIGNUP_WALL_BENEFITS_SPOT`, `SIGNUP_WALL_NOTE` passée à « Sans carte bancaire, en 30 secondes. ». `SignupWall` accepte une prop `spotName` : fournie → titre et bénéfices contextualisés ; absente → **DOM strictement inchangé** pour les 4 surfaces carte. L'intro qui ouvrait sur « Les coordonnées précises sont réservées aux abonnés » est supprimée de la fiche de spot. Aucune promesse de coordonnée précise (test dédié).

### Bloc 2 — la fiche de spot demande l'inscription
- CTA collant mobile : pour un anonyme, « Voir les conditions à {commune}, gratuit » vers `buildSignupHref`, instrumenté `signup_wall_clicked`. Nom réduit à la commune puis coupé **sur une frontière de mot** (22 car. max). Connecté : « + Loguer une prise ici » vers `ctaHref`, inchangé.
- Le mur est sorti de la branche `!spot.is_precise` : c'est un **bloc frère**, plus une alternative.
- Une instance dans la **colonne principale** (juste après conditions et marées, avant le reste), une dans la sidebar. **Exactement un `signup_wall_viewed`** par vue de page : la sidebar est en `track={false}`.
- L'upsell `/tarifs` des inscrits gratuits est inchangé.

### Bloc 3 — le parcours d'inscription
`/auth/register` **rend le formulaire** au lieu de rediriger (plus de 3xx ; le build la sort à 317 B / 228 kB, comme `/auth/login`). La normalisation de contexte BUG-10 est extraite en fonction pure **testée** (`lib/auth/auth-context.ts`) et passée en props : `plan`, `interval`, `next`/`redirect` validé par `safeInternalPath` arrivent jusqu'à `signUpWithPassword`. Champ « Confirme le mot de passe » **supprimé** (schéma zod + action serveur + tests alignés). Code fondateur **replié** derrière « J'ai un code fondateur », et **déplié + obligatoire si `INVITE_ONLY`**. Bouton Google **remonté au-dessus** du formulaire avec un séparateur « ou avec ton email ». Titre de page explicite.

### Bloc 4 — fil d'Ariane
`Place` (inchangé, octet pour octet) + `BreadcrumbList` à 4 niveaux, en **tableau** de deux objets, format identique à `/especes/[slug]` (pas de `@graph` : on ne crée pas un second format dans le site). Extrait dans `lib/seo/spot-jsonld.ts`, testé (positions 1 à 4 contiguës, URLs absolues, aucune coordonnée au-delà de 2 décimales).

### Bloc 5 — titres SERP
Gabarit `Pêche à {commune} ({dept}) : {espèces}`, sans marque, sans cadratin. **Testé sur les 416 spots réels de prod** (fixture `lib/seo/__tests__/fixtures/approved-spots.json`) : 0 titre > 60 caractères, 0 titre vide, 0 cadratin, **0 doublon**.

### Bloc 6 — « Pêche du dorade royale »
`programmaticTitle()` utilise `SPECIES[...].articleDe`. Test paramétré sur les **337** pages. Aucune autre occurrence fautive construite dynamiquement (les « pêche du bord » et « pêche du sar » en dur sont corrects, laissés).

### Bloc 7 — attribution
Diagnostic livré **avant tout code** (`research/attribution.md`). Correctif : mémorisation de la source d'entrée sans aucune émission (`lib/analytics/attribution.ts`), `$pageview` manquant émis **au moment du consentement**, init PostHog déplacée dans le rendu du provider, propriétés d'entrée attachées au premier `$pageview`. **`opt_out_capturing_by_default: true` intact.**

### Bloc 8 — repères
`METRIQUES.md` : 10 repères, chacun avec sa **source nommée** et une **requête recalculable** (SQL `auth.users` ou HogQL). Volumes re-mesurés en base le 14/08.

### Bloc 9 — mur sur `/spots`
Surface `spots_list` **ajoutée** (jamais renommé les 7 existantes). Mur pour les anonymes, titre contextualisé à la facette, `redirectTo` avec la query.

### Bloc 10 — maillage spot → spot
Section rendue **côté serveur**, 6 entrées max, `nearby_spots` (rayon 40 km) complétée par le département. Event `spot_to_spot_clicked`. Requêtes en parallèle, dégradation silencieuse sur erreur.

---

## ⚠️ Ce que le brief affirmait et qui est FAUX

1. **Bloc 2 — le mur ne disparaissait PAS sur les spots à `is_precise` vrai.** `get_spot_by_slug` calcule `is_precise` depuis `current_tier(auth.uid())`, qui vaut `discovery` pour un anonyme : **`is_precise` est toujours faux pour un visiteur anonyme**, et cette branche ne lui a jamais retiré le mur. **L'écart mesuré 156 → 65 ne vient donc pas de là**, mais de l'analytics (Bloc 7, cause n° 2 : l'event de montage du mur est perdu sur la page d'entrée). La tâche a quand même été faite : la structure « mur = bloc frère » est la bonne et résiste aux évolutions de tier.
2. **Bloc 10 — `nearby_spots` ne peut pas renvoyer 6 entrées à un anonyme.** La RPC finit par `where tier in ('local','itinerant') or rn <= 3` : **3 résultats maximum** pour tout le trafic SEO. Le repli départemental est donc le chemin **nominal**, pas l'exception. Le code et le libellé de section en tiennent compte.
3. **Bloc 6 — « les titres programmatiques mesurés font 36 à 59 caractères » est faux.** **13 pages dépassaient déjà 60 caractères avant toute correction** (jusqu'à 67), et l'accord féminin a porté ça à 23 (jusqu'à 70). Le brief citait « Pêche du maquereau à la flottante dans les Bouches-du-Rhône » (59) comme pire cas : les Pyrénées-Atlantiques sont plus longues.
4. **Bloc 6 — les deux critères d'acceptation étaient contradictoires.** « Les 212 pages masculines strictement inchangées » et « aucun titre au-dessus de 60 caractères sur les 337 » ne peuvent pas être vrais ensemble, puisque 13 pages masculines dépassaient déjà. **J'ai tranché pour la longueur** (c'est le but du sprint) via une dégradation en 3 temps qui préserve l'unicité des titres. **Conséquence à connaître : 13 pages masculines voient leur titre changer de forme** (« dans les Pyrénées-Atlantiques » devient « : Pyrénées-Atlantiques »), et 4 pages perdent le mot « Pêche ». → **décision à valider par John.**
5. **Bloc 5 — « aucun doublon exact » n'était pas atteignable avec la règle demandée.** Couper systématiquement au cadratin faisait converger **12 spots vers 5 titres** (4 rien qu'au Grau-du-Roi). J'ai gardé le nom **complet tant qu'il tient dans 60 caractères** (cadratin remplacé par une virgule), et je ne retombe sur la commune seule qu'ensuite. Résultat : 0 doublon. **Contrepartie mesurée : 7 spots sur 416 (1,7 %) n'ont plus de liste d'espèces dans leur titre.** J'ai préféré ça à 12 spots avec un `<title>` dupliqué.

## ⚠️ DEMANDER À JOHN

1. **Titres programmatiques** (point 4 ci-dessus) : 13 pages masculines déjà indexées changent de forme de titre. C'est voulu et c'est une amélioration, mais ça touche du contenu en ligne. **Valider ou demander un repli sur « article corrigé seulement, longueur laissée telle quelle ».**
2. **Requêtes réseau PostHog avant consentement** : c'est le critère non négociable du Bloc 7 et **je n'ai pas pu le trancher sans navigateur**. Mon correctif ne change ni n'aggrave ce point (l'init a lieu au même instant du chargement, seulement déplacée d'un effet vers le rendu). **À vérifier dans l'onglet Réseau sur la preview.** Si `posthog.init()` déclenche un appel de configuration distante, c'est un défaut **préexistant** à traiter séparément.
3. **Bouton Google au-dessus du formulaire, pour les DEUX onglets** (connexion et inscription), pas seulement l'inscription. Une seule instance dans le DOM, hiérarchie cohérente, et le même argument « chemin le plus court d'abord » vaut pour un revenant. Dis-moi si tu le veux réservé à l'inscription.
4. **`/auth/register` et le basculement d'onglet** : depuis cette page, cliquer « Connexion » fait une **vraie navigation** vers `/auth/login` (contexte plan/interval/redirect reporté), au lieu de réécrire l'URL. Sinon l'URL dirait « register » en affichant un formulaire de connexion, soit le défaut symétrique de celui qu'on corrige.

## Ce que je n'ai PAS pu vérifier (il faut un navigateur)

- La position du mur « avant 60 % de la hauteur de page en 390 px » et le CTA « visible sans scroller » (Bloc 2), ainsi que « le mur visible dans le premier écran et demi » sur `/spots` (Bloc 9). Le placement dans le flux DOM est fait pour ça, mais **ce sont des mesures Playwright à faire en QA**.
- Le rendu du fil d'Ariane dans le **test de résultats enrichis de Google** (Bloc 4).
- Les 4 premières lignes de `METRIQUES.md` sont des **relevés PostHog de John du 13/08**, pas des re-mesures : je n'ai pas de connecteur PostHog. Les volumes `auth.users`, eux, sont re-mesurés le 14/08.

## Notes de la passe

- **Sur `/spots`, `revalidate = 3600` était déjà inerte** : le `<Header/>` du layout marketing appelle `auth.getUser()`, ce qui rend toutes les routes marketing dynamiques. Lire le tier sur cette page ne coûte donc aucun cache ISR, il était déjà perdu. Le build confirme : `/spots` et `/spots/[slug]` sont en `ƒ (Dynamic)`.
- **Placement du mur sur `/spots`** : le brief demandait « après le premier groupe de département ». Sur `?dept=56` ce groupe fait 105 spots, le mur serait tombé aussi bas qu'un pied de page, soit exactement ce que le brief voulait éviter. Il est donc glissé **dans** le premier groupe, après 3 cartes, sur toute la largeur de la grille.
- **Maillage** : sur les 416 fiches, la médiane est de **40 spots candidats** (même département ou moins de 40 km). **Une seule fiche sur 416 en a moins de 3** (elle en a 2). Le critère « au moins 3 liens » tient donc pour 415 fiches sur 416.
- **Flakiness préexistante** : `__tests__/security-headers.test.ts` dépasse son timeout de 5 s **à froid** (le premier import de `next.config.ts` prend ~17 s à compiler). À chaud il passe en 2,1 s. Ce n'est pas une régression de ce sprint (reproduit sur l'arbre pristine), mais **ça mériterait un `testTimeout` explicite**.

## Reste manuel John

1. **Relire les 4 points « DEMANDER À JOHN » ci-dessus**, en particulier le n° 1 (titres déjà indexés).
2. QA navigateur : captures 390 px et 1280 px de `/spots/pointe-de-penvins` et `/spots` en navigation privée ; vérifier l'onglet Réseau avant consentement.
3. Redirection 301 `carnet-de-peche.com` → `www.carnet-de-peche.com` **dans le dashboard Vercel** (Domains → apex → Redirect to www). Volontairement PAS de `redirects()` dans `next.config.ts`.
4. Vérifier dans GSC que `https://www.carnet-de-peche.com/sitemap.xml` est bien soumis sur la propriété `sc-domain:carnet-de-peche.com`.
5. Passer les nouveaux titres et le fil d'Ariane au test de résultats enrichis de Google, puis surveiller l'onglet **Améliorations**.
6. Merge `sprint-76` → `main` et déploiement.
7. Relire `METRIQUES.md` à **J+14 (27/08)** et **J+30 (12/09)**, en lisant couverture et taux de clic **ensemble** (le correctif d'attribution fait monter les dénominateurs).
