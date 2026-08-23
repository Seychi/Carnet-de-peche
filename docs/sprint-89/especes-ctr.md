# Sprint 89 — Bloc B · Verdict CTR des fiches espèces

> Rédigé le **2026-08-19**. Statut : **cadre d'analyse prêt, chiffres en attente de John.**
> Base de comparaison : `docs/sprint-78/METRIQUES.md` (fenêtre 16/07 → 14/08, gelée).

---

## ⚠️ Avant tout : le plan de mesure du brief ne peut pas fonctionner tel quel

Le brief propose de comparer **29/07 → 07/08** (avant S75) à **10/08 → 19/08** (après S75), et d'en tirer un verdict sur le correctif du sprint 75.

**Ça ne marche pas, parce que le title des fiches espèces a changé QUATRE fois, pas une.** Vérifié dans l'historique git, pas supposé :

| Date de mise en prod | Ce qui a changé | Fiches touchées |
|---|---|---|
| **09/08 08:59** (`fe31f5c`, merge S75) | Création de `lib/especes/seo.ts` : title et description portant la maille, le marquage et la saison | les **26** |
| **14/08 20:40** (`2f69be1`, merge S77) | Ouverture du **mécanisme** d'override `content.seoTitle` (`lib/especes/seo.ts:110`), appliqué à 3 fiches : `congre`, `mulet`, `tassergal` | **3** |
| **15/08 10:37** (`85b7822`, **S78**) | « 8 titres especes portes a l'intention peche » : `bar`, `barracuda`, `liche`, `maigre`, `oblade`, `pageot`, `sar`, `seiche` | **8** |
| **17/08 11:53** (`357c94d`, merge S83) | Retrait de l'override sur `mulet` + nouveau title, dans le cadre de l'A/B du sprint 83 | **1** (`mulet`) |

Conséquence directe : la fenêtre « après » proposée par le brief (10/08 → 19/08) **contient trois changements de title supplémentaires**. Un verdict tiré de cette fenêtre attribuerait au sprint 75 l'effet cumulé de quatre interventions.

Pire : trois des six fiches que le brief range dans le groupe « intention pêche » — **`bar`, `sar`, `seiche`** — ont été réécrites le **15/08** par le sprint 78. Ce sont précisément celles qui devaient porter le verdict.

> ⚠️ **Corrigé après la revue croisée.** La première version de ce document annonçait « trois changements » et attribuait les 11 overrides au sprint 77 du 14/08. Le S77 n'a en réalité ouvert que le mécanisme et touché 3 fiches ; les 8 fiches décisives viennent du **sprint 78, le 15/08** (`85b7822`). La méthode ci-dessous ne bouge pas, mais la fenêtre de lecture des contaminées démarre au **16/08**.

---

## La méthode corrigée : juger sur les 15 fiches que personne n'a retouchées

Quinze fiches n'ont **rien reçu** depuis le 09/08. Pour elles, et pour elles seules, la fenêtre 10/08 → 19/08 est un lecteur propre du correctif S75, sur 10 jours pleins et comparable au 29/07 → 07/08.

**Groupe de lecture propre (15 fiches)** — c'est sur celui-là que se joue le verdict :

`calmar` · `chinchard` · `dorade-grise` · **`dorade-royale`** · **`lieu-jaune`** · `lieu-noir` · **`maquereau`** · `marbre` · `merlan` · `orphie` · `plie` · `rouget` · `sole` · `tacaud` · `vieille`

Les trois en gras sont celles du groupe « intention pêche » du brief qui survivent au filtre. C'est peu, mais c'est propre, et trois fiches à intention pêche non contaminées valent mieux que six fiches dont la moitié a bougé deux fois.

**Groupe contaminé (11 fiches), à exclure du verdict S75** — leur CTR mélange S75 et S77 :

