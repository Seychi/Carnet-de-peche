# Sprint 85, Bloc 4 — Mesure d'activation (pour le sprint 86)

> **Ceci est de la mesure, pas une intervention.** Aucun comportement produit n'est
> changé par ce document. Le mur d'activation (faire loguer la 1ère, puis la 3e
> prise) est déjà visible dans les chiffres ci-dessous ; le traiter est **hors
> périmètre du sprint 85** (cf `docs/sprint-85/BRIEF.md`, Bloc 4 et « Hors
> périmètre »). Ce fichier pose seulement la mesure pour que le sprint 86 (ou 87)
> parte d'un diagnostic chiffré, pas d'une impression.

**Base gelée : 17/08/2026**, via le connecteur Supabase en lecture seule (aucune
écriture). Toutes les requêtes ci-dessous sont documentées telles qu'exécutées
et vérifiées, pas approximées.

---

## 1. Le seuil produit : 3 prises

Le seuil où le moat s'active (personnalisation du scoring par l'historique de
prises) est **3 prises loguées**, pas 1. Cité tel quel dans
`docs/CIBLES-MARKETING-2026-07-06.md`, §3 « Cibles secondaires », point 1 :

> « Objectif : les faire passer d'occasionnels à réguliers (les amener au
> **seuil des 3 prises** où le moat s'active). »

Toute mesure d'activation qui ne compte que « a logué au moins 1 prise » sousestime
la vraie friction : la marche importante n'est pas la première prise, c'est la
troisième.

---

## 2. ★ Le piège de lecture : l'agrégat brut de 12,8 % est trompeur

Requête (fenêtre 90 jours, la même que `scripts/reconcile-signups.mjs`) :

```sql
with base as (
  select
    u.id,
    u.created_at,
    extract(day from now() - u.created_at)::int as age_days,
    coalesce(c.n_catches, 0) as n_catches
  from auth.users u
  left join (
    select user_id, count(*) as n_catches from public.catches group by user_id
  ) c on c.user_id = u.id
  where u.created_at >= now() - interval '90 days'
)
select
  count(*) as inscrits_90j,
  count(*) filter (where n_catches >= 1) as au_moins_1_prise,
  round(100.0 * count(*) filter (where n_catches >= 1) / count(*), 1) as pct_agregat_brut,
  count(*) filter (where age_days < 14) as moins_14j,
  count(*) filter (where age_days >= 14 and age_days < 30) as entre_14_29j,
  count(*) filter (where age_days >= 30) as plus_30j
from base;
```

**Résultat vérifié le 17/08/2026** :

| Inscrits (90j) | Au moins 1 prise | % agrégat brut | < 14j | 14-29j | 30j et + |
|---|---|---|---|---|---|
| 47 | 6 | **12,8 %** | 29 | 4 | 14 |

**Pourquoi c'est trompeur** : sur les 47 inscrits des 90 derniers jours, **29 ont
moins de 14 jours d'ancienneté** (l'inscription est passée de ~2/semaine à
13-14/semaine début août, cf `docs/sprint-85/BRIEF.md` §« Le fait qui doit
recadrer tout le sprint » — la cohorte récente est massive et n'a
mécaniquement pas encore eu le temps de logger). L'agrégat brut de 12,8 % mélange
donc des gens qui ont eu 90 jours pour logger avec des gens qui se sont inscrits
il y a 3 jours. Il faut lire par **ancienneté comparable**, pas en bloc.

---

## 3. Les trois cohortes par ancienneté (lecture correcte)

