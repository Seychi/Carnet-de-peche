-- =====================================================================
-- Carnet de Pêche — 106 : favoris + réglages d'alertes + journal de dédup
-- Sprint 72 « Alertes par port » — WS B (Bloc 1)
-- =====================================================================
-- 3 tables + 1 RPC service-role + extension du CHECK notifications.type :
--  1) favorite_spots : spots favoris (tous tiers, c'est du carnet).
--     Cap 10/user via trigger backstop (modèle 035/035b).
--  2) alert_settings : réglages d'alerte own-only. OPT-IN EXPLICITE :
--     alerts_enabled default FALSE (RGPD, anti-spam, décision verrouillée).
--     Le gating de tier (Local/Itinérant) est fait par le moteur via
--     current_tier, PAS ici : un Découverte peut préparer ses réglages,
--     il ne recevra simplement rien.
--  3) alerts_sent : journal de dédup (user, spot, window_date). Écrit
--     UNIQUEMENT en service-role (aucune policy d'écriture authenticated,
--     pattern maison 065 : « pas de policy d'envoi »).
--  4) get_favorite_spot_coords() : coordonnées PRÉCISES des spots favorisés
--     pour la prévision du cron. EXECUTE service_role only (modèle 016/025
--     get_spots_for_scoring). Jamais appelable par le client : aucune
--     coordonnée ne sort dans une alerte (nom + slug uniquement, invariant
--     floutage GPS).
--  5) notifications_type_check re-posé avec 'spot_alert' (liste FERMÉE,
--     28 types existants + 1). target_type 'spot' est déjà permis.
--
-- SÉCURITÉ : RLS fail-closed AVANT toute donnée ; policies to authenticated
-- avec (select auth.uid()) (perf initplan, leçon 024). Suppression de compte
-- RGPD : FK auth.users ON DELETE CASCADE sur les 3 tables → delete_my_account
-- (033, delete auth.users) purge tout SANS modification (vérifié : sa
-- définition ne liste pas les tables, la cascade FK fait foi).
--
-- ROLLBACK : drop function get_favorite_spot_coords ; drop trigger + function
-- favorite_spots_enforce_limit ; drop table alerts_sent, alert_settings,
-- favorite_spots ; re-poser notifications_type_check sans 'spot_alert'.
-- =====================================================================

-- ─── 1) favorite_spots ────────────────────────────────────────────────

create table public.favorite_spots (
  user_id    uuid        not null references auth.users(id)   on delete cascade,
  spot_id    uuid        not null references public.spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

comment on table public.favorite_spots is
  'Spots favoris (sprint 72). Tous tiers. Cap 10/user (trigger backstop). RLS own-only ; le moteur d''alertes lit en service-role. PK (user_id, spot_id) = unicité + index côté user ; index dédié côté spot (FK couverte, leçon 097).';

create index favorite_spots_spot_idx on public.favorite_spots (spot_id);

alter table public.favorite_spots enable row level security;

create policy favorite_spots_select_own on public.favorite_spots
  for select to authenticated
  using (user_id = (select auth.uid()));

-- INSERT : ses propres favoris, et uniquement sur un spot que l'appelant
-- VOIT (le sous-select sur spots s'exécute sous la RLS de l'appelant →
-- pas de favori sur le spot privé d'autrui via un uuid deviné ; la FK seule
-- ne suffirait pas, elle est vérifiée en owner et ignore la RLS).
create policy favorite_spots_insert_own on public.favorite_spots
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.spots s where s.id = spot_id)
  );

create policy favorite_spots_delete_own on public.favorite_spots
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Pas de policy UPDATE : aucune colonne mutable (on retire puis re-pose le
-- favori). RLS fail-closed → UPDATE refusé.

-- Cap 10 favoris / user (backstop DB, modèle 035b : le token EST le message,
-- pas de USING MESSAGE en plus sinon 42601 ; le FR lisible part en DETAIL,
-- l'action serveur détecte le token et rend la copy côté app).
create or replace function public.favorite_spots_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.favorite_spots where user_id = new.user_id) >= 10 then
    raise exception 'max_favorite_spots'
      using detail = 'Maximum 10 spots favoris. Retire un favori pour en ajouter un autre.';
  end if;
  return new;
end;
$$;

create trigger favorite_spots_limit_trg
  before insert on public.favorite_spots
  for each row execute function public.favorite_spots_enforce_limit();

-- ─── 2) alert_settings ────────────────────────────────────────────────

create table public.alert_settings (
  user_id         uuid        primary key references auth.users(id) on delete cascade,
  alerts_enabled  boolean     not null default false,
  channel_push    boolean     not null default true,
  channel_email   boolean     not null default true,
  alert_threshold smallint    not null default 70
    constraint alert_settings_threshold_check check (alert_threshold between 50 and 90),
  updated_at      timestamptz not null default now()
);

