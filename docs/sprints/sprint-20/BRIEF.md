# Sprint 20 — Brief d'exécution
## Hotfix prod : upload photo carnet (Server Action 1 Mo) + cache conditions mort

> Rédigé le 2026-06-23. Durée : ~1 jour (2 workstreams parallèles + VERIF).
> Contexte : 2 bugs **en production** sur `main`, remontés par Sentry/audit le 2026-06-23.
> Nature : hotfix ciblé, hors roadmap. Ne PAS embarquer d'autre chantier (carte-v2, sprint-12+) dedans.
> Décisions John 2026-06-23 : réparer ces 2 bugs uniquement, à fond et avec esprit critique (cf §19).

**Préalable avant de démarrer** (manuel John) : aucun merge requis. Le hotfix part de `main`
(branche de prod). Travailler sur une branche `hotfix-20` dédiée. Ne pas push sans validation.

> ⚠️ **Le diagnostic de départ a été vérifié contre le code + la base live, et il est partiellement
> inexact. À lire avant de coder — ne pas réparer le symptôme décrit, réparer la cause réelle.**
> - Bug #1 : le resize client **n'est PAS manquant** (`PhotoInput` redimensionne déjà à 1920 px / WebP
>   via `resizeImageToWebp`). La cause réelle = le resize **ne plafonne pas la taille de sortie**
>   (`maxSizeMB: Infinity`) → un WebP 1920 px peut dépasser **1 Mo**, et la **limite de body des
>   Server Actions Next.js (1 Mo par défaut)** rejette la requête **avant** que le code de l'action
>   ne s'exécute. Le garde interne de l'action (1,5 Mo) ne sert donc jamais : le mur framework (1 Mo)
>   est plus strict ET frappe en premier. §11.9 (resize 1920 px / WebP / client) est en fait respecté.
> - Bug #2 : « ne matche aucune contrainte unique » est **une des trois** causes. La table a aussi une
>   PK composite `NOT NULL (spot_id, hour)` que le write ne renseigne pas, ET la **RLS est active sans
>   aucune policy** (deny-all). Résultat mesuré : `conditions_cache` contient **0 ligne** — le cache
>   n'a jamais rien écrit depuis sa création. Ce n'est pas « des 400 non fatals », c'est un cache
>   **100 % mort** (chaque prise/fiche refait l'appel Open-Meteo).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-20/BRIEF.md`. Lance les workstreams A et B en
> parallèle dès maintenant (aucune dépendance entre eux), puis termine par le workstream VERIF avant
> de me rendre la main. Vérifie chaque hypothèse contre le code et la base live (supabase-guard),
> remets en cause le diagnostic s'il se trompe, et ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher `next.config.ts` (clé `serverActions.bodySizeLimit`) et `browser-image-compression` | **docs-researcher** → Context7 | Confirmer le chemin de config exact pour **Next 15** (sous `experimental` ?) et l'option `maxSizeMB` de la lib. Pas de config de mémoire. |
| Schéma / migration / RLS / types `conditions_cache` & nouvelle table | **supabase-guard** → Supabase (RO) | Le schéma live a déjà été lu (voir Preuves) ; re-confirmer avant migration, puis `get_advisors` après. Migration = **fichier numéroté** (`044_*`), regen `lib/types.ts`. |
| QA `/carnet/nouvelle` (photo > 1 Mo) + fiche spot (cache hit) | **qa-chrome** → Claude in Chrome + Playwright | Reproduire le 500 avant, prouver le fix après ; vérifier le 2e chargement = cache hit. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Confirmer que l'issue `JAVASCRIPT-NEXTJS-5` cesse d'apparaître. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Un upload photo de prise > 1 Mo ne casse plus jamais le Server Action, et le cache conditions
écrit réellement en base (≥ 1 ligne persistée, plus de 400 PostgREST), sans rien régresser.

## Preuves (ancrées, à re-vérifier en lecture avant de coder)

- **Bug #1 — Sentry** : issue `JAVASCRIPT-NEXTJS-5` — *« Error: Body exceeded 1 MB limit. »*,
  culprit `?(nodejs)`, 2 events, first/last seen ~17 h avant le 2026-06-23, `is:unresolved`.
  → https://carnet-de-peche.sentry.io/issues/JAVASCRIPT-NEXTJS-5
- **Bug #1 — code** : `components/forms/PhotoInput.tsx` appelle `resizeImageToWebp` (présent) ;
  `lib/storage/image-resize.ts:23` passe `maxSizeMB: Infinity` (aucun plafond de sortie) ;
  `lib/catches/actions.ts:268` `MAX_SIZE_BYTES = 1.5 Mo` (garde interne, jamais atteint) ;
  `next.config.ts` ne définit **pas** `serverActions.bodySizeLimit` → défaut Next = **1 Mo**.
- **Bug #2 — base live** (`conditions_cache`, projet `glgciwwnpmgifyhbvxsw`, eu-west-1) :
  - PK = `UNIQUE (spot_id, hour)` → `spot_id` **et** `hour` sont `NOT NULL`.
  - Unique sur `cache_key` = **index PARTIEL** : `... (cache_key) WHERE (cache_key IS NOT NULL)`.
  - **RLS active, 0 policy** (deny-all anon/authenticated).
  - **`SELECT count(*) = 0`** (total, `cache_key IS NOT NULL`, `spot_id IS NOT NULL` : tous 0).
- **Bug #2 — code** : 2 consommateurs au pattern identique et cassé —
  `lib/conditions/openmeteo.ts:133` (conditions d'une prise) et
  `lib/conditions/spot-forecast.ts:110` (fiche spot) :
  `.upsert({ cache_key, payload, fetched_at }, { onConflict: 'cache_key' })`.
  Clients service-role disponibles : `lib/supabase/service-role.ts`, `lib/supabase/admin.ts`.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Bloc 1 — upload photo carnet | 0,5 j | — | ✅ |
| B | Bloc 2 — cache conditions | 1 j | — | ✅ |
| VERIF | revue finale indépendante | 0,5 j | A + B | ❌ (toujours en dernier) |

---

## Bloc 1 — Upload photo carnet : garantir un body < limite Server Action

Le resize existe mais ne borne pas la taille de sortie, et trois limites incohérentes coexistent
(client : aucune / framework Next : 1 Mo / action : 1,5 Mo). Objectif : rendre le pipeline cohérent
et **défensif en profondeur** pour qu'aucun fichier ne franchisse jamais le mur des 1 Mo sans une
erreur **propre** (toast), jamais un 500. Ne PAS toucher au chemin avatar (`resizeImageToSquareWebp`,
512 px, canvas — non concerné, mais VERIF doit confirmer qu'il marche encore).

> **Connecteurs** : **docs-researcher** (Context7) pour valider, pour **Next 15**, le chemin exact de
> `serverActions.bodySizeLimit` (probablement `experimental.serverActions.bodySizeLimit`) et l'option
> `maxSizeMB` de `browser-image-compression`. **qa-chrome** pour reproduire/prouver.

### Tâches
1. `lib/storage/image-resize.ts` — dans `resizeImageToWebp`, remplacer `maxSizeMB: Infinity` par un
   **plafond réel** (`maxSizeMB: 0.9`) pour garantir une sortie < 1 Mo (la lib réduit qualité/dimension
   jusqu'à tenir). Garder `maxWidthOrHeight: 1920` (§11.9). Ne pas changer `resizeImageToSquareWebp`.
2. `next.config.ts` — définir explicitement `serverActions.bodySizeLimit` (cible **'2 Mo'**) pour
   donner de la marge **et** permettre au garde interne de l'action (toast 1,5 Mo) de réellement se
   déclencher au lieu d'un 500 framework. Chemin de clé à confirmer via docs-researcher.
3. `lib/catches/actions.ts` — `uploadCatchPhoto` : conserver le garde de taille mais l'**aligner** sous
   la nouvelle limite framework (ex. `MAX_SIZE_BYTES = 1.8 Mo` < 2 Mo) pour que le message FR
   *« La photo dépasse … redimensionne-la »* soit toujours atteignable. Garder le contrôle `image/webp`.
4. `components/forms/PhotoInput.tsx` — après resize, si `webp.size` dépasse encore le plafond visé
   (cas pathologique), afficher un toast FR clair et `onChange(null)` (ne pas envoyer un fichier trop
   lourd au Server Action). Défense en profondeur côté client.
5. (Optionnel, si rapide) garde `try/catch` autour de l'appel `uploadCatchPhoto` dans
   `components/catches/CatchForm.tsx` (`onSubmit`) pour transformer toute erreur réseau/framework
   résiduelle en toast FR au lieu d'une exception non gérée.

### Critères d'acceptation
- Une photo source lourde (ex. 8–12 Mo, scène détaillée) loguée via `/carnet/nouvelle` produit un
  WebP **< 1 Mo** envoyé au Server Action → la prise se crée **sans 500** (vérifier réseau qa-chrome :
  la requête POST du Server Action renvoie 200, pas « Body exceeded 1 MB limit »).
- Un fichier qui dépasserait quand même le plafond déclenche un **toast FR** (pas de 500, pas de crash).
- L'issue Sentry `JAVASCRIPT-NEXTJS-5` ne réapparaît plus après déploiement (deploy-watch).
- **Anti-régression** : upload avatar (`AvatarUploader`) fonctionne toujours ; édition d'une prise
  avec remplacement de photo fonctionne ; §11.9 respecté (1920 px max, WebP, resize client).

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : changer la valeur cible de `bodySizeLimit` au-delà de 2 Mo, ou modifier
  le format de stockage `storage/catches/<user_id>/...` (hors périmètre du hotfix).
- Ne pas toucher : `resizeImageToSquareWebp`, le bucket Storage, les policies Storage.

---

## Bloc 2 — Cache conditions : table propre + RLS + repointer les 2 consommateurs

`conditions_cache` est mort à cause de **trois murs cumulés** (ON CONFLICT sur index partiel + PK
`NOT NULL (spot_id, hour)` non renseignée + RLS sans policy). La table est aussi **surchargée** : sa
forme d'origine `(spot_id, hour)` (scores par spot) est supplantée par la table `spot_scores`
(migration 014) et compte 0 ligne. La réparation propre = donner au cache géohash sa **propre table**.

> **Connecteurs** : **supabase-guard** (RO) pour re-confirmer le schéma live avant la migration, lister
> les policies, et relancer `get_advisors` (sécurité + perf) après. Migration = **nouveau fichier
> numéroté** `supabase/migrations/044_weather_cache.sql` (dernier en place : `043_spots_sources.sql`).
> **NE PAS** éditer `001`/`006`. Regénérer `lib/types.ts` après application.

### Approche recommandée (à valider — voir garde-fou)
Nouvelle table dédiée, découplée de la forme morte `(spot_id, hour)` :

```sql
-- 044_weather_cache.sql
create table public.weather_cache (
  cache_key   text primary key,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);
create index weather_cache_fetched_at_idx on public.weather_cache (fetched_at);

alter table public.weather_cache enable row level security;

-- Lecture publique : la météo n'est pas sensible et la fiche spot est consultable hors connexion.
create policy "weather_cache lisible par tous"
  on public.weather_cache for select
  to anon, authenticated using (true);

-- Aucune policy INSERT/UPDATE pour anon/authenticated → écriture réservée au service-role
-- (bypass RLS), pas de vecteur d'empoisonnement de cache depuis le client.
```

### Tâches
1. Créer `supabase/migrations/044_weather_cache.sql` (ci-dessus). Vérifier PK = `cache_key` (non
   partielle) → `onConflict: 'cache_key'` matchera enfin une vraie contrainte.
2. `lib/conditions/openmeteo.ts` — `readCache` (select sur `weather_cache`) et `writeCache`
   (upsert `weather_cache`, écriture via **client service-role** `lib/supabase/service-role.ts`,
   pas le client de session). `onConflict: 'cache_key'` conservé.
3. `lib/conditions/spot-forecast.ts` — même repointage `readCache`/`writeCache` vers `weather_cache`
   + écriture service-role. Les deux consommateurs partagent la table (clés géohash distinctes).
4. Vérifier que la **lecture** (`readCache`) sur fiche spot publique (visiteur anon) passe bien la RLS
   `SELECT to anon` → cache hit possible sans connexion.
5. Regénérer `lib/types.ts` (`supabase gen types`). Ne PAS supprimer `conditions_cache` dans ce
   hotfix (peut rester inutilisée ; un éventuel `DROP` est un nettoyage séparé — voir garde-fou).

### Critères d'acceptation
- Après une prise loguée avec position en France métropolitaine, `SELECT count(*) FROM weather_cache`
  passe de 0 à **≥ 1** (supabase-guard) ; aucun 400 PostgREST sur l'upsert (logs API Supabase propres).
- Charger **deux fois** une fiche spot dans l'heure : le 2e chargement lit le cache (cache hit), pas de
  2e appel Open-Meteo (vérifier réseau qa-chrome ou log : la fenêtre de fraîcheur 1 h fonctionne).
- `get_advisors` (security) ne signale **aucune** nouvelle alerte sur `weather_cache` (RLS active +
  policy SELECT présente). Rappel : HIBP reste hors sujet (cf CLAUDE.md, décision John).
- **Anti-régression** : aucune écriture ne contourne une vue `*_for_viewer` ; le chemin scoring
  (`spot_scores`, crons) est intact ; aucune fuite GPS (le cache ne stocke que météo, pas de geom précis).

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT de trancher entre les 2 options si l'agent a un doute :
  **(recommandé)** nouvelle table `weather_cache` + écriture service-role ; **(alternatif)** réparer
  `conditions_cache` en place (rendre `spot_id`/`hour` nullable, remplacer l'index partiel par une
  contrainte `UNIQUE(cache_key)` non partielle, ajouter les policies) — plus risqué (table surchargée).
  Par défaut, partir sur le **recommandé** sans bloquer.
- ⚠️ DEMANDER À JOHN AVANT : tout `DROP TABLE conditions_cache` ou autoriser l'écriture cache à `anon`.
- Ne pas désactiver la RLS ; ne pas exposer la clé service-role côté client (§11.2).

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. Lance **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` (bloquant)
   + revue croisée indépendante + passe anti-régression. Vérifier en particulier
   `lib/conditions/openmeteo.test.ts` vert ; ajouter/ajuster une couverture sur le write du cache
   (upsert ciblant `weather_cache` / `onConflict` correct / ne throw pas).
2. Re-cocher chaque critère d'acceptation des Blocs 1 et 2 avec **preuve** (✅/❌ + commande/URL/SQL).
3. Passe sécurité : `weather_cache` → RLS d'abord + policy SELECT ; écriture service-role uniquement,
   clé jamais côté client ; aucun secret commité (hook `guard-git`).
4. Passe copy : messages d'erreur upload en **français**, tutoiement, pas de promesse mensongère.
5. **qa-chrome** sur `/carnet/nouvelle` (photo lourde → pas de 500) + fiche spot (cache hit au 2e load).
   **deploy-watch** (post-déploiement) : `JAVASCRIPT-NEXTJS-5` ne réapparaît plus, pas de nouvelle issue.
6. Livrer `docs/sprint-20/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Relire la branche `hotfix-20`, puis merge → `main` + déploiement Vercel.
- Appliquer la migration `044_weather_cache.sql` en prod (fichier + CLI), puis **regénérer
  `lib/types.ts`** et confirmer `weather_cache` créée (supabase-guard).
- Vérifier après déploiement : Sentry `JAVASCRIPT-NEXTJS-5` passe en résolu (ne réapparaît pas) ;
  `SELECT count(*) FROM weather_cache` augmente avec l'usage réel.
- (Optionnel, séparé) décider du sort de `conditions_cache` (DROP si confirmée morte).

---

## Rappels invariants (cf CLAUDE.md §11, §13, §14)
- Pas de push sans validation de John. RLS jamais désactivée. Migrations = nouveaux fichiers numérotés,
  jamais d'édition de `001`/`006`. Régénérer `lib/types.ts` après chaque migration. Validation zod FR.
