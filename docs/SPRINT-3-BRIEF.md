# 🎣 Sprint 3 — Carnet de pêche CRUD

> Sprint de 2 semaines. Objectif : faire vivre **le cœur du produit**, la fonctionnalité qui distingue Carnet de Pêche de tous les concurrents. À la fin, John peut logger une vraie session, voir son historique, ses stats, et tout repose sur les bons fondamentaux DB / privacy / conditions.

---

## 🎯 Objectif global

À la fin du sprint 3, un utilisateur connecté peut :

1. **Logger une prise** depuis `/carnet/nouvelle` : espèce, taille, poids, technique, leurre, photo, position GPS, notes privées — avec **auto-capture** des conditions météo/marée/vent/houle.
2. **Voir son carnet** sur `/carnet` : liste filtrable par espèce / technique / période, avec stats résumées en haut.
3. **Consulter le détail** d'une prise sur `/carnet/[id]`, l'**éditer** ou la **supprimer**.
4. **Choisir la confidentialité** de chaque prise (privée / amis / publique), avec floutage GPS automatique géré côté DB (trigger déjà en place).

À la fin du sprint, John peut faire un test grandeur nature : aller pêcher, logger 3 prises depuis son téléphone, retrouver l'historique le soir, voir les conditions s'afficher correctement. **Si ce test grandeur nature ne fonctionne pas, le sprint n'est pas fini.**

---

## 🧭 Vision d'ensemble — comment tout se relie

```
┌──────────────────────────────────────────────────────────────┐
│  UI (Server Components + Server Actions)                     │
│                                                              │
│  /carnet/nouvelle  →  /carnet  ←  /carnet/[id]               │
│        │                  │              │                   │
│        └──── lib/catches/actions.ts ─────┘                   │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────┐                  │
│  │ lib/catches/schema.ts  (validation)    │                  │
│  │ lib/catches/queries.ts (reads)         │                  │
│  │ lib/conditions/openmeteo.ts (API ext)  │                  │
│  │ lib/storage/photo.ts   (upload)        │                  │
│  └──────────────────┬─────────────────────┘                  │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│  SUPABASE                                                    │
│  ┌────────────────────────┐    ┌──────────────────────────┐  │
│  │ catches (table)        │    │ storage/catches/<uid>/   │  │
│  │ ├─ geom (précis)       │    │   <catch_id>.webp        │  │
│  │ ├─ geom_public (flou)  │    │                          │  │
│  │ ├─ conditions (jsonb)  │    └──────────────────────────┘  │
│  │ └─ privacy             │                                  │
│  │                        │    ┌──────────────────────────┐  │
│  │ catches_for_viewer     │    │ RLS policies +           │  │
│  │   (vue à utiliser !)   │    │ trigger geom_public      │  │
│  └────────────────────────┘    └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────────────┐
            │ APIs externes           │
            │ ─ Open-Meteo Marine     │
            │ ─ Open-Meteo Forecast   │
            │ ─ (Tides : à valider)   │
            └─────────────────────────┘
```

**Règles d'or à NE JAMAIS oublier** :
- **Lecture** : toujours via la vue `catches_for_viewer` (jamais `catches` direct). Sinon tu leak des geom précis.
- **Écriture** : `catches` direct, le trigger calcule `geom_public` tout seul.
- **Photo** : redimensionner client-side AVANT upload (max 1920 px), stocker en webp.
- **Conditions** : capturer au moment du log, pas en différé (les conditions changent).
- **Server Components par défaut**, `'use client'` uniquement pour les composants interactifs (form, modal, upload).

---

## 🚫 Hors scope sprint 3

- Carte interactive MapLibre (sprint 5)
- Stripe / paywall sur les features (sprint 4)
- Fil régional / posts (sprint 9)
- Modération IA (post-MVP)
- Score d'activité des spots (sprint 8, dépend du volume de logs)
- Friends / follows (sprint 9 — pour cette feature `privacy=friends` affichera les prises à TOUS les utilisateurs authentifiés en attendant)
- App mobile (phase 2)

---

## 📋 Backlog en 8 phases atomiques

> Chaque phase = 1 à 3 sessions Claude Code. Lis le titre, copie le bloc « PROMPT POUR CLAUDE CODE » dans ton terminal, valide, passe à la suivante. Ne saute pas l'ordre.

---

### PHASE A — Fondations data (Jour 1)

#### Tâche A.1 — Pré-flight check : valider Open-Meteo + APIs marées

⚠️ **À faire AVANT toute autre tâche.** Le brief général dit « Open-Meteo Marine pour marées + météo + vent + houle ». **Or Open-Meteo Marine ne fournit que les vagues (hauteur, période, direction), pas les marées.** Il faut décider maintenant.

**PROMPT POUR CLAUDE CODE :**

