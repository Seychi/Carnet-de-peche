# Addendum sprint 11.5 — Le vrai correctif de la fuite GPS

> Rédigé le 2026-06-21 (audit `docs/audits/AUDIT-2026-06-21-site-complet.md`, findings C1/C2).
> ⚠️ **Le Bloc A du sprint 11.5 ne ferme PAS la fuite GPS.** Il révoque `get_spots_for_scoring`, mais la fuite réelle (vérifiée live + SQL) passe par 3 autres vecteurs. Cet addendum les traite. À jouer **après** les migrations 025/026/027 (028 dépend de 026 qui recrée `blur_spot_geom`).

## Le problème, vérifié en prod
1. **`geom_public` est un buffer symétrique centré sur le point exact** → `ST_Centroid(geom_public)` = le point d'origine. Offset mesuré : **0,021 m** sur les 38 spots. La branche « floutée » de `get_spots_for_map` et la fiche `/spots/[slug]` renvoient donc les **coords exactes**, pendant que l'UI dit « ZONE FLOUTÉE 1 KM ».
2. **`anon` a `SELECT` sur la colonne `spots.geom`** (`has_column_privilege('anon','public.spots','geom','SELECT') = true`) → avec la clé publishable, `from('spots').select('geom')` rend les 38 points précis. *(L'app, elle, ne lit jamais `geom` en direct — vérifié : les 6 `from('spots')` sélectionnent slug/name/department/species/… ; les coords passent uniquement par les RPC `get_spots_for_map` / `get_spot_by_slug` / `get_spot_by_id` / `nearby_spots`, toutes SECURITY DEFINER. Le REVOKE est donc sans impact app.)*
3. **`get_spots_for_map` / `nearby_spots` / `/api/spots/nearby` n'ont aucun gating de tier côté serveur** : la limite « 3/dépt » et « local = home_department » ne vivent que dans `app/(map)/carte/page.tsx`. Appel direct RPC (clé publishable + JWT) → tous les spots, tous les dépts. Un **Local** obtient même le précis de tous les dépts (= feature Itinérant).

---

## Correctif — 2 migrations + 1 patch code

### Migration `028_spot_geom_blur_jitter.sql` — flou réel + révocation colonne
> ⚠️ À jouer APRÈS 026 (qui recrée `blur_spot_geom` avec `set search_path`). On garde le `set search_path = public`.
> Choix : **jitter ALÉATOIRE stocké**, PAS dérivé d'un hash de l'id. Un offset déterministe à partir de l'id (seed public) + formule connue = réversible (on soustrait l'offset). Un offset aléatoire stocké n'a aucun lien public→précis : l'attaquant ne voit que le point flouté, à ~500-900 m, sans moyen de remonter au précis (qui est en `geom`, révoqué).

```sql
-- 1) Nouveau flou : point projeté à 500-900 m dans une direction aléatoire,
--    recalculé uniquement quand geom change (sinon le point flouté bougerait à chaque édition).
create or replace function public.blur_spot_geom()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.geom is distinct from old.geom then
    new.geom_public := ST_Project(
      new.geom,
      500 + random() * 400,        -- distance 500..900 m
      random() * 2 * pi()          -- azimut 0..2π
    )::geography;
  end if;
  return new;
end;
$$;

-- 2) Recalcul des 38 spots existants (le trigger ne se redéclenche pas seul).
update public.spots
set geom_public = ST_Project(geom, 500 + random() * 400, random() * 2 * pi())::geography;

-- 3) Révoquer la lecture directe de la colonne précise.
--    Les RPC restent SECURITY DEFINER (owner=postgres) → elles gardent l'accès à geom.
--    Le cron compute-spot-scores passe par service_role → non impacté.
revoke select (geom) on public.spots from anon, authenticated;
```

**Vérifs 028**
- `select min(d), max(d) from (select ST_Distance(geom::geography, geom_public::geography) d from public.spots) t;` → tout entre ~500 et ~900 m (plus de 0,02 m).
- `select has_column_privilege('anon','public.spots','geom','SELECT');` → **false**.
- La carte (gratuit) et la fiche spot affichent un point à ~500-900 m du réel ; abonné = précis.

### Migration `029_spot_rpc_tier_gating.sql` — gating de tier DANS les RPC
> Le plus délicat : à tester (cf. critères). Porte « 3/dépt » + « local = home_department » côté serveur, et fait dériver le précis du **tier réel** (`current_tier`), plus de `has_active_subscription` (qui ne distingue pas local/itinerant).

