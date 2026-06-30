-- 095_clean_alose_stickbait.sql — Sprint 53, WS-B (valeurs orphelines).
--
-- alose : 3 spots taguent 'alose', or 'alose' n'est PAS dans le référentiel des 26
-- espèces (aucune fiche /especes/alose) → texte gris non cliquable sur la fiche spot.
-- Décision John 2026-06-30 : RETIRER (espèce amphihaline marginale pour la pêche du
-- bord ; pas de fiche à produire pour 3 spots).
--
-- stickbait : 5 spots taguent la technique 'stickbait', or c'est un TYPE DE LEURRE,
-- pas une technique canonique (référentiel = leurres/surfcasting/flottante/vif).
-- Normaliser → 'leurres' (dédupliqué, ordre conservé).
--
-- Idempotent (gardes `= any(...)`). Aucun changement de schéma. Cible par slug.

-- alose → retirer des 3 spots.
update public.spots
set species = array_remove(species, 'alose')
where 'alose' = any(species)
  and slug in ('baie-de-txingudi-hendaye','digue-de-port-medoc','embouchure-de-l-adour-anglet');

-- stickbait → leurres (retire stickbait, ajoute leurres si absent, ordre conservé).
update public.spots
set techniques = case
  when 'leurres' = any(techniques) then array_remove(techniques, 'stickbait')
  else array_remove(techniques, 'stickbait') || array['leurres']
end
where 'stickbait' = any(techniques)
  and slug in (
    'belle-ile-pointe-des-poulains','ile-d-ouessant-lampaul','ile-de-sein-cale-nord',
    'pointe-de-pen-hir','pointe-du-raz'
  );
