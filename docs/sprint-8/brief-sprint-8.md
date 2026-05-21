# 🟢 Brief Sprint 8 — Fil communautaire

> **Durée** : 2 semaines (cf ROADMAP, fenêtre 2026-05-28 → 2026-06-10)
> **Type** : sprint feature majeur — pivot social du produit
> **Objectif** : activer les tables `feed_posts` / `feed_comments` / `feed_likes` / `follows` dormantes depuis sprint 1 + brancher Realtime + signal social local sur les fiches spots.
> **Pré-requis** : sprint 7.5 verrouillé (CI verte, lint = 0, types regen, migrations propres, RLS auditées).
> **Référence roadmap** : `docs/ROADMAP.md` § "Sprint 8 — Fil communautaire"

---

## Comment lire ce brief

Même format que `docs/sprint-7.5/brief-sprint-7.5.md` :

- Tâches numérotées, autonomes à l'intérieur d'un bloc, **ordonnées par bloc** (0 → A → B → C → D → E → F → G → H → I).
- Chaque tâche : fichier(s) cible(s), critère d'acceptation testable, coût estimé.
- Mode d'opération : Conventional Commits, branche `sprint-8` recommandée (gros sprint avec migrations + RLS — éviter `main` direct cette fois), tutoiement, copy FR.
- **Tests** : pour chaque nouveau Server Action et chaque nouvelle RPC, écrire au minimum un test Vitest. On ne sort pas le sprint avec `pnpm test` < 130/130 (16 nouveaux tests minimum).

> ⚠️ **Règle d'or sprint 8** : on touche aux tables sociales et aux RLS. **Toute migration doit être testée avec `supabase db reset` en local AVANT push remote**, et chaque policy RLS doit être validée via au moins 2 comptes test (un `discovery` 29 + un `local` 29 + un `local` 56) avant de passer à la tâche suivante. Une fuite GPS via le fil = catastrophe image. Cf risque #7 dans le ROADMAP.

---

# Bloc 0 — Décisions à verrouiller AVANT de coder (15 min, à valider par John)

Le ROADMAP §8 pose 4 décisions. Le brief propose les recommandations par défaut. **John doit lire et trancher** avant que Claude Code n'attaque le Bloc A.

> ✅ **VERROUILLÉ par John le 2026-05-21.** Les 4 recommandations sont validées telles quelles. Détail des décisions ci-dessous sous chaque point.

## 0.1 — Granularité du fil

**Recommandation** : un fil **par département** (`/fil/[dept]`) + un onglet "Mes follows" (`/fil?tab=follows`) + un onglet "Mon dept" qui présélectionne `profile.home_department` (= défaut sur `/fil` tout court).

**Pourquoi pas un fil global France** : avec 1 500 inscriptions cible J+45, un fil global noierait les locaux. Et notre angle = signal local. À reconsidérer post-Gate 2 si une dimension nationale (concours, événements) émerge.

**Action** : valider ou non par John. Si validé, la suite du brief s'applique tel quel.

> ✅ **Décision John (2026-05-21)** : fil **par département** validé. Pas de fil global France en v1. Onglets « Ton département » (défaut sur `home_department`) + « Tes follows » + « Tous les départements côtiers » (itinerant uniquement, cf E4).

## 0.2 — Posts génériques vs posts ancrés sur une catch

**Recommandation** : **les deux**. Un post peut être (a) un texte libre (question matos, alerte spot pollué, conditions du jour) ou (b) le partage d'une de tes catches du carnet (avec photo + conditions snapshot affichées en card).

**Implémentation** : le schéma DB le supporte déjà (`feed_posts.catch_id` nullable, `feed_posts.text` ≤ 2000 chars). Le composer aura un toggle "Partager une prise" qui ouvre un picker de tes 20 dernières catches.

> ✅ **Décision John (2026-05-21)** : les **deux** types de posts (texte libre + catch ancrée) validés.
>
> **Géoloc des posts ancrés sur une catch** : on **respecte le privacy de la catch** — pas de règle spéciale "masquage forcé" côté fil. Implémentation obligatoire : la vue `feed_posts_for_viewer` lit la catch **via `catches_for_viewer`** (déjà le cas dans B1, ligne `left join public.catches_for_viewer`), qui applique le floutage selon le viewer. Conséquence : la geom précise n'apparaît dans un post que si l'auteur a explicitement coché `reveal_precise_to_public=true` sur cette catch ; sinon les non-amis voient le point flouté 1 km. Le partage n'introduit **aucune** voie de contournement du floutage. ⚠️ Ne jamais lire `catches` en direct dans la vue/RPC du fil — toujours `catches_for_viewer` (CLAUDE.md règle #6).

## 0.3 — Modération

**Recommandation** : **libre au lancement**, comme prévu dans CLAUDE.md §8. `feed_posts.moderation_status` default `'approved'` reste tel quel. Ajout d'un bouton "Signaler" qui crée une ligne dans `reports`. Modération auto Claude API = sprint post-beta si volume reports > 5/jour.

**Bonus** : email alerte à John à chaque report (template Resend dispo sprint 11, en sprint 8 on logue en console + table `reports`).

> ✅ **Décision John (2026-05-21)** : modération **libre au lancement** validée. `moderation_status` default `'approved'`. Bouton « Signaler » → ligne dans `reports` + log console. Bascule en modération a priori (`'pending'`) seulement si volume reports > 5/jour. Email Resend reporté au sprint 11.

## 0.4 — Limites tier (verrouillé par CLAUDE.md §8, à coder)

