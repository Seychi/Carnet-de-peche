# Tuto — ce qui reste à faire à la main

> Écrit le **2026-08-19**. Tout ce qui pouvait être fait en code l'a été.
> Ce qui suit, ce sont les quatre choses qu'aucun agent ne peut faire à ta place, dans l'ordre où je les ferais.
> **Colle tes chiffres directement dans ce fichier**, les tableaux sont prêts.

---

## Ce qui est DÉJÀ fait, ne t'en occupe pas

| Tâche | Statut |
|---|---|
| Autoriser Sentry | ✅ fait par toi, et j'ai lu les compteurs (verdict plus bas) |
| Vérifier le plan Vercel | ✅ **plan `pro`** confirmé par l'API |
| `maxDuration` du cron | ✅ passée de 60 à 300 s, c'est du code |
| ~~`BATCH_SIZE` du cron~~ | ❌ **abandonné, mauvaise piste** : cf le verdict du 24/08 en bas de page. Remplacé par des appels groupés, 424 requêtes → 10. |
| Étangs et lagunes | ✅ ta décision appliquée, 2 rejets |

---

## 1. PostHog, 5 minutes — le plus rentable

Sans ça, **45 % de ton tableau d'acquisition est faux**. Ce sont des sessions recoupées comptées comme du trafic référé.

### 1a. Exclure les auto-référents

