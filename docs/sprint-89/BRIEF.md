# Sprint 89 — Brief d'exécution
## « Lire avant d'écrire » — l'hygiène de mesure, le verdict CTR des fiches espèces, et les 500 qui coûtent du crawl

> Rédigé le **2026-08-19**. Durée cible : **1 sprint court** (WS A/B/C/D parallèles jour 1, WS VERIF en dernier).
> Contexte : `docs/PLAN-IMPRESSIONS-2026-08-19.md` (diagnostic du jour), `docs/PLAN-TRAFIC-2026-08-17.md`,
> `docs/sprint-78/METRIQUES.md` (baseline GSC gelée), `docs/sprint-83/BASELINE.md`, `docs/sprint-88/RECAP.md`.
> Décisions John 2026-08-19 : **périmètre = hygiène de mesure + CTR fiches espèces** ✅ ·
> la curation Méditerranée part la semaine prochaine dans son propre brief ✅.

**Préalable avant de démarrer** : aucun merge en attente. `main` = `0e95cfb`, prod à jour.

---

## ⚠️ Ce que ce brief corrige par rapport au plan du 19/08

Le plan du matin recommandait « réécrire les title/meta des 25 fiches espèces ». **C'est déjà fait.**
Le sprint 75 Bloc 4 a livré `lib/especes/seo.ts` (title et description portant la maille, le marquage
et la saison en cours), mergé le **09/08**. Le chiffre de 1,7 % de CTR est **antérieur** à ce correctif.

Réécrire une deuxième fois sans avoir lu le résultat du premier passage, c'est exactement ce que le
sprint 85 s'appelait « mesurer avant de convertir ». **Le sprint 89 lit d'abord.** Il ne réécrit que
si la lecture le justifie, et le WS B porte les deux branches.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-89/BRIEF.md`. Lance les workstreams A, B, C et D en
> parallèle dès maintenant, respecte les dépendances du tableau, et termine par le workstream VERIF
> avant de me rendre la main. Le WS B a une porte de décision : si le verdict est « le correctif S75
> a marché », tu ne touches à aucun title et tu me le dis. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| WS A · WS B — lecture GSC | **John** (Search Console, hors outils Claude) + Supermetrics | La GSC n'est pas accessible depuis la session. C'est la limite honnête déjà notée au §7 du plan du 17/08. |
| WS B — comptage réel des inscrits | `supabase` (RO) → **supabase-guard** | PostHog sous-compte de 40 % (biais de consentement, mesuré au S85). Les volumes se lisent dans `auth.users`. |
| WS C — origine des 500 | `vercel` + `sentry` → **deploy-watch** | Corréler logs runtime et issues. C'est le seul chemin vers la cause. |
| WS D — re-géocodage des 9 fiches | `supabase` (RO puis écriture ciblée) → **supabase-guard** | Lire les 9 lignes avant d'écrire, une par une, jamais en masse. |
| Avant toute lib externe | **docs-researcher** → Context7 | Aucun code de mémoire. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

---

## Objectif du sprint en une phrase

Rendre les chiffres d'acquisition lisibles (GSC resoumis, referrers PostHog propres, canal IA suivi),
trancher si le correctif CTR du sprint 75 a marché, et supprimer les 500 qui rationnent le crawl.

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Hygiène de mesure (5 actions) | 0,5 j | — | ✅ |
| B | Verdict CTR `/especes` post-S75 | 0,5 j | relevé GSC de John | ✅ |
| C | Les 570 réponses 500 en 24 h | 1 j | — | ✅ |
| D | Republication des 9 fiches curées dépubliées | 1 j | — | ✅ |
| VERIF | Revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Hygiène de mesure

Cinq actions courtes, sans code, qui conditionnent **toute** lecture ultérieure. Tant qu'elles ne
sont pas faites, chaque analyse d'acquisition repart avec 45 % de bruit dans le tableau des canaux.

> **Connecteurs** : `PostHog` pour les points 2 et 5. Les points 1 et 3 sont dans la Search Console,
> donc **manuels John**. Le point 4 est repris par le WS C.

### Tâches

1. **John** — Search Console → Sitemaps → resoumettre `https://www.carnet-de-peche.com/sitemap.xml`.
   C'est le reste manuel n°5 du RECAP 83, toujours en attente depuis le 17/08, et il porte la
   découverte des 118 pages `/peche` ajoutées au sprint 83.
