# Sprint 72 — Bloc 0 : Ancrage (WS A, lecture seule)

> Rédigé le 2026-07-02 depuis le code de la branche `sprint-72` + SQL live prod (lecture seule).
> Pilote les WS B (migration 106), C2 (moteur), D (UX), E (email).

## TL;DR décisions tranchées ici

1. **Étendre vs créer** : on n'étend PAS `personal-window` (07:00 UTC, calcule AUJOURD'HUI) : incompatible avec la décision verrouillée « ~17h Paris pour le LENDEMAIN ». On **greffe le moteur d'alerte dans `recfishing-reminders`** (17:00 UTC = 18h/19h Paris, créneau du soir, qui héberge DÉJÀ un greffon « la veille » avec `parisTomorrowBoundsUtc`). Zéro 5e cron (contrainte projet répétée S40/49/50/63/67). Détail §1.
2. **« coef ≥ 90 » du brief est INEXÉCUTABLE tel quel** : AUCUN coefficient de marée n'existe dans le code, par invariant délibéré (« marnage réel, jamais de coef inventé », S49). L'équivalent honnête existant = `getBigTideForDay` (marnage mesuré + seuils façade : Manche > 9 m, Atlantique > 5 m, Méditerranée jamais). Cold start = cette détection, adaptée à DEMAIN, copy en mètres. Détail §5b. ⚠️ La copy d'exemple du brief (« coef 92 ») ne peut pas être produite sans données SHOM (hors périmètre).
3. **Réglages** : table dédiée **`alert_settings`** (pas des colonnes `profiles`) : point d'entrée du batch (`where alerts_enabled = true` → on ne scanne QUE les opt-in), CHECK sur le seuil, RLS own-only. DDL esquissé §3.
4. **Max 1 alerte/user/jour** : `unique(user_id, spot_id, window_date)` seul autorise N alertes pour N favoris → le moteur doit choisir LE meilleur spot (score max ≥ seuil) et n'envoyer qu'UNE alerte. Détail §1d.
5. **Type de notif in-app** : le CHECK `notifications_type_check` est une liste fermée → la migration 106 doit ajouter `'spot_alert'` en répétant la **liste complète** (pattern anti-régression S49). `target_type='spot'` + `target_id=<spot uuid>` sont déjà permis. Détail §3c.
6. **PostHog cron** : `lib/analytics-server.ts` (posthog-node, `captureServer` + `flush()` en fin de route). `alert_clicked` : UTM sur les liens + pageview client existant (limite : consentement requis). Détail §8.

---

## 1. Le cron `/api/crons/personal-window` + paysage cron complet

### 1a. Les 4 crons (`vercel.json`, horaires UTC)

```json
{ "path": "/api/crons/compute-spot-scores",  "schedule": "0 5 * * *" },
{ "path": "/api/crons/personal-window",      "schedule": "0 7 * * *" },
{ "path": "/api/crons/dunning-relances",     "schedule": "0 9 * * *" },
{ "path": "/api/crons/recfishing-reminders", "schedule": "0 17 * * *" }
```

Contrainte projet documentée et répétée (brief S49 : « 4 crons sur Vercel Hobby, AUCUN slot libre ») : **on ne crée pas de 5e cron**, on greffe (modèle : co-pêchage S40 greffé dans recfishing, big-tide/closure/digest S49 + streak S63 + archive_season S67 greffés dans personal-window).

Tous les crons : auth `Bearer ${CRON_SECRET}`, `createAdminClient()` (service-role), `export const maxDuration = 60`, runtime Node implicite (web-push + service-role ont besoin du crypto Node), fail-soft par greffon (try/catch isolé, best-effort strict), Sentry en échec global.

### 1b. Anatomie de `personal-window` (07:00 UTC, ~610 lignes)

Ordre exact des sections (`app/api/crons/personal-window/route.ts`) :

