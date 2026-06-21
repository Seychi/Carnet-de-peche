-- =====================================================================
-- Carnet de Pêche — 033 hotfix BUG-03 : auto-suppression de compte (SECURITY DEFINER)
-- Sprint 11.6. ⚠️ APPLIQUÉE EN PROD le 2026-06-21 (version 20260621…).
-- =====================================================================
-- Le fix initial de BUG-03 utilisait auth.admin.deleteUser (rôle GoTrue
-- `supabase_auth_admin`). Échec en prod : « permission denied for table feed_posts »
-- (SQLSTATE 42501) — ce rôle n'a pas les droits DELETE sur les tables `public`
-- ciblées par la cascade ON DELETE de auth.users (vérifié :
-- has_table_privilege('supabase_auth_admin','public.feed_posts','DELETE') = false).
--
-- Correctif : auto-suppression via une fonction SECURITY DEFINER possédée par
-- `postgres` (qui a DELETE sur toutes les tables public). delete from auth.users
-- where id = auth.uid() → cascade exécutée avec les droits de postgres → OK.
-- (FK moderated_by / resolved_by / reporter_id / created_by → SET NULL via 030.)
--
-- L'action app/(app)/profil/actions.ts appelle supabase.rpc('delete_my_account')
-- avec le client SSR de l'utilisateur (authenticated) ; auth.uid() = l'appelant.
-- create-or-replace idempotent (delete_my_account était déjà présent en prod ;
-- on garantit ici owner=postgres + grants + présence dans l'historique).
-- =====================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Seuls les utilisateurs connectés peuvent supprimer LEUR propre compte (auth.uid()).
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
