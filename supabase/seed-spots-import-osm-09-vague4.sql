-- =====================================================================
-- seed-spots-import-osm-01.sql — IMPORT OSM (sprint Carte-v2 / C2, Bloc D)
-- GÉNÉRÉ par scripts/import-osm-spots.ts — ⚠️ À RELIRE avant insertion.
-- Source des positions : OpenStreetMap, sous licence ODbL v1.0.
--   © OpenStreetMap contributors — https://www.openstreetmap.org/copyright
-- Chaque ligne : source='imported', verified=false, moderation_status='pending'.
-- (sprint 42 : les imports bruts entrent en BACKLOG de curation, masqués de la carte
--  publique jusqu'à validation au sprint 43 — toutes les lectures filtrent 'approved'.)
-- Le NOT EXISTS ST_DWithin(150 m) déduplique contre l'existant
-- (curated + community + imported) AU MOMENT de l'insertion.
-- Le trigger spots_blur recalcule geom_public (flou) automatiquement.
-- 88 structures candidates.
-- =====================================================================

begin;

insert into public.spots (name, slug, department, region, geom, source, moderation_status, verified, visibility, structure)
select
  c.name, c.slug, c.department, c.region,
  ST_SetSRID(ST_MakePoint(c.lng::double precision, c.lat::double precision), 4326)::geography,
  'imported', 'pending', false, 'public', c.structure::text
from (values
  ('Requin', 'requin-osm13798438929', '59', 'Hauts-de-France', 2.598485, 51.081173, null),
  ('Feu de Saint-Pol', 'feu-de-saint-pol-osm72312290', '59', 'Hauts-de-France', 2.349372, 51.060575, null),
  ('Tour du Leughenaer', 'tour-du-leughenaer-osm72575067', '59', 'Hauts-de-France', 2.378626, 51.040151, null),
  ('Plage du Braek', 'plage-du-braek-osm176961121', '59', 'Hauts-de-France', 2.260116, 51.043756, 'plage'),
  ('Plage de Leffrinckoucke', 'plage-de-leffrinckoucke-osm234115857', '59', 'Hauts-de-France', 2.449342, 51.062564, 'plage'),
  ('Plage de Zuydcoote', 'plage-de-zuydcoote-osm234116167', '59', 'Hauts-de-France', 2.485868, 51.071383, 'plage'),
  ('Plage de Malo-les-Bains', 'plage-de-malo-les-bains-osm520745148', '59', 'Hauts-de-France', 2.405568, 51.052255, 'plage'),
  ('Phare de Dunkerque', 'phare-de-dunkerque-osm751717753', '59', 'Hauts-de-France', 2.364403, 51.048914, null),
  ('Blériot-Plage', 'bleriot-plage-osm1723311211', '62', 'Hauts-de-France', 1.905773, 50.979458, 'plage'),
  ('Calais plage', 'calais-plage-osm1723311230', '62', 'Hauts-de-France', 1.800469, 50.962929, 'plage'),
  ('Cap Blanc Nez', 'cap-blanc-nez-osm1723311259', '62', 'Hauts-de-France', 1.713443, 50.929401, 'plage'),
  ('Dunes du Chatelet', 'dunes-du-chatelet-osm1723311454', '62', 'Hauts-de-France', 1.638539, 50.877254, 'plage'),
  ('Hardelot Plage', 'hardelot-plage-osm1723311510', '62', 'Hauts-de-France', 1.576147, 50.636547, 'plage'),
  ('Stella Plage', 'stella-plage-osm1723311813', '62', 'Hauts-de-France', 1.577571, 50.503039, 'plage'),
  ('Wissant', 'wissant-osm1723311846', '62', 'Hauts-de-France', 1.681843, 50.905949, 'plage'),
  ('Pointe de la Crèche', 'pointe-de-la-creche-osm2749121526', '62', 'Hauts-de-France', 1.594224, 50.750608, 'pointe_rocheuse'),
  ('Phare de Walde', 'phare-de-walde-osm3627204490', '62', 'Hauts-de-France', 1.914757, 50.993503, null),
  ('Baie d''Authie', 'baie-d-authie-osm4776857221', '62', 'Hauts-de-France', 1.570765, 50.358948, null),
  ('Baie de Wissant', 'baie-de-wissant-osm5792829919', '62', 'Hauts-de-France', 1.652015, 50.889025, null),
  ('Pointe aux Oie', 'pointe-aux-oie-osm8849229717', '62', 'Hauts-de-France', 1.604960, 50.786878, 'pointe_rocheuse'),
  ('Pointe de la Rochette', 'pointe-de-la-rochette-osm8849229729', '62', 'Hauts-de-France', 1.605481, 50.776985, 'pointe_rocheuse'),
  ('Cap d''Alprech', 'cap-d-alprech-osm8850627411', '62', 'Hauts-de-France', 1.562118, 50.699421, 'pointe_rocheuse'),
  ('Pointe de la Courte Dune', 'pointe-de-la-courte-dune-osm8879125099', '62', 'Hauts-de-France', 1.598877, 50.871614, 'pointe_rocheuse'),
  ('Cap Gris Nez', 'cap-gris-nez-osm8879139598', '62', 'Hauts-de-France', 1.583409, 50.871100, 'pointe_rocheuse'),
  ('Cran de Quette', 'cran-de-quette-osm8879139603', '62', 'Hauts-de-France', 1.581678, 50.865468, 'pointe_rocheuse'),
  ('Cran des Sillers', 'cran-des-sillers-osm8879139614', '62', 'Hauts-de-France', 1.580161, 50.862707, 'pointe_rocheuse'),
  ('Cran Barbier', 'cran-barbier-osm8879146534', '62', 'Hauts-de-France', 1.579392, 50.855723, 'pointe_rocheuse'),
  ('Pointe du Riden', 'pointe-du-riden-osm8879146538', '62', 'Hauts-de-France', 1.578758, 50.852944, 'pointe_rocheuse'),
  ('Cran aux Œufs', 'cran-aux-ufs-osm8879146539', '62', 'Hauts-de-France', 1.582464, 50.850439, 'pointe_rocheuse'),
  ('Pointe du Touquet', 'pointe-du-touquet-osm8891077187', '62', 'Hauts-de-France', 1.587152, 50.540314, 'pointe_rocheuse'),
  ('Cran Mademoiselle', 'cran-mademoiselle-osm8899063312', '62', 'Hauts-de-France', 1.588272, 50.835908, 'pointe_rocheuse'),
  ('Pointe du Nid de Corbet', 'pointe-du-nid-de-corbet-osm8899063313', '62', 'Hauts-de-France', 1.590239, 50.829853, 'pointe_rocheuse'),
  ('Cran Poulet', 'cran-poulet-osm8899114237', '62', 'Hauts-de-France', 1.585282, 50.843823, 'pointe_rocheuse'),
  ('Plage d''Ambleteuse', 'plage-d-ambleteuse-osm9027126149', '62', 'Hauts-de-France', 1.600424, 50.775403, 'plage'),
  ('Cap Blanc Nez', 'cap-blanc-nez-osm9027126157', '62', 'Hauts-de-France', 1.706948, 50.925427, 'pointe_rocheuse'),
  ('Le Petit Blanc Nez', 'le-petit-blanc-nez-osm9027126196', '62', 'Hauts-de-France', 1.693006, 50.915341, 'pointe_rocheuse'),
  ('Pointe du Haut Banc', 'pointe-du-haut-banc-osm9201920912', '62', 'Hauts-de-France', 1.556299, 50.397033, 'pointe_rocheuse'),
  ('Pointe de Routhiauville ou de la Dune Blanche', 'pointe-de-routhiauville-ou-de-la-dune-blanche-osm9214868839', '62', 'Hauts-de-France', 1.562677, 50.363916, 'pointe_rocheuse'),
  ('Pointe de Lornel', 'pointe-de-lornel-osm9214868841', '62', 'Hauts-de-France', 1.584227, 50.561566, 'pointe_rocheuse'),
  ('Crique de la Crevasse', 'crique-de-la-crevasse-osm9428994723', '62', 'Hauts-de-France', 1.566115, 50.681935, 'plage'),
  ('Crique de Ningles', 'crique-de-ningles-osm13124773706', '62', 'Hauts-de-France', 1.563186, 50.692121, 'plage'),
  ('Plage de Calais', 'plage-de-calais-osm35894485', '62', 'Hauts-de-France', 1.841250, 50.965499, 'plage'),
  ('Phare de Berck', 'phare-de-berck-osm132169637', '62', 'Hauts-de-France', 1.560783, 50.398361, null),
  ('Berck Plage', 'berck-plage-osm132196447', '62', 'Hauts-de-France', 1.558682, 50.404828, 'plage'),
  ('Phare de la Canche', 'phare-de-la-canche-osm156289500', '62', 'Hauts-de-France', 1.592187, 50.523598, null),
  ('Plage de Boulogne-sur-Mer', 'plage-de-boulogne-sur-mer-osm261400606', '62', 'Hauts-de-France', 1.594341, 50.739886, 'plage'),
  ('Ancien fossé antichar', 'ancien-fosse-antichar-osm266319266', '62', 'Hauts-de-France', 1.737291, 50.935975, 'digue'),
  ('La crèche', 'la-creche-osm310746359', '62', 'Hauts-de-France', 1.581466, 50.750734, 'digue'),
  ('Le Poulier', 'le-poulier-osm372980557', '62', 'Hauts-de-France', 1.590253, 50.547756, 'plage'),
  ('Phare de Calais', 'phare-de-calais-osm753220217', '62', 'Hauts-de-France', 1.853588, 50.961290, null),
  ('Digue Carnot', 'digue-carnot-osm934756023', '62', 'Hauts-de-France', 1.567514, 50.740791, 'digue'),
  ('Plage d''Audresselles', 'plage-d-audresselles-osm944686862', '62', 'Hauts-de-France', 1.592454, 50.821360, 'plage'),
  ('Plage du Portel', 'plage-du-portel-osm1039834126', '62', 'Hauts-de-France', 1.574221, 50.714601, 'plage'),
  ('Jetée Nord-est', 'jetee-nord-est-osm1040250064', '62', 'Hauts-de-France', 1.587276, 50.731846, 'digue'),
  ('Plage Naturiste', 'plage-naturiste-osm1055531744', '62', 'Hauts-de-France', 1.567651, 50.432000, 'plage'),
  ('Plage Hameau du Griz Nez.', 'plage-hameau-du-griz-nez-osm1249403234', '62', 'Hauts-de-France', 1.592579, 50.870551, 'plage'),
  ('Plage de Merlimont', 'plage-de-merlimont-osm1290674067', '62', 'Hauts-de-France', 1.572342, 50.462664, 'plage'),
  ('Phare d''Ailly', 'phare-d-ailly-osm461813484', '76', 'Normandie', 0.958465, 49.916055, null),
  ('Phare de Fécamp', 'phare-de-fecamp-osm493872225', '76', 'Normandie', 0.363292, 49.765627, null),
  ('Phare de Saint-Valery en Caux', 'phare-de-saint-valery-en-caux-osm1456880012', '76', 'Normandie', 0.708732, 49.873529, null),
  ('La Manneporte', 'la-manneporte-osm1605544539', '76', 'Normandie', 0.189224, 49.704387, 'pointe_rocheuse'),
  ('Porte d''Amont', 'porte-d-amont-osm1605544541', '76', 'Normandie', 0.205860, 49.714543, 'pointe_rocheuse'),
  ('Dieppe - plage de la piscine', 'dieppe-plage-de-la-piscine-osm1723311345', '76', 'Normandie', 1.062423, 49.924965, 'plage'),
  ('L''Escamet', 'l-escamet-osm1723311534', '76', 'Normandie', 0.766963, 49.871605, 'plage'),
  ('Plage du petit-Ailly', 'plage-du-petit-ailly-osm1723311788', '76', 'Normandie', 0.986434, 49.917965, 'plage'),
  ('Cap d''Antifer', 'cap-d-antifer-osm2696877347', '76', 'Normandie', 0.164592, 49.686535, 'pointe_rocheuse'),
  ('Pointe du Fourquet', 'pointe-du-fourquet-osm2837428353', '76', 'Normandie', 0.168546, 49.689997, 'pointe_rocheuse'),
  ('Pointe de la Courtine', 'pointe-de-la-courtine-osm2840836540', '76', 'Normandie', 0.182200, 49.699732, 'pointe_rocheuse'),
  ('Le Grand Sable', 'le-grand-sable-osm5181743730', '76', 'Normandie', 0.871139, 49.894966, 'plage'),
  ('Plage de Vaucottes', 'plage-de-vaucottes-osm7772396844', '76', 'Normandie', 0.290884, 49.738041, 'plage'),
  ('Le Pertuiser', 'le-pertuiser-osm9214868832', '76', 'Normandie', 0.187183, 49.702111, 'pointe_rocheuse'),
  ('Pointe du Chicard', 'pointe-du-chicard-osm9214868833', '76', 'Normandie', 0.303746, 49.741290, 'pointe_rocheuse'),
  ('Cap Fagnet', 'cap-fagnet-osm9214868834', '76', 'Normandie', 0.369390, 49.768770, 'pointe_rocheuse'),
  ('la Pointue', 'la-pointue-osm9214868835', '76', 'Normandie', 0.829058, 49.888503, 'pointe_rocheuse'),
  ('plage des Petites Dalles', 'plage-des-petites-dalles-osm13095246543', '76', 'Normandie', 0.523878, 49.825373, 'plage'),
  ('Port de plaisance du Tréport', 'port-de-plaisance-du-treport-osm131483643', '76', 'Normandie', 1.382227, 50.060081, 'digue'),
  ('Bethencourt', 'bethencourt-osm132426193', '76', 'Normandie', 1.080901, 49.926919, 'digue'),
  ('D''Esnambuc', 'd-esnambuc-osm132426197', '76', 'Normandie', 1.083636, 49.928095, 'digue'),
  ('Phare d''Antifer', 'phare-d-antifer-osm167467175', '76', 'Normandie', 0.165347, 49.683458, null),
  ('Plage d''Antifer', 'plage-d-antifer-osm173045886', '76', 'Normandie', 0.154423, 49.647629, 'plage'),
  ('Plage de Dieppe', 'plage-de-dieppe-osm176438492', '76', 'Normandie', 1.068611, 49.926239, 'plage'),
  ('Le Tilleul - Antifer', 'le-tilleul-antifer-osm692956591', '76', 'Normandie', 0.179260, 49.695253, 'plage'),
  ('Plage du Fourquet', 'plage-du-fourquet-osm693000325', '76', 'Normandie', 0.166600, 49.687686, 'plage'),
  ('Plage du Puys', 'plage-du-puys-osm762970542', '76', 'Normandie', 1.108900, 49.937549, 'plage')
) as c(name, slug, department, region, lng, lat, structure)
where not exists (
  select 1 from public.spots s
  where ST_DWithin(
    s.geom,
    ST_SetSRID(ST_MakePoint(c.lng::double precision, c.lat::double precision), 4326)::geography,
    150
  )
);

commit;
