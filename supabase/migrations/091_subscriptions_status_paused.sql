-- 091_subscriptions_status_paused.sql — Sprint 51, WS-A (Stripe pause_collection).
--
-- Problème : Stripe peut mettre un abonnement en `paused` (pause_collection via
-- le Customer Portal). Le webhook écrit alors status='paused' dans subscriptions,
-- mais le CHECK d'origine (inline dans 001_init.sql, auto-nommé
-- `subscriptions_status_check`) n'autorise PAS cette valeur :
--   active, trialing, past_due, canceled, incomplete, incomplete_expired, unpaid
-- → l'upsert viole la contrainte → le handler relève l'erreur → la route renvoie
--   500 → Stripe rejoue l'event À L'INFINI et le tier local reste figé/faux.
--
-- Correctif : ajouter 'paused' au CHECK. Opération non destructive (aucune ligne
-- supprimée) ; l'ADD valide les lignes existantes, toutes déjà dans l'ancien set,
-- donc le sur-ensemble (ancien + paused) ne peut pas échouer à la validation.
--
-- current_tier (vérifié live, pg_get_functiondef) n'accorde le payant QUE pour
-- 'active'/'trialing' valides : 'paused' retombe sur 'discovery'. Aucun correctif
-- current_tier requis, aucun risque de faux accès payant.
--
-- Backstop applicatif complémentaire : lib/stripe/events.ts ignore désormais tout
-- statut hors de cette liste (clamp KNOWN_SUBSCRIPTION_STATUSES) plutôt que de
-- laisser l'upsert planter — défense contre un futur statut Stripe inconnu.
--
-- ⚠️ Prochain libre = 091. Regen lib/types.ts après application (status reste
--    `string | null`, pas d'enum : impact de typage attendu nul).

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status = any (array[
    'active',
    'trialing',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  ]));
