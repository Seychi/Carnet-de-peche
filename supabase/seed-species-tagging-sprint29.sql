-- seed-species-tagging-sprint29.sql — Tagging des spots curés avec les 6 NOUVELLES espèces (sprint 29).
--
-- ⚠️ NON APPLIQUÉ par défaut — à ARBITRER + appliquer par John (cf docs/sprint-29 « reste manuel »).
-- Tant qu'il n'est pas joué, les fiches /especes/<nouvelle> affichent un « top spots » VIDE
-- et HONNÊTE (aucun faux peuplement) — c'est volontaire et acceptable (Bloc 4, garde-fou).
--
-- Aucune migration, aucun schéma : pur data. Reprend EXACTEMENT le pattern de
-- seed-species-tagging-sprint23.sql (vérifié via supabase-guard) :
--   · spots.species (text[]) ; append `|| array['<dbKey>']`
--   · idempotent : `not (species @> array['<dbKey>'])`
--   · uniquement les spots CURÉS publics : `visibility='public' and source='curated'`
--   · filtre par façade via la liste des 9 départements Méditerranée.
-- dbKeys EXACTS (snake_case, == référentiel SPECIES) : barracuda, liche, tassergal, marbre, lieu_noir, merlan.
--
-- Garde-fou produit : on tague des spots RÉELLEMENT pertinents (façade × structure d'habitat),
-- pas de bruit. Conservateur : en cas de doute, mieux vaut un top-spots vide qu'un faux positif.
-- À relire/ajuster par John selon la répartition réelle de ses spots curés.

-- ═══ MÉDITERRANÉE (9 dépts : 06 11 13 30 34 66 83 2A 2B) ═══════════════════════

-- Barracuda (bécune) : prédateur de digues/ports/secs rocheux méditerranéens.
update spots set species = species || array['barracuda']
  where visibility='public' and source='curated'
    and btrim(department) = any(array['06','11','13','30','34','66','83','2A','2B'])
    and coalesce(structure,'') = any(array['digue','pointe_rocheuse','passe'])
    and not (species @> array['barracuda']);

-- Liche : gros carangidé de surface, digues / plages avec fond / embouchures (Med).
update spots set species = species || array['liche']
  where visibility='public' and source='curated'
    and btrim(department) = any(array['06','11','13','30','34','66','83','2A','2B'])
    and coalesce(structure,'') = any(array['digue','plage','estuaire'])
    and not (species @> array['liche']);

-- Tassergal : cœur méditerranéen (plages profondes, digues, embouchures). Conservateur :
-- Med uniquement — sa remontée atlantique est saisonnière/erratique, on évite le bruit côté Atl.
update spots set species = species || array['tassergal']
  where visibility='public' and source='curated'
    and btrim(department) = any(array['06','11','13','30','34','66','83','2A','2B'])
    and coalesce(structure,'') = any(array['plage','digue','estuaire'])
    and not (species @> array['tassergal']);

-- Marbré : sparidé fouisseur des plages de sable méditerranéennes.
update spots set species = species || array['marbre']
  where visibility='public' and source='curated'
    and btrim(department) = any(array['06','11','13','30','34','66','83','2A','2B'])
    and coalesce(structure,'') = any(array['plage'])
    and not (species @> array['marbre']);

-- ═══ MANCHE-ATLANTIQUE (tout sauf les 9 dépts Méditerranée) ════════════════════

-- Lieu noir : gadidé d'eau froide, digues profondes / môles / enrochements (Manche-Atl).
update spots set species = species || array['lieu_noir']
  where visibility='public' and source='curated'
    and btrim(department) <> all(array['06','11','13','30','34','66','83','2A','2B'])
    and coalesce(structure,'') = any(array['digue','cale','pointe_rocheuse'])
    and not (species @> array['lieu_noir']);

-- Merlan : surfcasting d'hiver sur le sable — plages / estuaires (Manche-Atl).
update spots set species = species || array['merlan']
  where visibility='public' and source='curated'
    and btrim(department) <> all(array['06','11','13','30','34','66','83','2A','2B'])
    and coalesce(structure,'') = any(array['plage','estuaire'])
    and not (species @> array['merlan']);

-- Vérif post-application (optionnel) :
-- select unnest(species) as sp, count(*) from spots where source='curated' group by 1 order by 2 desc;
