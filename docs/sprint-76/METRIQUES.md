# Sprint 76 — Les repères à relire dans 14 jours

> Base figée au **2026-08-13** (relevés John) et au **2026-08-14** (re-mesures en base par Claude, signalées comme telles).
> À relire le **27/08 (J+14)** et le **12/09 (J+30)**.
>
> Ce sprint change des **taux**, pas des volumes. Sans repères écrits, on ne saura pas s'il a marché.

## La règle qui prime sur toutes les autres

**Le volume d'inscriptions se lit dans `auth.users`, JAMAIS dans PostHog.**
PostHog sert aux **ratios entre étapes** (mur vu → mur cliqué → compte créé), la base sert aux **volumes**.
**Ne jamais mélanger les deux dans une même division.**

Facteur mesuré : sur 7 jours glissants, la base compte **15 comptes** quand PostHog en voit **10**, soit **1,5**. Le sprint 74 estimait ~2 : c'est mieux que prévu, mais l'écart est réel et il vient du gate de consentement (un visiteur qui refuse le bandeau n'est jamais compté). **Cet écart ne se refermera pas**, c'est le prix assumé du RGPD. Ne pas chercher un ratio 1:1 avec GSC.

## Le tableau de bord

| Repère | Base | Source | Cible J+14 |
|---|---|---|---|
| Taux de clic du mur (`signup_wall_clicked` / `signup_wall_viewed`) | **1,3 %** (3 / 225) | PostHog | > 6 % |
| Couverture du mur (visiteurs ayant vu un mur / visiteurs de fiches spots) | **42 %** (65 / 156) | PostHog | > 90 % |
| Complétion du formulaire (comptes / visiteurs `/auth/*`) | **≈ 28 %** (10 / 36) | PostHog | > 50 % |
| Comptes créés par semaine | **15** (07 au 13/08) | **`auth.users`** | 30 à 50 |
| Part de Google dans les inscriptions | **27 %** (4 / 15 sur 7 j, mesuré le 14/08) | **`auth.users`** | à surveiller après remontée du bouton |
| CTR `/spots` | **7,4 %** | GSC | > 8,5 % après breadcrumb + titres |
| CTR `/especes` | **1,05 %** | GSC | à surveiller, hors périmètre |
| Référent interne dans PostHog | **42 %** | PostHog | < 5 % |
| Sessions à une seule page | **54 %** (167 / 308) | PostHog | < 45 % après Bloc 10 |
| Pages indexées sur les 416 fiches | à relever à la main | GSC (onglet Indexation) | en hausse après Bloc 10 |

> ⚠️ **Les 4 premières lignes sont mesurées AVANT le correctif d'attribution du Bloc 7.** Elles sous-comptent : le `$pageview` d'entrée et les `signup_wall_viewed` de la page d'entrée étaient perdus (cf `research/attribution.md`). Après déploiement, les dénominateurs vont **monter mécaniquement**. Une baisse apparente du taux de clic du mur à J+14 peut donc traduire une meilleure mesure, pas une régression : **comparer d'abord les volumes absolus de `signup_wall_clicked`**, puis les taux.

## Comment recalculer chaque repère

### Volumes d'inscription — `auth.users` (SQL, via le connecteur Supabase)

```sql
select date_trunc('day', created_at)::date as jour,
       coalesce(raw_app_meta_data->>'provider','inconnu') as provider,
       count(*) as comptes
from auth.users
where created_at >= now() - interval '14 days'
group by 1, 2 order by 1 desc;
```

Agrégat 7 / 14 jours et part de Google :

```sql
select
  count(*) filter (where created_at >= now() - interval '7 days') as comptes_7j,
  count(*) filter (where created_at >= now() - interval '14 days') as comptes_14j,
  count(*) filter (where created_at >= now() - interval '7 days'
                   and coalesce(raw_app_meta_data->>'provider','') = 'google') as google_7j
from auth.users;
```

Mesuré le **2026-08-14** : `comptes_7j = 15`, `comptes_14j = 20`, `google_7j = 4`, total historique **42 comptes**.

### Taux de clic du mur — PostHog (HogQL)

```sql
select
  countIf(event = 'signup_wall_clicked') as clics,
  countIf(event = 'signup_wall_viewed')  as vues,
  round(100.0 * countIf(event = 'signup_wall_clicked')
        / nullIf(countIf(event = 'signup_wall_viewed'), 0), 2) as taux_pct
from events
where event in ('signup_wall_viewed', 'signup_wall_clicked')
  and timestamp >= now() - interval 14 day
```

Par surface, pour voir laquelle convertit (au sprint 75, les 3 seuls clics venaient de `map_filters`) :

```sql
select properties.surface as surface,
       countIf(event = 'signup_wall_viewed')  as vues,
       countIf(event = 'signup_wall_clicked') as clics
from events
where event in ('signup_wall_viewed', 'signup_wall_clicked')
  and timestamp >= now() - interval 14 day
group by surface order by vues desc
```

> Deux surfaces nouvelles à surveiller ce sprint : `spot_page` (le mur remonté dans le flux mobile + le CTA collant) et `spots_list` (Bloc 9, la page qui n'avait aucune surface de conversion).

### Un seul `signup_wall_viewed` par vue de fiche — PostHog (contrôle du Bloc 2)

Deux instances du mur coexistent sur une fiche (colonne principale en mobile, sidebar en desktop). Une seule porte l'event. Ce contrôle doit renvoyer **0 ligne** :

```sql
select properties.$session_id as sid, count() as n
from events
where event = 'signup_wall_viewed' and properties.surface = 'spot_page'
  and timestamp >= now() - interval 1 day
group by sid having n > 1
```

### Couverture du mur sur les fiches de spots — PostHog

```sql
select
  uniqIf(person_id, event = '$pageview' and properties.$pathname like '/spots/%') as visiteurs_fiches,
  uniqIf(person_id, event = 'signup_wall_viewed' and properties.surface = 'spot_page') as ont_vu_le_mur
from events
where timestamp >= now() - interval 14 day
```

### Attribution : part de référent interne — PostHog (contrôle du Bloc 7)

```sql
select properties.$referring_domain as referent, count() as vues
from events
where event = '$pageview' and timestamp >= now() - interval 7 day
group by referent order by vues desc limit 20
```

Cible : `www.carnet-de-peche.com` **sous 5 %** du total (42 % au 13/08).

### Sessions à une seule page — PostHog (contrôle du Bloc 10)

```sql
select
  countIf(pages = 1) as sessions_1_page,
  count() as sessions,
  round(100.0 * countIf(pages = 1) / nullIf(count(), 0), 1) as pct
from (
  select properties.$session_id as sid, count() as pages
  from events
  where event = '$pageview' and timestamp >= now() - interval 14 day
  group by sid
)
```

Et le maillage lui-même :

```sql
select count() as clics_spot_vers_spot
from events
where event = 'spot_to_spot_clicked' and timestamp >= now() - interval 14 day
```

### CTR par page — GSC

Relevé manuel dans Search Console (l'API ne remonte ni la couverture d'indexation ni les enrichissements) : Performances → filtrer par page contenant `/spots`, puis `/especes`. Comparer la fenêtre 14 jours avant / après le déploiement, **à saisonnalité comparable**.

## Ce qu'il ne faut PAS conclure trop vite

- **Un CTR GSC ne bouge pas en 48 heures.** Les nouveaux titres et le fil d'Ariane doivent être recrawlés : compter 1 à 3 semaines, d'où la relecture à J+30 autant qu'à J+14.
- **Les volumes d'inscription sont petits** (15 par semaine). À ces ordres de grandeur, 3 comptes de plus ou de moins ne sont pas un signal. Regarder la tendance sur 14 jours, jamais un jour isolé.
- **Le taux de clic du mur et sa couverture bougent tous les deux ce sprint** : la couverture monte (le mur s'affiche enfin partout et l'event n'est plus perdu), donc le dénominateur du taux de clic monte aussi. Lire les deux ensemble, jamais l'un sans l'autre.
