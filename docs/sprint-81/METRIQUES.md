# Sprint 81 — Métriques et requêtes

> Relevés du **2026-08-15, ~17h00 (UTC+2)**, projet PostHog `208730` (fuseau projet : **UTC**).
> ⚠️ Un témoin sans sa requête est un chiffre qu'on ne saura pas reproduire. C'est exactement ce
> qui a rendu le §3a du brief nécessaire : l'audit concluait sur une fenêtre dont personne
> n'avait gardé les bornes.

---

## Repère de date : mise en production du correctif d'attribution du sprint 76

| Fait | Valeur | Source |
|---|---|---|
| Commit | `87fd730` | `git log -- lib/analytics/attribution.ts components/analytics/PostHogProvider.tsx` |
| Date du commit | 2026-08-14 04:44 (UTC+2) | idem |
| Merge sur `main` | `879c0d8`, 2026-08-14 **08:09** (UTC+2) = **06:09 UTC** | `git log --grep sprint-76` |

**Conséquence** : la fenêtre 16/07 → 14/08 utilisée par l'audit et la roadmap est **antérieure**
au correctif. Les 44,9 % qu'elle produit mesurent le comportement d'AVANT.

---

## T1 — Auto-référencement mobile, avant / après le correctif

```sql
SELECT
  if(timestamp < toDateTime('2026-08-14 06:09:00'), 'AVANT correctif S76', 'APRES correctif S76') AS fenetre,
  count() AS pageviews,
  countIf(properties.$referring_domain = 'www.carnet-de-peche.com') AS auto_references,
  round(100.0 * countIf(properties.$referring_domain = 'www.carnet-de-peche.com') / count(), 1) AS pct_auto_ref
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime('2026-07-16 00:00:00')
  AND properties.$device_type = 'Mobile'
GROUP BY fenetre
ORDER BY fenetre DESC
```

| Fenêtre | Pages vues | Auto-référencées | Taux |
|---|---|---|---|
| AVANT (16/07 → 14/08 06:09 UTC) | 1 260 | 569 | **45,2 %** |
| APRÈS (14/08 06:09 UTC → 15/08 ~15:00 UTC) | 183 | 56 | **30,6 %** |

Le 45,2 % reproduit le 44,9 % de l'audit : la coupure de fenêtre est bonne.

---

## T2 — Décomposition : entrée de session ou navigation interne ?

★ **C'est la requête qui change la lecture.** `$referring_domain` reflète `document.referrer`
au moment de la capture : pour une navigation interne avec chargement complet, il vaut notre
domaine **par construction**. Compter toutes les pages vues mélange donc un comportement normal
avec le vrai défaut.

```sql
SELECT
  if(rang = 1, 'PREMIER evenement de la session', 'en cours de session') AS position,
  count() AS pageviews
FROM (
  SELECT
    row_number() OVER (PARTITION BY properties.$session_id ORDER BY timestamp) AS rang,
    properties.$referring_domain AS ref
  FROM events
  WHERE event = '$pageview'
    AND timestamp >= toDateTime('2026-08-14 06:09:00')
    AND properties.$device_type = 'Mobile'
)
WHERE ref = 'www.carnet-de-peche.com'
GROUP BY position
ORDER BY pageviews DESC
```

| Position | Pages vues | Lecture |
|---|---|---|
| En cours de session | **45** (80 %) | Normal, rien à corriger |
| Premier événement de la session | **11** (20 %) | **Le vrai défaut** |

---

## T3 — Le témoin honnête du Bloc 3

```sql
SELECT
  count() AS entrees_de_session,
  countIf(ref = 'www.carnet-de-peche.com') AS entrees_auto_referencees,
  round(100.0 * countIf(ref = 'www.carnet-de-peche.com') / count(), 1) AS pct
FROM (
  SELECT
    row_number() OVER (PARTITION BY properties.$session_id ORDER BY timestamp) AS rang,
    properties.$referring_domain AS ref
  FROM events
  WHERE event = '$pageview'
    AND timestamp >= toDateTime('2026-08-14 06:09:00')
    AND properties.$device_type = 'Mobile'
)
WHERE rang = 1
```

| Entrées de session | Auto-référencées | Taux |
|---|---|---|
| 79 | 11 | **13,9 %** |

**Base d'avant** : 44,9 % (audit, toutes pages vues confondues, donc pas directement comparable).
**Cible** : < 10 %. **Non atteinte.**

⚠️ **n = 79 sur ~1,5 jour.** C'est mince. Ce chiffre bougera, et il ne se lit pas comme un
résultat définitif. À reprendre quand la fenêtre atteindra une semaine pleine, soit à partir du
**21/08**.

---

## Témoins qui ne peuvent pas encore être relevés

| Témoin | Pourquoi | Date utile |
|---|---|---|
| `signup_wall_clicked / viewed` mobile (S79) | S79 déployé le 15/08 à 14h05 : fenêtre < 1 h | **29/08** (J+14) |
| `home_cta_clicked`, `species_page_cta_clicked`, rebond `/carte` (S80) | S80 déployé le 15/08 à ~14h55 | **29/08** (J+14) |
| Entrées Google PostHog vs clics GSC (témoin redéfini au Bloc 0) | Demande 7 jours pleins | **22/08** |

⚠️ **Ne pas relever ces trois-là avant leur date.** Le volume quotidien du site est trop faible
pour qu'une fenêtre courte signifie quoi que ce soit : 2 clics sur 242 en 90 jours.
