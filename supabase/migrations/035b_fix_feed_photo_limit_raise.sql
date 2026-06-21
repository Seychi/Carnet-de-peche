-- =====================================================================
-- 035b : corrige le RAISE du trigger de plafond photos (sprint 13 Bloc A)
-- =====================================================================
-- 035 levait `raise exception 'max_photos_per_post' using message = '...'`
-- → MESSAGE spécifié deux fois (la chaîne de format EST déjà le message) →
-- erreur 42601 « RAISE option already specified: MESSAGE » au lieu d'un refus
-- propre. On ne garde que la chaîne de format comme message (token stable que
-- l'action serveur détecte) ; le message FR est rendu côté app.
-- create or replace → idempotent, ne touche ni la table ni les policies.
-- =====================================================================

create or replace function public.feed_post_photos_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feed_post_photos where post_id = new.post_id) >= 4 then
    raise exception 'max_photos_per_post';
  end if;
  return new;
end;
$$;
