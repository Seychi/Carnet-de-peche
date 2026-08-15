-- 112_email_suppressions.sql — Sprint 78, préalable emails
-- Liste de suppression : on n'écrit plus jamais à une adresse qui a rebondi.
--
-- POURQUOI MAINTENANT (audit QA du 2026-08-14, §1.7 et §1.8) :
-- La confirmation d'email est DÉSACTIVÉE sur le projet, et c'est une décision
-- assumée de John : l'exiger viderait de son sens l'inscription différée du
-- sprint 77 (un brouillon rejoué dans un compte inutilisable tant qu'on n'a pas
-- ouvert sa boîte n'a aucun intérêt). Conséquence : des adresses invalides
-- entrent en base (`test1234@gmmm.com`, domaine inexistant, compte confirmé et
-- session ouverte à l'instant de la création).
--
-- Le sprint 77 vient d'ajouter DEUX flux d'emails (relance J+2, alerte de
-- marnage). Chaque envoi vers une adresse morte est un rebond dur, et les
-- rebonds dégradent la réputation d'expéditeur du domaine. À 45 comptes ça ne se
-- voit pas ; le jour où l'acquisition décolle, c'est la délivrabilité de
-- l'alerte — le seul bénéfice impossible sans compte — qui trinque.
--
-- La protection se place donc côté ENVOI, pas côté inscription.
--
-- CLÉ = L'ADRESSE, PAS L'UTILISATEUR, à dessein : un rebond est une propriété de
-- la boîte aux lettres. Si le compte est supprimé puis recréé avec la même
-- adresse morte, la suppression doit survivre. `user_id` n'est conservé qu'à
-- titre indicatif, et passe à null si le compte disparaît.
--
-- ⚠️ RLS ACTIVE SANS AUCUNE POLICY : cette table ne doit être lue ni écrite par
-- un client, jamais. Seul le rôle de service (webhook Resend, résolution de
-- destinataire) y accède, et il contourne la RLS. Même discipline que
-- `season_results` (migration 103). Ajouter une policy ici exposerait la liste
-- des adresses email de la base.

begin;

create table if not exists public.email_suppressions (
  -- Normalisée en minuscules par l'application ET par la contrainte ci-dessous :
  -- un rebond sur « Jean@X.fr » doit bloquer « jean@x.fr ».
  email text primary key check (email = lower(email)),
  user_id uuid references auth.users (id) on delete set null,
  -- `hard_bounce`    : rebond définitif (boîte ou domaine inexistant)
  -- `complaint`      : signalé comme indésirable par le destinataire
  -- `invalid_domain` : domaine sans MX, détecté à l'inscription
  -- `manual`         : retrait décidé à la main
  reason text not null check (reason in ('hard_bounce', 'complaint', 'invalid_domain', 'manual')),
  -- Contexte brut du fournisseur, pour pouvoir enquêter sans deviner.
  detail text,
  suppressed_at timestamptz not null default now()
);

comment on table public.email_suppressions is
  'Adresses auxquelles on n''envoie plus rien (rebond dur, plainte, domaine sans MX). Service-role uniquement, RLS sans policy.';

create index if not exists email_suppressions_user_id_idx
  on public.email_suppressions (user_id);

alter table public.email_suppressions enable row level security;

-- Aucune policy : verrouillage total côté client, y compris pour un modérateur.
-- Le rôle de service contourne la RLS et reste le seul chemin d'accès.

commit;
