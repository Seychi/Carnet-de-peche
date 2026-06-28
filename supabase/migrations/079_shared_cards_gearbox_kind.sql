-- 079_shared_cards_gearbox_kind.sql — Sprint 46, WS-C (boîte partageable).
--
-- On réutilise tout le moteur de partage (sprint 38, shared_cards 061) ; il suffit
-- d'autoriser un nouveau kind 'gearbox'. Le payload gearbox est geom-free (libellés
-- + nombre de prises + espèces dominantes), JAMAIS un spot, une coordonnée ou une
-- photo (cf createGearboxCard côté app).
--
-- CHECK courant (061) = ('catch','conditions','outing') → on DROP + ADD avec 'gearbox'.
--
-- ⚠️ Prochain libre = 079. Migration APPLIQUÉE en prod. Regen types ensuite.

alter table public.shared_cards
  drop constraint if exists shared_cards_kind_check;

alter table public.shared_cards
  add constraint shared_cards_kind_check
  check (kind = any (array['catch'::text, 'conditions'::text, 'outing'::text, 'gearbox'::text]));
