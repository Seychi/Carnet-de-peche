-- 061_shared_cards.sql — Sprint 38, WS-A (moteur de partage social façon Strava).
--
-- But : une table PUBLIQUE-EN-LECTURE qui porte tout ce qu'une carte de partage
-- affiche (prise / conditions gagnantes / sortie), SANS rien de privé. La route OG
-- edge (`app/og/card/[slug]`) tourne en runtime='edge' : elle ne peut PAS lire
-- `catches_for_viewer` (SECURITY DEFINER) ni appeler getPersonalTendencies
-- (server-only) ni signer une photo privée. Donc une server action server-only
-- calcule un payload PUBLIC sans geom et l'écrit ici ; l'edge ne lit QUE cette
-- table via client anon (même modèle que weather_cache lu en anon, 045).
--
-- Invariants :
--   * Anti spot-burning : le payload ne contient JAMAIS geom/lat/lng/coordonnée.
--     La carte montre location_label + département (texte), jamais un point.
--   * Opt-in strict : une carte n'existe que si l'utilisateur partage SA prise
--     (INSERT owner, user_id = auth.uid()). Révocable (DELETE owner → 404).
--   * Slug aléatoire non énumérable (12 car. base62 généré côté action).
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

create table public.shared_cards (
  id         uuid        primary key default gen_random_uuid(),
  -- slug aléatoire non énumérable (généré côté server action), sert d'URL publique /c/[slug].
  slug       text        not null unique,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  -- catch = carte de prise ; conditions = « mes conditions gagnantes » ; outing = résumé de sortie.
  kind       text        not null check (kind in ('catch', 'conditions', 'outing')),
  -- payload PUBLIC, jamais de geom/lat/lng/spot_id résolvant à des coords.
  payload    jsonb       not null,
  created_at timestamptz not null default now()
);

comment on table public.shared_cards is
  'Cartes de partage social (sprint 38). payload PUBLIC sans aucune coordonnée (anti spot-burning). kind = catch / conditions / outing. Lecture publique par slug (non énumérable), écriture/suppression owner only. Carte révocable.';

-- Le UNIQUE sur slug fournit déjà l'index de lookup par slug (shared_cards_slug_key).
create index shared_cards_user_idx on public.shared_cards (user_id);

-- ─── RLS fail-closed (activée AVANT toute policy) ─────────────────────────────
alter table public.shared_cards enable row level security;

-- SELECT public : une carte est lisible par tous (le slug aléatoire fait le gating).
-- Modèle weather_cache (045) : la donnée est volontairement publique.
create policy shared_cards_select_public on public.shared_cards
  for select to anon, authenticated
  using (true);

-- INSERT owner : on ne crée une carte que pour soi (modèle gear_items 059).
create policy shared_cards_insert_own on public.shared_cards
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- DELETE owner : révocation (supprimer sa carte → /c/[slug] renvoie 404).
create policy shared_cards_delete_own on public.shared_cards
  for delete to authenticated
  using (user_id = (select auth.uid()));