1. **Greffon archive_season S67** (l.55-69) : `admin.rpc('archive_season', { p_offset: -1 })` + `emitSeasonRecapNotifications` : idempotent, best-effort, HORS boucle user.
2. **Sélection candidats** (l.75-79) : `profiles.select('id, home_department, favorite_species, notification_prefs').not('home_department','is',null)` : UNE requête, puis boucle `for` par profil.
3. Par user, dans l'ordre : greffon **big-tide** S49 (tous tiers, AVANT le gate) → greffon **species_closure** S49 → greffon **weekly_digest** S49 (lundi ISO seulement) → greffon **streak_danger** S63 (dimanche ISO seulement) → puis la notif **optimal_window** S26 :
   - gate tier : `admin.rpc('current_tier', { uid })`, ne continue que `local`/`itinerant` (1 appel RPC par user, dans la boucle) ;
   - idempotence/jour : count `notifications` `type='optimal_window'` entre `parisDayBoundsUtc(todayParis)` (la notif elle-même est le marqueur de dédup, pas de table dédiée) ;
   - tendances : `admin.from('catches').select('species, spot_id, caught_at, wind_speed_kmh, tide_state, conditions').eq('user_id', userId).limit(2000)` → `toCatchSamples` → `computePersonalTendencies` → skip si `!hasEnough` ;
   - créneau du jour : `getDeptNextWindow(dept)` (point côtier du DÉPARTEMENT, pas un spot) ;
   - match : `matchPersonalWindow(tendencies, { startTimeISO, endTimeISO, score })` → `{ shouldNotify, previewText }` ;
   - envoi : INSERT direct `notifications` (`type:'optimal_window'`, `target_type:'spot'`, `preview_text` ≤ 140, service_role, sans `actor_id`) puis push best-effort `sendPushToUser` gaté par `isNotificationPrefEnabled(prefs,'optimal_window')`.
4. Réponse JSON : compteurs `{ notified, skipped, bigTides, closures, digests, streakDangers, seasonRecaps }`.

**Canaux actuels d'optimal_window : in-app + push web. PAS d'email.** Cadence 1/jour. Source de score = solunar générique (`FishingWindow.score`), le perso ne sert qu'au MATCH + à la copy (descriptive, contrainte 7.5 : jamais prédictive).

Helpers TZ locaux au fichier (à répliquer ou factoriser, ils ne sont PAS exportés) : `parisDateKey(d)`, `parisDayBoundsUtc(dateKey)`, `parisIsWeekday(d, iso)`.

### 1c. DÉCISION : étendre quoi, où ?

- **Étendre `personal-window`** : NON. Il tourne à 07:00 UTC (08h Paris hiver / 09h été) et raisonne sur AUJOURD'HUI. La décision verrouillée du brief = calcul ~17h Paris pour le LENDEMAIN. Déplacer son schedule casserait optimal_window/big_tide/streak_danger (tous calibrés « matin, aujourd'hui », le timing matinal du streak est même documenté S63). Incompatibilité franche → documentée ici comme le brief l'exige.
- **Créer un 5e cron** : NON par défaut (contrainte Hobby projet ; le brief demande de ne pas dupliquer le moteur).
- ✅ **RECO FERME : greffer `runSpotAlerts(admin)` dans `recfishing-reminders`** (17:00 UTC), APRÈS le bloc co-pêchage, en best-effort strict (même modèle que `runOutingReminders`, `route.ts:66-80`). Arguments :
  - créneau du soir déjà en place ; 17:00 UTC = **18h Paris hiver / 19h été** : « la veille au soir », dans la fenêtre autorisée 7h-21h Paris ;
  - ce cron contient DÉJÀ la logique « demain » : `parisTomorrowBoundsUtc(now)` (l.232-253) + `parisDateKey` : réutilisables tels quels ;
  - `sendPushToUser` y est déjà importé ; la route est légère aujourd'hui (recfishing + outings, quelques users) → budget disponible sous `maxDuration = 60` ;
  - anti-régression : `personal-window` n'est PAS touché (le critère VERIF « optimal_window S26 toujours fonctionnelle » devient trivial).
  - Variante si John veut ~17h Paris pile : décaler ce cron à `0 15 * * *` (16h hiver / 17h été). Sans risque (le rappel RecFishing en amont reste « sous 24 h », le rappel sortie de demain arrive plus tôt = mieux). Par défaut on garde `0 17` (zéro diff `vercel.json`).

### 1d. Budget + règles moteur pour C2

