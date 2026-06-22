# Migration 039 — corriger la fuite GPS RLS-FIX-07 (`nearby_spots` trilatérable)

> **READ-ONLY / CONCEPTION SEULE.** Aucun write, aucun `apply_migration`. Prod Supabase
> `glgciwwnpmgifyhbvxsw` (eu-west-1), 2026-06-22. Application délibérée par John via CLI
> (`supabase db push`) ou SQL Editor. Référence backlog : `docs/ROADMAP.md` RLS-FIX-07.

## TL;DR

- **Vecteur confirmé : OUI.** Dans `nearby_spots`, `distance_m = ST_Distance(s.geom, point_observateur)`
  est calculée sur le **`geom` PRÉCIS pour tous les tiers**, y compris anon/discovery. Trois appels
  depuis trois points distincts = trilatération de la position exacte du spot → contourne le floutage.
- **Appelable par anon : OUI.** `GRANT EXECUTE … TO anon, authenticated` (et `PUBLIC`). C'est l'API
  publique « Spots autour de moi » (`/api/spots/nearby` → `MapShell.tsx`).
- **Le gating de tier existant (029) ne couvre PAS ce vecteur.** Il plafonne le NOMBRE de lignes
  (`rn <= 3` pour anon/discovery) et la visibilité `subscriber`, mais la `distance_m` retournée pour
  ces 3 lignes reste **exacte au décimètre**. C'est exactement le trou.
- **Fix 039** : pour les tiers sans droit au précis (anon, discovery, et Local **hors** de son
  `home_department`), calculer `distance_m` sur le **centroïde de `geom_public`** (point déjà jitteré
  500-900 m) au lieu de `geom`. Pour Itinérant (et Local sur son dépt, et le propriétaire), comportement
  inchangé. **Signature et colonnes de sortie strictement identiques** → zéro breaking change
  (`lib/types.ts`, `lib/spots/nearby.ts`, `/api/spots/nearby`, `NearbyPanel`, `MapShell` inchangés).

---

## 1. La fonction live (prod, `pg_get_functiondef`)

