-- =====================================================================
-- Carnet de Pêche — 001 init
-- Schéma de base : extensions, types, tables principales.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "citext";       -- case-insensitive text (usernames)
create extension if not exists "postgis";      -- géolocalisation
create extension if not exists "pg_trgm";      -- recherche fulltext fuzzy

-- ---------- Types & enums (sous forme de check constraints pour rester flexible) ----------
-- (on passera à des CREATE TYPE quand les valeurs seront stables)

-- ---------- Table profiles ----------
-- Étend auth.users avec les infos publiques du pêcheur.
-- Créée automatiquement à l'inscription via trigger (cf. 004_functions_triggers.sql).
create table public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  username        citext unique check (char_length(username) between 3 and 30),  -- nullable jusqu'à fin de l'onboarding
  display_name    text,
  avatar_url      text,
  bio             text check (char_length(bio) <= 280),
  city            text,                                -- ville, pas département complet (privacy)
  home_department char(3),                             -- département principal du pêcheur
  level           text check (level in ('debutant','intermediaire','expert')),
  techniques      text[] default '{}',                 -- {leurres, surfcasting, flottante, vif}
  favorite_species text[] default '{}',                -- {bar, dorade, lieu_jaune, ...}
  fishing_frequency text check (fishing_frequency in ('rare','weekly','daily','seasonal')),  -- collecté à l'onboarding
  years_practicing smallint,                           -- années de pratique (onboarding)
  badges          text[] default '{}',
  is_ambassador   boolean default false,
  onboarded       boolean default false not null,      -- bloque l'accès à l'app tant que faux
  onboarded_at    timestamptz,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

comment on table public.profiles is 'Profil public d''un pêcheur. Lié 1:1 à auth.users.';