2. Exclure `carnet-de-peche.com` **et** `www.carnet-de-peche.com` des domaines référents PostHog
   (Settings du projet 208730). Mesuré : 287 + 31 visiteurs « référés » qui sont des sessions
   recoupées, soit 45 % du tableau d'acquisition.
3. **John** — Search Console → Pages → relever les trois compteurs : *Indexée*, *Découverte, actuellement
   non indexée*, *Explorée, actuellement non indexée*. C'est le seul endroit qui dit si les 1 088 pages
   SEO sont réellement entrées dans l'index. **Coller les trois chiffres dans le RECAP.**
4. **John** — Search Console → Paramètres → Statistiques d'exploration : relever la moyenne de
   requêtes/jour et le temps de réponse moyen, **avant/après** le correctif ISR du 17-18/08. C'est la
   seule preuve disponible que le sprint 84 a servi à quelque chose.
5. Créer l'insight PostHog « canal IA » : `$pageview` filtré sur `utm_source` ∈ {`chatgpt.com`,
   `perplexity`, `copilot.com`, `gemini.google.com`, `claude.ai`}, en série temporelle 90 jours.
   Base connue : 18 visiteurs sur 90 j, dont ChatGPT 15.

### Critères d'acceptation

- Le tableau « Domaines référents » de PostHog sur 30 jours ne contient plus aucune ligne
  `*.carnet-de-peche.com`. Vérifiable dans l'UI.
- L'insight « canal IA » existe, est nommé, et renvoie une série non vide.
- Le RECAP contient les 3 compteurs d'indexation et les 2 chiffres d'exploration, datés.

### Garde-fous

- Ne pas modifier le sitemap lui-même : le filtre `moderation_status='approved'` du 05/08 reste tel quel.

---

## Bloc B — Le verdict CTR des fiches espèces

`/especes` pèse **36 % des impressions du site** et rapportait **1,42 % de CTR** (7 474 impressions,
106 clics, position moyenne 8,57) sur la fenêtre 16/07 → 14/08 (`docs/sprint-78/METRIQUES.md`).
Le correctif est en prod depuis le **09/08** (S75 Bloc 4, `lib/especes/seo.ts`).

Ce bloc **ne réécrit rien tant qu'il n'a pas lu**. Il produit un verdict, puis emprunte une des deux
branches ci-dessous.

> **Connecteurs** : relevé GSC par **John** (Supermetrics ou export manuel). Analyse et rédaction
> côté agent. `supabase-guard` si un volume produit doit être recoupé.

### Tâches

1. **John** — exporter de GSC, pour le répertoire `/especes`, deux fenêtres de **10 jours pleins** :
   **29/07 → 07/08** (avant le déploiement S75) et **10/08 → 19/08** (après). Colonnes : impressions,
   clics, CTR, position moyenne, par `pagepath`.
   ⚠️ Deux fenêtres de même longueur, sinon la comparaison ne vaut rien. Et **ne pas inclure le 08 ni
   le 09/08**, jours de bascule.
2. Calculer le delta de CTR **à position constante** : si la position moyenne a bougé de plus de
   1,5 rang entre les deux fenêtres, le CTR n'est pas comparable directement et il faut segmenter par
   tranche de position. Le dire explicitement plutôt que de conclure vite.
3. Séparer les deux intentions déjà identifiées dans `lib/especes/seo.ts` : les fiches à intention
   « définition » (congre, barracuda, liche, marbré, tassergal) et celles à intention « pêche »
   (bar, dorade royale, lieu jaune, sar, maquereau, seiche). La décision verrouillée du S75 est
   qu'on **ne se bat pas** pour les requêtes-définitions : ne pas juger les deux groupes ensemble.
4. **Porte de décision.**
   - **Branche 1 — le CTR « pêche » a monté d'au moins 1 point** : le correctif marche. **On ne touche
     à aucun title.** On écrit le verdict au RECAP et on rend la main. Le sprint s'arrête là sur ce bloc.
   - **Branche 2 — le CTR est stable ou baisse** : le problème n'est pas dans le gabarit de title mais
     dans l'intention servie. Produire une **note d'analyse** (`docs/sprint-89/especes-ctr.md`) : les
     10 pages qui pèsent le plus en impressions, leur requête dominante quand GSC la donne, et une
     proposition par page. **Aucune écriture de code dans ce sprint** : la réécriture est un sprint 90.

### Critères d'acceptation

- `docs/sprint-89/especes-ctr.md` existe et contient les deux fenêtres, le tableau par `pagepath`,
  la segmentation par intention et le verdict explicite en une phrase.