| Tier | Lecture fil | Écriture/likes/comments |
|---|---|---|
| `anonymous` | ❌ (redirect login) | ❌ |
| `discovery` | ✅ uniquement `home_department` | ❌ (lecture seule, CTA "Passe en Local pour participer") |
| `local` | ✅ tous départements (lecture libre) | ✅ uniquement sur `home_department` |
| `itinerant` | ✅ tous départements | ✅ tous départements côtiers FR |

**Note** : la lecture cross-dept est ouverte aux `local` (motivation : voir ce qui se passe ailleurs ne coûte rien et nourrit la fidélité). C'est l'écriture qui est gatée par dept pour `local`.

---

# Bloc A — Pré-requis sécurité (4-5h)

> Cf risque ROADMAP §8 "Realtime + RLS = patterns subtils, fuite données" + backlog "Audit RLS systématique (à faire au début du sprint 8 avant d'ajouter les tables `feed_*`)".

## A1 — Audit RLS systématique sur les tables `feed_*` + `follows` (2h)

**Objectif** : valider ligne par ligne que les policies existantes (`002_rls.sql`) ne laissent rien fuiter, AVANT d'ajouter la couche tier.

> ✅ **Décision John (2026-05-21) — comptes test & abonnements** : Stripe n'arrive qu'au sprint 9. On **code le gating tier maintenant**, mais on le teste via un **seed dev/preview-only** (`supabase/seed_test_accounts.sql`, cf A0 ci-dessous) qui insère les lignes `subscriptions` des comptes test. Ce seed n'est **JAMAIS** appliqué en prod (aucune fausse subscription en prod). Un flag env Next ne suffit pas : le RLS et `can_post_in_department` tournent dans Postgres et ont besoin de vraies lignes `subscriptions` pour être testés.

## A0 — Seed dev des comptes test (`supabase/seed_test_accounts.sql`, dev/preview only) (30 min)

Créer les 5 comptes test via SQL (dev/preview uniquement), puis insérer leur profil + abonnement :

- `test_anon@carnet.test` — pas de compte créé (= utilisateur non authentifié dans la matrice)
- `test_disco_29@carnet.test` — `home_department='29'`, subscription `discovery`/`active` (créée d'office par le trigger `handle_new_user`, on n'y touche pas)
- `test_local_29@carnet.test` — `home_department='29'`, subscription **UPDATE** vers plan `local`, status `active`
- `test_local_56@carnet.test` — `home_department='56'`, subscription **UPDATE** vers plan `local`, status `active`
- `test_itin@carnet.test` — `home_department='29'`, subscription **UPDATE** vers plan `itinerant`, status `active`

⚠️ **Le trigger `handle_new_user` (004) crée déjà profil + subscription `discovery/active` à l'insert dans `auth.users`.** Le seed ne fait donc que **UPDATE** ces lignes (poser `username`/`home_department`/`onboarded` sur le profil, basculer le plan sur la subscription), jamais INSERT.

**Garde-fou** : entête du fichier en commentaire `-- ⚠️ DEV/PREVIEW ONLY — ne jamais appliquer en prod`. Ne pas inclure dans `supabase db push` automatique.

**Méthode audit** :
2. Pour chaque table (`feed_posts`, `feed_comments`, `feed_likes`, `follows`), pour chaque verbe (SELECT/INSERT/UPDATE/DELETE), construire une matrice : "user X peut faire Y sur ressource Z créée par W ?"
3. Tester via Supabase Studio SQL Editor en switchant `set local role authenticated; set local request.jwt.claims to '{"sub": "<user-id>"}'`. Document la sortie attendue / réelle.
4. Documenter dans `docs/sprint-8/rls-audit.md` : matrice 5×4×4 = 80 cases minimum.

**Critère d'acceptation**
- Document `docs/sprint-8/rls-audit.md` créé avec la matrice complète
- 0 cas en rouge (fuite ou bloquage légitime non documenté)
- Tous les écarts à corriger sont listés à part avec ID `RLS-FIX-XX` repris en A2

## A2 — Corriger les écarts RLS identifiés en A1 (1-2h, dépend des findings)

**Hypothèse de départ** (à confirmer par A1) :
- `feed_posts_insert_own` accepte tous les users authentifiés → DOIT être restreint à `local`/`itinerant` qui postent dans leur dept.
- `feed_comments_insert_own` idem.
- ~~`feed_likes` n'a pas de policy d'INSERT explicite~~ → **FAUX, vérifié** : `feed_likes_insert_own` ET `feed_likes_select_all` ET `feed_likes_delete_own` existent déjà (002_rls.sql l.160-169). B1 les droppe avant recréation (cf correctif §4 de B1).

**Action si confirmé** : créer la migration 017 (cf B1) qui ajoute les nouvelles policies tier-gated et drop les anciennes.

## A3 — Helper SQL `can_post_in_department(dept char(3))` (30 min)

**Fichier** : à inclure dans migration 017.

```sql
create or replace function public.can_post_in_department(dept char(3))
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Une seule requête : pas de CTE ni de tri (subscriptions.user_id est PRIMARY KEY,
  -- donc au plus une ligne par user). exists() retourne false si aucune ligne ne matche
  -- (discovery, status null, ou local sur un autre dept) → fail-closed.
  select exists (
    select 1
    from public.subscriptions s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
      and (
        s.plan = 'itinerant'
        or (s.plan = 'local' and dept = p.home_department)
      )
  );
$$;

comment on function public.can_post_in_department is
  'true si l''utilisateur courant a le tier requis pour poster/commenter/liker dans le département donné. Itinerant = tous depts. Local = home_department uniquement. Discovery/anonymous = false.';
```