comment on table public.alert_settings is
  'Réglages d''alertes par spot favori (sprint 72). Opt-in explicite : alerts_enabled default false. Le moteur (cron ~17h Paris) ne considère que alerts_enabled=true PUIS gate au tier Local/Itinérant via current_tier. RLS own-only.';

alter table public.alert_settings enable row level security;

create policy alert_settings_select_own on public.alert_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy alert_settings_insert_own on public.alert_settings
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy alert_settings_update_own on public.alert_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy alert_settings_delete_own on public.alert_settings
  for delete to authenticated
  using (user_id = (select auth.uid()));

create trigger alert_settings_updated_at
  before update on public.alert_settings
  for each row execute function public.touch_updated_at();

-- ─── 3) alerts_sent (journal de dédup) ────────────────────────────────

create table public.alerts_sent (
  user_id     uuid        not null references auth.users(id)   on delete cascade,
  spot_id     uuid        not null references public.spots(id) on delete cascade,
  window_date date        not null,
  score       smallint    not null
    constraint alerts_sent_score_check check (score between 0 and 100),
  kind        text        not null
    constraint alerts_sent_kind_check check (kind in ('perso', 'generique')),
  sent_at     timestamptz not null default now(),
  -- Dédup dure : max 1 alerte par (user, spot, date de fenêtre). La PK
  -- composite sert aussi d'index (user_id, window_date, …) pour le moteur.
  primary key (user_id, spot_id, window_date)
);

comment on table public.alerts_sent is
  'Journal de dédup des alertes envoyées (sprint 72). Écrit APRÈS le 1er canal réussi, en service-role UNIQUEMENT (aucune policy d''écriture → insert authenticated = 42501). window_date = date Paris de la fenêtre annoncée (le lendemain du calcul).';

-- FK spot_id couverte (leçon 097) : la PK commence par user_id.
create index alerts_sent_spot_idx on public.alerts_sent (spot_id);

alter table public.alerts_sent enable row level security;

create policy alerts_sent_select_own on public.alerts_sent
  for select to authenticated
  using (user_id = (select auth.uid()));

-- AUCUNE policy INSERT/UPDATE/DELETE : le moteur écrit en service-role
-- (bypass RLS). RLS fail-closed pour tout le reste.

-- ─── 4) RPC service-role : coords précises des spots favorisés ────────
-- Le moteur du cron a besoin de lng/lat PRÉCIS pour la prévision (marée,
-- météo). geom est verrouillée colonne (028b) et PostGIS sort du WKB via
-- PostgREST → cette RPC renvoie des floats prêts à l'emploi + name/slug
-- (payload d'alerte) + department (calibration marée, façade grande marée),
-- TRIMMÉ à la source (department est char(3), leçon 103b).
-- Filtre : spots encore approuvés, géométrie présente, référencés par au
-- moins un favori. PAS de filtre source : un favori explicite sur un spot
-- OSM ou communautaire mérite son alerte (borné par le cap 10/user).
create or replace function public.get_favorite_spot_coords()
returns table (
  spot_id    uuid,
  name       text,
  slug       text,
  department text,
  lng        double precision,
  lat        double precision
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select
    s.id                   as spot_id,
    s.name,
    s.slug,
    btrim(s.department)    as department,
    ST_X(s.geom::geometry) as lng,
    ST_Y(s.geom::geometry) as lat
  from public.spots s
  where s.geom is not null
    and s.moderation_status = 'approved'
    and exists (select 1 from public.favorite_spots f where f.spot_id = s.id)
  order by s.id;
$$;

comment on function public.get_favorite_spot_coords() is
  'Sprint 72 : spots favorisés (distinct) avec coords PRÉCISES pour le moteur d''alertes. EXECUTE service_role uniquement (modèle 025 get_spots_for_scoring) : jamais exposée au client, aucune coordonnée ne sort dans une alerte.';

revoke execute on function public.get_favorite_spot_coords() from public;
revoke execute on function public.get_favorite_spot_coords() from anon;
revoke execute on function public.get_favorite_spot_coords() from authenticated;
grant execute on function public.get_favorite_spot_coords() to service_role;

-- ─── 5) notifications.type : + 'spot_alert' (liste fermée re-posée) ───
-- Liste live vérifiée le 2026-07-02 (28 types). Superset strict → pas de
-- NOT VALID nécessaire, les lignes existantes satisfont le nouveau CHECK.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'new_follower', 'post_liked', 'post_commented', 'catch_commented',
    'mention', 'spot_approved', 'spot_rejected', 'recfishing_reminder',
    'outing_join', 'outing_accepted', 'optimal_window', 'spot_verified',
    'outing_full', 'outing_cancelled', 'outing_message', 'outing_reminder',
    'big_tide', 'followed_catch', 'species_closure', 'weekly_digest',
    'nearby_outing', 'level_up', 'badge_earned', 'new_record',
    'streak_danger', 'challenge_completed', 'rank_overtake', 'season_recap',
    'spot_alert'
  ]));