```
Crée un script de validation API dans `scripts/check-apis.ts`. Le script doit :

1. Appeler Open-Meteo Marine pour latitude=48.04, longitude=-4.73, current+hourly 24h
   URL : https://marine-api.open-meteo.com/v1/marine
   Champs : wave_height, wave_direction, wave_period, sea_surface_temperature
   Loguer la réponse complète.

2. Appeler Open-Meteo Forecast pour les mêmes coords
   URL : https://api.open-meteo.com/v1/forecast
   Champs : temperature_2m, windspeed_10m, winddirection_10m, pressure_msl, cloudcover, precipitation
   Loguer la réponse complète.

3. CONFIRMER que ni l'un ni l'autre ne fournit de prédictions de marées.

4. Tester deux alternatives gratuites/freemium pour les marées :
   - https://www.worldtides.info/api/v3 (freemium, clé API gratuite à demander, 100 calls/jour)
   - https://api.stormglass.io/v2/tide/sea-level/point (10 calls/jour gratuit)

   Loguer la réponse type.

5. Documenter le verdict dans `docs/APIS-DECISION.md` :
   - quelles APIs on utilise pour quoi
   - quotas et coûts éventuels
   - propositions de fallback

Ne touche à AUCUN autre fichier. Lance le script avec `pnpm tsx scripts/check-apis.ts` après création.
```

**Définition of Done :** John lit `docs/APIS-DECISION.md` et tranche : on garde quelle API pour les marées ? (réponse probable : WorldTides freemium + cache aggressif, ou bien on ne capture pas les marées en sprint 3 et on les ajoute en sprint 7).

---

#### Tâche A.2 — Migration 006 : ajouts catches + bucket storage

**PROMPT POUR CLAUDE CODE :**

```
Crée la migration `supabase/migrations/006_catches_storage_extension.sql` avec :

1. ALTER TABLE public.catches :
   - ADD COLUMN lure_brand text (max 60 chars, nullable)
   - ADD COLUMN lure_model text (max 100 chars, nullable)
   - ADD COLUMN bait_type text (nullable, pour surfcasting : arenicole, crabe_vert, moule, etc.)
   - ADD COLUMN released boolean NOT NULL DEFAULT false (no-kill ou pas)
   - ADD COLUMN water_temperature_c numeric(4,1) (nullable, peut être saisi manuellement)
   - ADD COLUMN notes text (max 1000 chars)
   - ADD COLUMN photo_path text (chemin storage, nullable)
   - ADD COLUMN location_method text NOT NULL DEFAULT 'gps' CHECK (location_method IN ('gps','manual','spot'))
   - ADD COLUMN spot_id uuid REFERENCES public.spots(id) ON DELETE SET NULL (nullable)

2. Index sur catches(user_id, caught_at DESC) si pas déjà présent (pour /carnet listing)

3. Bucket Supabase Storage :
   - INSERT INTO storage.buckets (id, name, public) VALUES ('catches', 'catches', false) ON CONFLICT DO NOTHING
   - Policy SELECT : un user peut lire ses propres photos
   - Policy INSERT : un user peut uploader dans son dossier (path starts with auth.uid())
   - Policy DELETE : un user peut supprimer ses propres photos
   - Pas de policy UPDATE (on remplace via DELETE + INSERT)

4. Contrainte UNIQUE sur conditions_cache (utile pour B.3 et sprint 7 marées) :
   - Vérifie d'abord si la contrainte/index existe déjà sur conditions_cache.cache_key
     (regarde la migration 001_init.sql).
   - Si absente, ajoute :
     ALTER TABLE public.conditions_cache
       ADD CONSTRAINT conditions_cache_cache_key_key UNIQUE (cache_key);
   - Si la colonne `cache_key` n'existe pas non plus, créer un schéma cohérent :
     ALTER TABLE public.conditions_cache
       ADD COLUMN IF NOT EXISTS cache_key text UNIQUE,
       ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL,
       ADD COLUMN IF NOT EXISTS fetched_at timestamptz NOT NULL DEFAULT now();
     CREATE INDEX IF NOT EXISTS conditions_cache_fetched_at_idx ON public.conditions_cache(fetched_at);

5. Régénérer les types TS après application :
   pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts

Applique la migration via Supabase Studio (SQL Editor) ou via supabase db push, puis régénère les types.
```

**Définition of Done :** la table `catches` a les nouvelles colonnes (vérifie via Supabase Studio), le bucket `catches` existe avec ses 3 policies, `lib/types.ts` reflète les nouveaux champs.

---

### PHASE B — Server layer (Jour 2)

#### Tâche B.1 — Validation Zod centralisée

**PROMPT POUR CLAUDE CODE :**

```
Crée `lib/catches/schema.ts` avec les schémas Zod :

1. `catchSpeciesEnum` : enum Zod des 6 espèces v1 ['bar','dorade_royale','lieu_jaune','maquereau','sar','orphie']

2. `catchTechniqueEnum` : ['leurres','surfcasting','flottante','vif']

3. `catchPrivacyEnum` : ['private','friends','public']

4. `catchLocationMethodEnum` : ['gps','manual','spot']

5. `createCatchSchema` (Zod object) :
   - species : catchSpeciesEnum
   - caught_at : ISO datetime string, défaut now()
   - size_cm : number entre 10 et 200, optionnel
   - weight_kg : number entre 0.05 et 30, optionnel
   - technique : catchTechniqueEnum
   - lure_brand : string max 60, optionnel
   - lure_model : string max 100, optionnel
   - bait_type : string max 60, optionnel
   - released : boolean défaut false
   - water_temperature_c : number entre 0 et 35, optionnel
   - notes : string max 1000, optionnel
   - location_method : catchLocationMethodEnum, défaut 'gps'
   - latitude : number entre -90 et 90 (requis si location_method='gps' ou 'manual')
   - longitude : number entre -180 et 180 (requis si location_method='gps' ou 'manual')
   - spot_id : uuid optionnel (requis si location_method='spot')
   - privacy : catchPrivacyEnum, défaut 'private'
   - precise_for_friends : boolean, défaut true
   - reveal_precise_to_public : boolean, défaut false

6. `updateCatchSchema` : createCatchSchema.partial() avec id uuid requis

7. `catchFiltersSchema` :
   - species : catchSpeciesEnum array optionnel
   - technique : catchTechniqueEnum array optionnel
   - dateFrom : ISO date optionnel
   - dateTo : ISO date optionnel
   - released : boolean optionnel
   - limit : number max 50 défaut 20
   - offset : number défaut 0

Export tous les types inférés (`CreateCatchInput`, `UpdateCatchInput`, `CatchFilters`).

Aucun appel Supabase ici, c'est uniquement de la validation. Crée également un fichier de test minimal `lib/catches/schema.test.ts` (Vitest) qui valide 3 cas : payload valide, payload invalide (taille négative), payload avec privacy='public' + reveal_precise_to_public.
```

