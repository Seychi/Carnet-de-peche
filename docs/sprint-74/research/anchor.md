# Sprint 74 — Bloc 0 : ancrage (lecture seule)

> Établi le 2026-08-05 sur la branche `sprint-74` (HEAD = `c62ce30`, identique à `main` = prod).
> Méthode : 6 lecteurs parallèles sur le code + SQL live en prod via le connecteur Supabase + relecture directe des fichiers pivots.
> **Ce document corrige le brief sur 4 points.** Le brief reste le cap ; ces corrections sont les faits.

---

## 1. Ce que le brief a faux

### 1.1 ❌ « `emails/welcome.tsx` existe mais n'est importé nulle part (jamais envoyé) »

**FAUX, et c'est structurant.** Le welcome est importé et envoyé depuis `completeOnboarding` :

```ts
// app/(app)/onboarding/actions.ts:98-108
if (!before?.onboarded && user.email) {
  const { sendEmail } = await import("@/lib/email/send");
  const { default: WelcomeEmail } = await import("@/emails/welcome");
  await sendEmail({ to: user.email, subject: "Bienvenue dans Carnet de Pêche 🎣", react: WelcomeEmail({...}) });
}
```

Il y a même déjà une dédup (`!before?.onboarded`, lu AVANT l'update) et le point d'envoi est exactement celui que le brief propose (complétion d'onboarding, pas inscription : la collision avec la confirmation Supabase était déjà évitée).

**Conséquence** : la tâche Bloc 3.1 « brancher le welcome » n'existe pas. Le vrai travail est de l'**enrichir** (créneau du département, UTM, lien de désinscription : les trois manquent) et d'ajouter la dédup durable via `lifecycle_emails`.

### 1.2 ❌ Le garde-fou « ⚠️ DEMANDER À JOHN si `composeWeeklyDigest` envoie déjà un email hebdo »

**Levé, pas besoin de John.** `lib/notifications/weekly-digest.ts` est un composeur **pur** dont la sortie part en **notification in-app + push** (`sendPushToUser`), jamais en email. Aucun `sendEmail` dans le chemin (`app/api/crons/personal-window/route.ts:398-465`).

**Décision étendre vs créer : on CRÉE.** L'hebdo S49 (push, récap des prises passées, opt-out, lundi) et l'hebdo S74 (email, créneau du week-end à venir, opt-in, vendredi) sont deux objets de canal, de cadence, de sens et de consentement opposés. Les fusionner casserait la sémantique des deux.

⚠️ **Piège de nommage à connaître** : la pref push existante s'appelle déjà `weekly_digest`. La colonne du S74 s'appelle `weekly_window_optin`. Ce sont deux choses différentes ; ne jamais les câbler l'une sur l'autre.

### 1.3 ❌ Le chemin des crons

Le brief écrit `app/api/cron/`. Le vrai chemin est **`app/api/crons/`** (pluriel).

### 1.4 ❌ « jusqu'à 5 spots curés du département (nom + commune) »

**Il n'existe aucune colonne commune / city sur `spots`.** Colonnes réelles : `id, name, slug, department, region, geom, geom_public, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, created_by, verified, created_at, updated_at, source, moderation_status, verified_at, verified_by, verification_level`.

**Décision** : on affiche **nom + `structure`** (valeurs réelles : `digue`, `estuaire`, `pointe_rocheuse`, `cale`...), une donnée vraie et utile au pêcheur. On n'invente aucune commune. Le nom des spots curés porte déjà souvent le lieu (« Jetée du vieux port de Roscoff », « Le Diben (Brest) »).

---

## 2. Chiffres « AVANT » (SQL live, 2026-08-05) — à re-lancer à J+14

> ⚠️ Le brief annonce « 9 inscriptions en 60 jours » d'après PostHog. **La DB en compte 20.**
> PostHog sous-compte d'un facteur ~2 à cause du gate de consentement RGPD. **La DB est la source de vérité du avant/après**, PostHog sert à mesurer le *parcours*, pas le volume.

```sql
select 'profiles_total' as metric, count(*)::text from profiles
union all select 'profiles_60d', count(*)::text from profiles where created_at > now() - interval '60 days'
union all select 'profiles_60d_onboarded', count(*)::text from profiles where created_at > now() - interval '60 days' and onboarded
union all select 'catches_total', count(*)::text from catches
union all select 'catches_30d', count(*)::text from catches where created_at > now() - interval '30 days'
union all select 'distinct_catch_authors', count(distinct user_id)::text from catches
union all select 'favorite_spots_rows', count(*)::text from favorite_spots
union all select 'alert_settings_rows', count(*)::text from alert_settings
union all select 'alerts_sent_rows', count(*)::text from alerts_sent;
```

| Métrique | Valeur au 2026-08-05 |
|---|---|
| Profils totaux | **30** (24 onboardés) |
| Inscriptions sur 60 j | **20** (dont 16 onboardées, soit 80 %) |
| Prises totales | **24** (3 sur les 30 derniers jours) |
| Pêcheurs ayant logué ≥ 1 prise | **9** sur 30 |
| Favoris de spots | **1** |
| `alert_settings` / `alerts_sent` | **0 / 0** (conforme au brief : 100 % des comptes sont Découverte) |
| Opt-out marketing | **0** (les 30 profils sont joignables) |
| Posts du fil / sorties | 1 / 1 |

**Cohorte 60 jours, retour réel** : un seul compte est revenu après J+1 (dept 85, inscrit le 29/07, prises le 31/07 = J+2). Les 19 autres ne sont jamais revenus. Le diagnostic du brief tient : **le point de chute est après l'onboarding, pas dedans.**

### Cible des emails lifecycle : propre

```sql
select count(*) filter (where onboarded and home_department is null) as onboarded_sans_dept,     -- 0
       count(*) filter (where onboarded and onboarded_at is null)    as onboarded_sans_date,     -- 0
       count(*) filter (where not onboarded)                          as pas_onboardes           -- 6
from profiles;
```

**Les 24 comptes onboardés ont TOUS un `home_department` ET un `onboarded_at`.** Les 6 profils sans département sont exactement les 6 non-onboardés. Donc cibler `onboarded = true` suffit : le cas « onboardé sans dept » (que l'ancrage craignait) n'existe pas.

### Spots curés par département — le fallback est défensif

Les **24 départements côtiers ont tous ≥ 3 spots curés** : 29 (18), 17 (14), 33 (13), 44/64/85 (12), 13/83 (11), 40 (10), 2A/2B/34/66 (9), 22/50 (8), 06/11/56 (7), 30/76 (6), 35/62 (5), 14 (4), 59 (3).

Le fallback « département sans spot curé » du Bloc 2 ne se déclenchera jamais en pratique. On l'implémente quand même (défense en profondeur), mais ce n'est pas un chemin à optimiser.

### Baseline advisors (sécurité)

101 lints : **3 ERROR**, 1 INFO, 97 WARN. Les 3 ERROR sont la baseline assumée du projet :
`security_definer_view` sur `catches_for_viewer` et `spots_for_viewer` (assumé, cf migration 047 §3) et `rls_disabled_in_public` sur `spatial_ref_sys` (table système PostGIS). Le WARN `auth_leaked_password_protection` est assumé (décision John : Pro-only).

---

## 3. Mapping des préférences : où brancher l'opt-in hebdo

Il existe **un seul** système de prefs de notification, et il ne convient pas :

- `profiles.notification_prefs` (jsonb, migration 086) piloté par `lib/notifications/prefs-meta.ts`.
- Sémantique **opt-OUT** : `isNotificationPrefEnabled` traite une **clé absente comme ACTIVÉE** (`prefs-meta.ts:101-107` : `return raw !== false && raw !== 'false'`).
- Un opt-in par défaut OFF y est donc **impossible** sans casser la convention partagée entre les émetteurs et l'UI.

Les autres candidats et pourquoi ils ne conviennent pas :

| Emplacement | Verdict |
|---|---|
| `notification_prefs` (jsonb) | ❌ sémantique opt-out, et gère le **push**, pas l'email |
| `alert_settings` (106) | ❌ c'est le réglage des alertes **payantes** S72, créé à la demande, own-only. L'hebdo est tous tiers |
| `profiles.marketing_email_optin` | ❌ c'est le **kill-switch global** marketing, pas un réglage par type |
| **colonne dédiée `profiles.weekly_window_optin`** | ✅ retenu (décision du brief, confirmée) |

**Le kill-switch global reste au-dessus** : `getEmailRecipient(uid, {marketing:true})` renvoie `null` si `marketing_email_optin = false`, donc un désinscrit global ne reçoit jamais l'hebdo même s'il a coché l'opt-in.

⚠️ **Visibilité assumée** : `profiles` est world-readable (policy `profiles_select_all` USING `true`). La colonne `weekly_window_optin` est donc publique, au même titre que `public_ranking`. Sensibilité jugée nulle (« reçoit un email hebdo »).

---

## 4. Flow signup → fini, prouvé

1. `app/auth/login/actions.ts` : signup, `signup_completed` capturé côté serveur. `mailer_autoconfirm = true` (décision S25) → **session immédiate**, pas d'email de confirmation Supabase.
2. Onboarding en 6 étapes, chacune via `saveOnboardingStep(step, data)`.
3. `completeOnboarding(data)` : lit l'état AVANT (`before`), écrit `onboarded = true` + `onboarded_at = now()`, **envoie le welcome si premier passage**, `revalidatePath('/home')`.
4. `/onboarding/fini` : page server, redirige vers `/onboarding/1` si `!profile.onboarded`.

**Pas de risque de double email** : la confirmation Supabase est désactivée, et le welcome ne part qu'au premier passage.

---

## 5. Faille de sécurité trouvée en chemin (PRÉ-EXISTANTE, hors périmètre, à arbitrer par John)

`profiles.email_unsub_token` est **lisible par le rôle `anon`**. Prouvé en live :

```sql
begin;
  set local role anon;
  select count(*) from public.profiles where email_unsub_token is not null;  -- → 30
rollback;
```

N'importe quel visiteur peut énumérer tous les tokens de désinscription et **désinscrire tout le monde** des emails marketing, ce qui viserait exactement le canal que ce sprint construit. Trou présent depuis la migration **054** (sprint 26), pas introduit par le S74.

**Le correctif évident ne marche pas** (testé en prod, en rollback) :

```sql
begin;
  revoke select (email_unsub_token) on public.profiles from anon;
  set local role anon;
  select count(*) from public.profiles where email_unsub_token is not null;  -- → 30, INCHANGÉ
rollback;
```

Le `revoke` colonne est inopérant tant que le **grant TABLE** `SELECT` existe. Le correctif réel suit le modèle de la migration 028b : `revoke select on public.profiles from anon, authenticated;` puis `grant select (<les 23 autres colonnes>) to anon, authenticated;`.

**Pourquoi ce n'est PAS fait dans la 108** : ce verrou impose de re-granter à la main **chaque colonne ajoutée plus tard** à `profiles`, sinon elle devient silencieusement illisible côté app. C'est un piège de maintenance réel, et la décision dépasse le périmètre d'un sprint d'activation. Aucun chemin client ne lit ce token (`lib/email/recipient.ts` et `app/(marketing)/unsubscribe/actions.ts` passent tous les deux par service-role), donc le verrou ne casserait rien fonctionnellement.

**→ Décision à prendre par John.** Le correctif est prêt et testé, il tient en une migration `108b`.

---

## 6. Inventaire des API réutilisées (signatures vérifiées)

| Besoin | Existe déjà | Signature |
|---|---|---|
| Créneau gratuit du dept | `lib/conditions/dept-window.ts` | `getDeptNextWindow(dept): Promise<FishingWindow \| null>` · `getDeptUpcomingWindows(dept, count=3): Promise<FishingWindow[]>` — `unstable_cache` 1h par dept, jamais de throw |
| Justifications FR | `FishingWindow.factors.reasons: string[]` | déjà en français, à réutiliser tel quel |
| Favori de spot | `app/actions/favorites.ts` | `toggleFavoriteSpot(spotId): Promise<ActionResult<{favorite:boolean}>>`, cap 10 en DB, revalide /profil + /notifications |
| Envoi email | `lib/email/send.ts` | `sendEmail({to,subject,react}): Promise<{sent:boolean}>` — no-op sans `RESEND_API_KEY`, ne throw jamais |
| Destinataire + RGPD | `lib/email/recipient.ts` | `getEmailRecipient(uid, {marketing:true})` → `null` si opt-out, fournit `unsubToken` |
| Layout email | `emails/components.tsx` | `EmailShell`, `BRAND`, `SITE_URL`, `h1`, `paragraph`, `CtaButton` |
| Patron d'email complet | `lib/email/spot-alert.tsx` + `spot-alert-template.tsx` | orchestrateur fail-soft + template avec UTM et `/unsubscribe?token=` |
| Event serveur | `lib/analytics/server.ts` | `captureServerEvent(distinctId, event, props?)` — awaité, borné 1500 ms, ne throw jamais |
| Désinscription 1 clic | `app/(marketing)/unsubscribe/` | `unsubscribeByToken(token)` en service-role, idempotent |

**Contrainte crons confirmée** : `vercel.json` liste exactement **4** crons (`compute-spot-scores` 05:00, `personal-window` 07:00, `dunning-relances` 09:00, `recfishing-reminders` 17:00). Plafond du plan Hobby atteint → le greffon S74 va bien dans `personal-window`, pas dans un 5e cron.

---

## 7. Pièges hérités à ne pas re-découvrir

- `profiles.home_department` et `spots.department` sont **`char(3)` paddés** (`'29 '`). Trimmer la valeur **lue**, des deux côtés de toute comparaison (bug S66, fixé en 103b).
- Les **grants table sont automatiques** pour `anon`/`authenticated` sur toute nouvelle table du schéma `public` : la **RLS est le seul verrou**. Policies toujours `to authenticated`, jamais `to public`/`to anon`.
- Le `CHECK` sur `notifications.type` est une **liste fermée re-posée en entier** à chaque ajout (29 types). Le S74 n'ajoute aucun type in-app : ne pas y toucher.
- Les tests Vitest **ne touchent pas la DB** : ils assertent sur le **texte du fichier de migration**. La preuve runtime se fait en SQL live `begin; … rollback;`.
- L'historique `supabase_migrations` a une dérive connue : ne jamais conclure « pas appliquée » depuis `list_migrations` seul, vérifier l'objet par SQL.
- Le linter **performance** de Supabase échoue côté plateforme (`42601 syntax error at or near 'storage.buckets'`), déjà constaté au S72. Ne pas attendre de rapport perf propre en clôture.
