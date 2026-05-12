-- =====================================================================
-- Carnet de Pêche — 005 profile extension
-- Ajoute la RPC delete_my_account() nécessaire pour la page /profil.
-- Note : bio et avatar_url sont déjà dans 001_init.sql (char_length <= 280).
-- =====================================================================

-- Fonction de suppression de compte à la demande de l'utilisateur.
-- security definer : s'exécute avec les droits du owner, pas du caller.
-- Cela permet de DELETE dans auth.users depuis le client authenticated.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- La suppression en cascade (ON DELETE CASCADE) efface automatiquement :
  -- profiles, catches, feed_posts, feed_comments, feed_likes, follows, subscriptions
  delete from auth.users where id = auth.uid();
end;
$$;

-- Révoquer l'accès public, accorder uniquement aux utilisateurs connectés
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