- Entrée batch recommandée : `alert_settings where alerts_enabled = true` (cf §3) JOIN implicite favoris → on ne touche JAMAIS les users non opt-in. `current_tier` : 1 RPC par user opt-in (pattern existant), APRÈS le filtre opt-in (population minuscule au lancement).
- Prévisions par spot favori : `fetchSpotForecastWeek(lat, lng)` est `unstable_cache` 1h keyé (lat,lng) → 2 fetchs Open-Meteo par POINT unique, mutualisés entre users. La semaine contient DEMAIN (jours J..J+6, cf §5). Dédupliquer par spot_id AVANT de fetcher.
- **1 alerte/user/jour max** : choisir le meilleur (spot, fenêtre de demain) au-dessus du seuil, envoyer UNE alerte, écrire UNE ligne `alerts_sent`. La contrainte `unique(user_id, spot_id, window_date)` déduplique le re-run, PAS le multi-spot : c'est la logique moteur qui garantit le « max 1/jour ».
- Écrire `alerts_sent` **après le 1er canal réussi** (in-app compte comme canal) : pas d'alerte fantôme.
- Interdiction 21h-7h Paris : garde-fou en tête de greffon (si l'heure Paris du run est hors [7,21), no-op + log). Protège contre un run manuel nocturne.

## 2. Tendances perso S22 (`lib/scoring/personal/`)

⚠️ Gotcha S22 : le barrel `lib/scoring/personal/index.ts` mélange client/serveur : importer les MODULES précis (comme le cron le fait), pas le barrel, côté serveur.

Signatures exactes :

```ts
// buckets.ts
export type DbCatchRow = { species?: string|null; spot_id?: string|null; caught_at: string;
  wind_speed_kmh?: number|null; tide_state?: string|null; conditions?: unknown;
  gear_label?: string|null; lure_model?: string|null; lure_brand?: string|null }
export function toCatchSamples(rows: DbCatchRow[]): CatchSample[]   // filtre out_of_coverage, TZ Europe/Paris

// tendencies.ts
export function computePersonalTendencies(samples: CatchSample[], scope: TendencyScope = {}): PersonalTendencies
// scope = { species?, spotId? }  ← segmentable PAR SPOT : parfait pour la justification par favori

// types.ts
export type Tendency = { factor: 'hour'|'weekday'|'season'|'wind'|'tide'|'gear';
  label: string|null;      // ex. « le matin », « en marée descendante » (TIDE_LABELS/HOUR_LABELS de config.ts)
  count: number; sampleCount: number; share: number;  // count/sampleCount 0-1 → « 6 de tes 7 prises »
  confidence: 'low'|'medium'|'high'; hasData: boolean }
export type PersonalTendencies = { species: string|null; spotId: string|null; sampleCount: number;
  confidence: Confidence; tendencies: Tendency[];   // triées par share décroissante
  hasEnough: boolean; minToUnlock: number }

// config.ts — SEUILS
PERSONAL_CONFIG = { MIN_FOR_TENDENCIES: 3, MIN_PER_FACTOR: 2 }
confidence(count): count < 5 → 'low' ; 5-20 → 'medium' ; > 20 → 'high'

// window-match.ts (PUR, testé) — le modèle du match S26
export const MIN_WINDOW_SCORE = 60
export function matchPersonalWindow(t: PersonalTendencies, w: { startTimeISO; endTimeISO; score }): { shouldNotify: boolean; previewText: string|null }
export function windowHourBucket(startTimeISO: string): HourBucket
export function windowTimeRange(startISO, endISO): string   // « vers 17h-19h »
```

**Critère cold-start recommandé pour C2** : voie perso si `computePersonalTendencies(samples, { spotId })` (périmètre SPOT favori) a `hasEnough === true` (≥ 3 prises sur CE spot) ; sinon retenter sans scope (global user, modèle S26) ; sinon **générique**. La justification « 6 fois sur 7 » = `Tendency.count`/`sampleCount` du facteur dominant : DESCRIPTIF (contrainte 7.5 gravée : jamais « tu prendras », jamais un % prédictif inventé). Le « score » du payload = le score de fenêtre générique 0-100 (§5), PAS un pourcentage perso.

## 3. Préférences de notification existantes → où brancher les réglages

### 3a. Existant

- **Push par type (S49)** : `profiles.notification_prefs` jsonb NOT NULL DEFAULT '{}' (migration 086). Convention : clé absente = activé ; opt-out explicite = `false`. Clés dans `NOTIFICATION_PREF_KEYS` (`lib/notifications/prefs-meta.ts`) : optimal_window, big_tide, followed_catch, species_closure, weekly_digest, nearby_outing, progress, streak_reminder, ranking. Helper partagé émetteurs/UI : `isNotificationPrefEnabled(prefs, key)`. Lecture/écriture : server actions `getNotificationPrefs()` / `setNotificationPref(type, enabled)` (`app/actions/notification-prefs.ts`, scopé auth.uid, merge de clé, `revalidatePath('/notifications')`).
- **UI** : `app/(app)/notifications/page.tsx` section « Réglages » = `<PushSettingsToggle />` (master switch device) + `<NotificationTypeToggles prefs tier />` → c'est LÀ que le WS D ajoute le bloc alertes.
- **Email opt-out global (S26, migration 054)** : `profiles.marketing_email_optin` boolean NOT NULL DEFAULT true + `profiles.email_unsub_token` uuid NOT NULL DEFAULT gen_random_uuid(). Respecté par `getEmailRecipient(userId, { marketing: true })` → null si opt-out. Page de désinscription : `/unsubscribe?token=<email_unsub_token>` (`app/(marketing)/unsubscribe/`).

### 3b. RECO FERME pour WS B : table dédiée `alert_settings` (pas des colonnes profiles, pas le jsonb)

Pourquoi : (1) le batch démarre par `select ... from alert_settings where alerts_enabled = true` → seuls les opt-in sont scannés (opt-in default OFF = table quasi vide au début, requête triviale) ; (2) `alert_threshold` veut un CHECK typé (le jsonb n'en a pas) ; (3) `profiles` est déjà très large. DDL esquissé (à ajuster par B) :

```sql
create table public.alert_settings (
  user_id         uuid     primary key references auth.users(id) on delete cascade,
  alerts_enabled  boolean  not null default false,
  channel_push    boolean  not null default true,
  channel_email   boolean  not null default true,
  alert_threshold smallint not null default 70 check (alert_threshold between 50 and 90),
  updated_at      timestamptz not null default now()
);
alter table public.alert_settings enable row level security;
-- CRUD own-only (modèle push_subscriptions 065) : select/insert/update/delete to authenticated
--   using/with check (user_id = (select auth.uid())). Le cron lit en service-role (bypass).
```

`favorite_spots` : FK `spot_id → public.spots(id) on delete cascade` (favoris orphelins auto-purgés si spot supprimé, cf passe adversariale VERIF), cap 10 via trigger BEFORE INSERT (modèle `feed_post_photos_enforce_limit`). `alerts_sent` : RLS select own, **zéro policy d'écriture** (le service-role bypass la RLS : pattern `weather_cache`/`notifications` insert). Cascade RGPD : les 3 FKs `on delete cascade` vers auth.users suffisent (`delete_my_account` supprime auth.users en bout de chaîne).

### 3c. CHECK `notifications` à étendre (migration 106, WS B)

Constat live prod : `notifications_type_check` = liste FERMÉE de 28 types (new_follower … season_recap). **Ajouter `'spot_alert'` impose de re-poser le CHECK avec la liste complète répétée** (pattern S49/S63/S67, « liste COMPLÈTE = anti-régression »). `notifications_target_type_check` autorise déjà `'spot'` → la notif in-app peut porter `target_type:'spot', target_id:<spot uuid>`. `preview_text` ≤ 140 (CHECK).

## 4. Infra push web (S39)

- **Table `push_subscriptions`** (migration 065) : id, user_id FK cascade, endpoint UNIQUE, p256dh, auth, ua, created_at. RLS owner-only complet. Écrivains : `app/api/push/subscribe/route.ts` (POST authentifié, zod, upsert onConflict endpoint) et `app/api/push/unsubscribe/route.ts`.
- **Helper d'envoi** : `lib/push/send.ts` → `sendPushToUser(admin: SupabaseClient, userId: string, payload: { title, body, url }): Promise<{ sent: number, pruned: number }>`. Ne throw JAMAIS ; **no-op propre sans clés VAPID** (`env.VAPID_PRIVATE_KEY`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_SUBJECT`) ; envoie à TOUS les devices du user ; **purge automatique des abonnements morts 404/410** (delete par endpoint). Import dynamique de `web-push` (crypto Node, jamais dans un bundle client). Warning `url.parse` DEP0169 dans les logs = web-push@3.6.7, connu, pas de fix dispo (S70).
- Pour C2 : « subscription push morte → email passe quand même » = déjà couvert par construction (`sent: 0` n'est pas une erreur ; enchaîner l'email indépendamment du résultat push).

## 5. Chaîne marée/météo « demain » + score de fenêtre décomposé

### 5a. Le pipeline (réutilisable TEL QUEL)

```ts
// lib/conditions/spot-forecast.ts
export const fetchSpotForecastWeek = unstable_cache(_fetchSpotForecastWeek, ['spot-forecast-week'], { revalidate: 3600 })
// (lat, lng) => Promise<SpotConditions[]>  — 7 jours à partir d'AUJOURD'HUI (Paris) → DEMAIN = l'élément dont .date === parisDateKey(J+1)
// SpotConditions = { date, tide: { points, extrema, current_height_m }, weather: { ..., wind_speed_by_hour }, waves, swell }
// Persistance weather_cache : clé `forecast_{lat.toFixed(1)}_{lng.toFixed(1)}_{date}`, lecture session, ÉCRITURE service-role (045).

// lib/solunar/index.ts
export async function computeWeeklyForecast(startDate: Date, lat: number, lng: number, conditions: SpotConditions[]): Promise<DailyForecast[]>
// DailyForecast = { date, windows: FishingWindow[], dayScore, dayQuality, sunrise, sunset, ... }

// lib/solunar/types.ts — LE score de fenêtre décomposé existe DÉJÀ :
// FishingWindow = { startTimeISO, endTimeISO, startLocal, endLocal, centerEvent, score /*0-100*/,
//   quality, factors: { solunar, tide, wind, reasons: string[], weights, marnageM, tideNonDiscriminating } }
// Poids : solunar 0.40 / marée 0.35 / vent 0.25, renormalisés en Méditerranée (marnage < 0.3 m).
// factors.reasons = justifications FR déjà rédigées. QUALITY_THRESHOLDS: bonne=60, tres_bonne=80.

// lib/conditions/dept-window.ts (modèle d'orchestration, par DÉPARTEMENT)
export async function getDeptNextWindow(dept: string): Promise<FishingWindow | null>
export async function getDeptUpcomingWindows(dept: string, count = 3): Promise<FishingWindow[]>
```

Pour C2 « fenêtres de DEMAIN par SPOT favori » : même orchestration que `getDeptNextWindow` mais aux coords DU SPOT, puis filtrer `daily` sur `date === <demain Paris>` (ou les `windows` dont `startTimeISO` tombe dans `parisTomorrowBoundsUtc`). **PAS de nouveau scoring** : `FishingWindow.score` = le score de fenêtre 0-100 du contrat, `factors.reasons` + tendances perso (§2) = la justification.

**Coords des spots en service-role** : `spots.geom` est verrouillée colonne (028b) pour anon/authenticated ; le pattern service-role existant = RPC `get_spots_for_scoring()` → `TABLE(id uuid, lng float8, lat float8)` (curated+community, scope 071). Options C2 : appeler cette RPC 1× par run et mapper par spot_id (spots OSM favoris non couverts → skip honnête), OU (mieux) WS B ajoute en 106 une RPC definer service-only `get_favorite_spot_coords()` → (user_id, spot_id, name, slug, lat, lng) limitée aux spots ayant ≥ 1 favori. À trancher par B/C2 ; la 2e évite le N+1 et couvre tous les favoris.

**Marées calées** : `tide_calibration` (062/064) vit en prod avec 5 ports (Brest résiduel 1 min, Saint-Malo 3, Arcachon 4, Sables 5, Pornichet 8 ; vérifié SQL live). `getTideCalibration(department)` → `{ offsetMinutes = -bias_min, residualMin, ... }` (`lib/conditions/tide-calibration.ts`). Les heures PM/BM affichées dans une copy d'alerte doivent appliquer cet offset (pattern fiche spot) ; Méditerranée = null (pas d'offset, pas de chiffre inventé).

### 5b. ⚠️ « Coefficient » : IL N'Y EN A PAS (et c'est un invariant)

Constat (grep exhaustif lib/) : aucun coefficient de marée n'est calculé nulle part. `lib/conditions/tide.ts` : « Aucune valeur de coefficient inventée : le "marnage" est l'amplitude mesurée. » `lib/notifications/big-tide.ts` : « JAMAIS de coefficient inventé : on ne fabrique pas de "coef 95", on mesure une amplitude en mètres » (invariant re-gravé au RECAP S49). L'existant honnête :

```ts
// lib/notifications/big-tide.ts
export async function getBigTideForDay(dept: string): Promise<{ rangeM, thresholdM, facade } | null>
// Seuils John (D2) : Manche > 9 m, Atlantique > 5 m, Méditerranée JAMAIS. Lit week[0] = AUJOURD'HUI.
export function tideRangeFromExtrema(extrema): number | null   // PUR : max(PM) - min(BM)
```

**RECO FERME cold start** : critère générique = la même détection sur **week[demain]** (soit paramétrer `getBigTideForDay(dept, dayIndex)`, soit une fonction sœur pure réutilisant `tideRangeFromExtrema` sur les extrema de demain du spot). Copy générique labellisée : « Alerte générique : grande marée demain à [spot], marnage de X,X m. Logue tes prises pour la personnaliser. » **Jamais « coef 92 » dans une copy** tant qu'on n'a pas de source SHOM (à mentionner à John : si le mot « coefficient » doit apparaître, c'est un chantier données, pas ce sprint).

## 6. Baseline advisors (2026-07-02, AVANT sprint 72)

**Security (98 lints, PRÉ-existants, ne pas les imputer au S72)** :
- ERROR ×3 : `rls_disabled_in_public` (spatial_ref_sys, PostGIS système) ; `security_definer_view` ×2 (`catches_for_viewer`, `spots_for_viewer` : ASSUMÉES, cf migration 047 §3).
- WARN : `anon_security_definer_function_executable` ×37 ; `authenticated_security_definer_function_executable` ×50 ; `extension_in_public` ×3 (citext, postgis, pg_trgm) ; `function_search_path_mutable` ×3 (set_updated_at, set_updated_at_metadata, check_rate_limit) ; `auth_leaked_password_protection` ×1 (décision John : assumé, plan Free).
- INFO ×1 : `rls_enabled_no_policy` sur `season_results` (VOULU, verrou S67 103c). NB : `alerts_sent` déclenchera le même INFO si B ne pose qu'une policy select : avec la policy « select own » prévue, pas de nouveau lint.

**Performance : INDISPONIBLE le 2026-07-02** : l'endpoint advisors performance renvoie une erreur plateforme Supabase (« syntax error at or near 'storage.buckets' », reproduite 2×). La revue VERIF devra re-tenter ; à défaut, comparer les index FK à la main (les FKs de 106 : indexer `favorite_spots.spot_id` (le brief l'exige) + `alerts_sent.spot_id`).

