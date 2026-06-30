-- 093_spot_confirmations_no_self.sql — Sprint 51, WS-D (anti auto-confirmation).
--
-- Problème : la policy spot_confirmations_insert_own (migration 084) ne teste que
-- user_id = auth.uid(). Le créateur d'un spot communautaire peut donc confirmer
-- SA propre position et gonfler le compteur public « K pêcheurs confirment cette
-- position » de +1 (lui-même). Comme ce compteur est un signal de confiance
-- (RPC get_spot_confirmation_count), c'est un vecteur d'auto-inflation.
--
-- Correctif (backstop RLS, double avec le garde serveur dans confirmSpot) : on
-- recrée la policy À L'IDENTIQUE de la version déployée (with_check = user_id =
-- (select auth.uid()), forme initplan-optimisée, vérifiée live) en ajoutant une
-- clause NOT EXISTS qui interdit de confirmer un spot dont on est le créateur.
-- created_by est nullable (imports OSM) → la clause ne bloque jamais ces spots.
--
-- SELECT / DELETE inchangées (migration 084). Aucune coordonnée touchée.
--
-- ⚠️ Prochain libre = 093. Regen lib/types.ts après application (pas de nouveau type).

drop policy if exists spot_confirmations_insert_own on public.spot_confirmations;
create policy spot_confirmations_insert_own on public.spot_confirmations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.spots s
      where s.id = spot_id
        and s.created_by = (select auth.uid())
    )
  );