**Définition of Done :** `pnpm typecheck` passe, `pnpm test` (si configuré) passe. Les types sont exportés et utilisables.

---

#### Tâche B.2 — Server queries (lectures)

**PROMPT POUR CLAUDE CODE :**

```
Crée `lib/catches/queries.ts` avec les fonctions de LECTURE.

Important : toutes les lectures passent par la VUE `catches_for_viewer`, jamais par la table directe (sinon on leak des geom précis).

Fonctions à implémenter :

1. `getMyCatches(filters: CatchFilters)` :
   - Server-only (utilise createServerClient)
   - SELECT * FROM catches_for_viewer WHERE user_id = auth.uid()
   - Applique les filtres (species, technique, dateFrom, dateTo, released)
   - ORDER BY caught_at DESC
   - LIMIT/OFFSET pagination
   - Retourne { catches: CatchRow[], totalCount: number }

2. `getCatchById(id: string)` :
   - Server-only
   - SELECT * FROM catches_for_viewer WHERE id = $1
   - Retourne CatchRow | null
   - Si pas trouvé OU pas accessible → null (RLS gère)

3. `getMyCatchStats()` :
   - Server-only
   - Retourne :
     { totalCount, thisMonthCount, biggestCatch: { species, size_cm }, favoriteSpecies, releasedRate }
   - Utiliser une RPC SQL `get_my_catch_stats()` à créer dans migration 007
     (Plus performant qu'agréger côté JS pour un user avec 500+ prises)

4. `getPhotoSignedUrl(photoPath: string, expiresInSec = 3600)` :
   - Server-only
   - Génère une signed URL Supabase Storage pour afficher la photo
   - Retourne string | null

Toutes les fonctions doivent être typées strictement avec les types générés (lib/types.ts).
Pas de try/catch silencieux : laisse remonter les erreurs Supabase, on les gère dans les pages.
```

Puis dans la foulée :

```
Crée la migration `supabase/migrations/007_catch_stats_rpc.sql` :

create or replace function public.get_my_catch_stats(uid uuid default auth.uid())
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'totalCount', count(*),
    'thisMonthCount', count(*) filter (where caught_at >= date_trunc('month', now())),
    'biggestCatch', (
      select jsonb_build_object('species', species, 'size_cm', size_cm)
      from catches
      where user_id = uid and size_cm is not null
      order by size_cm desc nulls last
      limit 1
    ),
    'favoriteSpecies', (
      select species
      from catches
      where user_id = uid
      group by species
      order by count(*) desc
      limit 1
    ),
    'releasedRate', (
      case when count(*) = 0 then 0
           else round(count(*) filter (where released = true)::numeric * 100 / count(*), 1)
      end
    )
  )
  from catches
  where user_id = uid;
$$;

revoke all on function public.get_my_catch_stats from public;
grant execute on function public.get_my_catch_stats to authenticated;

Applique la migration et re-génère les types.
```

**Définition of Done :** depuis un Server Component de test (page bidon temporaire `/dev/test-queries`), tu peux appeler `getMyCatches({})` et voir les prises de l'user connecté dans la console serveur.

---

#### Tâche B.3 — Conditions snapshot (Open-Meteo)

> ✅ **Décision arrêtée en A.1** : Open-Meteo Marine + Forecast en sprint 3 (vent / houle / météo / pression / température eau). **Marées reportées au sprint 7** via WorldTides + cache `conditions_cache`. Les champs `tide_*` du snapshot restent **optionnels et `null`** en sprint 3 — l'UI doit gérer leur absence sans erreur.

**PROMPT POUR CLAUDE CODE :**

