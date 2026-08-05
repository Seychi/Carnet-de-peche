# Sprint 74 — RECAP
## « Première valeur en 60 secondes » : réparer le J0 → J7

> Exécuté le 2026-08-05 sur la branche `sprint-74` (part de `main` = `c62ce30`).
> **Migration 108 APPLIQUÉE et PROUVÉE en prod.** Code **NON commité, NON poussé** (consigne « ne push pas »).
> Suite : **999 tests verts / 91 fichiers** · `typecheck` OK · `lint` 0 warning · `build` OK.

---

## 1. Ce que le brief avait faux (prouvé au Bloc 0)

Le détail complet est dans `research/anchor.md`. Les quatre corrections qui ont changé le travail :

| # | Le brief disait | La réalité | Conséquence |
|---|---|---|---|
| 1 | « `emails/welcome.tsx` existe mais n'est importé nulle part, jamais envoyé » | **Il est envoyé** depuis `completeOnboarding` depuis le sprint 11, avec déjà une dédup `!before.onboarded` | La tâche « brancher le welcome » n'existait pas. On l'a **enrichi** (créneau, UTM, désinscription, journal) |
| 2 | ⚠️ « DEMANDER À JOHN si `composeWeeklyDigest` envoie déjà un hebdo » | C'est un composeur **push/in-app**, zéro `sendEmail` dans son chemin | Garde-fou **levé sans te déranger**. On CRÉE l'hebdo email (canal, cadence, sens et consentement opposés au digest S49) |
| 3 | Chemin des crons `app/api/cron/` | C'est **`app/api/crons/`** (pluriel) | — |
| 4 | « 5 spots curés, nom + **commune** » | **Aucune colonne commune/city sur `spots`** | On affiche nom + `structure` (digue, estuaire, pointe rocheuse) : une donnée vraie, aucune inventée |

**Chiffre à retenir** : le brief annonce 9 inscrits en 60 jours (PostHog). **La DB en compte 20.** PostHog sous-compte d'un facteur ~2 à cause du gate de consentement RGPD. Pour le avant/après de volume, **la DB fait foi** ; PostHog mesure le *parcours*.

---

## 2. Livré

### Bloc 1 — Migration 108 (appliquée en prod)

