-- 058 — Index couvrant les FK non indexées (advisor performance: unindexed_foreign_keys).
-- Cible : invite_codes.created_by (FK auth.users, déf. 052) + outings.spot_id (FK spots, déf. 051).
-- Index simples (PAS de CONCURRENTLY : exécuté dans la transaction de migration ; tables
-- petites). Idempotent via `if not exists`. Aucun impact RLS / floutage GPS / gating.
create index if not exists invite_codes_created_by_idx on public.invite_codes (created_by);
create index if not exists outings_spot_id_idx on public.outings (spot_id);
