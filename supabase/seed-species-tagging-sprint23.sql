-- =====================================================================
-- Carnet de Pêche — Tagging additif des nouvelles espèces sur les spots curés
-- (sprint 23, post-déploiement — APPLIQUÉ en prod le 2026-06-23 via execute_sql).
-- =====================================================================
-- Objectif : peupler les spots curés avec les ~14 espèces ajoutées au sprint 23, là
-- où elles sont PERTINENTES — règle habitat = façade (Manche/Atl vs Méditerranée) ×
-- structure du spot. Curation honnête (« ces espèces se pêchent du bord à ce type de
-- poste sur cette façade »), PAS des prises inventées.
--
-- IDEMPOTENT (garde `not (species @> array[...])`) et ADDITIF (append en fin → l'ordre
-- curé d'origine, donc le top-3 affiché, est préservé). Spots `source='curated'`
-- uniquement (on ne touche pas aux propositions communautaires / imports OSM).
-- =====================================================================

-- both façades
update spots set species = species || array['seiche']       where visibility='public' and source='curated' and coalesce(structure,'') = any(array['plage','pointe_rocheuse','digue','estuaire','cale','passe']) and not (species @> array['seiche']);
update spots set species = species || array['calmar']       where visibility='public' and source='curated' and coalesce(structure,'') = any(array['digue','cale','passe','pointe_rocheuse']) and not (species @> array['calmar']);
update spots set species = species || array['mulet']        where visibility='public' and source='curated' and coalesce(structure,'') = any(array['digue','cale','passe','estuaire','plage']) and not (species @> array['mulet']);
update spots set species = species || array['sole']         where visibility='public' and source='curated' and coalesce(structure,'') = any(array['plage','estuaire']) and not (species @> array['sole']);
update spots set species = species || array['rouget']       where visibility='public' and source='curated' and coalesce(structure,'') = any(array['plage','estuaire']) and not (species @> array['rouget']);
update spots set species = species || array['dorade_grise'] where visibility='public' and source='curated' and coalesce(structure,'') = any(array['pointe_rocheuse','digue']) and not (species @> array['dorade_grise']);
update spots set species = species || array['congre']       where visibility='public' and source='curated' and coalesce(structure,'') = any(array['digue','pointe_rocheuse']) and not (species @> array['congre']);
update spots set species = species || array['chinchard']    where visibility='public' and source='curated' and coalesce(structure,'') = any(array['digue','cale','passe','pointe_rocheuse']) and not (species @> array['chinchard']);
update spots set species = species || array['maigre']       where visibility='public' and source='curated' and coalesce(structure,'') = any(array['estuaire']) and not (species @> array['maigre']);

-- Manche / Atlantique uniquement (espèces d'eau froide / atlantiques)
update spots set species = species || array['vieille'] where visibility='public' and source='curated' and btrim(department) <> all(array['06','11','13','30','34','66','83','2A','2B']) and coalesce(structure,'') = any(array['pointe_rocheuse']) and not (species @> array['vieille']);
update spots set species = species || array['tacaud']  where visibility='public' and source='curated' and btrim(department) <> all(array['06','11','13','30','34','66','83','2A','2B']) and coalesce(structure,'') = any(array['digue','pointe_rocheuse']) and not (species @> array['tacaud']);
update spots set species = species || array['plie']    where visibility='public' and source='curated' and btrim(department) <> all(array['06','11','13','30','34','66','83','2A','2B']) and coalesce(structure,'') = any(array['plage','estuaire']) and not (species @> array['plie']);

-- Méditerranée uniquement (sparidés méditerranéens)
update spots set species = species || array['pageot'] where visibility='public' and source='curated' and btrim(department) = any(array['06','11','13','30','34','66','83','2A','2B']) and coalesce(structure,'') = any(array['plage','pointe_rocheuse']) and not (species @> array['pageot']);
update spots set species = species || array['oblade'] where visibility='public' and source='curated' and btrim(department) = any(array['06','11','13','30','34','66','83','2A','2B']) and coalesce(structure,'') = any(array['digue','pointe_rocheuse','cale','passe']) and not (species @> array['oblade']);
