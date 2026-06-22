-- 037_notifications.sql — Sprint 17 Bloc B (+ index recherche Bloc D)
-- Crée la table notifications + RLS + Realtime, et l'index trigram sur
-- profiles.username pour la recherche de pêcheurs. Aucune modif des autres tables.

-- ─── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type        text        NOT NULL
    CHECK (type IN (
      'new_follower',
      'post_liked',
      'post_commented',
      'catch_commented',
      'mention'
    )),

  -- payload minimal (acteur + cible) pour éviter les JOINs à l'affichage
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text        CHECK (target_type IS NULL OR target_type IN ('post', 'catch', 'comment')),
  target_id   uuid,

  -- données d'affichage dénormalisées (anti N+1 sur le badge / la liste)
  actor_username text,
  preview_text   text     CHECK (preview_text IS NULL OR char_length(preview_text) <= 140),

  read_at     timestamptz,            -- NULL = non lue
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  'Notifications in-app par utilisateur. Seul le destinataire (user_id) lit/maj/supprime les siennes (RLS). INSERT réservé au code serveur service_role (pas d''auto-notif).';

-- ─── Index ───────────────────────────────────────────────────────────────────
CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

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
  USING (user_id = (SELECT auth.uid()));

-- Le destinataire marque comme lue (ne peut pas changer user_id)
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- INSERT direct bloqué pour authenticated → seul service_role (Server Action) ou
-- un trigger SECURITY DEFINER (owner postgres, bypass RLS) crée des notifications.
CREATE POLICY notifications_insert_service_only
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Le destinataire purge les siennes (optionnel côté UI)
CREATE POLICY notifications_delete_own
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── Realtime (badge live) ───────────────────────────────────────────────────
-- Sans ces deux lignes, aucun event Realtime n'arrive (cf. feed_posts avant 020).
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ─── Recherche de pêcheurs (Bloc D) ──────────────────────────────────────────
-- profiles.username est citext → index trigram directement sur la colonne
-- (ne PAS faire lower(username), citext le rend redondant et casse selon PG).
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx
  ON public.profiles USING gin (username gin_trgm_ops);