`supabase/migrations/108_lifecycle_emails.sql` : table `lifecycle_emails` (journal de dédup, PK `(user_id, kind, sent_key)`, RLS select-own, **aucune policy d'écriture**) + colonne `profiles.weekly_window_optin boolean not null default false`. `lib/types.ts` régénéré.

**Matrice de sécurité re-prouvée en live le 2026-08-05, 10/10 OK, en `begin; … rollback;`** :

| # | Invariant | Attendu | Obtenu |
|---|---|---|---|
| 1 | RLS activée | true | true ✅ |
| 2 | Policies | SELECT:1 / write:0 | SELECT:1 / write:0 ✅ |
| 3 | PK de dédup | `user_id,kind,sent_key` | idem ✅ |
| 4 | `weekly_window_optin` | `false` / NOT NULL | idem ✅ |
| 5 | INSERT par `authenticated` | 42501 | 42501 ✅ |
| 6 | Doublon | 23505 | 23505 ✅ |
| 7 | Hebdo W32 puis W33 | accepté | accepté ✅ |
| 8 | `kind` hors liste | 23514 | 23514 ✅ |
| 9 | Lecture cross-user | 0 ligne | 0 ✅ |
| 10 | Cascade RGPD (delete user) | 0 ligne restante | 0 ✅ |

Advisors : **3 ERROR, exactement la baseline** (2 `security_definer_view` assumés + `spatial_ref_sys`). **Zéro advisory** mentionnant `lifecycle_emails` ou `weekly_window_optin`.

### Bloc 2 — Fini v2 « Ton spot, ton prochain créneau »

`app/(app)/onboarding/fini/page.tsx` enrichi (jamais refait, rien de bloquant, « Ouvrir mon carnet » reste toujours accessible) :

- **Section « Ton spot »** : jusqu'à 5 spots `curated` + `approved` du département, favori en un tap via `toggleFavoriteSpot`. Sélection SQL **minimale** (`id, name, structure`) : aucune coordonnée, même floutée, ne traverse la frontière client. Masquée si le dépt n'a aucun spot curé (défensif : les 24 dépts côtiers en ont tous ≥ 3).
- **Carte « Ton prochain créneau »** : `getDeptNextWindow(dept)`, chiffres en `font-mono`, raisons FR du moteur solunar, libellé honnête « Créneau du secteur X. Logue tes prises pour le personnaliser. ». **Aucun ScoreRing perso, aucun %.**
- **Checkbox opt-in hebdo** NON pré-cochée → `app/actions/weekly-window.ts` (zod, messages FR, scopé `auth.uid()`).
- **Réglage `/notifications`** : section « Emails » distincte, tous tiers, au-dessus des alertes payantes S72.

### Bloc 3 — Emails lifecycle

- **4 templates** : `emails/welcome.tsx` (enrichi), `first-window.tsx` (J+1), `import-nudge.tsx` (J+3), `weekly-window.tsx` (hebdo vendredi). Briques partagées dans `emails/components.tsx` (`WindowBlock`, `LocalUpsell`, `UnsubFooter`, `lifecycleUrl`).
- **Orchestrateur** `lib/lifecycle/send.tsx` : pipeline commun **dédup → destinataire (opt-out global) → envoi → journal → event**. Ne throw jamais.
- **Greffon cron** `lib/lifecycle/cron.ts`, greffé dans `personal-window` (07:00 UTC ≈ 9h Paris). **Pas de 5e cron.** Placé **après** le legacy, qui n'est jamais décalé, avec time-box 45 s et try/catch de ceinture.
- **UTM partout** : `utm_source=lifecycle&utm_medium=email&utm_campaign={kind}`, vérifié par test sur les 4 templates.

**Coût DB du greffon : 4 requêtes fixes** (`profiles`, `catches`, `lifecycle_emails`, `favorite_spots`), quel que soit le nombre d'inscrits. Prouvé par test avec 25 cibles.

### Bloc 4 — Mesure

- ★ **Le funnel était cassé à la racine** : `analytics.identify()` n'était appelé **nulle part** dans l'app, alors que les events serveur partent sur `user_id`. Les retours J+7 étaient donc **structurellement invisibles**. Corrigé via `components/analytics/AnalyticsIdentify.tsx` monté dans le layout authentifié, + `analytics.reset()` sur les 3 points de déconnexion.
- Events : `onboarding_finished`, `favorite_spot_added {source}` (émis sur ajout **net** seulement, jamais au retrait ni sur un double-clic), `weekly_optin_changed {enabled}`, `lifecycle_email_sent {kind}` (émis **après** envoi réussi seulement).

---

## 3. Décisions que j'ai prises (et pourquoi)

1. **J+1 utilise le créneau du DÉPARTEMENT, pas du spot favori** (le brief demandait « spot favori s'il existe »). Deux raisons : un créneau de département n'est pas un créneau de spot, l'annoncer comme tel violerait la règle d'honnêteté ; et un calcul par spot ferait N appels réseau dans un cron à budget 60 s, là où le créneau dept est caché 1 h et coûte au plus 24 fetches pour tout le run. Le spot favori est quand même **nommé et lié** dans l'email.
2. **Lecture du journal AVANT chaque envoi**, en plus de l'écriture après (le brief ne demandait que l'écriture). Sans ça, la dédup du welcome reposait uniquement sur `!before.onboarded`, qui ne survit pas à une ré-écriture du profil. Fail-**ouvert** si le journal est illisible : mieux vaut un doublon rare que perdre le seul point de contact du sprint.
3. **Les 4 emails sont en catégorie marketing**, welcome compris. Conséquence assumée : un compte désinscrit ne reçoit **aucun** email lifecycle. Cohérent avec le précédent S72.
4. **Pas d'hebdo si aucun créneau ne tombe samedi ou dimanche** : on n'envoie rien plutôt que titrer « ton créneau du week-end » sur un créneau de mardi.
5. **Supprimé `lib/lifecycle/window-copy.ts`** (écrit par le workstream interrompu) : sa phrase faisait doublon avec la copie honnête intégrée aux templates. Du code mort en moins.
6. **Corrigé un test rouge pré-existant** hors périmètre (`recfishing-reminders`, assertion restée sans le champ `truncated` ajouté par la time-box S72). C'était le seul test rouge de la suite et il bloquait la porte VERIF.

---

## 4. Comment tester

```powershell
pnpm test          # 999 verts / 91 fichiers
pnpm typecheck     # OK
pnpm lint          # 0 warning
pnpm build         # OK
node scripts/lint-copy-dashes.mjs   # 17 warns, TOUS pré-existants et tolérés, aucun dans les emails
pnpm dlx tsx scripts/preview-lifecycle-emails.tsx   # régénère les 4 previews HTML
```

**Previews** (à ouvrir dans un navigateur) : `research/email-preview-{welcome,j1-window,j3-import,weekly-window}.html`.

**Contrôle SQL de l'opt-in hebdo** après avoir coché la case au fini :
```sql
select id, username, weekly_window_optin from profiles where weekly_window_optin;
```

**Simuler le cron à blanc** (aucun email ne part sans `RESEND_API_KEY`) :
```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" https://www.carnet-de-peche.com/api/crons/personal-window
```
La réponse contient désormais un bloc `lifecycle: { j1, j3, weekly, failed, timedOut }`.

---

## 5. Critères d'acceptation du brief

| Critère | Statut |
|---|---|
| `anchor.md` : étendre vs créer, mapping prefs, flow signup→fini, dept→spots curés, requêtes « avant » | ✅ |
| Matrice SQL 108 : cross-user, 42501, doublon, cascade | ✅ 10/10 en live |
| Advisors : aucun nouvel ERROR · `lib/types.ts` régénéré | ✅ |
| Fini v2 : spots, créneau, checkbox, rien de bloquant | ✅ |
| Dépt sans spot curé : pas de section, pas d'erreur | ✅ (défensif) |
| Gating S72 intact (aucune alerte quotidienne pour un gratuit) | ✅ `lib/alerts/*` et policies 106 non touchés |
| 2 runs → 1 seul envoi par kind ; hebdo re-envoyé la semaine suivante | ✅ testé |
| 1 prise avant J+1 → ni J+1 ni J+3 | ✅ testé |
| Opt-out marketing → aucun email | ✅ testé |
| Sans opt-in hebdo → pas d'hebdo | ✅ testé |
| Throw sur un user → les suivants et le legacy continuent | ✅ testé (2 niveaux) |
| Previews HTML des 4 templates | ✅ |
| Copy : tutoiement, zéro tiret cadratin, zéro % inventé, désinscription visible | ✅ testé sur les 4 |
| **QA compte neuf réel (qa-chrome), mobile 390 px + desktop** | ❌ **non fait, cf §6** |
| **deploy-watch après déploiement** | ❌ non déployé |

---

## 6. Reste manuel (John)

1. **QA compte neuf réel — le seul critère VERIF non exécuté.** Je ne l'ai pas fait seul volontairement : une inscription de bout en bout écrit un vrai compte dans la base de **production** (le dev local pointe sur le Supabase cloud) et, si `RESEND_API_KEY` est présente, envoie de **vrais emails**. Parcours à couvrir : signup → 6 étapes → fini v2 (spots + créneau + checkbox) → `/home`, en 390 px et en desktop, console propre.
2. **Relire les 4 previews HTML** avant de déployer : c'est la copy que verront tes 20 premiers fondateurs.
3. **Vérifier `RESEND_API_KEY` en prod.** Sans elle, tout ce sprint est un no-op silencieux (comportement voulu de `lib/email/send.ts`, mais alors rien ne part).
4. Merge `sprint-74` → `main`, déploiement, puis `deploy-watch`.
5. **Lane amorçage, toujours prioritaire** : 18 codes fondateurs restants sur 20. Le meilleur onboarding du monde ne retient personne dans un produit désert.

### ⚠️ Décision qui t'attend : `profiles.email_unsub_token` lisible par `anon`

Faille **pré-existante** (migration 054, sprint 26), pas introduite ici, mais elle vise exactement le canal que ce sprint construit : n'importe quel visiteur peut énumérer les 30 tokens et **désinscrire tout le monde** des emails marketing.

Le correctif évident ne marche pas (testé en prod, en rollback) : un `revoke select (colonne)` est inopérant tant que le grant TABLE existe. Le vrai correctif suit le modèle 028b (revoke table + re-grant des 23 autres colonnes), mais il impose de **re-granter à la main chaque colonne future** de `profiles`, sinon elle devient silencieusement illisible côté app. Aucun chemin client ne lit ce token (`recipient.ts` et `unsubscribe/actions.ts` passent tous deux par service-role), donc le verrou ne casserait rien fonctionnellement.

**C'est un arbitrage de maintenance, pas technique.** Le correctif est prêt et tient en une `108b`. Dis-moi si je la pose.

---

## 7. Mesure : le « avant » et quoi relancer à J+14

### Avant (DB live, 2026-08-05)

| Métrique | Valeur |
|---|---|
| Profils totaux | 30 (24 onboardés) |
| Inscriptions sur 60 j | **20** (dont 16 onboardées, 80 %) |
| Prises totales | 24 (3 sur 30 j) |
| Pêcheurs ayant logué ≥ 1 prise | 9 / 30 |
| Favoris de spots | **1** |
| `alert_settings` / `alerts_sent` | 0 / 0 |
| Opt-out marketing | 0 |
| **Comptes revenus après J+1 (cohorte 60 j)** | **1 sur 20** |

### À relancer à J+14 (SQL, source de vérité du volume)

```sql
select
  (select count(*) from profiles where created_at > now() - interval '14 days') as inscrits_14j,
  (select count(*) from profiles where weekly_window_optin)                     as optin_hebdo,
  (select count(*) from favorite_spots)                                         as favoris,
  (select count(*) from catches where created_at > now() - interval '14 days')  as prises_14j,
  (select count(*) from lifecycle_emails)                                       as emails_envoyes,
  (select count(*) from lifecycle_emails where kind = 'welcome')                as welcome,
  (select count(*) from lifecycle_emails where kind = 'j1_window')              as j1,
  (select count(*) from lifecycle_emails where kind = 'j3_import')              as j3,
  (select count(*) from lifecycle_emails where kind = 'weekly_window')          as hebdo;
```

### Funnel PostHog (HogQL, mesure du parcours)

```sql
SELECT
  countIf(event = 'signup_completed')                          AS inscriptions,
  countIf(event = 'onboarding_finished')                       AS onboarding_finis,
  countIf(event = 'favorite_spot_added')                       AS favoris_ajoutes,
  countIf(event = 'weekly_optin_changed' AND properties.enabled) AS optin_hebdo,
  countIf(event = 'lifecycle_email_sent')                      AS emails_lifecycle,
  countIf(event = 'catch_log_started')                         AS logs_demarres
FROM events
WHERE timestamp > now() - INTERVAL 14 DAY
```

**Retour à J+7** (la métrique du sprint, désormais mesurable grâce au fix `identify`) :

```sql
SELECT
  person_id,
  min(timestamp) AS premiere_visite,
  max(timestamp) AS derniere_visite,
  dateDiff('day', min(timestamp), max(timestamp)) AS jours_de_vie
FROM events
WHERE timestamp > now() - INTERVAL 60 DAY
GROUP BY person_id
HAVING jours_de_vie >= 7
ORDER BY jours_de_vie DESC
```

⚠️ PostHog reste **sous-compté d'un facteur ~2** face à la DB (gate de consentement RGPD). Utilise-le pour les **ratios** entre étapes, pas pour les volumes absolus.

### Attention pour la lecture à J+14

Les emails J+1 et J+3 ne ciblent que les comptes onboardés **exactement** la veille ou 3 jours avant, et **toujours à 0 prise**. Sur la cohorte actuelle (20 inscrits en 60 jours, soit ~0,3/jour), **attends-toi à très peu d'envois** : ce sprint répare le seau, il ne le remplit pas. C'est la lane amorçage qui fournira le volume.
