# Investigation — Markers gris sans score sur la carte (spots récents)

> Read-only. Aucun write/trigger exécuté. Supabase prod `glgciwwnpmgifyhbvxsw` (eu-west-1).
> Date : 2026-06-22.

## TL;DR

Cause racine = **le cron de scoring n'a pas encore tourné depuis l'insertion des nouveaux spots**.
Ce n'est PAS un blocage technique. Aucun filtre par département, aucune limite de run, aucune
condition manquante. Les 74 spots gris sont **100 % éligibles** au scoring et seront colorés
**automatiquement au prochain run du cron, demain 05:00 UTC (07:00 Paris)**.

Si John veut les colorer **maintenant**, il suffit de **déclencher le cron manuellement** (1 appel
HTTP authentifié par `CRON_SECRET`). C'est un write prod (upsert dans `spot_scores`), à valider par
John, mais à faible risque.

---

## 1. Mesure du gap (chiffres réels)

**83 / 157 spots scorés. 74 sans score** (et non ~48 : le diagnostic initial de John sous-estimait —
les lots Manche/Mer du Nord récents sont aussi gris).

Répartition des **74 non-scorés**, tous créés **aujourd'hui 2026-06-22** :

| Heure de création (UTC) | Spots | Départements |
|---|---|---|
| 15:00 (lot Manche / Mer du Nord) | 26 | 14, 50, 59, 62, 76 |
| 16:00 (lot Méditerranée + Corse) | 48 | 06, 11, 13, 2A, 2B, 30, 34, 66, 83 |

Tous les autres départements (Bretagne/Atlantique : 17, 22, 29, 33, 35, 40, 44, 56, 64, 85)
sont **100 % scorés**, dernière création ≤ 2026-06-21.

Éligibilité des 74 non-scorés au pipeline : **74/74 `visibility='public'` ET `geom IS NOT NULL`**
→ rien ne les exclut du scoring.

État de `spot_scores` : 83 lignes, toutes calculées le **2026-06-22 entre 05:32:40 et 05:32:47 UTC**
(le run du cron de ce matin), toutes encore valides (`valid_until` ~ 2026-06-23 07:32, validité 26h).

**Chronologie déterminante** : cron du matin à **05:32 UTC** → insertion des nouveaux spots à
**15:00 et 16:00 UTC**. Le cron a tourné AVANT que les spots existent. CQFD.

---

## 2. Pipeline de scoring

**Cron Vercel** : `vercel.json` → `{ "path": "/api/crons/compute-spot-scores", "schedule": "0 5 * * *" }`
→ **quotidien à 05:00 UTC** (plan Hobby = 1 run/jour max). Région `dub1`.

**Endpoint** : `app/api/crons/compute-spot-scores/route.ts`
- `GET`, `force-dynamic`, `maxDuration = 60`.
- Auth **fail-closed** : exige `Authorization: Bearer <CRON_SECRET>`, sinon 401. Vercel injecte
  cet en-tête automatiquement pour ses crons.
- Appelle `computeAndStoreSpotScores(admin)` avec le client admin (service role).

