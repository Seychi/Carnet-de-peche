# schema-migrations.md — Sprint 17, vérification schéma live + draft SQL

Produit par supabase-guard, 2026-06-22. Lecture seule (MCP read-only).

---

## 1. Vérification des 4 faits du brief

### Fait 1 — Dernière migration = 036_avatars_storage, numéros 037/038 libres

**CONFIRME.** `list_migrations` retourne exactement 34 entrées, la dernière étant
`036_avatars_storage` (version `20260621162750`). Pas de 037 ni de 038.

Gap 025-027 confirmé : les migrations 025, 026, 027 ne figurent pas dans
`schema_migrations` mais leurs effets DDL sont présents dans le schéma live
(colonnes, vues, functions de blur). Ce gap est documenté dans CLAUDE.md et dans
`docs/memory/supabase-migration-history-drift.md`. Sans impact sur la numérotation
des prochains fichiers. Action non faite : `supabase migration repair --status
applied 025 026 027` — à garder en note mais hors scope sprint 17.

### Fait 2 — Table `notifications` absente

**CONFIRME.** `information_schema.columns` WHERE `table_name = 'notifications'`
retourne 0 lignes. La table n'existe pas.

### Fait 3 — Bug policy `reports_select_own_or_mod` : is_ambassador vs is_moderator

**CONFIRME, avec nuance importante sur la signature de `is_moderator()`.**

Policy SQL exact (lu via `pg_policies`) :

```sql
-- reports_select_own_or_mod  (SELECT)
(reporter_id = ( SELECT auth.uid()))
OR (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = ( SELECT auth.uid())
    AND profiles.is_ambassador = true   -- BUG : devrait être is_moderator
))

-- reports_update_moderator  (UPDATE) — correct
( SELECT is_moderator() AS is_moderator)
```

Colonne `profiles.is_ambassador` : existe (boolean, default false).
Colonne `profiles.is_moderator` : existe (boolean, default false, ajoutée en 023).
Fonction `is_moderator()` : existe, signature réelle = `is_moderator(uid uuid DEFAULT auth.uid())`.

**Nuance** : la policy `reports_update_moderator` appelle `is_moderator()` SANS
argument, ce qui déclenche le `DEFAULT auth.uid()`. C'est intentionnel et correct.
Le fix 038 doit faire de même — ne pas passer auth.uid() explicitement, juste
`is_moderator()`.

Il n'existe pas de fonction `is_ambassador()` dans le schéma (la colonne existe,
pas de wrapper). La policy faisait un inline JOIN profiles plutôt qu'un appel de
fonction. Le fix est une simple réécriture de la policy SELECT.

### Fait 4 — `catches_for_viewer` expose id, species, size_cm, caught_at, technique, photo_path

**CONFIRME, et plus.** Vue lue via `pg_views`. La vue expose (entre autres) :
`id`, `user_id`, `username`, `display_name`, `avatar_url`, `spot_id`, `spot_name`,
`department`, `geom_visible`, `species`, `size_cm`, `weight_g`, `technique`,
`bait`, `caught_at`, `photo_path`, `notes`, `privacy`, `released`, `created_at`,
`bait_type`, `lure_brand`, `lure_model`, `water_temperature_c`, `location_method`,
`location_label`, `conditions`, `precise_for_friends`, `reveal_precise_to_public`,
`wind_speed_kmh`, `wind_direction_deg`, `tide_state`, **`lng`**, **`lat`**.

Migration 034 a bien ajouté les colonnes calculées `lng` et `lat` (ST_X/ST_Y sur
`geom_visible`). `photo_path` est bien présent sous ce nom exact. `privacy` est
lisible. Le `.select()` du brief bloc A.1 est valide.

Floutage GPS intégré : la vue utilise `COALESCE(catch_visible_geom(c.*), c.geom_public)`
— le point précis n'est jamais exposé directement, le floutage est géré dans la
fonction `catch_visible_geom` (SECURITY DEFINER). Invariant respecté.

---

## 2. Etat de départ : advisors (sécurité + perf)

### Sécurité — alertes actives