```
Crée `lib/conditions/openmeteo.ts`.

Fonction principale :

`fetchConditionsAt(lat: number, lng: number, datetime: Date): Promise<ConditionsSnapshot>`

Récupère et fusionne deux endpoints Open-Meteo :

1. Marine API : wave_height, wave_direction, wave_period, sea_surface_temperature
   URL : https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lng}&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=Europe/Paris&start_date={date}&end_date={date}

2. Forecast API : temperature_2m, windspeed_10m, winddirection_10m, pressure_msl, cloud_cover, precipitation
   URL : https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=temperature_2m,windspeed_10m,winddirection_10m,pressure_msl,cloud_cover,precipitation&timezone=Europe/Paris&start_date={date}&end_date={date}

Le datetime peut être passé / futur (max +7j). Trouve l'heure la plus proche dans le tableau `hourly`.

Type retourné :

```ts
type ConditionsSnapshot = {
  fetched_at: string;             // ISO
  source: 'open-meteo';
  air_temperature_c: number | null;
  water_temperature_c: number | null;     // sea_surface_temperature Marine API
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  pressure_hpa: number | null;
  cloud_cover_pct: number | null;
  precipitation_mm: number | null;
  wave_height_m: number | null;
  wave_period_s: number | null;
  wave_direction_deg: number | null;
  // ⚠️ Marées : reportées au sprint 7 (WorldTides). Toujours null en sprint 3.
  tide_state: 'rising' | 'falling' | 'high' | 'low' | null;
  tide_coefficient: number | null;
  next_high_tide_at: string | null;
  next_low_tide_at: string | null;
};
```

Si une des APIs échoue, retourne `null` pour les champs concernés mais ne throw PAS — la prise doit pouvoir se logger même sans conditions.

CACHE : utilise la table `conditions_cache` qui existe déjà dans la migration 001
(jamais de cache mémoire process — Vercel = serverless multi-instances, ça ne marcherait pas).

Stratégie :
- Clé : geohash précision 5 (≈ 4,9 km × 4,9 km) calculé depuis lat/lng + heure arrondie à l'heure (UTC).
  Installe la dépendance : pnpm add ngeohash
  Helper : `cacheKey(lat, lng, datetime)` → `${ngeohash.encode(lat, lng, 5)}_${datetime.toISOString().slice(0,13)}`
- TTL : 1 h (les conditions changent vite, plus court que le 12h prévu pour les marées en sprint 7).
- Avant chaque appel API :
  SELECT payload FROM conditions_cache WHERE cache_key = $1 AND fetched_at > now() - interval '1 hour'
- Après chaque fetch réussie :
  INSERT INTO conditions_cache (cache_key, payload, fetched_at)
  VALUES ($1, $2, now())
  ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now();
- Si la table `conditions_cache` n'a pas encore la contrainte UNIQUE sur cache_key, l'ajouter via migration 006 (à insérer dans le ALTER déjà prévu).

À utiliser depuis le server action createCatch (jamais depuis le client : pas de CORS au browser, et on garde la clé/IP du serveur).

Crée un test minimal dans `lib/conditions/openmeteo.test.ts` qui mock fetch et vérifie :
1. Le parsing d'une réponse Marine + Forecast bien fusionnés.
2. Que les 4 champs tide_* sont bien à null.
3. Le hit cache (deuxième appel = pas de re-fetch).
```

**Définition of Done :** depuis le Server Component test précédent, tu appelles `fetchConditionsAt(48.04, -4.73, new Date())` et tu vois un snapshot complet dans la console.

---

#### Tâche B.4 — Server actions (mutations)

**PROMPT POUR CLAUDE CODE :**

```
Crée `lib/catches/actions.ts` avec les SERVER ACTIONS Next.js.

Met `'use server'` en haut du fichier.

Fonctions :

1. `createCatch(input: CreateCatchInput): Promise<{ id: string } | { error: string }>`
   - Valide avec createCatchSchema
   - Récupère l'user connecté via createServerClient
   - Calcule conditions snapshot via fetchConditionsAt() si lat/lng disponibles (pas bloquant)
   - INSERT INTO catches (...) RETURNING id
   - revalidatePath('/carnet')
   - Retourne { id }

2. `updateCatch(input: UpdateCatchInput): Promise<{ ok: true } | { error: string }>`
   - Valide avec updateCatchSchema
   - UPDATE catches SET ... WHERE id = $1 AND user_id = auth.uid()
   - revalidatePath('/carnet') + revalidatePath('/carnet/[id]', 'page')
   - Si la lat/lng a changé, recalcule conditions et update le jsonb

3. `deleteCatch(id: string): Promise<{ ok: true } | { error: string }>`
   - DELETE FROM catches WHERE id = $1 AND user_id = auth.uid()
   - Si photo_path présent, DELETE depuis storage
   - revalidatePath('/carnet')

4. `uploadCatchPhoto(formData: FormData): Promise<{ path: string } | { error: string }>`
   - Reçoit un file (déjà redimensionné côté client en webp)
   - Vérifie taille max 1.5MB
   - Vérifie type image/webp
   - Upload vers storage/catches/<user_id>/<crypto.randomUUID()>.webp
   - Retourne { path }

Toutes les erreurs doivent être loguées côté serveur (console.error) ET retournées proprement au client. Pas de throw au runtime.
```

**Définition of Done :** depuis le Server Component test, tu appelles `createCatch({...})` avec un payload valide et tu vois une nouvelle ligne dans la table `catches` côté Supabase. Le champ `conditions` est rempli. Le champ `geom_public` est rempli automatiquement par le trigger.

---

### PHASE C — Photo (Jour 3)

#### Tâche C.1 — Utilitaire de redimensionnement client

**PROMPT POUR CLAUDE CODE :**

