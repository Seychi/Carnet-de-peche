-- =====================================================================
-- Carnet de Pêche — 042 : Realtime « carte vivante » (Carte v2 / C1, Bloc C)
-- Sprint Carte-v2 C1. À jouer APRÈS 040.
-- =====================================================================
-- Objectif : quand une prise PUBLIQUE est loguée, pousser un signal aux clients
-- qui regardent la carte → ils rafraîchissent la heatmap (RPC get_catch_heatmap,
-- agrégée + k-anonyme) en quelques secondes, sans reload.
--
-- 🔒 POURQUOI UN BROADCAST ET PAS postgres_changes SUR `catches` :
--   Realtime/postgres_changes applique la RLS au niveau LIGNE mais réplique le
--   tuple WAL COMPLET — donc `geom` PRÉCIS partirait dans le payload vers les
--   abonnés anon (les grants de colonne ne sont PAS appliqués par Realtime).
--   On ne s'abonne donc JAMAIS à la table `catches`. À la place, un trigger émet
--   un BROADCAST dont on contrôle entièrement le payload : un signal grossier
--   (département seulement, jamais de coordonnée). Le client s'en sert uniquement
--   comme « ping » → il re-fetch la RPC k-anonyme. Aucune position ne transite.
--
--   Granularité : département (≈ échelle régionale). Une prise isolée ne révèle
--   donc rien d'exploitable, et la heatmap re-fetchée ne montrera la maille que si
--   le seuil K=3 (3 pêcheurs distincts) est atteint. Double garde-fou.
--
-- Topic PUBLIC ('catch-heat', private=false) → anon peut s'abonner sans
-- autorisation de canal. realtime.send() est dispo sur ce projet (vérifié).
-- =====================================================================

create or replace function public.broadcast_public_catch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dept text;
begin
  if new.privacy = 'public' then
    -- Département dérivé du spot rattaché (NULL si prise loguée hors spot).
    -- AUCUNE coordonnée n'est jamais incluse dans le payload.
    select department into v_dept from public.spots where id = new.spot_id;

    -- ⚠️ Broadcast BEST-EFFORT : un signal de carte ne doit JAMAIS faire échouer le
    -- log d'une prise (cœur produit). Si realtime.send devient indisponible (droits
    -- révoqués, schéma realtime modifié…), on avale l'erreur et l'INSERT continue.
    begin
      perform realtime.send(
        jsonb_build_object('department', btrim(coalesce(v_dept, ''))),
        'new-catch',   -- event
        'catch-heat',  -- topic public
        false          -- private = false → canal public, anon autorisé
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

comment on function public.broadcast_public_catch is
  'Trigger Carte v2 / C1 : broadcast Realtime ''new-catch'' (topic public catch-heat) a chaque prise publique. Payload = { department } UNIQUEMENT, jamais de coordonnee. Le client re-fetch la heatmap k-anonyme. Securise par construction (le payload ne contient pas geom).';

drop trigger if exists catches_broadcast_heat on public.catches;
create trigger catches_broadcast_heat
  after insert or update of privacy on public.catches
  for each row
  execute function public.broadcast_public_catch();