1. Ouvre <https://eu.posthog.com> et va sur le projet **208730**.
2. Menu de gauche tout en bas → **Settings** → onglet **Project**.
3. Cherche la section **« Referrer domains to exclude »** (selon la version, elle peut s'appeler *Discard events* ou *Self-referrals*).
4. Ajoute **les deux lignes**, pas une :

   ```
   carnet-de-peche.com
   www.carnet-de-peche.com
   ```

5. Sauvegarde.

**Comment vérifier que ça a marché** : Insights → un graphe de **Web Analytics** → onglet *Referrers* sur 30 jours. Plus aucune ligne en `*.carnet-de-peche.com`. Le repère mesuré était **287 + 31 visiteurs** fantômes.

⚠️ Ça ne corrige pas le passé, seulement les événements à venir. Les 30 prochains jours resteront pollués en partie.

### 1b. Créer l'insight « Canal IA »

C'est le seul moyen de savoir si ChatGPT et Perplexity t'envoient du monde.

1. Insights → **New insight** → type **Trends**.
2. Événement : `$pageview`.
3. Ajoute un filtre sur la propriété `utm_source`, opérateur **est l'un de**, avec ces cinq valeurs :

   ```
   chatgpt.com · perplexity · copilot.com · gemini.google.com · claude.ai
   ```

4. Période : **90 jours**. Granularité hebdomadaire.
5. Nomme-le **`Canal IA`** et enregistre-le.

**Base à battre** : 18 visiteurs sur 90 jours, dont ChatGPT 15.

---

## 2. Search Console, 10 minutes

### 2a. Resoumettre le sitemap

En attente depuis le 17/08, et il porte la découverte des 118 pages `/peche` du sprint 83 **plus les 21 fiches du 13 publiées hier**.

1. <https://search.google.com/search-console> → propriété `www.carnet-de-peche.com`.
2. Menu de gauche → **Sitemaps**.
3. Dans « Ajouter un sitemap », colle `sitemap.xml` et envoie.
4. Il doit passer en **« Réussite »** avec **1 179 URL découvertes** (c'est le compte exact que j'ai vérifié en direct).

### 2b. Relever les trois compteurs d'indexation

Menu de gauche → **Pages**. Colle les trois chiffres ici :

| Compteur | Valeur au \_\_/08 |
|---|---|
| Pages indexées | |
| Découverte, actuellement non indexée | |
| Explorée, actuellement non indexée | |

**Comment les lire** : « Découverte non indexée » qui gonfle veut dire que Google connaît tes pages mais ne les juge pas prioritaires. « Explorée non indexée » veut dire qu'il les a lues et n'en a pas voulu. Les deux se soignent différemment, d'où l'intérêt de les séparer.

### 2c. Relever les statistiques d'exploration

★ **C'est la seule preuve que le sprint 84 a servi à quelque chose.** Sans ce relevé, l'ISR reste une conviction.

Menu de gauche → **Paramètres** → **Statistiques sur l'exploration** → ouvre le rapport.

| Mesure | Avant le 17/08 | Après le 18/08 |
|---|---|---|
| Requêtes d'exploration / jour (moyenne) | | |
| Temps de réponse moyen (ms) | | |

Le graphe couvre 90 jours : lis la moyenne sur la semaine du 10 au 16/08, puis sur les jours depuis le 18. **Le temps de réponse moyen devrait avoir chuté** : avant, chaque page était rendue à la demande ; depuis, elle sort du cache.

Regarde aussi **Par réponse** : la part de **403** doit être à **0 %**. C'était la question du Bloc 6 du sprint 88, à laquelle j'ai répondu « non, Googlebot n'est pas bloqué ». Ce chiffre le confirme ou m'inflige un démenti.

---

## 3. Le 22/08, pas avant — l'export `/especes`

C'est le verdict du sprint 75 : est-ce que réécrire les titles a fait monter le CTR ?

**Pourquoi attendre le 22** : la Search Console a 2 à 3 jours de retard. Aujourd'hui, 3 des 10 journées de la fenêtre sont incomplètes, soit 30 % de la mesure, pour un verdict qui se joue sur un point de CTR.

1. Search Console → **Performances** → **Résultats de recherche**.
2. Filtre **Page** → *contient* → `/especes/`.
3. Onglet **Pages**, et active les 4 métriques en haut : clics, impressions, CTR, position.
4. Fais **deux exports** avec la même longueur de fenêtre :
   - **W0** : 29/07 → 07/08
   - **W1** : 10/08 → 19/08
5. ⚠️ **N'inclus ni le 08 ni le 09/08**, ce sont les jours de bascule.

Le tableau à remplir et la règle de lecture sont dans **`docs/sprint-89/especes-ctr.md`**. La règle est fixée **avant** de voir les chiffres, exprès.

★ **Ne juge que les 15 fiches listées là-bas.** Les 11 autres ont vu leur title réécrit une deuxième fois par le sprint 78 le 15/08, elles ne mesurent plus rien de propre.

---

## 4. Le spot-check de curation, 5 minutes

Mode B : je publie, tu vérifies par sondage. Trois fiches sont à moins de 350 m d'une fiche curée existante. J'ai jugé que ce ne sont pas des doublons, à toi de confirmer.

| Ouvre celle-ci | Compare à | Distance |
|---|---|---|
| [/spots/plage-fernandel-osm190924374](https://www.carnet-de-peche.com/spots/plage-fernandel-osm190924374) | [/spots/carry-le-rouet](https://www.carnet-de-peche.com/spots/carry-le-rouet) | 161 m |
| [/spots/anse-de-la-couronne-vieille-osm4946139951](https://www.carnet-de-peche.com/spots/anse-de-la-couronne-vieille-osm4946139951) | [/spots/cap-couronne](https://www.carnet-de-peche.com/spots/cap-couronne) | 325 m |
| [/spots/plage-de-carro-petite-plage-osm55127549](https://www.carnet-de-peche.com/spots/plage-de-carro-petite-plage-osm55127549) | [/spots/port-de-carro](https://www.carnet-de-peche.com/spots/port-de-carro) | 341 m |

**La question à te poser** : est-ce que les deux fiches décrivent le même poste, ou deux postes voisins ? Mon analyse est que les curées sont des fiches de **secteur** et les nouvelles des **postes précis**, donc qu'elles s'additionnent. Si tu n'es pas d'accord sur une, dis-le et je la repasse en `pending`.

Pendant que tu y es, lis une fiche en entier à voix haute, n'importe laquelle des 21. C'est le test du sprint 78 : une tournure bancale répétée sur des centaines de pages est le signal le plus clair que le contenu est fabriqué.

---

## Le verdict Sentry, que j'ai pu lire grâce à ton autorisation

### Le sprint 88 a tenu

| Issue | Avant | Maintenant | Verdict |
|---|---|---|---|
| **`1P`** régression ISR | 355 évts, +15/h | **375 au total, arrêtée, résolue automatiquement** | ✅ |
| **`H`** JIT de zod / CSP | 268 / 24 h | 763 au total, **dernière il y a 2 jours** | ✅ arrêtée au déploiement |
| **`J`** Vercel Live | 18 / 24 h | 27 au total, **dernière il y a 4 jours** | ✅ arrêtée quand tu as coupé la toolbar |
| **PwaProvider** (8 issues) | 16 cumulés | 2 restantes, **toutes antérieures au correctif** | ✅ |
| **`12` / `19`** MapLibre | 3 | **absentes** | ✅ |
| **CSP previews** (6 issues) | ~40 | dernières il y a 5 jours | ✅ |

Le dashboard passe de **36 à 23 issues**, et les restantes sont pour l'essentiel des reliquats d'avant le correctif.

### 🔴 Mais un nouveau problème a pris la première place

| Issue | Événements | Dernière | Route |
|---|---|---|---|
| `1S` + `1R` + `1X` | **737 en 4 jours** | **il y a 4 heures** | `GET /api/crons/compute-spot-scores` |
| `1W` + `1V` | 7 | il y a 2 jours | `GET /spots/[slug]` |

C'est le **429 « Too many concurrent requests » d'Open-Meteo**, celui que le sprint 89 a diagnostiqué. J'en avais mesuré 82 sur un run ; c'est en réalité **~180 par jour**, et c'est devenu la première source de bruit du projet.

Les `1W`/`1V` sont plus embêtantes : ce sont des **503 sur les fiches spots elles-mêmes**, donc des pages utilisateur qui rendent en dégradé.

### ✅ Verdict tombé le 24/08 : le correctif prévu ne suffisait pas, la vraie cause était ailleurs

Deux corrections à ce que je t'écrivais le 19/08, l'une factuelle, l'autre de fond.

**1. « Déjà poussé » était faux.** L'abstention et le jitter, oui (`397d66b`). Mais `BATCH_SIZE` à 5 et `maxDuration` à 300 sont restés **non committés** dans ton working tree. Ils n'ont jamais tourné en prod.

**2. Le seuil que je t'avais donné est explosé.** Le run du 24/08 à 05:00 UTC, avec le jitter bien en place :

```
Spot scores computed: 212 spots (57 ok, 155 sans données, 0 échec) in 8730ms
```

**Y = 155**, pas « au-dessus de 20 » : **73 %**. Et en base, **57 lignes valides sur 217**, donc les trois quarts de la carte sans couleur. `T` = 8,7 s, très loin des 300 000 ms : le temps n'a jamais été la contrainte.

**★ Et baisser `BATCH_SIZE` n'y aurait rien changé.** Mesuré, pas supposé : 20 requêtes simultanées depuis une IP propre passent toutes les 20. Le quota Open-Meteo est **par IP**, et l'IP de sortie d'une fonction Vercel est mutualisée avec les autres clients de la région. On partage le seau avec des voisins qu'on ne contrôle pas ; réduire notre propre parallélisme ne le vide pas. La preuve directe est le run ci-dessus : le jitter était déployé, et il n'a rien donné.

La seule variable qu'on maîtrise est le **nombre** de requêtes. Les deux API acceptent une liste de coordonnées et répondent par un tableau dans l'ordre d'entrée. Le cron passe donc de **424 requêtes à 10** (commit `ba2165c`, non poussé).

Vérifié contre l'API réelle, sur tes 212 vraies coordonnées : **212/212 semaines complètes, 10/10 requêtes en succès, 1,9 s, 0 dégradé.**

**Ce qu'il faut regarder au prochain run** (05:00 UTC après ton déploiement) :

- `Y` doit tomber **à 0 ou presque**. S'il reste au-dessus de 20, c'est qu'Open-Meteo a un vrai problème de son côté, pas nous.
- Les compteurs `1S` / `1R` doivent **cesser de monter**. Ils vont aussi **fusionner** : c'était le même incident coupé en deux issues parce que le corps JSON brut était dans le titre et qu'Open-Meteo n'ordonne pas ses clés. Ne t'étonne pas de voir apparaître une issue au nom légèrement différent.
- La carte doit **retrouver ses couleurs** dans l'heure. Requête de contrôle : `select count(*) filter (where valid_until > now()) from spot_scores;` doit passer de 57 à ~212.

---

## Ce que je n'ai volontairement pas fait

- **Résoudre les issues Sentry restantes.** Je peux le faire d'un mot, mais les 23 restantes méritent un tri à froid plutôt qu'un nettoyage automatique. Dis-moi et je m'en occupe.
- **Toucher aux titles `/spots/*` ou `/especes/mulet`.** Fenêtres de mesure du sprint 83 ouvertes jusqu'au **07/09**.
- **Continuer la curation du 13.** Il reste 43 fiches pour la cible de 100, et trois communes de la Côte Bleue à confirmer par géocodage inverse avant de les écrire.