- Si branche 1 : `git diff` ne touche ni `lib/especes/seo.ts` ni les fiches de `lib/especes/content/`.
- Le verdict cite la position moyenne des deux fenêtres, pas seulement le CTR.

### Garde-fous

- ⚠️ **Ne pas toucher `/especes/mulet`** : la page est dans le périmètre de mesure du sprint 83,
  fenêtre ouverte jusqu'au **07/09**.
- ⚠️ **Ne toucher aucun `<title>` de fiche `/spots/*`** ni le maillage interne, même raison.
  Le module concerné est `lib/seo/spot-title.ts` et le périmètre de l'A/B se lit dans
  `lib/conditions/tide-departments.ts`.
- Ne pas conclure sur 3 jours de données : GSC a 2 à 3 jours de retard, les deux dernières journées
  de la fenêtre « après » sont incomplètes. Si besoin, décaler la fenêtre d'autant.

---

## Bloc C — Les 570 réponses 500 en 24 heures

Le relevé du Bloc 6 du sprint 88 compte, sur 24 h de logs runtime prod : 8 478 × 200, 928 × 304,
**570 × 500**, 79 × 404, 38 × 307, 7 × 303, 2 × 405. Soit **5,6 % des requêtes en erreur serveur**.

Google réduit sa cadence d'exploration quand l'origine renvoie des erreurs. À 176 impressions/jour,
c'est un frein qu'on ne peut pas se permettre, et c'est le seul chiffre de l'audit du 18/08 qui n'a
reçu aucune explication.

> **Connecteurs** : **deploy-watch** → `vercel` (logs runtime, 1 jour de rétention sur Pro) + `sentry`.
> Commencer par `vercel` : Sentry ne voit que ce que le SDK capture, les 500 d'infrastructure lui échappent.

### Tâches

1. Extraire des logs runtime Vercel la répartition des 500 **par route** et **par heure**. Une
   concentration sur une route ou sur un créneau désigne la cause.
2. Croiser avec les issues Sentry ouvertes du jour. Deux candidates sérieuses, déjà visibles :
   `JAVASCRIPT-NEXTJS-1S` / `1R` (Open-Meteo **429 Too many concurrent requests**, 89 événements
   cumulés, culprit `GET /api/crons/compute-spot-scores`) et `1W` / `1V` (Open-Meteo **503**, culprit
   `GET /spots/[slug]`).
3. **Hypothèse à tester en premier** : le cron `compute-spot-scores` sature Open-Meteo, et les fiches
   spots rendues pendant sa fenêtre d'exécution héritent du 429/503. Si elle tient, le correctif est
   dans la concurrence du cron (limiter le parallélisme, espacer, réutiliser `weather_cache`), pas
   dans la fiche.
4. Corriger la cause dominante. Si la cause est ailleurs que dans Open-Meteo, **s'arrêter et remonter
   le diagnostic à John** plutôt que de corriger au jugé.

### Critères d'acceptation

- `docs/sprint-89/RECAP.md` contient la répartition des 500 par route et par heure, avec la date du relevé.
- La cause dominante est nommée, avec sa preuve (log ou issue Sentry cité).
- Après correctif et déploiement : nouveau relevé 24 h montrant les 500 **sous 1 %** des requêtes.
  Si le seuil n'est pas atteint, le RECAP dit pourquoi au lieu de déclarer le bloc fini.
- `pnpm test` vert, aucune régression sur les tests de `weather_cache` ni sur
  `__tests__/spot-pages-are-static.test.ts`.

### Garde-fous

- ⚠️ **Ne pas « optimiser » `weather_cache`** hors du strict nécessaire : c'est un rappel explicite du brief 88.
- Ne pas poser `dynamic = 'force-static'` sur la fiche spot : le sprint 88 a tranché que la variante A suffit.
- Ne pas désactiver le cron pour faire baisser le compteur. On corrige la concurrence, pas le thermomètre.

---

## Bloc D — Les 9 fiches curées dépubliées depuis le 06/08

L'incident du 06/08 (`docs/contenu/curation-spots/INCIDENT-2026-08-06-coordonnees.md`) a dépublié
**9 fiches du catalogue curé** dont les coordonnées avaient été saisies à la main, arrondies à
2 décimales, soit une grille de 1,1 km. Penhors tombait à 5 km dans les terres, Le Diben à 60 km de
son vrai emplacement. En base aujourd'hui : `source='curated'`, `moderation_status='pending'`, **9 lignes**.

Ce sont **9 pages du catalogue le plus qualitatif du site**, hors ligne depuis 13 jours. C'est le
gain le plus rapide du sprint.