```
Crée `lib/storage/image-resize.ts` (côté client, donc pas de 'use server').

Fonction : `resizeImageToWebp(file: File, maxWidth = 1920, quality = 0.82): Promise<File>`

- Utilise le Canvas API du navigateur
- Charge l'image dans une Image()
- Calcule new dimensions en gardant le ratio (largeur max 1920)
- Dessine sur un OffscreenCanvas
- Exporte en webp avec quality 0.82
- Retourne un File renommé `<originalname>.webp`

Gère :
- L'orientation EXIF (rotate selon EXIF metadata) — utilise la lib `exifr` ou équivalent
- Les images très grandes (> 20MP) sans crash navigateur
- Le mobile Safari iOS (limitations OffscreenCanvas — fallback HTMLCanvasElement si besoin)

Installe les deps nécessaires :
pnpm add browser-image-compression exifr

Note : tu peux utiliser browser-image-compression qui gère tout ça déjà.

Crée également un composant `components/forms/PhotoInput.tsx` :
- 'use client'
- Input file accept="image/*" capture="environment" (déclenche la caméra arrière sur mobile)
- À la sélection : preview + bouton "Changer la photo"
- Quand l'utilisateur soumet le form parent, le composant renvoie le File webp redimensionné (via useImperativeHandle ou prop onChange)
- Loading state pendant le resize (peut prendre 2-3 sec sur mobile)
- Erreur si fichier > 20MB initial (rejette avec toast)

Ce composant sera utilisé dans le form de log.
```

**Définition of Done :** dans une page de test `/dev/test-photo`, tu sélectionnes une photo de 5MB depuis ton téléphone, tu vois le preview et la taille finale (~200-400KB en webp).

---

### PHASE D — UI : Logger une prise (Jours 4-5)

#### Tâche D.1 — Scaffold page `/carnet/nouvelle`

**PROMPT POUR CLAUDE CODE :**

```
Crée `app/(app)/carnet/nouvelle/page.tsx` :

- Server Component (le wrapper de page)
- Vérifie auth (déjà fait par le middleware mais double check user.id)
- Render `<NouvelleCaptureForm />` (Client Component à créer)
- Container max-w-2xl mx-auto px-4 py-8
- Titre : "Logue ta prise"
- Sous-titre : "Toutes les conditions sont enregistrées automatiquement."

Crée `app/(app)/carnet/nouvelle/NouvelleCaptureForm.tsx` :
- 'use client'
- Utilise react-hook-form + @hookform/resolvers/zod
- Schéma : createCatchSchema (lib/catches/schema)
- État loading pendant le submit
- Toast success → router.push(`/carnet/${id}`)
- Toast error → garder le form rempli

Structure du form (single page, scroll, mobile-first) :

Section 1 — Quoi
- Espèce : grid 2 colonnes de boutons (Bar / Dorade royale / Lieu jaune / Maquereau / Sar / Orphie) avec icône lucide-react Fish + nom
- Sélection par tap, surlignée en --teal-500
- Champ requis

Section 2 — Combien
- Taille (cm) : slider 10-120 + input number en miroir
- Poids (kg) : input number optionnel
- Conservé / Relâché : toggle (default = Relâché si taille < taille légale, sinon Conservé)
- Affiche un badge rouge "Sous-taille" si la valeur est inférieure à la taille légale (utilise un objet const local pour l'instant : { bar: 36 (42 en Bretagne), dorade_royale: 25, lieu_jaune: 30, maquereau: 20, sar: 23, orphie: 0 } — on raffinera plus tard)

Section 3 — Comment
- Technique : segmented control 4 options (Leurres / Surfcasting / Flottante / Vif)
- Selon technique :
  - Si leurres : 2 inputs "Marque du leurre" + "Modèle"
  - Si surfcasting / vif : input "Appât" (texte libre + datalist suggestions)
  - Si flottante : input "Appât" + input "Profondeur (m)" (à ajouter en schema plus tard, optionnel)

Section 4 — Où
- Composant `<LocationPicker />` :
  - Bouton "Utiliser ma position GPS" (navigator.geolocation, gère la permission et l'erreur)
  - Affiche lat/lng en clair une fois récupérés
  - Bouton secondaire "Saisir manuellement" → 2 inputs lat/lng
  - Future : sélection depuis liste spots (sprint 5)

Section 5 — Quand
- DateTime picker (default = maintenant)
- Pas de manipulation user en général, mais utile si on logge une session de la veille

Section 6 — Photo
- Composant `<PhotoInput />` (créé en C.1)
- Optionnel

Section 7 — Notes & Confidentialité
- Textarea notes (max 1000 chars, compteur)
- Privacy : segmented 3 options (Privée / Amis / Publique)
- Si Privée : helper text "Visible par toi seul"
- Si Amis : "Visible par tes amis avec coords précises (si activé)"
- Si Publique : "Visible par la communauté avec coords floutées à 1 km"
- Toggle avancé "Coords précises pour mes amis" (default ON)
- Toggle avancé "Coords précises publiques" (default OFF) — WARNING en rouge si activé : "Tout le monde verra l'endroit exact de ta prise"

Footer du form :
- Bouton sticky bottom mobile (z-50, bg-ink-900, border-t)
- "Logguer la prise" (loading state)

⚠️ Le submit doit :
1. Vérifier que la photo (si présente) a été uploadée AVANT (appel uploadCatchPhoto), récupérer photo_path
2. Appeler createCatch({ ...formValues, photo_path })
3. Rediriger
```

**Définition of Done :** tu remplis le form de ton téléphone et tu logges une vraie prise (bar 45 cm, leurre BlackMinnow, Camaret-sur-Mer, photo). Tu vois la ligne dans Supabase Studio avec toutes les colonnes remplies, photo dans le bucket, conditions jsonb peuplé.

---

#### Tâche D.2 — Polish du form

**PROMPT POUR CLAUDE CODE :**