**Job** : `lib/scoring/spot-scores-job.ts`
- (a) **Ce qu'il traite** : `admin.rpc('get_spots_for_scoring')` → **TOUS les spots**, sans filtre
  dept, **sans limite de N/run**. Batches de `BATCH_SIZE = 10` en parallèle, tolérant aux pannes
  (un spot qui échoue n'arrête pas le batch).
- (b) **Entrées du score** : pour chaque spot, `fetchSpotForecastWeek(lat, lng)` (lib
  `lib/conditions/spot-forecast.ts`) appelle **directement Open-Meteo** (2 endpoints gratuits sans
  clé : forecast + marine), puis `computeWeeklyForecast` (solunar) → `current`/`next`/`dayScore`.
  Upsert dans `spot_scores` (`onConflict: 'spot_id'`), `valid_until = now + 26h`.
  **`conditions_cache` n'est PAS un prérequis bloquant** : c'est un cache opportuniste (Supabase +
  cache Next.js 1h). Un spot sans entrée de cache fetche juste Open-Meteo à la volée.
- (c) **Schedule** : quotidien 05:00 UTC (cf. vercel.json).
- (d) **Nouveau spot pris en compte automatiquement ?** **OUI**, au prochain run, sans action,
  dès lors qu'il est `public` + `geom` non null — ce qui est le cas des 74.

**RPC source** `get_spots_for_scoring()` (SQL, SECURITY DEFINER, vérifiée en prod) :
```sql
SELECT s.id, ST_X(s.geom), ST_Y(s.geom)
FROM public.spots s
WHERE s.visibility = 'public' AND s.geom IS NOT NULL
ORDER BY s.id;
```
→ aucun filtre dept, aucun `LIMIT`. Prochain run = **157 spots**.

---

## 3. Cause racine

**« Le cron n'a pas encore tourné depuis l'insertion »** — pur problème de timing, pas de blocage.

Écarté explicitement :
- ❌ filtre par département dans la RPC → il n'y en a pas ;
- ❌ limite de N spots/run sur plan Hobby → le job traite tout, pas de cap ;
- ❌ `conditions_cache` manquant → pas un prérequis (fetch Open-Meteo direct) ;
- ❌ spots non éligibles (privacy/geom) → 74/74 public + geom OK.

Le bug est **cosmétique et auto-résolutif** : sans intervention, les 74 markers passeront de gris à
colorés demain ~05:32 UTC.

---

## 4. Couleur du marker

Confirmé : **gris = absence de score frais**. Logique dans `lib/map/utils.ts` :
- `QUALITY_NEUTRAL_COLOR = '#B7C2C9'` (ink-300) si `currentQuality` est `undefined`.
- Sinon `QUALITY_MARKER_COLORS` : `faible` → ink-400 gris ; `moyenne`/`bonne` → gold-500 ;
  `tres_bonne`/`exceptionnelle` → teal. (Nuance : « faible » donne aussi un gris, mais distinct du
  neutre ; ici le « — / 100 » + gris signalé par John = bien l'**absence** de score, pas un score faible.)

**D'où vient le score** : `app/(map)/carte/page.tsx` → `fetchFreshScores(spotIds)` fait un **fetch
séparé** sur la table `spot_scores` (`select spot_id, current_quality, valid_until` filtré sur
`valid_until > now()`), puis merge `currentQuality` sur chaque marker côté serveur. Ce n'est PAS
joint dans `get_spots_for_map` (la RPC carte ne renvoie pas le score). Donc : pas de ligne fraîche
dans `spot_scores` → `currentQuality = undefined` → marker neutre gris + « — / 100 ».

---

## 5. Comment corriger

### Option A (recommandée si on ne veut pas attendre) — déclencher le cron manuellement

Un seul appel HTTP authentifié. **C'est un write prod** (upsert `spot_scores`) → à valider par John.

URL exacte :
```
POST/GET  https://www.carnet-de-peche.com/api/crons/compute-spot-scores
Header:   Authorization: Bearer <CRON_SECRET>
```
(la route est en `GET`.) Exemple :
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://www.carnet-de-peche.com/api/crons/compute-spot-scores
```
- `CRON_SECRET` est une **var d'env Vercel** (pas dans le repo) — John l'a dans le dashboard Vercel.
  Sans le bon Bearer → 401.
- Réponse attendue : `{ ok: true, total: 157, succeeded, failed, elapsedMs }`.
- Alternative sans CLI : dashboard Vercel → onglet **Crons** → « Run now » sur
  `/api/crons/compute-spot-scores` (Vercel injecte le Bearer tout seul).

**Risques / coût** :
- ⚠️ `maxDuration = 60 s`. 157 spots × 2 requêtes Open-Meteo, par batch de 10. Le run du matin a fait
  83 spots en ~7 s → 157 devrait tenir largement (~15-20 s estimés), mais c'est la première fois
  qu'on dépasse ~80 spots : si ça frôle 60 s, certains spots échoueront silencieusement (failed++)
  et seront repris au run suivant. Surveiller le `succeeded`/`failed` de la réponse.
- ⚠️ **Open-Meteo gratuit, sans clé**, mais ~314 requêtes en rafale. La doc Open-Meteo a un
  rate-limit non-commercial (ordre de 600 req/min) — 314 réparties par batch de 10 passe, mais si
  des spots reviennent en `failed` avec des erreurs réseau, c'est probablement du throttling →
  re-déclencher plus tard suffit (cache Next.js 1h amortit).
- ✅ Aucun risque RLS / floutage : le job lit `geom` via RPC SECURITY DEFINER côté serveur (service
  role), n'expose rien au client. La carte continue de servir le score via `current_quality` (pas de
  coordonnée).

### Option B (zéro action) — attendre le cron quotidien

Demain **05:00 UTC (07:00 Paris)**, le run nominal scorera les 157 spots. Les markers gris
deviendront colorés sans rien faire. Acceptable si l'urgence est faible.

### À NE PAS faire

- Pas besoin de peupler `conditions_cache` au préalable (non bloquant).
- Pas de RPC dédiée « score un seul spot » : le job est tout-ou-rien sur l'ensemble public.
- Pas de modif de schéma / migration nécessaire : le pipeline est correct, c'est purement du timing.

---

## Recommandation

Si John veut la carte propre tout de suite : **Option A via le bouton « Run now » du dashboard Vercel**
(plus simple que curl + pas besoin de manipuler le secret), puis vérifier `succeeded: 157, failed: 0`
dans la réponse / les logs. Sinon, ne rien faire : c'est réglé au prochain cron.

### Fichiers de référence
- `c:\Users\johns\Carnet-de-peche\app\api\crons\compute-spot-scores\route.ts` (endpoint + auth)
- `c:\Users\johns\Carnet-de-peche\vercel.json` (schedule cron)
- `c:\Users\johns\Carnet-de-peche\lib\scoring\spot-scores-job.ts` (job, RPC source, batchs)
- `c:\Users\johns\Carnet-de-peche\lib\conditions\spot-forecast.ts` (entrées Open-Meteo, cache)
- `c:\Users\johns\Carnet-de-peche\app\(map)\carte\page.tsx` (fetchFreshScores + merge couleur)
- `c:\Users\johns\Carnet-de-peche\lib\map\utils.ts` (QUALITY_NEUTRAL_COLOR, markerColorForQuality)