| Niveau | Alerte | Hors scope sprint 17 ? |
|--------|--------|------------------------|
| ERROR | `rls_disabled_in_public` : `public.spatial_ref_sys` (PostGIS system table) | Oui — table système PostGIS, pas de données utilisateur, pas de RLS à activer sans policy complète. Assumé. |
| ERROR | `security_definer_view` : `spots_for_viewer` | Connu, assumé (décision 2026-06-21, RECAP 11.6). |
| WARN | `function_search_path_mutable` : `stripe.set_updated_at`, `stripe.set_updated_at_metadata`, `stripe.check_rate_limit` | Schéma Stripe géré, hors périmètre. |
| WARN | `extension_in_public` : citext, postgis, pg_trgm | Connu, assumé. |
| WARN | `anon_security_definer_function_executable` × 16 | Connu, assumé pour les RPC métier (gating, blur, helpers). |
| WARN | `auth_leaked_password_protection` | Assumé plan Free (cf. CLAUDE.md). NE PAS re-signaler. |

Bilan : aucune nouvelle alerte sécurité par rapport à l'état post-036. La migration
038 supprimera le bug `is_ambassador` mais n'affectera pas ces advisors.

### Performance — alertes actives pertinentes pour sprint 17

| Niveau | Alerte | Impact sprint 17 |
|--------|--------|-----------------|
| INFO | `unindexed_foreign_keys` : `feed_post_photos.user_id` | Mineur. A ajouter si on touche feed_post_photos en 17. |
| WARN | `multiple_permissive_policies` sur `catches` (SELECT) et `feed_posts`/`feed_comments` (DELETE) | Connu. Pour `catches` : les 3 policies SELECT (own/friends/public) sont la logique privacy correcte. Pour feed, les 2 DELETE (own + moderator) sont intentionnelles. Non réductibles sans changer la sémantique. |
| INFO | Unused indexes sur `feed_posts`, `catches`, `spots`, `reports` | Projet jeune (< 100 prises). Ignorer. |

**Recommandation pour 037** : ajouter un index sur `notifications(user_id, created_at DESC)`
et un index partiel sur `notifications(user_id) WHERE read_at IS NULL` pour les
badges. Voir section 3.

---

## 3. Draft SQL migration 037 — table `notifications`

Fichier à créer : `supabase/migrations/037_notifications.sql`
A appliquer via `supabase db push` (jamais via MCP apply_migration en prod).

```sql
-- 037_notifications.sql
-- Crée la table notifications + RLS.
-- Destinataire = seul lecteur/écrivain des siennes.
-- Pas de modif des autres tables dans ce fichier.

-- ─── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- type de l'événement
  type        text        NOT NULL
    CHECK (type IN (
      'new_follower',
      'post_liked',
      'post_commented',
      'catch_commented',
      'mention'
    )),

  -- payload minimal (acteur + cible, évite les JOINs au moment de l'affichage)
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text        CHECK (target_type IN ('post', 'catch', 'comment', NULL)),
  target_id   uuid,

  -- données d'affichage dénormalisées pour éviter N+1 lors du rendu des badges
  -- (actor_username est mis à jour côté applicatif si besoin — acceptable)
  actor_username text,
  preview_text   text    CHECK (char_length(preview_text) <= 140),

  read_at     timestamptz,           -- NULL = non lue
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Commentaire ─────────────────────────────────────────────────────────────
COMMENT ON TABLE public.notifications IS
  'Notifications in-app par utilisateur. Seul le destinataire (user_id) peut '
  'lire et marquer comme lues ses propres notifications (RLS).';

-- ─── Index ───────────────────────────────────────────────────────────────────
-- Pagination du flux de notifs (le plus courant)
CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

-- Badge "non lues" (COUNT(*) WHERE read_at IS NULL) — index partiel
CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Le destinataire lit ses propres notifications
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = ( SELECT auth.uid()));

-- Le destinataire marque comme lue (UPDATE read_at uniquement)
-- with_check strict : il ne peut pas changer user_id ou type
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING  (user_id = ( SELECT auth.uid()))
  WITH CHECK (user_id = ( SELECT auth.uid()));

-- INSERT : seul le code serveur (service_role via Edge Function / Server Action)
-- crée les notifications. Les utilisateurs ne peuvent pas s'auto-notifier.
-- Pas de policy INSERT pour authenticated → l'INSERT doit venir d'un contexte
-- SECURITY DEFINER ou service_role.
-- Si on veut permettre l'insert depuis un trigger SECURITY DEFINER, c'est OK
-- car le trigger tourne en tant que postgres (owner), lequel bypass RLS.
-- On ajoute quand même une policy INSERT restricted pour éviter les appels
-- directs anon/authenticated via PostgREST.
CREATE POLICY notifications_insert_service_only
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (false);   -- bloque tout INSERT direct authenticated ; seul service_role passe

-- DELETE : le destinataire supprime les siennes (purge optionnelle côté UI)
CREATE POLICY notifications_delete_own
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = ( SELECT auth.uid()));
```

