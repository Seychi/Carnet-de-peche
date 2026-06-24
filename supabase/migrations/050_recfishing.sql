-- 050_recfishing.sql — Sprint 24, Chantier C (Bloc B).
-- Helper de déclaration RecFishing : flag `declared` sur la prise, type de
-- notification de rappel, et RPC (service-role) qui liste les prises déclarables
-- non encore déclarées/rappelées pour le cron de rappel des 24 h.
--
-- ⚠️ On ne déclare JAMAIS à la place du pêcheur (RecFishing = EU Login, pas d'API
-- tierce). Ces objets servent uniquement à DÉTECTER + RAPPELER + PRÉ-REMPLIR.

-- ─── 1. Flags de déclaration sur la prise ─────────────────────────────────────
ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS declared              boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declared_at           timestamptz,
  -- Anti-doublon de rappel : posé par le cron quand une notif de rappel est créée.
  ADD COLUMN IF NOT EXISTS recfishing_reminded_at timestamptz;

COMMENT ON COLUMN public.catches.declared IS
  'Prise sensible marquée « déclarée sur RecFishing » par le pêcheur (auto-déclaratif ; on ne soumet jamais à sa place).';

-- ─── 2. Nouveau type de notification (rappel RecFishing) ──────────────────────
-- On remplace notifications_type_check en AJOUTANT 'recfishing_reminder'. ⚠️ On
-- repart de la liste LA PLUS RÉCENTE (migration 043, qui avait ajouté
-- 'spot_approved' + 'spot_rejected' aux 5 types initiaux de 037) — sinon on
-- régresserait silencieusement les notifs de modération de spots (LIVE en prod,
-- cf lib/notifications/create.ts + app/actions/spots.ts).
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_follower',
    'post_liked',
    'post_commented',
    'catch_commented',
    'mention',
    'spot_approved',
    'spot_rejected',
    'recfishing_reminder'
  ));

-- ─── 3. RPC cron : prises déclarables en attente (service-role uniquement) ─────
-- SECURITY DEFINER (owner postgres) car elle lit `catches.geom` (verrouillée au
-- niveau colonne depuis 041) pour en dériver lat/lng. La logique « espèce sensible
-- × façade » reste côté TS (référentiel unique lib/regulation/recfishing.ts) : la
-- RPC ne fait qu'un PREFILTRE par espèce (p_species) + fenêtre temporelle, et
-- expose le département (du spot) + lat/lng pour que le cron tranche la façade.
CREATE OR REPLACE FUNCTION public.get_pending_recfishing_catches(
  p_since    timestamptz,
  p_species  text[]
)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  species     text,
  caught_at   timestamptz,
  released    boolean,
  department  text,
  lat         double precision,
  lng         double precision
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.user_id,
    c.species,
    c.caught_at,
    c.released,
    s.department,
    ST_Y(c.geom::geometry) AS lat,
    ST_X(c.geom::geometry) AS lng
  FROM public.catches c
  LEFT JOIN public.spots s ON s.id = c.spot_id
  WHERE c.declared = false
    AND c.recfishing_reminded_at IS NULL
    AND c.caught_at >= p_since
    AND c.species = ANY (p_species);
$$;

COMMENT ON FUNCTION public.get_pending_recfishing_catches(timestamptz, text[]) IS
  'Cron RecFishing (service-role) : prises d''espèces potentiellement déclarables non déclarées et non encore rappelées depuis p_since. La façade exacte est tranchée côté serveur (TS).';

-- Réservé au code serveur (cron) : jamais exposé aux clients.
REVOKE ALL ON FUNCTION public.get_pending_recfishing_catches(timestamptz, text[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_recfishing_catches(timestamptz, text[]) TO service_role;
