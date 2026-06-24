-- 056_gamification.sql — Sprint 26, WS-C (gamification anti-comparaison, G3).
-- Rétention par COLLECTION + RÉGULARITÉ personnelles, JAMAIS par comparaison.
-- Décisions John : streaks/Pokédex PRIVÉS par défaut, ZÉRO leaderboard, tout dérive
-- du carnet → reste GRATUIT. Aucun classement public, aucune « plus grosse prise ».
--
-- Cette migration ne persiste QUE les badges SQL-dérivables non-trichables (count
-- espèces / prises / relâchées / semaines actives), recalculés depuis public.catches.
-- Les défis dépendant de la réglementation (maille, fermeture) restent calculés en TS
-- (lib/regulation est en TypeScript, pas en SQL) → pas persistés, pas trichables.
--
-- Invariants : RLS fail-closed (un user ne lit QUE ses badges), écriture réservée à
-- un RPC SECURITY DEFINER (aucune policy INSERT/UPDATE/DELETE client). Idempotent.

-- ─── Table user_badges ────────────────────────────────────────────────────────
CREATE TABLE public.user_badges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_slug text        NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  meta       jsonb,
  UNIQUE (user_id, badge_slug)
);

COMMENT ON TABLE public.user_badges IS
  'Badges gagnés (privés). Recalculés depuis public.catches via recompute_my_badges() (SECURITY DEFINER). RLS : strictement privé au propriétaire. earned_at figé à la première obtention (idempotent). AUCUN usage public/leaderboard.';

CREATE INDEX user_badges_user_idx ON public.user_badges (user_id);

-- ─── RLS fail-closed (activée AVANT toute policy) ─────────────────────────────
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- SELECT own uniquement. Pas de policy INSERT/UPDATE/DELETE → l'écriture client est
-- impossible ; seul le RPC SECURITY DEFINER (owner = postgres) écrit.
CREATE POLICY user_badges_select_own ON public.user_badges
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── RPC recompute_my_badges() ────────────────────────────────────────────────
-- Recalcule les badges SQL-dérivables du demandeur depuis SES prises, et UPSERT
-- idempotent (ON CONFLICT DO NOTHING → earned_at d'origine conservé). Renvoie la
-- liste complète des badges du user. SECURITY DEFINER + filtre explicite auth.uid().
CREATE OR REPLACE FUNCTION public.recompute_my_badges()
RETURNS SETOF public.user_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid             uuid := auth.uid();
  v_total           bigint;
  v_species         bigint;
  v_released        bigint;
  v_active_weeks    bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Agrégats à partir des SEULES prises du demandeur.
  SELECT
    count(*),
    count(DISTINCT species),
    count(*) FILTER (WHERE released IS TRUE),
    count(DISTINCT date_trunc('week', caught_at))
  INTO v_total, v_species, v_released, v_active_weeks
  FROM public.catches
  WHERE user_id = v_uid;

  -- UPSERT idempotent : on n'insère un badge que s'il est mérité ; ON CONFLICT
  -- DO NOTHING garde l'earned_at de la première fois (jamais réécrit).
  INSERT INTO public.user_badges (user_id, badge_slug)
  SELECT v_uid, b.badge_slug
  FROM (VALUES
    ('first_catch',      (v_total        >= 1)),
    ('ten_catches',      (v_total        >= 10)),
    ('five_species',     (v_species      >= 5)),
    ('pokedex_complete', (v_species      >= 20)),
    ('release_friendly', (v_released     >= 10)),
    ('regular_4w',       (v_active_weeks >= 4))
  ) AS b(badge_slug, earned)
  WHERE b.earned
  ON CONFLICT (user_id, badge_slug) DO NOTHING;

  RETURN QUERY
    SELECT * FROM public.user_badges WHERE user_id = v_uid ORDER BY earned_at;
END;
$$;

COMMENT ON FUNCTION public.recompute_my_badges() IS
  'Recalcule et persiste (idempotent) les badges SQL-dérivables du demandeur (auth.uid()) depuis public.catches, puis renvoie ses badges. Ne touche jamais les badges d''un autre user.';

REVOKE ALL ON FUNCTION public.recompute_my_badges() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recompute_my_badges() TO authenticated;

-- ─── RPC get_my_streak() ──────────────────────────────────────────────────────
-- Régularité PERSONNELLE (descriptif, jamais de pression) : nombre de jours actifs
-- distincts, semaines actives distinctes, et plus longue série de SEMAINES actives
-- consécutives. Tout depuis caught_at, sur les SEULES prises du demandeur.
CREATE OR REPLACE FUNCTION public.get_my_streak()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_days AS (
    SELECT DISTINCT (caught_at AT TIME ZONE 'Europe/Paris')::date AS d
    FROM public.catches
    WHERE user_id = auth.uid()
  ),
  my_weeks AS (
    SELECT DISTINCT date_trunc('week', (caught_at AT TIME ZONE 'Europe/Paris'))::date AS w
    FROM public.catches
    WHERE user_id = auth.uid()
  ),
  -- Plus longue série de semaines consécutives : on numérote les semaines et on
  -- groupe par (rang - position), classique « gaps and islands ».
  week_groups AS (
    SELECT w,
           (row_number() OVER (ORDER BY w)) AS rn
    FROM my_weeks
  ),
  islands AS (
    SELECT count(*) AS streak_len
    FROM week_groups
    GROUP BY (w - (rn * interval '1 week'))
  )
  SELECT json_build_object(
    'activeDays',         (SELECT count(*) FROM my_days),
    'activeWeeks',        (SELECT count(*) FROM my_weeks),
    'longestWeekStreak',  COALESCE((SELECT max(streak_len) FROM islands), 0)
  );
$$;

COMMENT ON FUNCTION public.get_my_streak() IS
  'Régularité du demandeur (auth.uid()) : jours actifs distincts, semaines actives distinctes, plus longue série de semaines consécutives. Descriptif, privé, pas de comparaison.';

REVOKE ALL ON FUNCTION public.get_my_streak() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streak() TO authenticated;
