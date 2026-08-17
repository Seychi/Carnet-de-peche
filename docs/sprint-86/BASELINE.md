# Sprint 86, Bloc 0 — Figer l'avant, et l'avertissement de mesure

> Rejoué le **17/08/2026**, via le connecteur Supabase en lecture seule
> (`mcp__supabase__execute_sql`, aucune écriture). Chaque chiffre porte sa
> provenance : **« rejoué en base »** (requête exécutée depuis cette session) ou
> **« repris du brief, non revérifié »** (source indisponible dans cette
> session).

---

## 1. Le compte d'inscrits

```sql
select count(*) as total_inscrits from auth.users;
```

**Rejoué en base le 17/08/2026 : 52.** Identique au chiffre cité dans
`docs/sprint-85/ACTIVATION.md` §3 (« 52 comptes au 17/08 ») — aucun écart, ce
qui est attendu : les deux relevés tombent le même jour.

⚠️ `auth.users` vit dans le schéma `auth`, pas `public` — confirmé en
exécutant la requête directement sur `auth.users` (pas une vue `public`), comme
demandé.

---

## 2. Les trois cohortes d'activation (rejouées depuis `docs/sprint-85/ACTIVATION.md`)

Les deux requêtes ci-dessous sont **copiées telles quelles** depuis
`ACTIVATION.md` §2 et §3, puis rejouées depuis cette session le 17/08/2026.

### 2.1 L'agrégat brut 90 jours (le piège de lecture, §2 d'ACTIVATION.md)

| | Inscrits (90j) | Au moins 1 prise | % agrégat brut | < 14j | 14-29j | 30j et + |
|---|---|---|---|---|---|---|
| **Rejoué 17/08** | 47 | 6 | 12,8 % | 29 | 4 | 14 |
| Relevé ACTIVATION.md (17/08) | 47 | 6 | 12,8 % | 29 | 4 | 14 |

**Aucun écart.** Le rappel de lecture reste valable : cet agrégat mélange des
inscrits qui ont eu 90 jours pour logger avec des inscrits de moins de 14
jours — ne pas le lire en bloc (cf §3 ci-dessous).

### 2.2 Les trois cohortes par ancienneté (lecture correcte, §3 d'ACTIVATION.md)

| Cohorte | Inscrits | ≥ 1 prise | % ≥ 1 prise | ≥ 3 prises (seuil moat) | % ≥ 3 prises | ≥ 1 favori | % ≥ 1 favori |
|---|---|---|---|---|---|---|---|
| **30 j et + — rejoué 17/08** | 19 | 7 | 36,8 % | 3 | 15,8 % | 0 | 0,0 % |
| 30 j et + — ACTIVATION.md | 19 | 7 | 36,8 % | 3 | 15,8 % | 0 | 0,0 % |
| **14-29 j — rejoué 17/08** | 4 | 2 | 50,0 % | 1 | 25,0 % | 1 | 25,0 % |
| 14-29 j — ACTIVATION.md | 4 | 2 | 50,0 % | 1 | 25,0 % | 1 | 25,0 % |
| **Moins de 14 j — rejoué 17/08** | 29 | 1 | 3,4 % | 0 | 0,0 % | 7 | 24,1 % |
| Moins de 14 j — ACTIVATION.md | 29 | 1 | 3,4 % | 0 | 0,0 % | 7 | 24,1 % |

**Aucun chiffre n'a bougé** entre le relevé d'`ACTIVATION.md` et ce rejeu, sur
les trois cohortes. Attendu : les deux relevés tombent le même jour calendaire,
il n'y a pas eu de fenêtre de dérive. Le seuil produit réel (3 prises) reste
un mur : seuls 3 inscrits sur 19 dans la cohorte 30j+ l'ont franchi.

---

## 3. Les volumes d'events `pending_catch_started` / `pending_replayed`

