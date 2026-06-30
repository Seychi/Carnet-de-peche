-- 094_tag_sprint29_species.sql — Sprint 53, WS-A (taguer les 6 espèces du sprint-29).
--
-- Problème : barracuda, tassergal, liche, marbre, lieu_noir, merlan ont une fiche
-- complète mais étaient sur 0 spot → fiche sans « Meilleurs spots », chips carte à
-- 0, espèces invisibles.
--
-- Curation éditoriale (validée par John 2026-06-30) : aire de répartition + structure
-- + co-occurrence. Listes complétées avec la Méditerranée PACA (région
-- 'provence-alpes-cote-d-azur', absente du brief initial) et les pointes bretonnes
-- déjà taguées lieu_jaune. Les 86 slugs ont été vérifiés présents en base (curated).
--
-- Idempotent ET ordre-préservant : append `|| array['X']` seulement si l'espèce
-- n'est pas déjà présente (`not ('X' = any(species))`). Ré-exécutable sans effet.
-- Ne touche que source='curated'. Aucune coordonnée. Aucun changement de schéma
-- (pas de regen lib/types.ts).

-- lieu_noir (23) — Manche/Atlantique rocheux froid, co-occurrence lieu_jaune.
update public.spots set species = species || array['lieu_noir']
where source = 'curated' and not ('lieu_noir' = any(species)) and slug in (
  'cap-de-la-hague-goury','cap-de-carteret','pointe-de-barfleur-gatteville','digue-de-querqueville',
  'digue-de-dielette','pointe-du-roc-granville','pointe-du-chateau-plougrescant','cap-frehel',
  'pointe-de-l-arcouest','port-de-gwin-zegal','pointe-de-primel','pointe-saint-mathieu',
  'phare-du-petit-minou','pointe-du-raz','ile-d-ouessant-lampaul','cap-sizun','pointe-de-dinan',
  'pointe-du-millier','rochers-de-saint-guenole','le-diben-brest','pointe-du-grouin',
  'belle-ile-pointe-des-poulains','pointe-du-percho'
);

-- merlan (15) — Manche/Mer du Nord, demersal sableux + jetées.
update public.spots set species = species || array['merlan']
where source = 'curated' and not ('merlan' = any(species)) and slug in (
  'jetees-de-courseulles','jetees-de-port-en-bessin','digue-de-saint-vaast','pointe-d-agon',
  'pointe-du-roc-granville','chenal-de-l-aa-gravelines','jetee-de-malo-les-bains','digue-carnot-boulogne',
  'digue-de-wimereux','jetee-ouest-de-calais','cap-gris-nez','jetees-de-saint-valery-en-caux',
  'jetee-du-treport','jetees-de-dieppe','jetee-de-fecamp'
);

-- marbre (14) — Méditerranée, plages/bordures sableuses (Occitanie + PACA + Corse).
update public.spots set species = species || array['marbre']
where source = 'curated' and not ('marbre' = any(species)) and slug in (
  'plage-de-la-franqui','gruissan-plage','espiguette-section-ouest','plage-rive-gauche-grau-du-roi',
  'plage-sud-port-camargue','pointe-de-l-espiguette','plage-de-frontignan','plage-du-lazaret-sete',
  'anse-de-paulilles','plage-de-la-marana','plage-du-cavaou','plage-napoleon-port-saint-louis',
  'saintes-maries-de-la-mer','mourillon-toulon'
);

-- liche (15) — Méditerranée, digues/môles + caps (Occitanie + PACA + Corse).
update public.spots set species = species || array['liche']
where source = 'curated' and not ('liche' = any(species)) and slug in (
  'mole-saint-louis-sete','jetees-du-grau-du-roi','mole-de-port-vendres','jetee-de-narbonne-plage',
  'port-d-argeles','jetee-nord-port-leucate','port-de-propriano','port-tino-rossi-ajaccio',
  'port-de-bonifacio','mole-de-la-pointe-rouge','jetee-du-large-nice','digue-du-port-vauban',
  'mole-jean-reveille-saint-tropez','sanary-sur-mer','digue-du-port-de-bandol'
);

-- barracuda (23) — Méditerranée, ports/digues éclairés + caps (Corse + Occitanie + PACA, 06 = secteur n°1 FR).
update public.spots set species = species || array['barracuda']
where source = 'curated' and not ('barracuda' = any(species)) and slug in (
  'port-tino-rossi-ajaccio','port-de-bonifacio','port-de-propriano','port-de-porto-vecchio',
  'jetee-du-dragon-bastia','phare-de-pertusato','pointe-de-la-parata','mole-saint-louis-sete',
  'mole-de-port-vendres','jetees-du-grau-du-roi','cap-d-agde','cap-leucate','cap-bear',
  'digue-du-port-vauban','jetee-du-large-nice','cap-d-antibes','cap-ferrat','cap-martin',
  'mole-de-la-pointe-rouge','callelongue-cap-croisette','cap-camarat','presqu-ile-de-giens',
  'mole-jean-reveille-saint-tropez'
);

-- tassergal (18) — Méditerranée, pointes/passes exposées + caps (Corse + Occitanie + PACA).
update public.spots set species = species || array['tassergal']
where source = 'curated' and not ('tassergal' = any(species)) and slug in (
  'capo-di-feno','pointe-de-la-parata','barcaggio-cap-corse','phare-de-pertusato','cap-leucate',
  'cap-d-agde','cap-bear','cap-l-abeille-banyuls','pointe-saint-vincent-collioure','pointe-de-l-espiguette',
  'cap-d-antibes','cap-ferrat','cap-martin','pointe-de-l-aiguille-theoule','cap-couronne',
  'callelongue-cap-croisette','cap-camarat','cap-dramont'
);
