-- Sprint 58 WS-C — Index couvrants pour les clés étrangères non indexées.
-- Advisors Supabase (performance, INFO) : ces 4 FK n'avaient pas d'index couvrant,
-- ce qui rend lents les JOIN / les ON DELETE / les filtres par la colonne FK.
-- Idempotent (IF NOT EXISTS). Aucun impact RLS ni donnée. Clôture chantier 51→58.

create index if not exists outing_messages_user_id_idx
  on public.outing_messages (user_id);

create index if not exists outing_reviews_reviewer_id_idx
  on public.outing_reviews (reviewer_id);

create index if not exists spot_confirmations_user_id_idx
  on public.spot_confirmations (user_id);

create index if not exists spots_verified_by_idx
  on public.spots (verified_by);
