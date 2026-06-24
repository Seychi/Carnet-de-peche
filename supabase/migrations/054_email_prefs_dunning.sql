-- 054_email_prefs_dunning.sql — Sprint 26, WS-A (tunnel : relances + opt-out RGPD).
--
-- But : (1) donner une base légale + un opt-out aux emails MARKETING (win-back),
-- (2) poser des marqueurs anti-double-envoi pour les relances temporelles par cron
-- (sans état DB, un cron quotidien réenverrait le même mail chaque jour).
--
-- RGPD : on distingue TRANSACTIONNEL (J-1 « ton essai finit demain »,
-- payment-failed — base légale = exécution du contrat, pas d'opt-out) de
-- MARKETING (win-back J+2 — base légale = intérêt légitime / soft opt-in client
-- existant + désinscription facile par lien tokenisé sans login).
--
-- Aucune opération destructive. Aucune nouvelle policy : les écritures de ces
-- colonnes se font en service_role (cron / Server Action) qui bypasse la RLS.
-- La RLS existante reste : profiles = SELECT/UPDATE own ; subscriptions = SELECT own.

-- ─── profiles : consentement marketing + token de désinscription ──────────────
-- Soft opt-in (défaut true) : modèle « intérêt légitime + désinscription facile »
-- pour des clients/utilisateurs existants (CNIL — relances liées à un service déjà
-- utilisé). L'utilisateur peut couper en 1 clic (toggle compte ou lien email).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_email_optin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_unsub_token uuid NOT NULL DEFAULT gen_random_uuid();

COMMENT ON COLUMN public.profiles.marketing_email_optin IS
  'Consentement aux emails de relance/conseils (marketing). Défaut true (soft opt-in). false = désinscrit. N''affecte PAS le transactionnel (essai J-1, paiement échoué).';
COMMENT ON COLUMN public.profiles.email_unsub_token IS
  'Token de désinscription marketing par lien (page /unsubscribe?token=...) sans login. Régénérable.';

-- Un email = un token unique (le lien de désinscription doit cibler un seul compte).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unsub_token_key
  ON public.profiles (email_unsub_token);

-- ─── subscriptions : marqueurs anti-double-envoi (cron de relance) ────────────
-- Écrits UNIQUEMENT en service_role (le cron). Pas de policy ajoutée : le cron
-- bypasse la RLS ; aucun chemin client n'écrit ces colonnes.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_reminder_j1_at  timestamptz,
  ADD COLUMN IF NOT EXISTS post_trial_winback_at timestamptz;

COMMENT ON COLUMN public.subscriptions.trial_reminder_j1_at IS
  'Horodate l''envoi de l''email TRANSACTIONNEL J-1 « ton essai finit demain » (anti-doublon cron dunning).';
COMMENT ON COLUMN public.subscriptions.post_trial_winback_at IS
  'Horodate l''envoi de l''email MARKETING J+2 win-back post-essai non converti (anti-doublon cron dunning).';