`nearby_spots(double precision, double precision, double precision, text[], text[])`
→ `RETURNS TABLE(id, name, slug, department, distance_m, techniques, species, difficulty)`
`LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.

C'est la version de la migration **029** (verbatim, fichier `supabase/migrations/029_spot_rpc_tier_gating.sql`),
elle-même reprise de 004/024. Cœur du problème :

```sql
matched as (
  select s.id, s.name, s.slug, s.department,
    ST_Distance(                                  -- ⚠️ sur s.geom PRÉCIS
      s.geom,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m,
    s.techniques, s.species, s.difficulty, v.tier
  from public.spots s cross join viewer v
  where ST_DWithin(s.geom, …, radius_km * 1000)    -- filtre sur geom (OK, ne fuit pas)
    and ( visibility public / subscriber+tier / owner )
    …
  order by distance_m limit 100
),
ranked as ( select *, row_number() over (order by distance_m) as rn from matched )
select id, name, slug, department, distance_m, techniques, species, difficulty
from ranked
where tier in ('local','itinerant') or rn <= 3   -- plafonne le COUNT, PAS la distance
order by distance_m;
```

Le `viewer` ne calcule que `coalesce(current_tier(auth.uid()),'discovery')` — il ne récupère **pas**
le `home_department` (contrairement à `get_spots_for_map`/`get_spot_by_*`). Donc 029 ne fait, pour
`nearby_spots`, **aucun gating fin par département** : un Local obtient la distance précise de TOUS les
dépts (déjà noté dans `docs/sprint-11.5/ADDENDUM-gps.md`).

## 2. Confirmation du vecteur (mesure prod live)

Depuis un point d'observation fixe (Brest, 48.39 / -4.49), pour 5 spots publics :

| slug | `dist_precise_m` (geom) | `dist_blurred_m` (centroïde geom_public) | écart | jitter réel du centroïde |
|---|---|---|---|---|
| phare-du-petit-minou | 10978.7 | 11433.1 | -454.4 | 532.7 |
| pointe-de-pen-hir | 17375.2 | 17579.8 | -204.7 | 765.6 |
| pointe-de-dinan | 18446.1 | 18749.7 | -303.6 | 681.5 |
| le-diben-brest | 20504.3 | 20451.7 | +52.7 | 696.1 |
| pointe-saint-mathieu | 21904.2 | 21783.8 | +120.5 | 570.9 |

- `dist_precise_m` est exacte **au décimètre** vers le point réel → 3 mesures de ce type depuis 3
  points ⇒ trilatération du `geom` exact. **C'est la fuite.**
- `dist_blurred_m` vise le **centroïde de `geom_public`** (le point déjà publié aux gratuits, jitteré
  500-900 m). La trilatération de ces 3 distances reconverge vers le **centroïde flou**, jamais vers le
  point réel (qui reste dans un anneau de 500-900 m autour, non récupérable). **C'est le fix.**

## 3. Grants & exposition (prod live)

| Fonction | grantee | EXECUTE |
|---|---|---|
| `nearby_spots` | PUBLIC (donc anon + authenticated) | ✅ |
| `get_spots_for_map`, `get_spot_by_slug`, `get_spot_by_id`, `current_tier`, `blur_spot_geom` | PUBLIC | ✅ |

→ **`nearby_spots` est bien appelable par `anon`.** La 029 fait en plus `grant execute … to anon,
authenticated` explicitement. Le fix doit **préserver ces grants**.

## 4. Usage côté app (grep `lib/`, `app/`, `components/`)

- `app/api/spots/nearby/route.ts` → `supabase.rpc('nearby_spots', { lat, lng, radius_km, species_filter,
  technique_filter })`, puis re-plafonne côté serveur (`cap` 3/5/100 selon tier via `getUserTier()`).
- `lib/spots/nearby.ts` → type `NearbySpot { …, distance_m: number, … }` + `nearbyQuerySchema` (zod).
- `components/map/MapShell.tsx:257` → `fetch('/api/spots/nearby?…')`.
- `components/map/NearbyPanel.tsx:265` → affiche `formatDistance(spot.distance_m)` dans la liste « Spots
  autour de moi ».
- `MapShell.handleNearbyResultClick` recentre la carte via les coords du **marker** (issues de
  `get_spots_for_map`, déjà floutées pour les gratuits) — **PAS** via `distance_m`.

**Impact d'un floutage de `distance_m` :**
- La liste affichera, pour un gratuit, une distance « au centroïde flou » (ex : « ~11,4 km » au lieu de
  « 10,98 km »). Cosmétiquement indistinguable, et **honnête** (c'est la distance vers la zone publique).
- Le tri par distance reste cohérent (réordonnancement possible à ~500 m près entre spots quasi
  équidistants — négligeable et acceptable pour une liste de proximité).
- Aucun recentrage de carte ne dépend de `distance_m` → **rien ne casse**.

## 5. SQL drafté — `supabase/migrations/039_fix_nearby_spots_trilateration.sql`

> ⚠️ **NE PAS APPLIQUER ICI.** Fichier à créer, jamais éditer 004/024/029. Application = John.
> Aligne le gating fin de `nearby_spots` sur celui de `get_spots_for_map` / `get_spot_by_*` (029) :
> récupère `home_department`, dérive `is_precise` du tier réel, et calcule `distance_m` sur le bon point.

```sql
-- =====================================================================
-- Carnet de Pêche — 039 : fix fuite GPS RLS-FIX-07 (nearby_spots trilatérable)
-- À jouer APRÈS 029. READ ONLY côté Claude — application délibérée par John.
-- =====================================================================
-- PROBLÈME : nearby_spots renvoie distance_m = ST_Distance(geom PRÉCIS, observateur)
--   pour TOUS les tiers. 3 appels depuis 3 points => trilatération du geom exact
--   => contourne le floutage geom_public (anti spot-burning).
--
-- FIX : distance_m calculée sur le point AUTORISÉ pour le viewer, exactement
--   comme get_spots_for_map dérive ses coords :
--     - précis (geom)            si itinerant, OU local sur son home_department,
--                                OU propriétaire du spot ;
--     - flou (centroïde public)  sinon (anon, discovery, local hors dépt).
--   Le ST_DWithin du filtre reste sur geom (sert juste à pré-sélectionner le rayon ;
--   ne fuit rien, son résultat booléen n'est pas exposé). On garde le plafond
--   COUNT 3/dépt-global pour anon/discovery (parité 029).
--
-- SIGNATURE & COLONNES DE SORTIE IDENTIQUES à 029/004 :
--   nearby_spots(double precision, double precision, double precision, text[], text[])
--   -> (id, name, slug, department, distance_m, techniques, species, difficulty)
--   => aucun breaking change (lib/types.ts, lib/spots/nearby.ts, /api/spots/nearby,
--      NearbyPanel, MapShell inchangés). lib/types.ts à regénérer par discipline (no-op probable).
--
-- VÉRIFS (en rôle) :
--   anon       : distance_m vers le CENTROÏDE flou (≠ geom), ≤ 3 lignes.
--   local h=29 : précis (geom) pour les spots du 29 ; flou ailleurs.
--   itinerant  : précis partout (comportement inchangé).
-- =====================================================================

create or replace function public.nearby_spots(
  lat double precision,
  lng double precision,
  radius_km double precision default 50,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id uuid,
  name text,
  slug text,
  department char(3),
  distance_m double precision,
  techniques text[],
  species text[],
  difficulty smallint
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.id, s.name, s.slug, s.department,
      -- distance calculée sur le point AUTORISÉ pour ce viewer (parité avec get_spots_for_map) :
      case
        when (
          coalesce(s.created_by = v.uid, false)
          or v.tier = 'itinerant'
          or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
        )
        then ST_Distance(
               s.geom,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
        else ST_Distance(
               ST_Centroid(s.geom_public)::geography,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
      end as distance_m,
      s.techniques, s.species, s.difficulty,
      v.tier
    from public.spots s
    cross join viewer v
    where ST_DWithin(                                  -- pré-sélection rayon, sur geom : non exposé
            s.geom,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000
          )
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (species_filter is null   or s.species   && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
    order by distance_m
    limit 100
  ),
  ranked as (
    select *, row_number() over (order by distance_m) as rn from matched
  )
  select id, name, slug, department, distance_m, techniques, species, difficulty
  from ranked
  where tier in ('local','itinerant') or rn <= 3      -- anon/discovery : 3 max (parité 029)
  order by distance_m;
$$;

grant execute on function public.nearby_spots(
  double precision, double precision, double precision, text[], text[]
) to anon, authenticated;
```

### Notes de conception (choix verrouillés et points d'attention)

1. **Parité stricte avec `get_spots_for_map`** : la condition « a droit au précis » est copiée mot pour
   mot de 029 (`owner OR itinerant OR (local AND dépt = home)`). C'est volontaire — un seul critère de
   précis sur tous les chemins spots, plus facile à auditer.
2. **`ST_DWithin` reste sur `geom`** : c'est un filtre booléen de pré-sélection du rayon, son résultat
   n'est pas renvoyé. Le garder sur `geom` évite de manquer un spot dont le centroïde flou sortirait du
   rayon alors que le point réel y est (cohérence de la liste). Aucune fuite : seul `distance_m` est
   exposé, et lui est désormais flouté. **Trade-off mineur assumé** : pour un gratuit, un spot peut
   apparaître dans la liste avec une `distance_m` (au centroïde) légèrement > `radius_km` (jusqu'à
   ~900 m au-delà). Acceptable. *Alternative si John préfère la cohérence stricte du rayon : passer le
   `ST_DWithin` du flou pour les gratuits aussi — mais ça déplace le critère et complexifie ; non retenu.*
3. **Tri par `distance_m`** : maintenant mixte (certains precise, certains flous selon le tier — mais en
   pratique, pour un viewer donné, tous les spots non-précis utilisent la même métrique flou, et les
   précis la métrique précise ; pour anon/discovery c'est 100 % flou, donc tri homogène). Pas de
   problème de tri incohérent intra-tier.
4. **`limit 100` puis `rn <= 3`** : conservé tel quel (parité 029). Le `/api/spots/nearby` re-plafonne
   de toute façon (`cap` 3/5/100). Défense en profondeur conservée.
5. **`viewer` passe de 1 à 3 colonnes** (ajout `uid`, `home_dept`) : identique au pattern
   `get_spots_for_map`. Perf : `materialized` conservé, sous-requête `home_department` = 1 lookup PK sur
   `profiles`. Négligeable.

## 6. Vérifs post-application (à faire par John, et au `get_advisors`)

1. **Mesure anti-trilatération (le test qui compte)** — en rôle `anon` (ou un compte discovery),
   appeler `nearby_spots` depuis 3 points distincts pour le même spot et vérifier que la trilatération
   des 3 `distance_m` reconverge vers le **centroïde flou** (à ±500-900 m du point réel), pas vers
   `geom`. SQL de contrôle (à exécuter en prod après application) :
   ```sql
   -- doit montrer distance_m == distance au CENTROÏDE (pas au geom) pour un viewer non-précis
   set local role anon;  -- ou tester via /api/spots/nearby non connecté
   select slug,
     round(distance_m::numeric,1) as d_returned,
     round(ST_Distance(ST_Centroid(geom_public)::geography,
           ST_SetSRID(ST_MakePoint(-4.49,48.39),4326)::geography)::numeric,1) as d_centroid,
     round(ST_Distance(geom,
           ST_SetSRID(ST_MakePoint(-4.49,48.39),4326)::geography)::numeric,1) as d_geom_precise
   from nearby_spots(48.39,-4.49,50) n
   join public.spots using (id)  -- NB : anon ne lit pas geom ; faire ce join en rôle postgres pour le contrôle
   limit 5;
   -- attendu : d_returned ≈ d_centroid (et NON d_geom_precise)
   ```
   (Le contrôle final geom vs centroïde se fait en rôle privilégié ; l'attaquant, lui, n'a que
   `d_returned`.)
2. **Local sur son dépt = précis inchangé** : un Local `home=29` doit retrouver `distance_m ≈ d_geom`
   pour les spots du 29, et `≈ d_centroid` pour les spots hors 29.
3. **Itinérant = inchangé** : `distance_m ≈ d_geom` partout.
4. **Plafond COUNT** : anon/discovery ≤ 3 lignes ; local/itinerant jusqu'à 100.
5. **Non-régression UI** : `/carte` → « Spots autour de moi » s'affiche, distances cohérentes, clic
   recentre toujours (via marker, pas via distance).
6. **`get_advisors(security)` + `get_advisors(performance)`** : zéro nouvelle alerte (la fonction reste
   `SECURITY DEFINER` + `search_path=public`, comme 029 — pas de régression d'advisor attendue ; HIBP
   `auth_leaked_password_protection` reste WARN assumé, ne pas le compter).
7. **Réconcilier l'historique** : ajouter 039 à `list_migrations` après `supabase db push` (et profiter
   de la passe pour `supabase migration repair --status applied 025 026 027` si pas encore fait — cf.
   `MEMORY supabase-migration-history-drift`).
8. **Regénérer `lib/types.ts`** (`pnpm dlx supabase gen types … > lib/types.ts`) — signature inchangée,
   diff probablement vide, mais discipline §14.

## 7. Checklist « avant de promouvoir le code »

- ☑️ **Aucun changement de code applicatif requis** : signature + colonnes identiques → `lib/types.ts`,
  `lib/spots/nearby.ts`, `/api/spots/nearby`, `NearbyPanel`, `MapShell` inchangés. La migration peut
  être appliquée **sans** redéploiement de code (la prod actuelle continue de marcher, juste avec des
  distances floutées pour les gratuits).
- ☑️ **Ordre** : appliquer 039 en prod AVANT toute promotion de code qui en dépendrait (ici aucun) —
  mais la leçon 023/024 s'applique : migration d'abord, code ensuite.
- ☑️ **RLS / floutage** : RLS des `spots` inchangée ; la fonction reste DEFINER (justifié, c'est l'API
  publique gateée en interne). Le verrou colonne `geom` (028b) reste la défense de fond.
- ☑️ **Perf** : +1 lookup PK `profiles` par appel (comme `get_spots_for_map`), négligeable.
- ☑️ **SEO** : aucun impact.

---

## Réponses directes au brief

1. **Lue** : signature `nearby_spots(float8,float8,float8,text[],text[])` → `(id,name,slug,department,
   distance_m,techniques,species,difficulty)`, `SQL STABLE SECURITY DEFINER search_path=public`,
   exécutable par anon+authenticated (PUBLIC + grant explicite). Gating actuel = plafond COUNT 3/dépt
   pour anon/discovery + visibilité subscriber ; **aucun floutage de `distance_m`, aucun gating fin par
   département**. Définie en 004, redéfinie en 024 puis 029 (toujours `ST_Distance(geom,…)`).
2. **Vecteur** : `distance_m` calculée sur **`geom` PRÉCIS pour tous les tiers** (mesuré en prod : exacte
   au décimètre). Pas de coords lng/lat renvoyées par cette RPC — le seul vecteur est `distance_m`.
   **Réellement appelable par anon** (grant confirmé). **→ fuite réelle.**
3. **Usage app** : `/api/spots/nearby` (consommé par `MapShell`/`NearbyPanel`), affichage
   `formatDistance(distance_m)` ; recentrage carte via marker, pas via distance. Aucun usage cassé par
   le floutage de `distance_m`.
4. **SQL 039** : ci-dessus (§5) — `distance_m` sur centroïde flou pour anon/discovery/local-hors-dépt,
   précis pour itinerant/local-sur-dépt/owner. Signature & grants préservés.
5. **Vérifs post-app** : §6 (mesure anti-trilatération, parité local/itinerant, advisors, regen types).

*Conception read-only, 2026-06-22. Aucun write SQL. Lu : `nearby_spots` (live), `get_spots_for_map`,
`get_spot_by_slug/id`, `current_tier`, `blur_spot_geom` (live), migrations 029/024/004,
`app/api/spots/nearby/route.ts`, `lib/spots/nearby.ts`, `components/map/{MapShell,NearbyPanel}.tsx`.
Mesures prod via connecteur Supabase (SELECT uniquement).*
