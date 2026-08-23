# Plus d'impressions, plus de clics — plan du 19/08/2026

> Rédigé le **2026-08-19**, en réponse à « les impressions et les clics ont chuté aujourd'hui ».
> Sources mesurées : PostHog projet 208730, Supabase `glgciwwnpmgifyhbvxsw`, Sentry `carnet-de-peche`,
> repo à `0e95cfb`, `docs/PLAN-TRAFIC-2026-08-17.md`, baseline GSC 90 j du `CLAUDE.md` §S75 (06/08).
> Rien dans ce document ne touche la fenêtre de mesure du sprint 83 (ouverte jusqu'au **07/09**).

---

## 0. D'abord : la chute d'aujourd'hui n'existe pas

**Search Console a 2 à 3 jours de retard.** La ligne « aujourd'hui » d'un rapport GSC est toujours
vide ou partielle — ce n'est pas une baisse, c'est une donnée qui n'est pas encore arrivée. Comparer
le jour J au jour J-7 dans GSC produit mécaniquement une fausse chute, tous les jours de l'année.

**Le trafic réel, lui, est au contraire dans le haut de la fourchette.** Mesuré dans PostHog,
en heure de Paris, journée à peine à moitié écoulée :

| Jour | Pages vues | Visiteurs | Pages vues depuis un moteur |
|---|---|---|---|
| **19/08 (aujourd'hui, mi-journée)** | **171** | **45** | **59** |
| 18/08 | 195 | 53 | 69 |
| 17/08 | 296 | 71 | 99 |
| 16/08 | 278 | 69 | 99 |
| 15/08 | 249 | 66 | 74 |
| 14/08 | 152 | 58 | 49 |
| 13/08 | 98 | 28 | 40 |
| 12/08 | 98 | 37 | 25 |
| 11/08 | 101 | 33 | 30 |
| 05/08 | 49 | 18 | 23 |

À midi, la journée dépasse déjà les 11, 12 et 13 août **en entier**. La courbe sur 15 jours est
franchement montante — 49 pages vues le 05/08, ~280 les 16 et 17/08.

**Et l'inscription unique de ce matin est normale**, pas un signal. Sur les 22 derniers jours
(`auth.users`), le compte quotidien va de **0 à 5**, avec une **médiane à 1** : dix jours à 1, cinq
jours à 0, quatre jours à 3, et trois pointes isolées (2, 4, 5 les 8, 10 et 9 août). Une journée à 1
est le cas le plus fréquent du mois — et celle-ci n'est pas finie.

**Sentry ne montre rien qui casse l'acquisition** : 10 issues ouvertes, la plus grosse est un
`Blocked 'script' from 'eval:'` (CSP, 1 293 événements) et les 429 Open-Meteo sur le cron. Aucune
erreur sur le chemin d'inscription.

> **Conclusion** : il n'y a rien à réparer aujourd'hui. La vraie question, la bonne, est la suivante.

---

## 1. Le plafond : 15 821 impressions sur 90 jours, ce n'est pas un problème de CTR

Baseline GSC 90 j (relevé du 06/08) : **893 clics / 15 821 impressions / CTR 5,6 %**, **82 % mobile**,
**92 % de requêtes anonymisées** (longue traîne).

176 impressions par jour, c'est un site que Google connaît à peine. À ce volume, la variance
quotidienne est énorme en relatif : une journée à 120 et une journée à 240 sont **le même site**.
Arrêter de lire GSC au jour le jour, lire en moyenne 7 jours glissants.

Le CTR à 5,6 % est bon. **Le problème est le nombre de pages qui ont une chance d'apparaître.**

---

## 2. Les leviers, par impact décroissant

### 🔥 Levier 1 — 3 827 spots publics sont bloqués en modération

C'est de loin la trouvaille la plus lourde de la session.

```sql
select moderation_status, visibility, count(*) from spots group by 1,2;
-- pending  / public : 3 827
-- approved / public :   607
-- rejected / public :   171
```

`app/sitemap.ts` filtre `moderation_status = 'approved'` (fix du 05/08, à raison : sans lui on
déclarait des URLs mortes). Et la fiche `/spots/[slug]` filtre `approved` elle aussi. Donc :

**86 % de tes spots publics non rejetés n'existent pas pour Google** (3 827 sur 4 434 ; 83 % si on
compte aussi les 171 rejetés). 3 827 pages qui ne peuvent capter
aucune impression, sur un site dont le problème est précisément le nombre d'impressions. C'est le
backlog d'imports OSM de la migration 072.

**Ce n'est pas « approuver tout ».** 3 827 fiches OSM brutes quasi identiques, c'est du thin content
en masse, et ça se paie. La bonne forme :

1. Définir un **seuil de qualité publiable** : nom exploitable (pas `spot OSM 747711726`), coordonnées
   valides, département résolu, au moins une espèce plausible, bathymétrie disponible.
2. Approuver **par lots géographiques**, en commençant par une façade (Bretagne, ou Méditerranée où
   les entrées organiques actuelles sont déjà fortes), **200 à 300 spots**, pas plus.
3. Mesurer 21 jours : indexation dans GSC (Pages → Indexée / Découverte non indexée), impressions du
   lot, CTR du lot. Si le lot s'indexe et rapporte, dérouler la façade suivante.
4. Si Google indexe mal le lot, c'est le signal que la fiche est trop mince **avant** d'en publier
   3 800 — et c'est exactement pour ça qu'on procède par lots.

**Gain potentiel** : l'ordre de grandeur est un facteur ~6 sur la surface indexable. Même à 20 %
d'indexation utile, c'est le plus gros chiffre disponible sur ce site.

**Prérequis technique déjà rempli** : l'ISR fonctionne enfin (sprint 84 + hotfix S88, 17-18/08 —
73 routes pré-rendues, 71 fichiers HTML, `X-Vercel-Cache: HIT` vérifié). Avant ça, publier 3 800
pages dynamiques aurait fait exploser le CPU Vercel sans être exploré. **La fenêtre est ouverte
maintenant, elle ne l'était pas il y a trois jours.**

