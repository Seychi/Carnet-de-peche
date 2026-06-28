-- 089_outing_chat_v2.sql — Sprint 50, WS-D (chat v2 : photos privées + sur place + modération).
--
-- 1) Photos du chat : colonne outing_messages.photo_path + bucket PRIVÉ outing-photos
--    (owner-scoped <uid>/…). Lecture = signed URL générée SERVEUR en service-role
--    APRÈS vérification de l'appartenance à la sortie (PAS de policy SELECT large).
--    EXIF strippé serveur (sharp) à l'upload, comme les prises. JAMAIS le bucket public.
-- 2) « Sur place » (D2) : colonne outing_participants.on_site_at + RPC mark_on_site
--    (un participant accepté pointe SA présence ; l'UPDATE direct est host-only) +
--    Realtime sur outing_participants pour diffuser le changement.
-- 3) Modération : reports.target_type accepte 'outing_message' (cibler un message
--    précis ; la suppression se fait en service-role côté action modérateur, le chat
--    étant append-only sans policy DELETE).
--
-- ⚠️ Prochain libre = 089. Migration APPLIQUÉE en prod. Regen types.

-- ─── 1. Photos du chat ────────────────────────────────────────────────────────
alter table public.outing_messages add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('outing-photos', 'outing-photos', false, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- INSERT/SELECT/DELETE owner-scoped (les membres LISENT via signed URL service-role).
drop policy if exists "outing_photos_insert_own" on storage.objects;
create policy "outing_photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'outing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "outing_photos_select_own" on storage.objects;
create policy "outing_photos_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'outing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "outing_photos_delete_own" on storage.objects;
create policy "outing_photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'outing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── 2. « Sur place » ─────────────────────────────────────────────────────────
alter table public.outing_participants add column if not exists on_site_at timestamptz;

-- Un participant ACCEPTÉ pointe SA présence (l'UPDATE direct est host-only via RLS).
create or replace function public.mark_on_site(p_proposal_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
begin
  update public.outing_participants
    set on_site_at = v_now
    where proposal_id = p_proposal_id
      and user_id = auth.uid()
      and status = 'accepted';
  if not found then
    raise exception 'not an accepted participant of this outing';
  end if;
  return v_now;
end;
$function$;

grant execute on function public.mark_on_site(uuid) to authenticated;

-- Realtime sur outing_participants (diffuser on_site_at). replica identity full pour
-- que l'UPDATE porte la ligne complète aux abonnés.
alter table public.outing_participants replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'outing_participants'
  ) then
    alter publication supabase_realtime add table public.outing_participants;
  end if;
end $$;

-- ─── 3. Modération d'un message de chat ───────────────────────────────────────
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type = any (array[
    'post'::text, 'comment'::text, 'catch'::text, 'profile'::text, 'spot'::text, 'outing'::text, 'outing_message'::text
  ]));