```
Améliorations sur NouvelleCaptureForm :

1. Persistance localStorage : si l'user remplit puis ferme accidentellement, on restaure le form (sauf la photo qui doit être re-sélectionnée). Clé : "carnet:draft-catch". Effacer après submit success.

2. Validation temps réel : afficher les erreurs Zod sous chaque champ dès qu'il a été touché (mode 'onTouched').

3. Bouton "Annuler" en haut à gauche → modal de confirmation si form modifié → router.back().

4. Optimistic UI : pendant le submit, désactiver le bouton et afficher "Sauvegarde..." pour 0.5s, puis "Conditions en cours d'enregistrement..." si la fetch Open-Meteo prend du temps.

5. Tracking analytics (à brancher quand PostHog sera installé sprint 4, mais préparer les events) :
   - posthog.capture('catch_log_started', { source: 'web' })
   - posthog.capture('catch_log_completed', { species, technique, hasPhoto })
   - posthog.capture('catch_log_abandoned', { lastFieldFocused })
```

**Définition of Done :** tu testes les 5 améliorations une par une.

---

### PHASE E — UI : Liste & filtres (Jours 6-7)

#### Tâche E.1 — Page `/carnet` (liste)

**PROMPT POUR CLAUDE CODE :**

```
Crée `app/(app)/carnet/page.tsx` :

Server Component qui :

1. Lit les searchParams pour les filtres (species, technique, dateFrom, dateTo, page).
2. Appelle `getMyCatches(filters)` et `getMyCatchStats()` en parallèle (Promise.all).
3. Render le layout :

   ┌─────────────────────────────────────────┐
   │  [stats cards en haut]                  │
   │                                         │
   │  [filtres barre — composant client]     │
   │                                         │
   │  [grid des catches]                     │
   │                                         │
   │  [pagination]                           │
   └─────────────────────────────────────────┘

   FAB sticky bottom-right : "+" → /carnet/nouvelle

4. `<CatchStatsRow />` : 4 cards horizontales
   - Total prises (totalCount)
   - Ce mois (thisMonthCount) avec badge variation vs mois -1 (peut être à raffiner plus tard)
   - Plus gros poisson (species + size_cm)
   - Taux de relâche (releasedRate %)

5. `<CatchFiltersBar />` (Client Component) :
   - Espèces : multi-select chips
   - Technique : multi-select chips
   - Période : preset (7j, 30j, 3 mois, année, tout) + custom
   - Bouton "Réinitialiser"
   - Mise à jour via router.replace(url avec query string)

6. `<CatchGrid catches={catches} />` :
   - Grid responsive : 1 col mobile, 2 cols tablet, 3 cols desktop
   - Chaque carte = `<CatchCard catch={c} />` :
     - Photo (signed URL via getPhotoSignedUrl, ou placeholder lucide Fish)
     - Espèce en gras
     - Taille / poids
     - Date relative (date-fns formatDistanceToNow)
     - Lieu (ville approchée via reverse geocoding ? ou département depuis lat/lng ? — pour sprint 3, juste afficher la lat/lng arrondie 2 décimales ou "Spot privé" selon le mode)
     - Badge privacy (cadenas pour Private, deux silhouettes pour Friends, globe pour Public)
     - Click → /carnet/[id]

7. État vide :
   - Si aucune prise jamais : illustration + "Logue ta première prise" + CTA gros bouton
   - Si filtres trop restrictifs : "Aucune prise ne correspond" + bouton "Réinitialiser"

8. Pagination : boutons Prev / Next en bas, ou bien "Charger plus" si tu préfères infinite scroll (à toi de choisir, infinite scroll est plus naturel mobile).
```

**Définition of Done :** tu vois tes 3-5 prises de test en grille, tu peux filtrer par espèce, tu vois les stats correctes, tu cliques sur une carte → navigation vers le détail (page suivante).

---

### PHASE F — UI : Détail & édition (Jour 8)

#### Tâche F.1 — Page `/carnet/[id]`

**PROMPT POUR CLAUDE CODE :**

```
Crée `app/(app)/carnet/[id]/page.tsx` :

Server Component :

1. params.id → appel getCatchById(id)
2. Si null → notFound() (renvoie vers app/not-found.tsx existant)
3. Layout :

   ┌────────────────────────────────────┐
   │  ← Retour  ·  [Modifier] [···]    │
   │                                    │
   │  [photo grande largeur — clic = zoom]
   │                                    │
   │  Espèce — Taille cm                │
   │  Date + lieu                       │
   │                                    │
   │  Section "Comment"                 │
   │  - Technique                       │
   │  - Leurre/appât                    │
   │  - Relâchée / conservée            │
   │                                    │
   │  Section "Conditions" (badge "Auto enregistré")
   │  - Vent, vague, marée, météo en grille
   │  - Si tide_state présent, l'afficher avec icône
   │                                    │
   │  Section "Notes" si présentes      │
   │                                    │
   │  Section "Confidentialité"         │
   │  - Affiche le mode actuel + qui voit quoi
   │                                    │
   │  [Mini carte statique avec un pin]
   │  - Pour sprint 3 : juste une image
   │    style "Spot privé — coords masquées" pour soi-même
   │  - Vraie carte interactive en sprint 5
   └────────────────────────────────────┘

4. Bouton "···" → DropdownMenu (shadcn) :
   - Modifier (lien vers /carnet/[id]/modifier — Phase F.2)
   - Partager (lien copy → toast — pour plus tard une URL publique si privacy=public)
   - Supprimer → AlertDialog confirmation → appel deleteCatch → router.push('/carnet')
```

