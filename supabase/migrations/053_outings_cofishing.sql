-- 053_outings_cofishing.sql — Sprint 25, WS-D (co-pêchage). 🔴 GPS = CRITIQUE.
-- Proposer/rejoindre une sortie à plusieurs. Décision D-D3 : localisation =
-- DÉPARTEMENT + LIBELLÉ LIBRE, AUCUNE coordonnée précise. Aucune colonne geom →
-- pas de 4e surface de fuite (le floutage 3 couches reste intact, rien à flouter ici).
--
-- Invariants : RLS fail-closed d'abord, vue security_invoker (leçon 031), notif via
-- service_role uniquement, can_post_in_department + rate-limit (anti-spam, calqué 022).

-- ─── Propositions de sortie ───────────────────────────────────────────────────
CREATE TABLE public.outing_proposals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department  text        NOT NULL,
  -- Libellé LIBRE saisi par l'hôte (« plage de la Govelle », « digue nord »).
  -- JAMAIS une coordonnée : aucune colonne geom/lat/lng sur cette table.
  area_label  text        CHECK (area_label IS NULL OR char_length(area_label) <= 120),
  planned_at  timestamptz NOT NULL,
  capacity    int         CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 20),
  status      text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'full', 'cancelled', 'done')),
  notes       text        CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.outing_proposals IS
  'Co-pêchage (sprint 25) : sorties à plusieurs. Localisation = département + libellé libre, AUCUNE coordonnée précise (anti spot-burning). Pas de colonne geom.';

CREATE INDEX outing_proposals_dept_idx ON public.outing_proposals (department, planned_at DESC);
CREATE INDEX outing_proposals_host_idx ON public.outing_proposals (host_id);

-- ─── Participants (RSVP) ──────────────────────────────────────────────────────
CREATE TABLE public.outing_participants (
  proposal_id uuid        NOT NULL REFERENCES public.outing_proposals(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, user_id)
);

CREATE INDEX outing_participants_user_idx ON public.outing_participants (user_id);

-- ─── RLS fail-closed (activée AVANT toute policy) ─────────────────────────────
ALTER TABLE public.outing_proposals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outing_participants ENABLE ROW LEVEL SECURITY;

-- Propositions : lecture authentifiée (board interne) ; écriture = hôte + dépt côtier.
CREATE POLICY outing_proposals_select_auth ON public.outing_proposals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY outing_proposals_insert_host ON public.outing_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    host_id = (SELECT auth.uid())
    AND public.can_post_in_department(department)
  );

CREATE POLICY outing_proposals_update_host ON public.outing_proposals
  FOR UPDATE TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY outing_proposals_delete_host ON public.outing_proposals
  FOR DELETE TO authenticated
  USING (host_id = (SELECT auth.uid()));

-- Participants : on voit sa propre participation, celles des sorties qu'on héberge,
-- et les participants ACCEPTÉS (pour la liste). Les demandes en attente restent
-- privées (demandeur + hôte uniquement).
CREATE POLICY outing_participants_select_scoped ON public.outing_participants
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR status = 'accepted'
    OR EXISTS (
      SELECT 1 FROM public.outing_proposals p
      WHERE p.id = proposal_id AND p.host_id = (SELECT auth.uid())
    )
  );

-- Rejoindre : on s'inscrit soi-même, en 'requested', sur une sortie ouverte.
CREATE POLICY outing_participants_insert_self ON public.outing_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'requested'
    AND EXISTS (
      SELECT 1 FROM public.outing_proposals p
      WHERE p.id = proposal_id AND p.status = 'open'
    )
  );

-- Mise à jour : RÉSERVÉE À L'HÔTE (accepter/refuser). ⚠️ Sécurité (revue sprint 25) :
-- on NE laisse PAS le participant updater sa propre ligne, sinon il pourrait passer
-- son statut 'requested' → 'accepted' via un appel PostgREST direct et s'auto-inscrire
-- en contournant l'hôte. Le retrait du participant se fait par DELETE (policy ci-dessous),
-- pas par UPDATE. → seul le host modifie le statut.
CREATE POLICY outing_participants_update_host ON public.outing_participants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.outing_proposals p
      WHERE p.id = proposal_id AND p.host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outing_proposals p
      WHERE p.id = proposal_id AND p.host_id = (SELECT auth.uid())
    )
  );

-- Suppression : le participant retire sa demande, ou l'hôte la retire.
CREATE POLICY outing_participants_delete_scoped ON public.outing_participants
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.outing_proposals p
      WHERE p.id = proposal_id AND p.host_id = (SELECT auth.uid())
    )
  );

-- ─── Vue d'affichage (security_invoker, AUCUN geom) ───────────────────────────
-- Sert UNIQUEMENT à dénormaliser l'hôte (pseudo/avatar) + compter les acceptés.
-- security_invoker → la RLS des tables sous-jacentes s'applique (pas de bypass).
CREATE VIEW public.outing_proposals_for_viewer
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.host_id,
  p.department,
  p.area_label,
  p.planned_at,
  p.capacity,
  p.status,
  p.notes,
  p.created_at,
  pr.username      AS host_username,
  pr.display_name  AS host_display_name,
  pr.avatar_url    AS host_avatar_url,
  (SELECT count(*) FROM public.outing_participants op
    WHERE op.proposal_id = p.id AND op.status = 'accepted') AS accepted_count
FROM public.outing_proposals p
LEFT JOIN public.profiles pr ON pr.id = p.host_id;

COMMENT ON VIEW public.outing_proposals_for_viewer IS
  'Affichage co-pêchage : proposition + hôte (pseudo/avatar) + nb d''acceptés. security_invoker (RLS sous-jacente appliquée). AUCUNE coordonnée (la table n''en a pas).';

GRANT SELECT ON public.outing_proposals_for_viewer TO authenticated;

-- ─── Rate-limit anti-spam sur les propositions (calqué 022) ───────────────────
CREATE OR REPLACE FUNCTION public.enforce_outing_proposal_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.outing_proposals
    WHERE host_id = new.host_id
      AND created_at > now() - interval '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'rate_limit_outings'
      USING errcode = 'P0001', hint = 'Max 5 sorties proposées par 24h.';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS outing_proposals_rate_limit ON public.outing_proposals;
CREATE TRIGGER outing_proposals_rate_limit
  BEFORE INSERT ON public.outing_proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_outing_proposal_rate_limit();

-- ─── Étendre les CHECK notifications + reports pour le co-pêchage ──────────────
-- ⚠️ Repartir des listes COMPLÈTES en vigueur (cf 050 pour type, 043 pour target_type)
-- pour ne RIEN régresser (leçon sprint 24).
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder',
    'outing_join', 'outing_accepted'
  ));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_target_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_target_type_check
  CHECK (target_type IS NULL OR target_type IN ('post', 'catch', 'comment', 'spot', 'outing'));

-- reports : cibler une sortie (réutilise le flux de modération existant).
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('post', 'comment', 'catch', 'profile', 'spot', 'outing'));