> **Connecteurs** : `supabase` en lecture d'abord (**supabase-guard**) pour lister les 9 lignes et
> leurs coordonnées actuelles, puis écriture ciblée, **un UPDATE par fiche**.

### Tâches

1. Lister les 9 fiches :
   `select id, slug, name, trim(department) dept, ST_Y(geom::geometry) lat, ST_X(geom::geometry) lng
    from spots where source='curated' and moderation_status='pending' order by name;`
2. Pour chacune, re-géocoder à partir d'une **source nommée** (Géoportail, page communale, office de
   tourisme, relevé tchinggiz.org pour la Bretagne). Reporter la source dans le RECAP, pas dans la fiche.
3. Contrôle obligatoire avant republication, les deux, pas l'un ou l'autre :
   - **écart au toponyme < 1 km** (règle 13 du playbook) ;
   - **test Open-Meteo Marine** : le point renvoie des données de houle, donc il est en mer.
     Le script du lot 8 est réutilisable tel quel (94/94 sur le 29, 48/48 sur les plages).
4. Republier une par une :
   `update public.spots set geom=ST_SetSRID(ST_MakePoint(<lng>,<lat>),4326), moderation_status='approved',
    updated_at=now() where id='…' and slug='…' and source='curated' and moderation_status='pending';`
   ★ **La clause `and slug='…'` est obligatoire** (décision 15 du playbook, incident du lot 10).
5. Toute fiche dont le toponyme ne se retrouve pas avec une source reste `pending`. Le doute ne se publie pas.

### Critères d'acceptation

- `select count(*) from spots where source='curated' and moderation_status='pending';` a diminué, et
  le RECAP explique ligne par ligne : republiée avec quelle source, ou laissée en attente et pourquoi.
- Les fiches republiées apparaissent dans `/sitemap.xml` (le sitemap filtre `approved`).
- Les 2 fiches nommées dans l'incident (Penhors, Le Diben) sont soit republiées à une coordonnée
  sourcée, soit explicitement laissées de côté avec la raison.
- Aucune fiche `source='imported'` touchée par ce bloc.

### Garde-fous

- ⚠️ **Ne JAMAIS toucher** `geom_public`, `visibility`, `source`, `verified`, ni les policies RLS.
  `geom_public` est recalculée par le trigger de floutage, elle ne s'écrit pas à la main.
- `verified` reste tel quel : republier ne vaut pas vérification terrain.
- Pas de migration : ce bloc n'écrit que des données.

---

## Hors périmètre (candidats sprint 90, à ne pas commencer ici)

- **`/spots` reste rendue dynamiquement** parce qu'elle lit `searchParams` (facettes `?dept=` /
  `?species=`). C'est ta page au meilleur CTR (8,4 %) et ta première page d'entrée organique : la
  rendre statique par facette vaut un bloc à elle seule, pas une note de bas de page.
- **Réécriture des fiches espèces** : seulement si le WS B emprunte la branche 2.
- **Les guides** (6 publiés, cible 15) : lane éditoriale continue, hors sprint.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lancer `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée
   + passe anti-régression). Puis **deploy-watch** après déploiement.
2. Relire chaque critère d'acceptation des blocs A à D et cocher ✅/❌ **avec preuve** (commande, requête, capture).
3. Passe sécurité : aucune écriture ne contourne `spots_for_viewer` / `catches_for_viewer` ; `geom`
   non exposée ; aucun secret commité ; RLS intacte.
4. Passe anti-régression SEO, explicite : `pnpm check:prerender` toujours vert (les 73 routes
   pré-rendues du S84 tiennent), `__tests__/marketing-layout-is-static.test.ts` vert, aucun `<title>`
   de `/spots/*` ni de `/especes/mulet` modifié (`git diff` à l'appui).
5. Passe copy : tutoiement, zod en français, `node scripts/lint-copy-dashes.mjs` sur les textes touchés.
6. Livrer `docs/sprint-89/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

- Les 4 relevés Search Console du Bloc A (sitemap resoumis, 3 compteurs d'indexation, statistiques
  d'exploration) et l'export `/especes` du Bloc B. **Le sprint ne peut pas conclure sans eux.**
- Merge → `main` → déploiement, puis nouveau relevé 24 h des codes de réponse pour clore le Bloc C.
- Arbitrage à rendre avant lundi pour ne pas bloquer la curation : cf le brief
  `docs/contenu/curation-spots/BRIEF-CAMPAGNE-MED-2026-08-24.md`, section « Décisions attendues ».