**⚠️ Le connecteur PostHog n'était pas connecté dans cette session** —
`mcp__claude_ai_PostHog__exec` a répondu `MCP server "claude.ai PostHog" is
not connected` sur un simple appel `read-data-schema`, avant même toute
requête de comptage. Conformément à la consigne, ces deux chiffres sont donc
**repris du brief `docs/sprint-86/BRIEF.md`, non revérifiés dans cette
session** :

- `pending_catch_started` : **4** sur les 90 jours précédant le 17/08.
- `pending_replayed` : **1** sur la même fenêtre.

---

## 4. ★ Le piège de mesure — à écrire noir sur blanc avant de livrer

> Recopié tel quel depuis `docs/sprint-86/BRIEF.md`, Bloc 0.

Aujourd'hui `signup_wall_viewed({surface:'pending_catch'})` est émis **après**
le clic. Demain le bloc de promesse est visible dès le chargement, donc
l'impression partira **à chaque ouverture du formulaire par un anonyme**.

**Les impressions vont monter d'un ordre de grandeur et le taux de clic de
`pending_catch` va mécaniquement s'effondrer. Ce n'est PAS une régression.**
C'est exactement le même piège que la discontinuité `spot_page` du
sprint 85 §3.

- **Le repère de succès est le volume absolu de `pending_catch_started`**, pas
  un taux.
- Il vaut **4 sur les 90 jours précédant le 17/08**, dont **1 émis par la QA
  elle-même** → la base honnête est **3**.
- Toute valeur durablement au-dessus de ~1 par semaine est un gain.

---

## 5. `pnpm reconcile:signups`

Rejoué depuis cette session le 17/08/2026, avec les mêmes arguments que le
relevé du sprint 85 (`--posthog 28 --days 90`, cf en-tête du script) :

```
$ pnpm reconcile:signups -- --posthog 28 --days 90

> carnet-de-peche@0.1.0 reconcile:signups
> node scripts/reconcile-signups.mjs "--" "--posthog" "28" "--days" "90"

❌ reconcile-signups : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
   requis (env ou .env.local). La clé service-role n'est pas dans le repo,
   demande-la à John (CLAUDE.md §5) — jamais côté client, jamais commitée.

 ELIFECYCLE  Command failed with exit code 1.
```

**Échec confirmé, exactement comme documenté dans l'en-tête du script** :
`SUPABASE_SERVICE_ROLE_KEY` n'est ni dans l'environnement du shell, ni dans
`.env.local` (vérifié par grep, sans jamais afficher de valeur). Le script
s'arrête proprement, il ne plante pas.

**Conséquence** : l'écart base ↔ PostHog laissé à **40,4 %** par le sprint 85
(47 comptes réels vs 28 vus par PostHog sur 90 jours) **n'a pas pu être
rejoué**, ni côté base (clé service-role absente) ni côté PostHog (connecteur
non connecté dans cette session, cf §3). La moitié « PostHog » de ce chiffre
reste **non revérifiée** — comme elle l'était déjà à la fin du sprint 85.

---

## 6. Ce que ce bloc n'a pas pu vérifier

- Les volumes `pending_catch_started` (4) et `pending_replayed` (1) — connecteur
  PostHog indisponible dans cette session. Repris du brief tels quels.
- L'exécution réelle de `pnpm reconcile:signups` — bloquée par l'absence de
  `SUPABASE_SERVICE_ROLE_KEY` en environnement local. Le comportement d'échec
  lui-même a été vérifié (sortie collée ci-dessus), pas le recalcul de l'écart.
- Aucune donnée de la cohorte n'a été recoupée au-delà de ce qu'`ACTIVATION.md`
  couvrait déjà (mêmes deux requêtes, même périmètre `auth.users` /
  `public.catches` / `public.favorite_spots`).

---

## 7. Périmètre respecté

Ce bloc n'a touché **aucun fichier** de `app/`, `components/` ou `lib/`. Seule
lecture (SQL en lecture seule + exécution du script existant), et l'écriture
de ce document.
