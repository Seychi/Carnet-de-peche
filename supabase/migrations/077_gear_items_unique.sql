-- 077_gear_items_unique.sql — Sprint 44, WS-A (dédup boîte à matériel).
--
-- 059 n'a posé aucun index unique sur gear_items → on peut créer 2× le même leurre.
-- Index unique partiel (sur les items ACTIFS) pour empêcher les doublons. ⚠️ colonne
-- d'archivage = `archived` (pas is_archived) ; brand/model/color nullable → on COALESCE
-- les trois à '' (sinon les NULL sont traités comme distincts et la dédup fuit sur les
-- champs vides). Vérifié : 0 doublon existant → création sans dédup préalable.
--
-- ⚠️ Prochain libre = 077. Migration APPLIQUÉE en prod.

create unique index if not exists gear_items_dedup_idx
  on public.gear_items (
    user_id,
    kind,
    lower(coalesce(brand, '')),
    lower(coalesce(model, '')),
    lower(coalesce(color, ''))
  )
  where not archived;