**Définition of Done :** tu cliques sur une carte du carnet, tu vois tout le détail propre et lisible, tu peux supprimer la prise avec confirmation.

---

#### Tâche F.2 — Page `/carnet/[id]/modifier`

**PROMPT POUR CLAUDE CODE :**

```
Crée `app/(app)/carnet/[id]/modifier/page.tsx` :

Réutilise le composant NouvelleCaptureForm mais :

1. Wrappe-le dans `ModifierCaptureForm` qui :
   - Charge la prise existante via getCatchById en Server Component parent
   - Passe defaultValues au form
   - Le submit appelle updateCatch au lieu de createCatch
   - Pas de localStorage draft persistance (c'est de l'édition)
   - Bouton "Annuler" → router.back()

2. Photo : si l'user veut changer la photo, ancien path supprimé du storage après update success.

3. Si la position change, les conditions sont recalculées côté server action.

Refactor NouvelleCaptureForm en `CatchForm` qui accepte une prop `mode: 'create' | 'edit'` et `initialValues?: CatchRow`. Préfère cette refacto plutôt qu'une copie complète du form.
```

**Définition of Done :** tu modifies une prise existante (changes la taille), tu cliques Enregistrer, tu reviens sur le détail, la valeur est à jour.

---

### PHASE G — Stats détaillées (Jour 9)

#### Tâche G.1 — Section stats étendue

**PROMPT POUR CLAUDE CODE :**

```
Sur /carnet, ajoute une section "Mes stats" repliable (par défaut fermée sur mobile, ouverte sur desktop) :

1. Pour la rendre rapide à charger, crée une nouvelle RPC dans migration 008_catch_extended_stats.sql :

create or replace function public.get_my_catches_breakdown(uid uuid default auth.uid())
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'bySpecies', (
      select jsonb_agg(jsonb_build_object('species', species, 'count', cnt, 'avgSize', avg_size))
      from (
        select species, count(*) as cnt, round(avg(size_cm)::numeric, 1) as avg_size
        from catches where user_id = uid
        group by species
        order by cnt desc
      ) s
    ),
    'byTechnique', (
      select jsonb_agg(jsonb_build_object('technique', technique, 'count', cnt))
      from (
        select technique, count(*) as cnt
        from catches where user_id = uid
        group by technique
        order by cnt desc
      ) t
    ),
    'byMonth', (
      select jsonb_agg(jsonb_build_object('month', month, 'count', cnt) order by month)
      from (
        select to_char(date_trunc('month', caught_at), 'YYYY-MM') as month, count(*) as cnt
        from catches where user_id = uid
        and caught_at >= (now() - interval '12 months')
        group by 1
      ) m
    )
  );
$$;

revoke all on function public.get_my_catches_breakdown from public;
grant execute on function public.get_my_catches_breakdown to authenticated;

2. Ajoute `getMyCatchesBreakdown()` dans `lib/catches/queries.ts`.

3. Composant `<CatchStatsDetailed />` (Client Component pour la chart, sans lib lourde) :
   - Onglets : Espèces / Techniques / Mois
   - Affichage simple : barres horizontales en CSS (largeur = count / max * 100%), pas de lib graph en sprint 3
   - Sur "Mois", affiche les 12 derniers mois avec 0 si pas de prise

On ajoutera de vraies charts (Recharts) en sprint 12 polish.
```

**Définition of Done :** depuis /carnet tu ouvres la section stats détaillées et tu vois ton breakdown.

---

### PHASE H — Polish & QA (Jour 10)

#### Tâche H.1 — États de chargement + erreurs

**PROMPT POUR CLAUDE CODE :**

```
1. Crée `app/(app)/carnet/loading.tsx` :
   - Skeleton de stats cards (4 boxes grises pulse)
   - Skeleton de grid (6 boxes grises)

2. Crée `app/(app)/carnet/[id]/loading.tsx` :
   - Skeleton détail (photo grise + lignes)

3. Crée `app/(app)/carnet/error.tsx` :
   - Reuse `app/error.tsx` existant mais adapté au contexte carnet
   - Bouton "Retour au carnet" → /carnet
   - Log l'erreur dans console + futur Sentry

4. Sur tous les boutons "Logguer", "Enregistrer", "Supprimer" : disabled state + spinner pendant l'opération.

5. Gestion 401 / session expirée : si une server action retourne "not authenticated", redirect /auth/login?next=/carnet
```

**Définition of Done :** tu navigues rapidement entre /carnet et /carnet/[id], les skeletons s'affichent brièvement, aucune page blanche.

---

#### Tâche H.2 — QA grandeur nature

**PROMPT POUR CLAUDE CODE :**

```
Vérifie sur 3 viewports (375 mobile, 768 tablet, 1280 desktop) :

1. /carnet/nouvelle :
   - Form scrollable sans saut de layout
   - Sticky bottom CTA visible toujours
   - Caméra mobile s'ouvre au tap photo
   - GPS demande la permission proprement

2. /carnet :
   - Filtres pas cassés en mobile
   - Grid passe bien à 1 col

3. /carnet/[id] :
   - Photo bien dimensionnée
   - Sections lisibles

4. /carnet/[id]/modifier :
   - Form pré-rempli correctement
   - Pas de doublon de log en cas de submit rapide

Check `pnpm build` + `pnpm typecheck` + `pnpm lint` → tous verts.

Check Supabase Studio :
- Vérifie les RLS policies sur catches (toujours actives, jamais désactivées)
- Vérifie que geom_public est toujours flouté (jamais égal à geom)
- Vérifie que les photos dans storage/catches/ sont dans des dossiers <user_id>/

Push sur main → Vercel deploy → smoke test sur prod : logge une vraie prise depuis ton téléphone à un endroit réel.
```