**Historique migrations** : `list_migrations` s'arrête à `105b_xp_integrity_db_enforcement` (20260702104000). **106 est libre.** Tables confirmées ABSENTES en prod : `favorite_spots`, `alerts_sent`, `alert_settings`. Présentes : `push_subscriptions`, `notifications`, `tide_calibration`, `weather_cache`.

## 7. Emails existants (pour WS E)

- **Transport** : `lib/email/send.ts` → `sendEmail({ to, subject, react }): Promise<{ sent: boolean }>`. From `Carnet de Pêche <bonjour@carnet-de-peche.com>`. No-op loggé sans `RESEND_API_KEY` ; ne throw jamais (Sentry + `{ sent:false }`).
- **Destinataire** : `lib/email/recipient.ts` → `getEmailRecipient(userId, opts?: { marketing?: boolean }): Promise<{ email, firstName, unsubToken? } | null>`. Avec `{ marketing: true }` : retourne **null si `profiles.marketing_email_optin === false`** (l'opt-out global S26) et fournit `unsubToken` pour le lien `/unsubscribe?token=...`. **RECO pour l'alerte spot : `{ marketing: true }`** (l'alerte est un email d'engagement, pas d'exécution de contrat) → l'opt-out global est respecté « EN PLUS du canal » exactement comme l'exige le contrat de `sendSpotAlertEmail`, et le lien de désinscription un-clic est fourni gratuitement.
- **Templates** : `emails/*.tsx`, default export + `PreviewProps` (préviewables via react-email), composés avec `EmailShell({ preview, children })` + styles partagés `h1`/`paragraph`/`CtaButton` de `emails/components.tsx` (BRAND navy/teal/sand, SITE_URL = https://www.carnet-de-peche.com). Modèle avec unsub : `emails/post-trial-winback.tsx` (`${SITE_URL}/unsubscribe?token=${unsubToken}`). Tests de rendu : `emails/__tests__/render.test.tsx`.
- **Pattern d'appel cron** (modèle : `app/api/crons/dunning-relances/route.ts:61-90`) : imports DYNAMIQUES `await import('@/lib/email/recipient')` / `await import('@/lib/email/send')` dans la route (isolation server-only vs vitest), recipient null → skip, échec d'envoi → continue.

## 8. PostHog server : lequel pour quoi

Deux modules, complémentaires (documenté en tête de `lib/analytics/server.ts`) :

| Module | API | Usage prévu |
|---|---|---|
| `lib/analytics-server.ts` | `captureServer(distinctId, event, props): void` + `flush(): Promise<void>` (posthog-node 5.38, lazy init, flushAt:1, no-op sans `NEXT_PUBLIC_POSTHOG_KEY`, ne throw jamais) | **RECO pour le cron** (rafale d'events multi-users) : `captureServer(userId, 'alert_sent', { kind, channel })` par canal réussi, puis **UN `await flush()` avant le `return` de la route** (serverless gèle sinon). |
| `lib/analytics/server.ts` | `captureServerEvent(distinctId, event, props): Promise<void>` (fetch direct `/capture/`, timeout 1,5 s) | Server actions one-shot (S70 signup). Pas idéal pour N events en boucle. |

Invariants S26 : AUCUNE PII dans les props (pas d'email/pseudo/coords ; `spot_id` uuid OK, jamais lat/lng), distinct_id = user_id Supabase.

**`alert_clicked`** : RECO = UTM sur tous les liens sortants (push `url`, CTA email, notif in-app) : `?utm_source=spot_alert&utm_medium=push|email|inapp&utm_campaign=sprint72`. posthog-js capture les `$pageview` avec les UTM automatiquement → l'insight « pageviews filtrés utm_source=spot_alert » mesure le clic SANS nouvel event ni code client. Limite honnête à documenter au RECAP : le client PostHog est opt-in consentement (RGPD S26) → les clics des non-consentants ne sont pas comptés ; c'est assumé (pas de tracking serveur de contournement).

---

## Récap des points à porter aux autres WS

- **WS B (106)** : `alert_settings` table dédiée (§3b, DDL) ; `favorite_spots` FK cascade ×2 + index `spot_id` + trigger cap 10 ; `alerts_sent` select-own sans policy write ; CHECK `notifications_type_check` re-posé avec `'spot_alert'` + LISTE COMPLÈTE des 28 types existants (§3c) ; envisager RPC `get_favorite_spot_coords()` service-only (§5a) ; regen `lib/types.ts`.
- **WS C2** : greffon `runSpotAlerts` dans `recfishing-reminders` (§1c) ; réutiliser `parisTomorrowBoundsUtc` du même fichier ; 1 alerte max/user/jour = choix du meilleur spot (§1d) ; score = `FishingWindow.score` existant ; perso = `computePersonalTendencies(samples, { spotId })` avec fallback global puis générique (§2) ; générique = marnage réel demain + seuils façade, PAS de coef (§5b) ; offset `tide_calibration` sur les heures citées ; `captureServer` + `flush()` (§8) ; garde-fou 21h-7h.
- **WS D** : bloc réglages dans `app/(app)/notifications/page.tsx` §Réglages (à côté de `NotificationTypeToggles`) ; server actions modèle `notification-prefs.ts` mais sur `alert_settings`.
- **WS E** : `getEmailRecipient(userId, { marketing: true })` (opt-out global + unsubToken gratuits) ; template modèle `post-trial-winback.tsx` ; appels via imports dynamiques (modèle dunning).
- **VERIF** : advisors performance KO plateforme le 02/07 (§6) : re-tester ; baseline security = 98 lints listés §6.