---

### 🔥 Levier 2 — `/especes` : 36 % des impressions, 1,7 % de CTR

Le relevé du 06/08 est sans appel :

| Famille | Part des impressions | CTR |
|---|---|---|
| `/especes` | **36 %** | **1,7 %** |
| `/spots` | — | 8,4 % |
| `/peche` | — | 7,3 % |

Google **te donne déjà** un tiers de tes impressions sur les fiches espèces, et elles ne se cliquent
pas. ~5 700 impressions sur 90 j pour ~97 clics. Au CTR moyen du site (5,6 %), les mêmes impressions
feraient **~320 clics** : **+220 clics par trimestre, +25 % du total, sans une seule page nouvelle
et sans un seul backlink.**

⚠️ **À revérifier dans GSC avant d'agir** : ce relevé date du 06/08 et le sprint 75 avait justement
« titles/metas par intention » à son programme. Si le CTR `/especes` a déjà bougé, le levier est plus
petit que ci-dessus — c'est une requête de 2 minutes dans GSC (Performances → Pages → filtre
`/especes`, 28 derniers jours) et elle conditionne tout le reste de ce paragraphe.

C'est un problème de `<title>` et de `<meta description>`, pas de contenu. Un titre de fiche espèce
qui répond à l'intention réelle (« taille légale », « quand le pêcher », « où le trouver ») bat un
titre encyclopédique. Les 26 fiches sont profondes et sourcées — le contenu est là, c'est la promesse
en SERP qui ne vend pas.

> ⚠️ **Contrainte S83** : `/especes/mulet` et les titres des fiches `/spots/*` sont dans l'A/B en
> cours. **Ne pas y toucher avant le 07/09.** Les 25 autres fiches espèces sont libres — c'est
> largement assez pour bouger le chiffre, et ça préserve le verdict causal du sprint 83.

---

### Levier 3 — Les guides : 6 publiés, c'est le format qui se fait citer

`content/guides/` contient **6 guides** (hors `_TEMPLATE`). C'est le format qui :