**Définition of Done :** John peut logger une vraie prise en pleine session de pêche depuis son téléphone, retrouver l'historique avec photos et conditions exactes, modifier et supprimer.

---

## ✅ Definition of Done globale du sprint 3

- [ ] Migrations 006, 007, 008 appliquées, types TS régénérés.
- [ ] Bucket Storage `catches` créé avec policies.
- [ ] `/carnet/nouvelle` permet de logger une prise complète (form + photo + GPS + conditions auto).
- [ ] `/carnet` affiche la liste filtrée avec stats résumées.
- [ ] `/carnet/[id]` affiche le détail.
- [ ] `/carnet/[id]/modifier` permet l'édition.
- [ ] Suppression fonctionne (DB + photo storage).
- [ ] Privacy 3 niveaux respectée (private / friends / public), avec floutage GPS confirmé en DB.
- [ ] Conditions Open-Meteo capturées au moment du log.
- [ ] Smoke test grandeur nature en mobile + 4G validé par John.
- [ ] `pnpm build`, `typecheck`, `lint` verts.
- [ ] Vercel deploy OK, aucune régression sur Sprint 1 et 2.

---

## 📦 Fichiers à créer (récap)

```
supabase/migrations/
├── 006_catches_storage_extension.sql
├── 007_catch_stats_rpc.sql
└── 008_catch_extended_stats.sql

scripts/
└── check-apis.ts

lib/
├── catches/
│   ├── schema.ts
│   ├── queries.ts
│   ├── actions.ts
│   └── schema.test.ts
├── conditions/
│   ├── openmeteo.ts
│   └── openmeteo.test.ts
└── storage/
    └── image-resize.ts

components/
└── forms/
    └── PhotoInput.tsx

app/(app)/carnet/
├── page.tsx
├── loading.tsx
├── error.tsx
├── nouvelle/
│   ├── page.tsx
│   └── CatchForm.tsx          (renommé depuis NouvelleCaptureForm)
└── [id]/
    ├── page.tsx
    ├── loading.tsx
    └── modifier/
        └── page.tsx

components/carnet/
├── CatchStatsRow.tsx
├── CatchStatsDetailed.tsx
├── CatchFiltersBar.tsx
├── CatchGrid.tsx
├── CatchCard.tsx
└── LocationPicker.tsx

docs/
└── APIS-DECISION.md           (créé en A.1)
```

---

## 🚦 Workflow conseillé

1. **1 phase = 1 branche** : `feat/sprint3-phase-a`, `feat/sprint3-phase-b`, etc. Tu merges sur main après QA visuel.
2. **Commits atomiques** : 1 tâche = 1 ou 2 commits.
3. **Smoke test après chaque phase** : ouvre /carnet/nouvelle en preview Vercel, fais un test à blanc.
4. **Ne saute jamais la validation A.1** : si on découvre en phase E que les marées ne sont pas dispo, tu remangeras 3 phases.
5. **Logue tes vraies prises au fur et à mesure** : dès la fin de phase D, mets en prod et utilise toi-même. C'est le meilleur QA possible.
6. **Tag la release** : `git tag v0.3.0` à la fin.

---

## 💡 Anti-pièges classiques

- **Ne JAMAIS lire `catches` directement.** Utilise toujours `catches_for_viewer`. Sinon tu leak les geom précis dans le DOM, et c'est une vraie faille produit.
- **Ne JAMAIS oublier le redimensionnement client de la photo.** Si tu envoies 8MB depuis un téléphone 4G, l'upload dure 30s et l'user abandonne.
- **Ne JAMAIS bloquer le log sur la fetch des conditions.** Si Open-Meteo est down, la prise se logge quand même (conditions=null). On enrichit plus tard via une Edge Function de réconciliation si besoin.
- **Ne JAMAIS attendre une lat/lng exacte pour autoriser le log.** L'utilisateur peut être dans un coin sans signal GPS. `location_method='manual'` ou même `null` autorisés en fallback.
- **Ne mets pas la map MapLibre maintenant.** C'est tentant pour la fiche détail. Résiste. Sprint 5.
- **Ne fais pas tes propres charts.** Pour les stats sprint 3, des barres horizontales CSS suffisent. Recharts viendra en sprint 12.

---

## 📈 Après le sprint 3

- **Sprint 4 (1 semaine)** : Stripe Subscriptions + paywall sur les features carte (sprint 5) et stats avancées.
- **Sprint 5 (3 semaines)** : Carte MapLibre v1 — où le scoring 0-100 calculé sur tes propres logs commence à briller.
- **Recommandation** : entre sprint 3 et sprint 4, **logge tes vraies sessions pendant 1-2 semaines**. C'est l'occasion de détecter les frictions UX réelles (clavier qui couvre le bouton submit, lat/lng moisies en 4G, photo trop lourde, etc.) que tu n'aurais jamais vues en testing à la maison.

---

*Dernière mise à jour : mai 2026. Préparé par Claude pour John, à exécuter dans l'ordre avec Claude Code.*