Requête (population complète, pas seulement les 90 derniers jours — l'ancienneté
est calculée sur l'ensemble de `auth.users`, 52 comptes au 17/08) :

```sql
with base as (
  select
    u.id,
    u.created_at,
    extract(day from now() - u.created_at)::int as age_days,
    coalesce(c.n_catches, 0) as n_catches,
    coalesce(f.n_favs, 0) as n_favs
  from auth.users u
  left join (
    select user_id, count(*) as n_catches from public.catches group by user_id
  ) c on c.user_id = u.id
  left join (
    select user_id, count(*) as n_favs from public.favorite_spots group by user_id
  ) f on f.user_id = u.id
),
bucketed as (
  select
    case
      when age_days >= 30 then '30j et plus'
      when age_days >= 14 then '14-29j'
      else 'moins de 14j'
    end as cohort,
    n_catches,
    n_favs
  from base
)
select
  cohort,
  count(*) as inscrits,
  count(*) filter (where n_catches >= 1) as au_moins_1_prise,
  round(100.0 * count(*) filter (where n_catches >= 1) / count(*), 1) as pct_1_prise,
  count(*) filter (where n_catches >= 3) as au_moins_3_prises,
  round(100.0 * count(*) filter (where n_catches >= 3) / count(*), 1) as pct_3_prises,
  count(*) filter (where n_favs >= 1) as au_moins_1_favori,
  round(100.0 * count(*) filter (where n_favs >= 1) / count(*), 1) as pct_1_favori
from bucketed
group by cohort
order by case cohort when '30j et plus' then 1 when '14-29j' then 2 else 3 end;
```

**Résultat vérifié le 17/08/2026** :

| Cohorte (ancienneté) | Inscrits | ≥ 1 prise | % ≥ 1 prise | ≥ 3 prises (seuil moat) | % ≥ 3 prises | ≥ 1 favori | % ≥ 1 favori |
|---|---|---|---|---|---|---|---|
| **30 j et +** | 19 | 7 | **36,8 %** | 3 | 15,8 % | 0 | 0,0 % |
| **14-29 j** | 4 | 2 | **50,0 %** | 1 | 25,0 % | 1 | 25,0 % |
| **Moins de 14 j** | 29 | 1 | **3,4 %** | 0 | 0,0 % | 7 | 24,1 % |

Ces trois chiffres (36,8 % / 50 % / 3,4 %) correspondent exactement au relevé cité
dans `docs/sprint-85/BRIEF.md` (Bloc 4) — recoupés indépendamment ici via le
connecteur Supabase en lecture seule, pas recopiés du brief.

**Lecture** :

- À ancienneté comparable, l'activation **1 prise** tourne autour de **37-50 %**
  (30j+ et 14-29j) — c'est un chiffre bien plus sain que les 12,8 % de l'agrégat
  brut.
- La cohorte « moins de 14 j » (29 personnes, 1 prise) n'est **pas encore un
  signal d'échec** : elle n'a simplement pas eu le temps. C'est la cohorte à
  regarder à J+14/J+30, pas maintenant.
- Le seuil produit réel (**3 prises**) est nettement plus dur que « au moins
  1 » : même dans la cohorte 30j+, seuls **3 personnes sur 19 (15,8 %)** ont
  atteint 3 prises. C'est le vrai mur, et il est **hors périmètre de ce
  sprint** — matière du sprint 86/87.
- **Les favoris (migration 106, sprint 72) sont un signal récent** : la
  fonctionnalité alertes par port n'existe que depuis le sprint 72. La cohorte
  30j+ contient des comptes créés avant son existence (0 % de favoris), pendant
  que la cohorte « moins de 14 j » l'a immédiatement à disposition (24,1 %). Ne
  pas lire ce contraste comme un signal d'activation : c'est un artefact de
  date de sortie de la fonctionnalité, pas un comportement utilisateur.

---

## 4. L'insight PostHog à créer — reste manuel John

**Cette étape n'a pas pu être faite par l'agent** : la création d'un insight
PostHog nécessite le connecteur PostHog, indisponible dans cette session
(`MCP server "claude.ai PostHog" is not connected` au moment de ce sprint).
Même disponible, la doctrine du Bloc 0 (§4 du brief) rappelle que PostHog sert
aux **taux**, pas aux **volumes** — l'insight ci-dessous mesure un
**taux de progression dans un funnel d'événements déjà consentis**, ce qui reste
dans le domaine où PostHog est fiable (biais de consentement au numérateur ET au
dénominateur, largement compensé).

**Funnel à créer** (PostHog → Insights → nouveau Funnel) :

1. **Étape 1** : `signup_completed` (event serveur, `lib/analytics/server.ts`).
2. **Étape 2** : `catch_log_started` (event client, `lib/analytics.ts` —
   `analytics.catchLogStarted`, déclenché à l'ouverture du formulaire de prise).
3. **Étapes 3, 4, 5** : `catch_log_completed` répété **trois fois** — c'est
   l'idiome standard de PostHog pour représenter « la Nᵉ occurrence d'un
   événement » dans un funnel à ordre strict : chaque répétition du même event
   comme étape suivante exige une occurrence de plus avant de continuer. Trois
   étapes `catch_log_completed` consécutives = est arrivé à sa **3e prise**.
4. **Fenêtre de conversion** : 30 jours.
5. **Ordre** : strict (chaque étape doit suivre la précédente dans le temps).

Cela donne directement, sans recalcul : combien d'inscrits démarrent une prise,
et combien parmi eux atteignent le seuil des 3 prises dans les 30 jours — le
même seuil que la colonne « % ≥ 3 prises » du tableau ci-dessus, mais suivi en
continu au lieu d'un relevé SQL ponctuel.

⚠️ Ne pas confondre `catch_log_started` (tentative, peut être abandonnée) et
`catch_log_completed` (prise réellement enregistrée) : le funnel ci-dessus
utilise volontairement les deux, dans cet ordre, pour distinguer « a essayé »
de « a réussi ».

**Une fois créé, noter son URL dans `docs/sprint-85/RECAP.md`** (l'agent ne peut
pas le faire depuis cette session).

---

## 5. Ce que ce document ne fait PAS

- Il ne change aucun comportement produit, aucun texte visible, aucun réglage.
- Il ne tranche pas la stratégie d'activation du sprint 86/87 — il pose
  seulement le chiffre de départ.
- Il ne recrée pas l'insight PostHog lui-même (reste manuel John, §4).
