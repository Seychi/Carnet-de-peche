-- 068_outing_chat.sql — Sprint 40, WS-B (chat temps réel par sortie).
--
-- But : permettre aux participants ACCEPTÉS + l'hôte de discuter en temps réel d'une
-- sortie. FAIL-CLOSED : un `requested`/`declined`/tiers ne lit ni n'écrit rien. La RLS
-- est la barrière (le filtre Realtime n'est PAS une sécurité). Aucune coordonnée n'est
-- poussée par le système ; LOOKS_LIKE_COORD est appliqué côté action sur le corps.
--
-- ⚠️ Numérotation : le brief disait 066, pris au sprint 39 → cette migration = 068.
-- ⚠️ Prédicat RLS : on NE copie PAS outing_participants_select_scoped (sa branche
--    `OR status='accepted'` rend une ligne lisible par tout authentifié). On teste
--    l'appartenance du LECTEUR : hôte de la sortie OU sa propre ligne accepted.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

create table public.outing_messages (
  id          uuid        primary key default gen_random_uuid(),
  proposal_id uuid        not null references public.outing_proposals(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  body        text        not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

comment on table public.outing_messages is
  'Chat par sortie (sprint 40). FAIL-CLOSED : lisible/écrivable seulement par l''hôte + les participants accepted de la sortie. Append-only v1 (pas d''édition/suppression). Aucune coordonnée (LOOKS_LIKE_COORD côté action).';

create index outing_messages_proposal_created_idx
  on public.outing_messages (proposal_id, created_at);

-- ─── RLS fail-closed (activée AVANT toute policy) ─────────────────────────────
alter table public.outing_messages enable row level security;

-- Appartenance du LECTEUR à la sortie : hôte OU participant accepté.
create policy outing_messages_select_member on public.outing_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.outing_proposals p
      where p.id = outing_messages.proposal_id
        and p.host_id = (select auth.uid())
    )
    or exists (
      select 1 from public.outing_participants op
      where op.proposal_id = outing_messages.proposal_id
        and op.user_id = (select auth.uid())
        and op.status = 'accepted'
    )
  );

-- INSERT : on n'écrit que pour soi (user_id = auth.uid()) ET membre de la sortie.
create policy outing_messages_insert_member on public.outing_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (
        select 1 from public.outing_proposals p
        where p.id = outing_messages.proposal_id
          and p.host_id = (select auth.uid())
      )
      or exists (
        select 1 from public.outing_participants op
        where op.proposal_id = outing_messages.proposal_id
          and op.user_id = (select auth.uid())
          and op.status = 'accepted'
      )
    )
  );

-- Pas de policy UPDATE/DELETE : chat append-only en v1 (surface d'abus minimale,
-- groupe fermé choisi par l'hôte). Modération/suppression = fast-follow si besoin.

-- ─── Realtime : diffusion des INSERT (modèle feed 020) ────────────────────────
-- La RLS reste la barrière : un non-membre ne reçoit RIEN même abonné au channel.
-- Pas de REPLICA IDENTITY FULL : on ne diffuse que les INSERT (chat append-only).
alter publication supabase_realtime add table public.outing_messages;
