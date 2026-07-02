# Sprint 16 Bloc C — Audit requetes Supabase sur /carte

Fichier : `app/(map)/carte/page.tsx`
Date : 2026-06-22

---

## 1. Inventaire des 5 requetes et leurs dependances

| # | Requete | Localisation (file:line) | Objet |
|---|---|---|---|
| Q1 | `supabase.auth.getUser()` dans la page | page.tsx:95-98 | Identite utilisateur |
| Q2 | `getUserTier()` — `supabase.auth.getUser()` + RPC `current_tier` | lib/auth/tier.ts:18-26 | Tier de l'utilisateur |
| Q3 | `fetchProfile(user.id)` — `.from('profiles').select('home_department')` | page.tsx:24-32 | Departement principal |
| Q4 | `fetchSpots(tier, homeDept, filters)` — RPC `get_spots_for_map` | page.tsx:54-58 | Spots (coords + is_precise) |
| Q5 | `fetchFreshScores(spotIds)` — `.from('spot_scores').select(...)` | page.tsx:77-86 | Scores qualite caches |

### Graphe de dependances

```
Q1 (auth.getUser)
  └─> Q2 (getUserTier) — depend du user token, pas du resultat Q1
        └─> Q3 (fetchProfile) — depend du user.id de Q1 ET du tier de Q2 (condition line 101)
              └─> Q4 (fetchSpots) — depend du tier (Q2) + homeDept (Q3)
                    └─> Q5 (fetchFreshScores) — depend de la liste d'IDs issue de Q4
```

### Parallelisable ?

**NON — chaine sequentielle en cascade.**

- Q1 et Q2 font chacun un `supabase.auth.getUser()` interne : Q2 via `cache()` de React (lib/auth/tier.ts:14),
  Q1 directement dans la page (page.tsx:94-97). `cache()` deduplique l'appel reseau en un seul aller-retour
  JWT par requete HTTP, mais la page execute Q1 ET Q2 en sequence (Q2 ligne 99, Q1 lignes 94-98) sans
  `Promise.all`.
- Q3 est conditionnelle : `tier !== 'anonymous' && user` (line 101). Elle attend Q2 + Q1.
- Q4 attend Q3 pour avoir `homeDept` (line 119).
- Q5 attend Q4 pour avoir la liste des IDs (line 122).

**Opportunite concrete de parallelisation :**
Q1 et Q2 partagent le meme appel JWT via `cache()`. On pourrait les lancer en `Promise.all([supabase.auth.getUser(), getUserTier()])` : Q1 retournerait la reference en cache, Q2 ferait le vrai round-trip JWT + RPC `current_tier`. Gain : 1 round-trip RPC `current_tier` elimine de la chaine critique.

Q3 (profile) et Q5 (scores) sont les candidats les plus impactants :
- Q3 pourrait etre lancee en parallele de Q2 si on accepte de toujours la charger pour les connectes
  (au lieu de la conditionner sur tier). Gain : 1 round-trip DB.
- Q5 ne peut pas etre parallelisee avec Q4 car elle depend des IDs retournes par Q4.

---

## 2. Controle GPS — fuite vers Discovery

### RPC en vigueur : migration 029 (`get_spots_for_map`)

La migration 029 (`supabase/migrations/029_spot_rpc_tier_gating.sql`) remplace la migration 009 comme
version active de `get_spots_for_map`. Elle est `security definer` avec `set search_path = public`.

**Logique de floutage dans la RPC (lines 60/83-85 de 029) :**

```sql
(v.tier in ('local','itinerant') or coalesce(s.created_by = v.uid, false)) as is_precise
...
case when is_precise then ST_X(geom::geometry)
     else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
case when is_precise then ST_Y(geom::geometry)
     else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
```

Pour `anon` et `discovery` : `is_precise = false`, coordonnees = centroide de `geom_public` (disque flouté).
Les colonnes brutes `geom` et `geom_public` ne sont jamais exposees en sortie — la RPC retourne uniquement
`lng/lat` (floats scalaires). La colonne `geom` precise n'est donc PAS lisible via cette RPC par un tier gratuit.

**Cap Discovery en double defense :**
1. Cote RPC (SQL) : `where tier in ('local','itinerant') or rn <= 3` (line 87 de 029) — max 3 spots/dept.
2. Cote page (TS) : `limitSpotsPerDept(spots, 3)` (page.tsx:64-65) — defense en profondeur.

**Colonne `geom` directe sur la table `spots` :**
D'apres l'audit sprint 11.6 et la migration 029, la colonne `geom` a subi un verrou REVOKE via migration 028
(`028_geom_column_lock.sql` ou equivalent). Ce verrou est orthogonal a la RPC — meme si un utilisateur
passait en direct via `.from('spots')`, il ne pourrait pas lire `geom`. A confirmer si besoin via
`mcp__supabase__execute_sql` (hors perimetre lecture seule de ce rapport).

**Conclusion GPS : pas de fuite detectee dans le chemin de code actuel** pour un tier Discovery/anon.

---

## 3. Surete-cache — /carte doit rester dynamique

**Verdict : DYNAMIQUE, confirmé.**

La page `app/(map)/carte/page.tsx` :
- N'exporte pas `export const dynamic` ni `export const revalidate`.
- Importe et appelle `cookies()` de `next/headers` (lines 2 et 132-133).

En Next.js 15 App Router, l'appel a `cookies()` opt-in la page dans le rendu dynamique (pas de cache partage).
Le layout `app/(map)/layout.tsx` n'exporte pas non plus de directive de cache.

Chaque requete HTTP recoit donc une version fraiche, personnalisee par session (tier + GPS + cookie upsell).
Aucune page cached partagee possible entre un utilisateur Discovery et un utilisateur Local/Itinerant.

---

## 4. Recommandations Sprint 16 Bloc C

| Priorite | Action | Gain estime |
|---|---|---|
| HAUTE | `Promise.all([supabase.auth.getUser(), getUserTier()])` — Q1 et Q2 en parallele (page.tsx:94-99). `cache()` deduplique le JWT, mais `current_tier` est un round-trip RPC distinct qui attend Q1 actuellement. | -1 round-trip serie |
| HAUTE | Lancer Q3 (`fetchProfile`) en parallele de Q2 pour les utilisateurs connectes, plutot qu'attendre Q2 pour la conditionner. Accepter de faire la requete meme en Discovery (retourne juste `home_department`, pas sensible). | -1 round-trip serie |
| MOYENNE | Q4 → Q5 ne peut pas etre parallelisee (dependance IDs). Mais Q5 pourrait etre deplacee cote client (lazy) : la carte s'affiche sans couleurs, puis les scores arrivent. Reduit le TTFB percu. | -1 round-trip bloquant percu |
| BASSE | Ajouter `export const dynamic = 'force-dynamic'` explicitement pour documenter l'intention. Pas fonctionnellement requis (cookies() suffit), mais evite une regression silencieuse si cookies() est un jour retire. | Securite code |

---

## 5. Diagramme de la chaine actuelle vs optimisee

```
ACTUEL (sequence)          OPTIMISE (parallele max)
─────────────────          ─────────────────────────
getUser()                  Promise.all([
  └─ getUserTier()           getUser(),
       └─ fetchProfile()     getUserTier(),      ← deduplique JWT via cache()
            └─ fetchSpots()  fetchProfile()      ← toujours pour connectes
                 └─ fetchFreshScores()  ← lazy cote client (option)
                 ])
                  └─ fetchSpots(tier, homeDept)
                       └─ fetchFreshScores(ids)  ← reste sequentiel
```