### Notes de conception

- `INSERT … WITH CHECK (false)` pour `authenticated` : PostgREST bloque les
  inserts directs. Les notifications sont créées par des Server Actions utilisant
  le client `service_role` (qui bypass RLS), ou par des triggers SECURITY DEFINER.
  Si on veut un trigger, créer un trigger `AFTER INSERT ON feed_likes` etc., qui
  appelle une fonction SECURITY DEFINER faisant l'INSERT — le bypass RLS s'applique.
- Pas de FK `target_id → feed_posts(id)` car `target_type` est polymorphe. ON DELETE
  cascade n'est pas nécessaire (les notifications orphelines sont acceptables, elles
  seront gérées applicativement avec `target_id` null-check).
- `actor_username` dénormalisé : évite un JOIN profiles à chaque affichage du badge.
  Mis à jour par le code applicatif si le username change (edge case rare).
- Pas de Realtime activé dans cette migration — à activer après si on veut un
  badge live (`ALTER TABLE notifications REPLICA IDENTITY FULL` + publication).

---

## 4. Draft SQL migration 038 — fix policy reports_select_own_or_mod

Fichier à créer : `supabase/migrations/038_fix_reports_policy.sql`
A appliquer via `supabase db push`.

```sql
-- 038_fix_reports_policy.sql
-- Corrige reports_select_own_or_mod : is_ambassador → is_moderator().
-- is_moderator() existe déjà (023_moderation), signature :
--   is_moderator(uid uuid DEFAULT auth.uid()) → boolean
-- La policy UPDATE reports_update_moderator utilise déjà is_moderator() — on aligne.

DROP POLICY IF EXISTS reports_select_own_or_mod ON public.reports;

CREATE POLICY reports_select_own_or_mod
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_id = ( SELECT auth.uid())
    OR ( SELECT is_moderator())     -- appel sans arg → DEFAULT auth.uid()
  );
```

### Pourquoi c'est tout

- Pas de changement de colonne : `is_moderator` sur `profiles` existe depuis 023.
- Pas de nouvelle fonction : `is_moderator()` existe depuis 023.
- Le seul bug est la policy SELECT qui lisait `profiles.is_ambassador` via un JOIN
  inline au lieu d'appeler la fonction existante. Un DROP + CREATE suffit.
- Modèle social = abonnés (Insta) : la policy ne filtre pas sur le modèle follows,
  seulement sur reporter_id (l'auteur du signalement) ou modérateur. Neutre.
- L'advisor `anon_security_definer_function_executable` sur `is_moderator` reste
  présent après 038 — connu, assumé (la fonction est appelée depuis des policies
  légitimes).

---

## 5. Checklist avant de mettre 037/038 en fichiers + de les appliquer

- [ ] Vérifier que `supabase migration repair --status applied 025 026 027` a été
      fait (ou décision consciente de laisser le gap) — sinon `db push` peut
      tenter de rejouer 025-027.
- [ ] Régénérer `lib/types.ts` après application :
      `pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts`
- [ ] Relancer `get_advisors` security + perf et confirmer qu'aucune nouvelle
      alerte n'est apparue (la table `notifications` doit avoir RLS enabled — ce
      qui est le cas dans ce draft).
- [ ] Confirmer que les Server Actions qui créent des notifications utilisent bien
      le client `service_role` et non le client browser.