```sql
create or replace function public.get_spots_for_map(
  dept_filter char(3) default null,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id uuid, name text, slug text, department char(3), region text,
  lng double precision, lat double precision, is_precise boolean,
  techniques text[], species text[], structure text, difficulty smallint, verified boolean
)
language sql stable security definer set search_path = public
as $$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  visible as (
    select s.*, v.tier, v.uid,
      (v.tier in ('local','itinerant') or coalesce(s.created_by = v.uid, false)) as is_precise
    from public.spots s cross join viewer v
    where (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (
        v.tier = 'itinerant'
        or v.tier not in ('local','itinerant')                                 -- anon/discovery : tous dépts (limités à 3 plus bas)
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept,'')))
      )
      and (dept_filter is null or s.department = dept_filter)
      and (species_filter is null or s.species && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
  ),
  ranked as (
    select *, row_number() over (partition by btrim(department) order by name) as rn from visible
  )
  select
    id, name, slug, department, region,
    case when is_precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end,
    case when is_precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end,
    is_precise, techniques, species, structure, difficulty, verified
  from ranked
  where tier in ('local','itinerant') or rn <= 3                              -- anon/discovery : 3 max/dépt
  order by name;
$$;
grant execute on function public.get_spots_for_map(char, text[], text[]) to anon, authenticated;
```
- Appliquer le même principe de **plafond par tier** à `nearby_spots` (renvoyer au plus 3 lignes pour anon/discovery, 5 pour discovery connecté si on veut, tout pour local/itinerant ; cette RPC ne renvoie pas de geom, donc seul le COUNT est à plafonner).
- Une fois `app/(map)/carte/page.tsx` non régressif, on peut **retirer** `limitSpotsPerDept` côté page (le gating est désormais serveur) — optionnel, à garder en double sécurité dans un premier temps.

### Patch code — `app/api/spots/nearby/route.ts`
Ajouter un garde de tier serveur (aujourd'hui : aucun → un anonyme reçoit l'inventaire complet) :
```ts
import { getUserTier } from '@/lib/auth/tier'
// …
const tier = await getUserTier()
const cap = tier === 'itinerant' ? 100 : tier === 'local' ? 100 : tier === 'discovery' ? 5 : 3
// … après la RPC :
return NextResponse.json({ spots: (data ?? []).slice(0, cap) })
```

### Après migrations
- Régénérer `lib/types.ts` (`pnpm dlx supabase gen types …`).
- ⚠️ **Vérifier aussi les CATCHES** : si `blur_catch_geom` fait également un `ST_Buffer` centré, les prises publiques ont le même trou. Mesurer : `select max(ST_Distance(geom::geography, geom_public::geography)) from public.catches where geom is not null;` → si ~0 m, appliquer le même jitter à `blur_catch_geom` + recalcul. (L'audit carnet ne l'a pas mesuré.)

---

## Critères d'acceptation
- `has_column_privilege('anon','public.spots','geom','SELECT')` = **false**.
- `ST_Distance(geom, geom_public)` ∈ [~500, ~900] m pour les 38 spots (offset réel).
- En rôle `anon` : `get_spots_for_map()` → **≤ 3 spots/dépt**, `is_precise=false`, lng/lat ≠ exact.
- En rôle d'un **local** (home 29) : seulement le 29, `is_precise=true`, coords exactes.
- En rôle d'un **itinerant** : tous les dépts, précis.
- `/api/spots/nearby` anonyme → **≤ 3** résultats.
- Le cron `compute-spot-scores` produit toujours `spot_scores` (service_role non impacté).
- Aucune lecture app cassée (les 6 `from('spots')` ne lisent pas `geom`).

## Garde-fous / ordre
1. **028 après 026** (sinon 026 réécrase `blur_spot_geom` et le jitter saute).
2. RPC restent `security definer` (owner postgres) → gardent l'accès à `geom` malgré le REVOKE.
3. Ne pas toucher aux vues `*_for_viewer` ici (hors scope 11.5, cf. brief) — le correctif passe par le trigger + les RPC + le REVOKE colonne, pas par `security_invoker`.
4. Migrations = nouveaux fichiers (028/029), jamais éditer 001-027. RLS jamais désactivée.
5. **Bloquant avant la curation en masse (lots 2-5)** : tant que ce n'est pas en prod, chaque spot ajouté fuite ses coords exactes.