**Critère d'acceptation**
- Fonction créée + commentée
- Testable via `select can_post_in_department('29')` en local SQL Editor avec différents JWT

---

# Bloc B — DB : migration 017 (3-4h)

## B1 — Créer `supabase/migrations/017_feed_tier_gating.sql` (1.5h)

Contenu de la migration :

```sql
-- ============================================================
-- Migration 017 — Sprint 8 : Fil communautaire (tier gating + vue + index)
-- ============================================================

-- 1) Helper : can_post_in_department
--    (cf bloc A3, code ci-dessus)

-- 2) RLS feed_posts : drop ancien INSERT + UPDATE, créer tier-gated
drop policy if exists "feed_posts_insert_own" on public.feed_posts;
drop policy if exists "feed_posts_update_own" on public.feed_posts;
drop policy if exists "feed_posts_delete_own" on public.feed_posts;

create policy "feed_posts_insert_tier_gated"
  on public.feed_posts for insert
  with check (
    auth.uid() = author_id
    and region is not null
    and public.can_post_in_department(region)
  );

create policy "feed_posts_update_own"
  on public.feed_posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "feed_posts_delete_own"
  on public.feed_posts for delete
  using (author_id = auth.uid());

-- 3) RLS feed_comments : tier-gated en INSERT
drop policy if exists "feed_comments_insert_own" on public.feed_comments;

create policy "feed_comments_insert_tier_gated"
  on public.feed_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

-- 4) RLS feed_likes : tier-gated en INSERT, suppression libre par l'auteur
-- NB: feed_likes_select_all + feed_likes_insert_own + feed_likes_delete_own
--     existent déjà depuis 002_rls.sql → on les droppe TOUTES avant de recréer
--     (create policy n'a pas de "if not exists" → sinon la migration plante).
drop policy if exists "feed_likes_insert_own" on public.feed_likes;
drop policy if exists "feed_likes_delete_own" on public.feed_likes;
drop policy if exists "feed_likes_select_all" on public.feed_likes;

create policy "feed_likes_select_all"
  on public.feed_likes for select using (true);

create policy "feed_likes_insert_tier_gated"
  on public.feed_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and public.can_post_in_department(p.region)
    )
  );

create policy "feed_likes_delete_own"
  on public.feed_likes for delete
  using (user_id = auth.uid());

-- 5) Index supplémentaires
create index if not exists feed_posts_region_created_idx
  on public.feed_posts (region, created_at desc)
  where moderation_status = 'approved';

create index if not exists feed_posts_text_trgm_idx
  on public.feed_posts using gin (text gin_trgm_ops);

create index if not exists feed_posts_author_idx
  on public.feed_posts (author_id, created_at desc);

-- 6) Vue feed_posts_for_viewer
--    Joint profile auteur + catch (si catch_id) + flag liked_by_me
create or replace view public.feed_posts_for_viewer as
select
  fp.id,
  fp.author_id,
  fp.catch_id,
  fp.text,
  fp.region,
  fp.likes_count,
  fp.comments_count,
  fp.created_at,
  fp.updated_at,
  -- Auteur
  prof.username       as author_username,
  prof.display_name   as author_display_name,
  prof.avatar_url     as author_avatar_url,
  prof.home_department as author_home_department,
  -- Catch (si liée, via la vue catches_for_viewer qui gère déjà le floutage)
  -- NB colonnes réelles : weight_g (grammes, integer) + photo_path (pas weight_kg/photo_url)
  c.species           as catch_species,
  c.size_cm           as catch_size_cm,
  c.weight_g          as catch_weight_g,
  c.caught_at         as catch_caught_at,
  c.photo_path        as catch_photo_path,
  c.technique         as catch_technique,
  c.spot_name         as catch_spot_name,
  sp.slug             as catch_spot_slug,   -- catches_for_viewer n'expose pas le slug → join spots
  -- Flag perso
  exists (
    select 1 from public.feed_likes l
    where l.post_id = fp.id and l.user_id = auth.uid()
  ) as liked_by_me
from public.feed_posts fp
join public.profiles prof on prof.id = fp.author_id
left join public.catches_for_viewer c on c.id = fp.catch_id
left join public.spots sp on sp.id = c.spot_id
where fp.moderation_status = 'approved';

comment on view public.feed_posts_for_viewer is
  'Vue de lecture du fil : joint auteur + catch floutée (via catches_for_viewer) + liked_by_me. Toujours utiliser cette vue, jamais la table feed_posts directement, pour éviter de leaker geom précis.';

-- 7) RPC nb posts récents par dept (pour onglets carnet/header)
create or replace function public.get_feed_unread_counts(viewer uuid)
returns table (region char(3), nb_posts_24h integer)
language sql
stable
security definer
set search_path = public
as $$
  select region, count(*)::integer as nb_posts_24h
  from public.feed_posts
  where moderation_status = 'approved'
    and created_at > now() - interval '24 hours'
    and region is not null
  group by region;
$$;

-- 8) Trigger touch_updated_at sur feed_posts (s'il n'existe pas)
drop trigger if exists touch_updated_at_feed_posts on public.feed_posts;
create trigger touch_updated_at_feed_posts
  before update on public.feed_posts
  for each row execute function public.touch_updated_at();

-- 9) RLS-FIX-04 / RLS-FIX-05 (findings audit A1, validés par John 2026-05-21)
--    « Fil = login requis » au niveau RLS, pas seulement via le redirect app.
--    Avant : un anonyme avec la clé publishable lisait posts approuvés + tous
--    commentaires/likes + tout le graphe de follows. On exige auth.uid() not null.

-- feed_posts : lecture réservée aux authentifiés (RLS-FIX-04)
drop policy if exists "feed_posts_select_approved" on public.feed_posts;
create policy "feed_posts_select_approved"
  on public.feed_posts for select
  using (
    auth.uid() is not null
    and (moderation_status = 'approved' or author_id = auth.uid())
  );

-- feed_comments / feed_likes / follows : SELECT réservé aux authentifiés (RLS-FIX-05)
drop policy if exists "feed_comments_select_all" on public.feed_comments;
create policy "feed_comments_select_authenticated"
  on public.feed_comments for select
  using (auth.uid() is not null);

drop policy if exists "feed_likes_select_all" on public.feed_likes;
create policy "feed_likes_select_authenticated"
  on public.feed_likes for select
  using (auth.uid() is not null);

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_authenticated"
  on public.follows for select
  using (auth.uid() is not null);
```

