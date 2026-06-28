-- 081_shared_cards_recap_records_kind.sql — Sprint 47, WS-B + WS-C.
--
-- Deux nouveaux kinds de cartes de partage : 'recap' (Wrapped « mon année de pêche »)
-- et 'records' (PR board des records perso par espèce). On étend le CHECK kind de
-- shared_cards (qui valait catch/conditions/outing/gearbox après 079).
-- Payloads geom-free (aucun spot, aucune coordonnée), construits côté app.
--
-- ⚠️ Prochain libre = 081. Migration APPLIQUÉE en prod. Regen types ensuite.

alter table public.shared_cards
  drop constraint if exists shared_cards_kind_check;

alter table public.shared_cards
  add constraint shared_cards_kind_check
  check (kind = any (array[
    'catch'::text, 'conditions'::text, 'outing'::text,
    'gearbox'::text, 'recap'::text, 'records'::text
  ]));
