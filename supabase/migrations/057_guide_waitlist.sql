-- 057_guide_waitlist.sql — Sprint 31, F8 (capture email « préviens-moi à la sortie des guides »).
--
-- But : permettre à un visiteur (connecté OU anonyme) de laisser son email sur
-- /techniques pour être prévenu quand les guides techniques sortiront. La page
-- restait en « Bientôt disponible » sans aucune capture alors que sa meta promettait
-- « inscris-toi pour être notifié » (audit 2026-06-25 #6). Décision John : ajouter une
-- vraie capture (plutôt que de reformuler la meta).
--
-- RGPD : minimisation (EMAIL SEUL, pas de nom), finalité unique (une notification
-- produit ponctuelle), base = consentement explicite recueilli au formulaire. Aucun
-- envoi automatique ici : la liste est lue en service_role le jour J. Désinscription
-- sur demande (email seul, pas de profil lié). Aucune opération destructive.

create table if not exists public.guide_waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  source      text not null default 'techniques',
  created_at  timestamptz not null default now(),
  -- Un même email ne s'inscrit qu'une fois par source : le Server Action fait un
  -- upsert ignoreDuplicates (ON CONFLICT DO NOTHING) → réponse idempotente, jamais
  -- d'erreur de doublon, et pas d'énumération « cet email est-il déjà inscrit ? ».
  unique (email, source)
);

comment on table public.guide_waitlist is
  'Liste d''attente publique « préviens-moi à la sortie des guides » (/techniques, sprint 31 F8). Email seul (minimisation RGPD). Lecture en service_role uniquement (aucune policy SELECT).';

-- ─── RLS : INSERT autorisé (anon + authenticated), AUCUN SELECT/UPDATE/DELETE ──
-- La capture doit marcher DÉCONNECTÉ → policy INSERT pour anon ET authenticated.
-- Aucune policy SELECT : personne (hors service_role, qui bypasse la RLS) ne peut
-- LIRE la liste → impossible d'énumérer les emails inscrits. Pas d'UPDATE/DELETE non
-- plus (la gestion de la liste se fait en service_role). L'upsert ignoreDuplicates
-- prend le chemin INSERT ... ON CONFLICT DO NOTHING : seule la policy INSERT compte.
alter table public.guide_waitlist enable row level security;

-- WITH CHECK = garde DB minimale d'un email plausible (la vraie validation est zod,
-- côté Server Action). Une condition réelle (≠ `true`) évite aussi le flag advisor
-- « RLS Policy Always True » et bloque les inserts manifestement bidons côté base.
create policy "guide_waitlist_insert_public"
  on public.guide_waitlist
  for insert
  to anon, authenticated
  with check (
    char_length(email::text) between 3 and 254
    and email::text ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  );
