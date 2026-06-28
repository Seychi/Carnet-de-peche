-- 078_gear_photo_and_wear.sql — Sprint 46, WS-A (photo) + WS-B (usure/perte).
--
-- La boîte à matériel (059) devient visuelle (photo de leurre) et narrative
-- (un leurre peut être perdu/cassé/usé → « t'a sorti N poissons avant de te lâcher »).
-- Tout owner-only : la RLS gear_items_select_own/insert/update de 059 couvre ces
-- nouvelles colonnes (pas de verrou colonne ici, contrairement à geom spots/catches).
--
-- WS-A : photo_path = chemin dans le bucket PRIVÉ `catches` (sous-dossier gear/),
--        lu via signed URL côté serveur. Jamais d'URL publique.
-- WS-B : retired_at + retired_reason (perdu/casse/use). Retirer un leurre l'archive
--        aussi (archived=true posé côté app) → il part au « cimetière des leurres ».
--
-- ⚠️ Prochain libre = 078 (077 = sprint 44). Migration APPLIQUÉE en prod. Regen types ensuite.

alter table public.gear_items
  add column if not exists photo_path text,
  add column if not exists retired_at timestamptz,
  add column if not exists retired_reason text
    check (retired_reason in ('perdu', 'casse', 'use') or retired_reason is null);