> ⚠️ Le §4 ci-dessus (feed_likes) recrée `feed_likes_select_all` puis le §9 le droppe pour le remplacer par `feed_likes_select_authenticated`. Quand tu écriras réellement la migration, **fusionne** : ne recrée pas `feed_likes_select_all` au §4, crée directement `feed_likes_select_authenticated`. (Le brief garde les deux étapes séparées pour la traçabilité des findings.)

**Critère d'acceptation**
- `supabase db reset` en local applique 001 → 017 sans erreur
- `supabase db push --linked` réussit en remote
- `select * from feed_posts_for_viewer limit 1` ne plante pas (table peut être vide, OK)
- `select can_post_in_department('29')` retourne `false` pour anon, `true` pour itinerant, `true`/`false` selon dept pour local
- **RLS-FIX-04/05** : en rôle `anon`, `select count(*)` sur `feed_posts`, `feed_comments`, `feed_likes`, `follows` retourne **0** (lecture fermée aux non-authentifiés)

## B2 — RPC `get_spot_activity(spot_id uuid, days integer)` — pour signal social (45 min)

**Fichier** : `supabase/migrations/018_get_spot_activity.sql` (séparée pour la rollback granulaire).

```sql
create or replace function public.get_spot_activity(p_spot_id uuid, p_days integer default 7)
returns table (
  catches_count integer,
  fishers_count integer,
  last_catch_at timestamptz,
  recent_catches jsonb  -- array max 3 items
)
language sql
stable
security definer
set search_path = public
as $$
  with relevant as (
    select c.*
    from public.catches_for_viewer c
    where c.spot_id = p_spot_id
      and c.caught_at > now() - (p_days || ' days')::interval
  ),
  agg as (
    select
      count(*)::integer                                                       as catches_count,
      count(distinct user_id)::integer                                        as fishers_count,
      max(caught_at)                                                          as last_catch_at
    from relevant
  ),
  top3 as (
    select jsonb_agg(t) as items
    from (
      select
        id,
        username, display_name, avatar_url,
        species, size_cm, weight_g, caught_at
      from relevant
      order by caught_at desc
      limit 3
    ) t
  )
  select
    agg.catches_count,
    agg.fishers_count,
    agg.last_catch_at,
    coalesce(top3.items, '[]'::jsonb) as recent_catches
  from agg, top3;
$$;

comment on function public.get_spot_activity is
  'Activité publique récente sur un spot. Lit via catches_for_viewer qui applique déjà privacy + floutage. Renvoie agrégats + 3 catches détaillées max.';
```

