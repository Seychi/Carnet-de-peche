# Sprint 77 — Métriques de référence (Bloc 6)

> **Rempli le 2026-08-14, AVANT déploiement.** C'est la condition d'acceptation du
> Bloc 6 : ce sprint restreint du contenu sur les pages qui portent 80 % des clics,
> et il est livré **sans feature flag** (décision John). Le seul filet est la mesure.
>
> Les chiffres « base » sont relevés **en base de production** (SQL live) le
> 2026-08-14, sauf les lignes GSC qui viennent du relevé du 2026-08-13 cité au brief.
> Petits écarts avec le brief : il a été rédigé le 13/08, la base a bougé d'un jour.

---

## 1. Repères SEO (Google Search Console)

| Repère | Base 13/08 | Seuil d'alerte | J+3 | J+7 | J+14 |
|---|---|---|---|---|---|
| CTR `/spots` | **7,4 %** | **< 6 % → revenir en arrière** | | | |
| Impressions / jour | ~2 000 | < 1 400 sur 3 jours consécutifs | | | |
| Position moyenne | 7,4 | > 9 | | | |
| Pages indexées | ⚠️ **à relever par John dans GSC avant le déploiement** (l'API ne l'expose pas) | en baisse | | | |
| CTR `/especes` | **1,05 %** | doit **monter** vers 2 % (Bloc 9) | | | |

## 2. Repères produit (SQL live, 2026-08-14)

| Repère | Base 13/08 (brief) | Base 14/08 (mesurée) | Cible |
|---|---|---|---|
| Comptes créés / semaine | 15 | **16** | — |
| Comptes au total | 42 | **43** | — |
| Taux de clic du mur | 1,3 % | (PostHog, non requêtable ici) | — |
| **Comptes ayant logué ≥ 1 prise (60 j)** | 16 % (5 / 32) | **15 % (5 / 33)** | **> 35 %** |
| Prises loguées au total | 26 | **26** | — |
| **Prises publiques** | 7 | **7** | **> 60 % des nouvelles** |
| Abonnements entre pêcheurs | 12 | **12** | — |
| Favoris posés | 10 | **10** | — |
| Posts au fil | 1 | **1** | — |
| Spots approuvés / en attente | 416 | **416 / 4 189** | — |

### Requête de contrôle de l'activation (à rejouer telle quelle)

```sql
with comptes as (select id, created_at from auth.users where created_at >= now() - interval '60 days'),
     prises as (select user_id, count(*) nb from catches group by user_id)
select count(*) as comptes, count(p.user_id) as ont_logue,
       round(100.0*count(p.user_id)/nullif(count(*),0)) as pct_actives
from comptes c left join prises p on p.user_id = c.id
```
→ **2026-08-14 : 33 comptes, 5 ont logué, 15 %.**

### Requête de contrôle de la confidentialité (Bloc 8, garde-fou)

```sql
select privacy, count(*) from catches group by privacy order by privacy;
```
→ **2026-08-14 14h50, avant migration 110 : `friends` 1, `private` 18, `public` 7.**
→ **2026-08-14 15h00, après migration 110 : `friends` 1, `private` 18, `public` 7. Identique.**
→ **2026-08-14 18h10, fin de sprint : `friends` 1, `private` 19, `public` 7.**

⚠️ Le `private` passé de 18 à 19 n'est **pas** une reprise rétroactive : c'est une
**ligne neuve**, créée à 16h45 UTC par un vrai utilisateur (`ulotte`, prise au
leurre à Groix) **sur la production, qui tourne encore le code du sprint 76**.
Vérifié ligne à ligne : `public` et `friends` n'ont pas bougé d'une unité, aucune
prise existante n'a été touchée. Aucun agent n'a écrit en base.

C'est accessoirement la meilleure illustration du Bloc 8 : le dernier pêcheur en
date a logué sa prise **en privé sans le vouloir**, parce que c'est le défaut
actuel. Base de référence corrigée : **27 prises, dont 7 publiques (26 %)**.

Le défaut de colonne est bien passé à `'public'` (`information_schema` :
`'public'::text`) **sans toucher une seule ligne existante**. Toute variation de
ces trois compteurs après déploiement est un **échec du sprint**, pas un détail.

### Requête de contrôle du maillage (Bloc 5 tâche 2)

Couverture des liens entrants sur les 416 fiches, en rejouant la logique exacte de
`fetchDepartmentSpots` (FNV-1a + rotation sur le slug d'origine) :

| Budget de liens issus du repli départemental | AVANT (tri alphabétique) | APRÈS (rotation) |
|---|---|---|
| 3 par fiche (cas réel : `nearby_spots` en fournit déjà 3) | 95 / 416 (**22,8 %**) | 406 / 416 (**97,6 %**) |
| 6 par fiche | 155 / 416 (37,3 %) | **416 / 416 (100 %)** |
| 12 par fiche (ancien `limit`) | 222 / 416 (**53,4 %**) | 416 / 416 (100 %) |

La ligne « 12 » retrouve le chiffre annoncé au brief (52 %, 217/416), ce qui valide
la simulation. **Critère « > 85 % » : atteint (97,6 % au budget le plus défavorable).**

---

## 3. Date et heure du déploiement

Sans feature flag, c'est le **seul** moyen de démêler l'effet de ce sprint de celui
du sprint 76, déployé quelques heures plus tôt.

- **Sprint 76 déployé le** : 2026-08-14 (commit `879c0d8`, mergé sur `main`)
- **Sprint 77 déployé le** : ⚠️ **à noter par John au moment du merge** (date + heure)

---

## 4. Relectures

- [ ] **J+3** — CTR `/spots`, impressions, position.
- [ ] **J+7** — ⚠️ **si le CTR de `/spots` est sous 6 %, revenir en arrière sans attendre J+14.**
- [ ] **J+14** — activation (> 35 %), part de prises publiques (> 60 % des nouvelles), CTR `/especes` (> 2 %).

### Comment revenir en arrière

Le sprint se retire en trois gestes indépendants, du moins au plus coûteux :

1. **La restriction de contenu seule** (Blocs 2 et 3, ceux qui touchent le SEO) :
   remettre `isAnonymous`/`collapseList` à `false` dans
   `app/(marketing)/spots/[slug]/page.tsx` et `app/(marketing)/spots/page.tsx`.
   Aucune migration, aucun effet sur le reste.
2. **L'ouverture de la carte au compte gratuit** (Bloc 1) : migration `111`
   rétablissant `where tier in ('local','itinerant') or rn <= 3`, **plus** le
   plafond applicatif de `app/(map)/carte/page.tsx` et `app/api/spots/nearby/route.ts`.
   ⚠️ Ne jamais retoucher le fichier `110`.
3. **Le défaut de confidentialité** (Bloc 8) : `alter table catches alter column
   privacy set default 'private'` + `lib/catches/schema.ts` + `CatchForm`.
   ⚠️ Ne **jamais** repasser rétroactivement des prises déjà publiées en privé
   sans accord explicite de leur auteur.