-- ---------- Table spots ----------
-- Spots de pêche (canne du bord uniquement en v1).
create table public.spots (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,                -- pointe-du-raz
  department      char(3) not null,                    -- '29', '56', '2A', '06'...
  region          text not null,                       -- 'bretagne', 'paca', etc.
  geom            geography(point, 4326) not null,     -- coordonnées précises
  geom_public     geography(polygon, 4326),            -- zone floutée 2 km (générée par trigger)
  techniques      text[] not null default '{}',        -- {leurres, surfcasting, flottante, vif}
  species         text[] not null default '{}',        -- {bar, dorade_royale, lieu_jaune, ...}
  structure       text check (structure in ('digue','plage','pointe_rocheuse','estuaire','cale','passe','cassure')),
  difficulty      smallint check (difficulty between 1 and 5) default 3,
  description     text,
  access_notes    text,                                -- chemin d'accès, parking, etc.
  hazards         text[] default '{}',                 -- {ressac, vagues_scelerats, courants_forts}
  visibility      text not null check (visibility in ('public','subscriber','private')) default 'subscriber',
  created_by      uuid references public.profiles on delete set null,
  verified        boolean default false,               -- vérifié par un ambassadeur
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

comment on table public.spots is 'Spots de pêche à la canne du bord. geom = précis (réservé aux abonnés), geom_public = flouté pour affichage public.';

-- ---------- Table catches (LE CARNET — cœur du produit) ----------
create table public.catches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  spot_id         uuid references public.spots on delete set null,
  geom            geography(point, 4326),              -- précis, jamais exposé directement (cf. catch_visible_geom)
  geom_public     geography(point, 4326),              -- flouté 1 km (généré par trigger)
  species         text not null,                       -- 'bar', 'dorade_royale', etc.
  size_cm         smallint check (size_cm > 0 and size_cm < 300),
  weight_g        integer check (weight_g > 0 and weight_g < 50000),
  technique       text,                                -- 'leurre_souple', 'stickbait', 'surfcasting'...
  bait            text,                                -- 'shad_kaki_12cm', 'arenicole', 'vif_chinchard'...
  caught_at       timestamptz not null default now(),
  conditions      jsonb default '{}'::jsonb,           -- snapshot Open-Meteo : {coef, vent, vagues, lune, pression}
  photo_path      text,                                -- chemin Supabase Storage
  notes           text check (char_length(notes) <= 2000),
  privacy         text not null check (privacy in ('private','friends','public')) default 'private',
  -- Réglages de précision géographique :
  --   - precise_for_friends = true → les amis voient geom (par défaut)
  --   - reveal_precise_to_public = false → les non-amis ne voient JAMAIS le geom précis (par défaut)
  -- Le pêcheur peut basculer ces deux booleans par prise.
  precise_for_friends     boolean not null default true,
  reveal_precise_to_public boolean not null default false,
  released        boolean default true,                -- relâché (catch & release) ou prélevé
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

comment on table public.catches is 'Carnet de pêche. Chaque ligne = une prise loguée. Cœur de l''effet réseau du produit.';

-- ---------- Table feed_posts (mur communautaire) ----------
-- Posts publics (récits de session, partages de prises, questions techniques).
create table public.feed_posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references auth.users on delete cascade,
  catch_id        uuid references public.catches on delete set null,  -- partage d'une prise du carnet
  text            text check (char_length(text) <= 2000),
  region          char(3),                              -- département de référence (filtre du fil régional)
  moderation_status text not null check (moderation_status in ('pending','approved','flagged','rejected')) default 'approved',  -- modération libre au lancement, switch en 'pending' plus tard
  moderated_at    timestamptz,
  moderated_by    uuid references public.profiles,
  likes_count     integer default 0,
  comments_count  integer default 0,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

comment on table public.feed_posts is 'Mur communautaire (modéré). Tous les posts passent par status=pending → approved/flagged via Claude API.';

-- ---------- Table feed_comments ----------
create table public.feed_comments (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.feed_posts on delete cascade,
  author_id       uuid not null references auth.users on delete cascade,
  text            text not null check (char_length(text) between 1 and 1000),
  created_at      timestamptz default now() not null
);

-- ---------- Table feed_likes ----------
create table public.feed_likes (
  post_id         uuid references public.feed_posts on delete cascade,
  user_id         uuid references auth.users on delete cascade,
  created_at      timestamptz default now() not null,
  primary key (post_id, user_id)
);

-- ---------- Table follows ----------
create table public.follows (
  follower_id     uuid references auth.users on delete cascade,
  following_id    uuid references auth.users on delete cascade,
  created_at      timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------- Table subscriptions ----------
-- Mis à jour exclusivement par le webhook Stripe (RLS interdit toute écriture utilisateur).
create table public.subscriptions (
  user_id                 uuid primary key references auth.users on delete cascade,
  plan                    text not null check (plan in ('discovery','local','itinerant')) default 'discovery',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text check (status in ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid')),
  current_period_end      timestamptz,
  cancel_at_period_end    boolean default false,
  trial_end               timestamptz,
  unlocked_departments    text[] default '{}',           -- réservé pour des suppléments futurs
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

comment on table public.subscriptions is 'État de l''abonnement par utilisateur. Source de vérité = Stripe via webhook.';

-- ---------- Table conditions_cache ----------
-- Cache horaire des conditions Open-Meteo + score d'activité par spot.
-- Régénéré par Edge Function cron.
create table public.conditions_cache (
  spot_id         uuid references public.spots on delete cascade,
  hour            timestamptz not null,                  -- arrondi à l'heure
  tide            jsonb,                                 -- { coef, hauteur, marée_montante, BM/PM_times }
  weather         jsonb,                                 -- { vent_kts, direction, vagues_m, houle_m, pluie }
  astro           jsonb,                                 -- { lune_phase, sunrise, sunset, twilight }
  score           smallint check (score between 0 and 100),
  fetched_at      timestamptz default now() not null,
  primary key (spot_id, hour)
);

-- ---------- Table reports (signalements) ----------
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references auth.users on delete set null,
  target_type     text not null check (target_type in ('post','comment','catch','profile','spot')),
  target_id       uuid not null,
  reason          text not null,
  status          text not null check (status in ('pending','resolved','dismissed')) default 'pending',
  resolved_by     uuid references public.profiles,
  resolved_at     timestamptz,
  created_at      timestamptz default now() not null
);

comment on table public.reports is 'Signalements utilisateurs pour la modération communautaire.';