`congre` · `tassergal` (S77, 14/08) · `bar` · `barracuda` · `liche` · `maigre` · `oblade` · `pageot` · `sar` · `seiche` (S78, 15/08) · `mulet` (A/B du sprint 83, fenêtre ouverte jusqu'au **07/09**, à ne toucher sous aucun prétexte)

Ces onze-là ne sont pas perdues : elles se lisent plus tard, sur une fenêtre qui démarre au **16/08**. Mais pas maintenant, et pas pour juger le S75.

---

## Ce que John doit exporter

Search Console → Performances → filtrer sur les pages contenant `/especes/`, export par `pagepath`.
Colonnes : **impressions, clics, CTR, position moyenne**.

| Fenêtre | Dates | Ce qu'elle mesure |
|---|---|---|
| **W0 — avant** | **29/07 → 07/08** (10 j) | l'ancien title, avant S75 |
| **W1 — après** | **10/08 → 19/08** (10 j) | S75 seul, **pour les 15 fiches propres uniquement** |

⚠️ **Ne pas inclure le 08 ni le 09/08** : jours de bascule.

⚠️ **La GSC a 2 à 3 jours de retard.** Au 19/08, les journées du 17, 18 et 19 sont incomplètes. Deux options, à trancher au moment de l'export :
- soit décaler W1 à **07/08 → 16/08**… mais ça mordrait sur la bascule, donc non ;
- soit **attendre le 22/08** pour exporter un W1 complet du 10 au 19.

**Recommandation : attendre le 22/08.** Le brief lui-même dit « ne pas conclure sur 3 jours de données ». Trois jours incomplets sur dix, c'est 30 % de la fenêtre, et le verdict porte sur un écart d'un point de CTR.

---

## Le tableau à remplir

| `pagepath` | Impr. W0 | Clics W0 | CTR W0 | Pos. W0 | Impr. W1 | Clics W1 | CTR W1 | Pos. W1 | Δ CTR | Δ pos. |
|---|---|---|---|---|---|---|---|---|---|---|
| `/especes/dorade-royale` | | | | | | | | | | |
| `/especes/lieu-jaune` | | | | | | | | | | |
| `/especes/maquereau` | | | | | | | | | | |
| `/especes/orphie` | | | | | | | | | | |
| `/especes/vieille` | | | | | | | | | | |
| `/especes/dorade-grise` | | | | | | | | | | |
| `/especes/lieu-noir` | | | | | | | | | | |
| `/especes/marbre` | | | | | | | | | | |
| `/especes/merlan` | | | | | | | | | | |
| `/especes/rouget` | | | | | | | | | | |
| `/especes/sole` | | | | | | | | | | |
| `/especes/plie` | | | | | | | | | | |
| `/especes/tacaud` | | | | | | | | | | |
| `/especes/calmar` | | | | | | | | | | |
| `/especes/chinchard` | | | | | | | | | | |
| **Total groupe propre** | | | | | | | | | | |

Repère de départ, à ne pas confondre avec W0 : sur **16/07 → 14/08**, tout `/especes` confondu pesait **7 474 impressions, 106 clics, 1,42 % de CTR, position moyenne 8,57** (`docs/sprint-78/METRIQUES.md`).

---

## La règle de lecture, fixée AVANT de voir les chiffres

C'est le point du sprint 85 : on fixe le seuil avant, sinon on ajuste le seuil au résultat.

1. **Si la position moyenne a bougé de plus de 1,5 rang** entre W0 et W1, le CTR n'est **pas** comparable directement. Il faut segmenter par tranche de position, ou renoncer et le dire. Un CTR qui monte parce qu'on est passé de la position 9 à la position 5 ne dit rien du title.
2. **Branche 1 — le CTR du groupe propre monte d'au moins 1 point à position constante** : le correctif S75 marche. **On ne touche à aucun title.** On écrit le verdict, et le bloc s'arrête.
3. **Branche 2 — le CTR est stable ou baisse** : le problème n'est pas le gabarit de title mais l'intention servie. On produit l'analyse des 10 pages les plus lourdes en impressions avec leur requête dominante, et la réécriture devient un **sprint 90**. Aucune écriture de code dans ce sprint.

---

## Verdict

> **EN ATTENTE** — l'export GSC n'est pas accessible depuis la session de travail. Rien n'a été réécrit,
> aucun `title` n'a été touché : `git diff` ne montre aucune modification de `lib/especes/seo.ts`
> ni d'un fichier de `lib/especes/content/`.

À remplir en une phrase quand les chiffres seront là, en citant **la position moyenne des deux fenêtres**, pas seulement le CTR.