**Critère d'acceptation**
- `select * from get_spot_activity('<uuid spot pointe-du-raz>', 7)` renvoie une ligne (potentiellement 0/0/null/[] mais sans erreur)
- Un anonymous user appelant la RPC ne voit que les catches `public` (et jamais les `friends` d'un user inconnu) — validation via test SQL.

## B4 — `supabase/migrations/019_reports_details.sql` (10 min)

La table `reports` n'a pas de colonne pour le texte libre du `ReportDialog` (E5). On l'ajoute.

```sql
-- Migration 019 — Sprint 8 : colonne details sur reports (texte libre du signalement)
alter table public.reports
  add column if not exists details text check (char_length(details) <= 1000);

comment on column public.reports.details is
  'Texte libre optionnel saisi par le rapporteur (ReportDialog E5). reason = catégorie, details = précision.';
```

**Critère d'acceptation**

- `supabase db reset` applique 019 sans erreur
- `reports` possède la colonne `details` (nullable, ≤ 1000 chars)

## B3 — Regen `lib/types.ts` (5 min)

```bash
pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts
```

**Critère** : `feed_posts_for_viewer`, `get_feed_unread_counts`, `get_spot_activity`, `can_post_in_department` apparaissent dans les types. `pnpm typecheck` reste vert.

---

# Bloc C — Server Actions (5-6h)

## C1 — `app/actions/feed.ts` (3h)

Créer le fichier avec les actions suivantes. Chaque action :
- `'use server'` au top
- valide via zod
- check tier explicitement (ceinture + bretelles, même si RLS le bloque)
- `revalidatePath('/fil')` + path dépt si pertinent
- type de retour `{ ok: true, data } | { ok: false, error: string }`

```ts
// Actions à implémenter
createPost(input: { text?: string, catchId?: string, region: string }): Promise<...>
toggleLike(postId: string): Promise<...>     // upsert + delete cohérent
addComment(postId: string, text: string): Promise<...>
deletePost(postId: string): Promise<...>     // RLS gère mais double-check
deleteComment(commentId: string): Promise<...>
reportPost(postId: string, reason: 'spam'|'inapproprie'|'spot_burning'|'autre', details?: string): Promise<...>
```

**Règles métier** :
- `createPost` : exiger `text` OU `catchId`, pas les deux vides. Si `catchId`, vérifier que la catch appartient à l'auteur. `region` doit matcher un dept FR côtier (whitelist `lib/geo/coastal-departments.ts` à créer si manquante).
- `text` : trim + sanitize (pas de HTML, plain text + emojis OK). Limite 2000 chars (rappel : DB check).
- `addComment` : trim, 1-1000 chars.
- `reportPost` : insère dans `reports(reporter_id, target_type, target_id, reason, details)`. ⚠️ `target_type` doit valoir **`'post'`** (le check constraint de `reports` n'autorise que `'post'|'comment'|'catch'|'profile'|'spot'`, **pas** `'feed_post'`). La colonne `details` **n'existe pas encore** dans `reports` → ajoutée par la migration 019 (cf B4). `reason` stocke la catégorie (`spam`/`inapproprie`/`spot_burning`/`autre`), `details` le texte libre optionnel. Si plus de 3 reports sur le même post → log warn (à brancher Sentry sprint 11).

**Critère d'acceptation**
- Tests Vitest : `app/actions/__tests__/feed.test.ts` couvre les 6 actions × happy path + 1 cas d'erreur tier + 1 cas d'erreur validation = 24+ tests
- Chaque action retourne le type uniformisé `{ ok, ... }`
- `pnpm test` reste ≥ 116 + 24 = 140 vert

## C2 — `app/actions/follow.ts` (1h)

```ts
toggleFollow(targetUserId: string): Promise<...>   // upsert si pas suivi, delete sinon
getFollowSuggestions(): Promise<UserSuggestion[]>  // 5 suggestions, RPC ou query
listFollowers(userId: string): Promise<...>
listFollowing(userId: string): Promise<...>
```

**Règle métier** :
- Pas de check tier : suivre est gratuit (sinon le fil follows discovery est vide).
- `targetUserId != auth.uid()` (DB check le valide déjà).
- `getFollowSuggestions` : top 5 users du même `home_department` que moi, classés par `catches.created_at` desc sur 30j. Exclure ceux que je suis déjà.

**Critère** : tests Vitest dans `app/actions/__tests__/follow.test.ts`. 6 tests minimum.

## C3 — `lib/feed/coastal-departments.ts` (15 min)

```ts
export const COASTAL_DEPARTMENTS = [
  '06','13','14','17','22','29','30','33','34','35','40','44','50',
  '56','59','62','64','66','76','80','83','85','2A','2B',
  // DOM : à exclure v1 (Stripe Tax + couverture) — laisser commentés
  // '971','972','973','974','976',
] as const

export type CoastalDepartment = typeof COASTAL_DEPARTMENTS[number]

export function isCoastalDepartment(dept: string): dept is CoastalDepartment {
  return COASTAL_DEPARTMENTS.includes(dept as CoastalDepartment)
}
```

**Critère** : 24 depts, conforme cible "France métropolitaine côtière". Test unitaire isCoastalDepartment vert.

## C4 — Pas de markdown : sanitization (20 min)

Pour éviter XSS : tous les `<PostCard text>` et `<CommentItem text>` sont rendus en **plain text avec newline preserved** via `whitespace-pre-wrap` + sans `dangerouslySetInnerHTML`. Pas de markdown lib v1.

**Décision** : on autorise emojis (UTF-8 OK) et URLs cliquables détectées via regex simple (lib `linkify-react` à AJOUTER en dep, ~6kb min, OK).

```bash
pnpm add linkify-react linkifyjs
```

**Critère** : un post contenant `<script>alert(1)</script>` s'affiche tel quel (en texte échappé) sans exécution. Test avec un compte test.

---

# Bloc D — Realtime (2h)

## D1 — Hook `useFeedRealtime(region)` (1h)

**Fichier** : `lib/feed/useFeedRealtime.ts`

```ts
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useFeedRealtime(
  region: string,
  onInsert: (postId: string) => void
) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`feed:${region}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_posts',
          filter: `region=eq.${region}`,
        },
        (payload) => onInsert(payload.new.id as string)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [region, onInsert])
}
```

**Critère** : poster depuis un onglet incognito apparaît en < 3s dans l'autre onglet (test manuel obligatoire).

## D2 — Hook `usePostInteractionsRealtime(postId)` (1h)

Idem mais sur `feed_likes` et `feed_comments`, filtré par `post_id`, pour incrémenter compteurs live dans `<PostCard>`.

**Critère** : like depuis un onglet incognito incrémente le compteur dans l'autre onglet sans refresh.

---

# Bloc E — Composants UI (6-7h)

> Charte design : navy-900, teal-500, sand-50, Inter, radius lg=22px. Cf CLAUDE.md §6.

## E1 — `components/feed/PostCard.tsx` (2h)

Carte d'un post :
- Header : avatar + `display_name` (fallback `@username`) + petit `· dept 29` + `· il y a 2h` (date-fns `formatDistanceToNowStrict` locale `fr`)
- Body : texte (whitespace-pre-wrap + linkify) avec `line-clamp-6` + "Voir plus" si tronqué
- Si `catch_id` : encart catch en card teal-50 (espèce + taille/poids + photo thumbnail + technique + lien `/spots/[slug]`)
- Footer actions : Like (cœur, compteur), Commentaires (bulle, compteur — déplie le `CommentThread`), Signaler (icône drapeau, ouvre `ReportDialog`), Partager (copie URL `/fil/[dept]?post=[id]` au clipboard + toast)
- Si auteur = moi : menu `…` avec "Supprimer"
- Tap targets ≥ 44px

**Critère** : visible OK sur 320px (smallest mobile) et 1440px (desktop). Aucun overflow horizontal.

## E2 — `components/feed/PostComposer.tsx` (2h)

Composer avec 2 modes :
- "Texte" (défaut) : textarea (rows=3, auto-grow, max 2000 chars, compteur visible)
- "Partager une prise" : ouvre un picker bottom-sheet listant tes 20 dernières catches (avatar/photo + espèce + taille + date) → sélection → catch pré-attachée + textarea optionnelle pour commenter

**Tier gating UI** :
- `discovery` : composer désactivé + bandeau "Passe en Local pour participer au fil de ton département" + CTA `/tarifs`
- `local` 29 lisant le fil 56 : composer désactivé + bandeau "Tu es en Local 29. Pour poster ici, passe Itinérant" + CTA `/tarifs`
- `local` 29 lisant le fil 29 : composer actif
- `itinerant` : composer actif partout

**Critère** : 4 captures écran (les 4 cas ci-dessus) dans `docs/sprint-8/screenshots/composer-tiers.png` pour validation.

## E3 — `components/feed/CommentThread.tsx` (1.5h)

- Liste plate (1 niveau, pas de reply-to-reply v1)
- Input "Ton commentaire…" en bas (tier-gated comme E2)
- `<CommentItem>` : avatar + username + texte + date + bouton supprimer si auteur
- Pagination "Voir 10 commentaires de plus" si > 10
- Si > 0 et fermé par défaut : afficher juste "Voir les N commentaires"

**Critère** : commenter incrémente le compteur live dans `<PostCard>` parent (via Realtime D2).

## E4 — `components/feed/FeedTabs.tsx` (45 min)

3 onglets en haut du `/fil` :
- "Ton département" (default, `region = profile.home_department`)
- "Tes follows" (filtre `author_id IN (select following_id from follows where follower_id = me)`)
- "Tous les départements côtiers" (visible uniquement pour `itinerant`, sinon caché)

**Critère** : URL state via search params (`?tab=follows`), back/forward navigation propre.

## E5 — `components/feed/ReportDialog.tsx` (45 min)

Dialog shadcn avec 4 radios (spam / inapproprié / spot-burning / autre) + textarea "Précise (optionnel)" + bouton "Signaler".

**Critère** : après envoi, toast "Merci, on regarde." + dialog ferme. Ligne dans `reports`.

## E6 — `components/feed/EmptyFeed.tsx` (30 min)

État vide :
- Si dept du user, 0 post : "Sois le premier à poster dans le 29." + CTA composer focus
- Si tab follows, 0 follow : "Tu ne suis personne. Découvre des pêcheurs de ton coin." + CTA `/follows`
- Si tab follows, follows existent mais 0 post récent : "Calme plat. Tes follows n'ont rien posté ces 7 derniers jours."

**Critère** : 3 illustrations distinctes selon contexte. Pas d'image, juste copy + emoji discret + CTA.

---

# Bloc F — Routes (3h)

## F1 — `app/(app)/fil/page.tsx` (1h)

**ATTENTION** : `app/(marketing)/fil/page.tsx` existe (stub sprint 7.5). À supprimer dans cette tâche (sinon collision route).

```bash
git rm app/(marketing)/fil/page.tsx
```

Création de la page authentifiée :
- Server Component qui resolve `user`, `profile`, `tier`
- Si `tier === 'anonymous'` → `redirect('/auth/login?redirect=/fil')`
- Sinon : redirect interne vers `/fil/[home_department]` (ou un default si home_department null)
- Composé de `<FeedTabs>` + `<PostComposer>` + `<PostList>`
- `<PostList>` = client component qui charge initial 20 posts via Server Action `getFeedPage(region, cursor?)` + use `useFeedRealtime(region)` pour les nouveaux

**Critère** : `/fil` accessible uniquement loggé. SSR la première page. Realtime active après hydration.

## F2 — `app/(app)/fil/[department]/page.tsx` (45 min)

Page dépt-spécifique :
- Si dept invalide ou non côtier → `notFound()`
- Si user pas autorisé en lecture (cas non prévu, on accepte lecture pour tous tiers ≥ discovery sur tous depts en SELECT) → cf B1 § "lecture cross-dept ouverte aux local"
- Title : `Fil du Finistère (29) · Carnet de Pêche`
- Metadata OG dynamique

**Critère** : `/fil/29`, `/fil/56`, `/fil/13` rendent. `/fil/75` (intérieur) → 404. `/fil/abc` → 404.

## F3 — `app/(app)/u/[username]/page.tsx` — profil public (1h)

Page profil public :
- Header : avatar XL + display_name + `@username` + `· dept` + bio + bouton "Suivre"/"Suivi(e)" si pas moi
- Stats publiques : nb prises publiques (catches privacy='public'), espèces favorites (chips), techniques (chips), depuis (date created_at).
- Tabs : "Posts" (ses feed_posts), "Prises publiques" (ses catches.privacy='public')
- SSR avec metadata dynamique pour SEO (?  on peut indexer ou pas — décision : `noindex` v1, pas envie de rendre des profils trouvables Google sans consentement explicite)

**Critère** :
- `/u/seychi` (= username) rend
- Bouton "Suivre" toggle bien follow/unfollow, optimistic update
- `<head>` contient `<meta name="robots" content="noindex">`

## F4 — `app/(app)/follows/page.tsx` (15 min)

Page liste :
- Section "Tu suis (N)" : liste
- Section "Te suivent (M)" : liste
- Section "Suggestions pour toi" : 5 cards (E2.3 `getFollowSuggestions`)

**Critère** : suivre quelqu'un depuis cette page le déplace de "Suggestions" vers "Tu suis".

---

# Bloc G — Signal social local (fiche spot) (1.5h)

## G1 — `components/spots/SpotActivitySection.tsx` (1h)

À insérer dans `app/(marketing)/spots/[slug]/page.tsx` après la section conditions, avant les guides liés.

- Server Component : appelle RPC `get_spot_activity(spot_id, 7)`
- Si `catches_count === 0` → ne rend rien (pas de placeholder vide qui ressemble à une feature manquante)
- Sinon, encart :
  - Header : "Activité récente"
  - Phrase : "X pêcheurs ont logué Y prises ici les 7 derniers jours."
  - Liste 3 dernières prises (avatar + @username + espèce/taille + il y a Nh, sans coords)
  - CTA discret : "Logue ta prise" → `/carnet/nouvelle?spot_id=X`

**Critère** :
- Fiche spot avec ≥ 1 catch publique 7j : encart visible
- Fiche spot avec 0 catch 7j : pas d'encart (DOM-free)
- Aucune coord GPS exposée dans le DOM (vérif via View Source)

## G2 — Test e2e manuel + screenshot (30 min)

- Loguer une catch publique sur "pointe-du-raz" (compte test_local_29) → vérifier que `/spots/pointe-du-raz` affiche l'encart en < 30s (cache ISR 60s acceptable)
- Test : aucun marquage de coords précises dans la card

---

# Bloc H — Profil public + Mes follows (déjà partagé en F3/F4, voir là) (-)

(Tout est dans F3/F4. Bloc gardé vide pour le numéro mental.)

---

# Bloc I — Seed data pour beta (1h)

> Risque ROADMAP "Fil vide au lancement = UX déprimante". Mitigation = seed.

## I1 — `supabase/seed_sprint_8.sql` (1h)

**Cibles** : 3 départements (29 Finistère, 56 Morbihan, 22 Côtes-d'Armor) × 8 posts = 24 posts seed.

Contenu type :
- 12 posts texte libre : questions matos, alertes spot, observations conditions, retours session
- 12 posts ancrés sur des catches (utiliser les catches déjà seedées Bretagne du seed.sql initial)
- Auteurs : créer 6 comptes seed `seed_bzh_1@carnet.test` à `seed_bzh_6@carnet.test`, profile complet (avatar généré via DiceBear ou similaire, home_department, techniques, etc.)
- Dates étalées sur les 14 derniers jours

**Règle** : seed uniquement appliqué en dev/preview. En prod, on les active manuellement le J-3 de la beta.

**Critère** :
- `psql ... -f supabase/seed_sprint_8.sql` ajoute 6 profiles + 24 posts sans erreur
- `/fil/29` affiche 8 posts sur les 14 derniers jours après seed
- Bouton dans `/dev/seed-feed` (route guard `NODE_ENV=development`) qui lance le seed à la demande

---

# Bloc J — Critères de sortie + métriques (30 min)

## J1 — Tests automatisés

- `pnpm test` ≥ 140/140 vert (116 base + 24+ ajoutés)
- `pnpm lint` = 0 erreur
- `pnpm typecheck` = 0 erreur
- CI GitHub Actions verte sur `main`

## J2 — Tests manuels obligatoires (checklist)

À cocher dans `docs/sprint-8/qa-checklist.md` avant de marquer le sprint comme terminé :

**Tier `discovery` (compte test_disco_29)**
- [ ] `/fil` redirige vers `/fil/29`
- [ ] Lecture du fil 29 OK (8 posts visibles)
- [ ] Composer désactivé + bandeau "Passe en Local…"
- [ ] Cliquer like sur un post → toast "Passe en Local pour interagir"
- [ ] Signaler reste accessible (utile contre spam même en discovery) → ligne créée dans `reports`
- [ ] `/fil/56` accessible en lecture seule
- [ ] Profil public `/u/test_local_29` accessible, bouton "Suivre" actif (follow gratuit)

**Tier `local` 29 (compte test_local_29)**
- [ ] Composer actif sur `/fil/29`
- [ ] Composer désactivé sur `/fil/56` avec bandeau "Local 29, passe Itinérant pour poster ailleurs"
- [ ] Créer un post texte → apparaît en haut du fil 29 en < 3s côté autre onglet
- [ ] Partager une catch → card catch s'affiche, photo OK, coords floutées
- [ ] Like sur un post → compteur +1 live côté autre onglet
- [ ] Commenter → compteur commentaires +1 live
- [ ] Supprimer mon post → disparaît immédiatement, fil rechargé propre
- [ ] Suivre `test_local_56` → onglet "Tes follows" inclut désormais ses posts

**Tier `itinerant`**
- [ ] Composer actif sur `/fil/29` ET `/fil/56` ET `/fil/13`
- [ ] Onglet "Tous les départements côtiers" visible
- [ ] Poster sur `/fil/13` (Méditerranée) → OK

**Anonymous**
- [ ] `/fil` → redirect login
- [ ] `/u/seychi` (profil public) → accessible OU redirect login (décision John). Recommandation : redirect login pour cohérence + privacy.

**Signal social spot (fiche spot)**
- [ ] `pointe-du-raz` avec ≥ 1 catch 7j → encart "Activité récente" visible
- [ ] `pointe-du-raz` avec 0 catch 7j → pas d'encart
- [ ] `view-source` de la fiche : aucune lat/long précise dans le DOM des 3 catches de l'encart

**Sécurité (red team rapide)**
- [ ] Forger un POST direct à Supabase REST avec un JWT discovery vers `feed_posts` → 401/403
- [ ] Forger un POST avec JWT local 56 et `region='29'` → 401/403 (RLS A2)
- [ ] Tenter de DELETE un post d'un autre user → 0 row affected
- [ ] Tenter de SELECT directement `feed_posts` (pas la vue) avec catch_id pointant catch d'un autre user privée → ne doit pas leaker geom (catches privées invisibles, mais vérif)

## J3 — Métriques à logger (Plausible/PostHog setup sprint 11)

Documenter dans `docs/sprint-8/metrics-to-track.md` la liste des events à câbler quand PostHog sera setup au sprint 11 :
- `feed_post_created` (props: region, has_catch, char_count)
- `feed_post_liked` / `unliked`
- `feed_comment_created`
- `feed_post_reported`
- `follow_added` / `removed`
- `feed_tab_changed`
- `composer_blocked_by_tier` (props: viewer_tier, region)

## J4 — Documentation

- [ ] Mettre à jour `CLAUDE.md` §2 : sprint 8 ✅, sprint 9 🔜
- [ ] Mettre à jour `docs/ROADMAP.md` : marquer sprint 8 ✅ + ajouter les findings/décisions retenues
- [ ] Créer `docs/sprint-8/RECAP.md` au format des recap précédents (livré / dette / à faire suivi)

---

# Estimation totale

| Bloc | Coût estimé |
|---|---|
| 0 — Décisions | 15 min (John) |
| A — Pré-requis sécurité | 4-5h |
| B — DB migrations 017/018 | 3-4h |
| C — Server Actions | 5-6h |
| D — Realtime | 2h |
| E — Composants UI | 6-7h |
| F — Routes | 3h |
| G — Signal social spot | 1.5h |
| H — (intégré F3/F4) | — |
| I — Seed beta | 1h |
| J — QA + doc | 1h (hors temps tests manuels) |

**Total Claude Code** : ~28-32h sur 2 semaines = ~3-4h/jour, soutenable.
**Total John** : 0.25h Bloc 0 + 1h validation tests manuels Bloc J + revues intermédiaires.

---

# Risques et mitigations spécifiques sprint 8

| Risque | Probabilité | Mitigation immédiate |
|---|---|---|
| Fuite GPS via la vue `feed_posts_for_viewer` | Faible si on passe par `catches_for_viewer` | Bloc A2 audit RLS + Bloc J QA red team |
| RLS qui bloque trop (faux négatif) | Moyenne | Tester chaque policy avec les 5 comptes test du Bloc A |
| Realtime channel mal nettoyé → memory leak côté client | Moyenne | Cleanup explicite dans useEffect (D1/D2), test 5 navigations |
| Composer tier-gated bypass via Server Action direct | Moyenne | Triple check : RLS (B1) + Server Action explicite (C1) + UI (E2) |
| Seed trop visible (looks fake) | Forte si on bâcle | Varier les avatars, dates, longueurs, sujets — relire chaque post avant insert |
| Discovery user qui pourrait poser une plainte "j'ai pas pu poster" | Faible | Copy claire dans le bandeau composer (E2) + CTA Local |

---

# Checklist sortie sprint 8 (à valider par John en fin de sprint)

**Bloc A — Sécurité**
- [ ] `docs/sprint-8/rls-audit.md` complété, 0 case rouge
- [ ] 5 comptes test créés et documentés

**Bloc B — DB**
- [ ] Migrations 017 + 018 appliquées en remote (prod Supabase)
- [ ] `lib/types.ts` regen, commit
- [ ] `pnpm typecheck` vert

**Bloc C — Actions**
- [ ] 6 actions feed + 4 actions follow, toutes testées
- [ ] Tests Vitest ≥ 24 nouveaux

**Bloc D — Realtime**
- [ ] Hook `useFeedRealtime` testé manuellement
- [ ] Hook `usePostInteractionsRealtime` testé manuellement

**Bloc E — UI**
- [ ] 6 composants livrés (PostCard, Composer, CommentThread, FeedTabs, ReportDialog, EmptyFeed)
- [ ] Captures d'écran 4 tiers dans `docs/sprint-8/screenshots/`

**Bloc F — Routes**
- [ ] `/fil`, `/fil/[dept]`, `/u/[username]`, `/follows` accessibles
- [ ] `app/(marketing)/fil/page.tsx` supprimé (collision)

**Bloc G — Spot**
- [ ] Encart "Activité récente" visible sur ≥ 1 fiche spot
- [ ] Aucune coord précise leakée

**Bloc I — Seed**
- [ ] 6 profils + 24 posts seed appliqués en preview
- [ ] Route dev `/dev/seed-feed` guardée NODE_ENV

**Bloc J — QA**
- [ ] Checklist QA J2 cochée à 100%
- [ ] `pnpm test` ≥ 140/140 vert
- [ ] CI verte

**Méta**
- [ ] CLAUDE.md §2 mis à jour
- [ ] ROADMAP.md mis à jour
- [ ] `docs/sprint-8/RECAP.md` rédigé

Une fois ces points cochés → sprint 9 (Stripe paiements).

---

*Brief généré le 2026-05-21. Voir aussi `docs/ROADMAP.md` §"Sprint 8 — Fil communautaire" et `docs/sprint-7.5/brief-sprint-7.5.md` pour le format de référence.*
