-- 084_spot_confirmations.sql — Sprint 48, WS-B (compteur « K pêcheurs confirment »).
--
-- Décision John D2 : on construit MAINTENANT le compteur de confirmations
-- communautaires (« 7 pêcheurs confirment cette position »). Signal de confiance
-- distinct du verification_level (qui dit QUI a vérifié officiellement) : ici c'est
-- la communauté qui valide la justesse de la position.
--
-- Pas de coordonnée stockée ni exposée : seulement (spot_id, user_id). Le compteur
-- est lu via une RPC SECURITY DEFINER qui ne renvoie QU'UN NOMBRE (jamais qui).
-- 1 confirmation par utilisateur et par spot (unique). Confirmable/annulable.
--
-- ⚠️ Prochain libre = 084. Migration APPLIQUÉE en prod. Regen types.

create table if not exists public.spot_confirmations (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (spot_id, user_id)
);

create index if not exists spot_confirmations_spot_idx on public.spot_confirmations(spot_id);

alter table public.spot_confirmations enable row level security;

-- INSERT : un utilisateur confirme en SON nom uniquement.
drop policy if exists spot_confirmations_insert_own on public.spot_confirmations;
create policy spot_confirmations_insert_own on public.spot_confirmations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- SELECT : un utilisateur voit SA propre confirmation (pour savoir s'il a déjà
-- confirmé / pour annuler). Le COMPTE global passe par la RPC definer ci-dessous
-- (on n'expose jamais la liste des confirmateurs).
drop policy if exists spot_confirmations_select_own on public.spot_confirmations;
create policy spot_confirmations_select_own on public.spot_confirmations
  for select to authenticated
  using (user_id = (select auth.uid()));

-- DELETE : annuler SA confirmation.
drop policy if exists spot_confirmations_delete_own on public.spot_confirmations;
create policy spot_confirmations_delete_own on public.spot_confirmations
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Compteur public : renvoie UNIQUEMENT le nombre de confirmations d'un spot.
create or replace function public.get_spot_confirmation_count(p_spot_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::integer from public.spot_confirmations where spot_id = p_spot_id;
$function$;

grant execute on function public.get_spot_confirmation_count(uuid) to anon, authenticated;