- ramène le plus de trafic IA (`/guides/peche-au-bar-au-leurre` est la 1re page d'entrée depuis
  ChatGPT), et 76 % des citations d'AI Overviews viennent du top 10 Google classique ;
- capte les requêtes explicatives que ni une fiche spot ni une fiche espèce ne peut viser.

Format le plus extractible, mesuré partout : **un bloc de réponse de 40 à 60 mots directement sous
chaque `<h2>`**, avant tout développement. Objectif raisonnable : **passer de 6 à 15 guides**, un par
semaine, chacun visant une question réelle (« quel coefficient de marée pour le bar », « taille
légale dorade royale 2026 », « pêcher le calmar de nuit du bord »).

---

### Levier 4 — La page de données propriétaires

Personne d'autre en France n'a « 607 spots référencés, N prises loguées, l'espèce la plus prise en
Bretagne en août ». Les statistiques originales sont ce qui se fait **citer** et **lier** — donc à la
fois GEO et backlinks, les deux choses que ce site n'a pas. Une page par saison, régénérée depuis le
carnet. C'est le point 7 du plan du 17/08, toujours pas fait.

---

### Levier 5 — Le social : 1 visiteur en 90 jours

Ce n'est pas un levier SEO et c'est pour ça qu'il n'est jamais priorisé. Mais l'ordre de grandeur est
brutal : le SEO peut emmener ce site de 600 à ~2 000 visiteurs par trimestre ; **un seul créateur
pêche de taille moyenne fait plus en une vidéo**. Et la saison retombe après août. C'est une décision
à trancher, pas une tâche de sprint.

---

## 3. Hygiène — à faire cette semaine, coût quasi nul

| # | Action | Effort |
|---|---|---|
| 1 | Resoumettre `sitemap.xml` dans Search Console (reste manuel du RECAP 83, toujours en attente) | 5 min |
| 2 | Exclure `carnet-de-peche.com` et `www.carnet-de-peche.com` des referrers PostHog — 45 % du tableau d'acquisition est du bruit | 5 min |
| 3 | Dans GSC, regarder **Pages → Découverte / explorée non indexée** : c'est le seul endroit qui dira si les 118 pages du S83 et les pages `/peche` sont réellement entrées dans l'index | 10 min |
| 4 | Vérifier le taux de 500 dans les logs Vercel : le relevé du 18/08 comptait **570 réponses 500 sur 24 h** (~5,6 % des requêtes). À ce niveau, Google réduit sa cadence d'exploration | 15 min |
| 5 | Insight PostHog « canal IA » par `utm_source` ∈ {chatgpt.com, perplexity, copilot.com, gemini.google.com, claude.ai} | 5 min |

---

## 4. Ce qu'il ne faut PAS faire

- **Ne pas réagir à GSC au jour le jour.** Fenêtre minimale de lecture : 7 jours glissants, comparés
  aux 7 précédents. Sinon on court après du bruit.
- **Ne pas toucher aux titres des fiches `/spots/*`, à `/especes/mulet`, ni au maillage interne avant
  le 07/09.** La fenêtre de mesure du sprint 83 est le seul verdict causal en cours sur ce site.
- **Ne pas approuver les 3 827 spots d'un coup.** Par lots, avec seuil de qualité, avec mesure.
- **Ne pas acheter Speed Insights** (10 $/mois/projet) : les Core Web Vitals sont déjà dans PostHog
  via `$web_vitals`.

---

## 5. Ordre d'exécution proposé

| Quand | Quoi |
|---|---|
| **Cette semaine** | Hygiène §3 (points 1 à 5) + réécriture des `<title>`/`<meta>` des **25** fiches espèces hors `mulet` |
| **Semaine prochaine** | Seuil de qualité spots + **premier lot de 200-300 approbations** sur une façade |
| **En continu** | 1 guide par semaine, format « réponse en 40-60 mots sous chaque h2 » |
| **07/09** | Lecture du verdict S83 → déblocage des titres spots et du maillage |
| **À trancher** | L'approche créateurs / réseaux — le seul levier de changement d'échelle |
