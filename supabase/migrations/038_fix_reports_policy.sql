-- 038_fix_reports_policy.sql — Sprint 17 Bloc C
-- Corrige reports_select_own_or_mod : le filtre lisait profiles.is_ambassador
-- (bug, introduit en 024) au lieu d'appeler is_moderator() (déjà utilisée par la
-- policy UPDATE reports_update_moderator). is_moderator() existe depuis 023,
-- signature is_moderator(uid uuid DEFAULT auth.uid()) → appel sans argument.
-- Aucune colonne ni fonction à créer : simple réécriture de la policy SELECT.

DROP POLICY IF EXISTS reports_select_own_or_mod ON public.reports;

CREATE POLICY reports_select_own_or_mod
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_id = (SELECT auth.uid())
    OR (SELECT is_moderator())
  );
