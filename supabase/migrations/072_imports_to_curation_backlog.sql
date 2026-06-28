-- 072_imports_to_curation_backlog.sql — Sprint 42, WS-B (masquage imports, Chemin A).
--
-- Décision John D1 = Chemin A : les 942 imports OSM bruts (squelettiques : pas
-- d'espèces/techniques/score) sont MASQUÉS de la carte publique jusqu'au curage
-- (sprint 43), en les passant en moderation_status='pending'. Toutes les lectures
-- carte filtrent 'approved' (get_spots_for_map 043:481, nearby_spots, get_spot_by_slug,
-- vue spots_for_viewer) → les imports disparaissent de la carte/fiche/nearby SANS
-- toucher au rendu. Ils deviennent un backlog de curation propre.
--
-- Le script d'import (scripts/import-osm-spots.ts) a été basculé en 'pending' dans le
-- même sprint → tout futur réimport (06/Corse) entre directement en backlog, masqué.
--
-- ⚠️ Numérotation : prochain libre = 072. Idempotent (cible 'approved').
--
-- Migration APPLIQUÉE en prod via apply_migration.

update public.spots
set moderation_status = 'pending'
where source = 'imported'
  and moderation_status = 'approved';
