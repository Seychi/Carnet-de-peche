-- =====================================================================
-- Carnet de Pêche — LOT 8 de curation (Atlantique sud densification, 28 spots)
-- Façades sous-couvertes : 17 · 33 · 40 · 64
-- region 'nouvelle-aquitaine'
-- =====================================================================
-- ⚠️ NON INSÉRÉ — PROPOSITION à valider par John, spot par spot (sprint 41, WS B).
--    NE PAS REJOUER une fois inséré (collisions de slug). Fichier = trace/source.
--    Fichier de DONNÉE, pas migration (CLAUDE.md §20.4).
--
-- Pipeline de qualité (sprint 41, 2026-06-27) :
--   1. Recherche documentaire (structures réelles, nommées, publiques :
--      OSM/Géoportail + croisement guides/ports). AUCUNE invention de spot
--      ni de coordonnée. docs/sprint-41/osm-review-note.md.
--   2. Coordonnées APPROXIMATIVES (poste de pêche au bord de l'eau). ⚠️ À RECALER
--      AU SATELLITE (ortho Esri) spot par spot AVANT insertion, comme les lots 1-6 :
--      pour les ports, viser le MUSOIR de la digue (côté abrité), pas le centre du
--      bassin ; pour les embouchures landaises, l'embouchure est MOBILE (bancs).
--   3. Schéma prod confirmé (supabase-guard, lecture seule) : structure ∈ CHECK
--      {digue,plage,pointe_rocheuse,estuaire,cale,passe,cassure} ; visibility forcé
--      'public' (défaut table 'subscriber') ; difficulty 1..5 ; source OMIS →
--      default 'curated' ; verified=false. department char(3). Trigger blur_spot_geom
--      remplit geom_public (flou ~500-900 m) → NE PAS l'écrire.
--
-- Spécificités ATLANTIQUE SUD-OUEST (honnêteté produit, identiques au lot 3) :
--   • Marnage RÉEL (≠ Med) → danger submersion_maree systématique sur l'estran,
--     et l'estran se recouvre vite (piégeage à la montante).
--   • ⚠️ BAÏNES (courants de retour mortels) sur TOUTE plage océanique girondine
--     et landaise → flag courants_forts + access_notes systématique.
--   • Courants landais (Soustons, Contis…), passes (Arcachon, Maumusson),
--     embouchures (Gironde, Adour) = courants_forts toujours signalés.
--   • Espèces : bar, dorade_royale, maquereau, sar, orphie, + sole, mulet, congre,
--     maigre, alose (déjà dans SPECIES_LABELS depuis le lot 3). AUCUN lieu_jaune
--     (rare au sud de la Loire), AUCUNE vieille au sud.
--
-- Conventions (identiques aux lots 1-7) :
--   • geom GEOGRAPHY : ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography.
--     ⚠️ (lng, lat) dans cet ordre. Atlantique = longitudes NÉGATIVES (~-1.0 à -1.7),
--     latitudes ~43.3 à 46.2° N. Une longitude positive = bug.
--   • visibility = 'public' explicite. verified = false.
--
-- Répartition : 17=7 · 33=8 · 40=6 · 64=7 = 28 spots.
-- Résultat attendu : 158 → 186 spots publics (curés).
--
-- ⚠️ FLAGS D'ACCÈS À TRANCHER PAR JOHN (inclus ici avec caveat explicite dans
--    access_notes, à confirmer/retirer avant verified=true) :
--    • 33 #4 Port-Médoc : enrochement de zone portuaire active (confirmer capitainerie).
--    • 17 #5 Château-d'Oléron : jetée portuaire + parcs ostréicoles (<25 m interdits).
--    Spots ÉCARTÉS (NON inclus, cf note) : Pointe du Cap Ferret côté Bassin (pêche
--    INTERDITE), jetées d'embarquement Cap Ferret/Arcachon (Bélisaire, Thiers,
--    Eyrac), banc d'Arguin (réserve), digue de l'Artha (accès bateau), Corniche
--    basque (sentier fermé 2021), estacade de Capbreton (DOUBLON du lot 3).
--
-- Insertion après validation : Supabase Studio → SQL Editor → coller → Run.
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ========================= CHARENTE-MARITIME (17) — îles de Ré/Oléron, Royan =========================

-- #1 Môle du port de La Flotte (île de Ré) — digue de port de plaisance.
($$La Flotte — môle du port$$, 'mole-de-la-flotte', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.3236, 46.1882), 4326)::geography, -- ⚠️ à recaler satellite (extrémité du môle, phare vert)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','maquereau','orphie','mulet','sar'], 'digue', 1,
 $$Le môle du joli port de La Flotte, sur l'île de Ré, donne un poste facile et abrité, parfait pour débuter ou sortir en famille. Tu pêches à la flottante pour le mulet et la dorade royale le long du parement, au leurre pour le bar à l'entrée du port sur les bascules de marée, et le maquereau passe en banc l'été. Vise les changements de marée et le coup du soir.$$,
 $$Accès à pied depuis le port de La Flotte, sur le môle. Port de plaisance actif : pêche tolérée hors manœuvres et à l'écart des anneaux. ⚠️ Marnage important : l'estran se découvre et se recouvre vite, surveille l'horaire de marée. Enrochements glissants à marée basse.$$,
 array['submersion_maree','rochers_glissants'], 'public', false),

-- #2 Digue extérieure de Saint-Martin-de-Ré — digue de port fortifié.
($$Saint-Martin-de-Ré — digue extérieure$$, 'digue-de-saint-martin-de-re', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.3667, 46.2065), 4326)::geography, -- ⚠️ à recaler satellite (digue extérieure, hors pontons)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','maquereau','sar','orphie','mulet','congre'], 'digue', 1,
 $$La digue extérieure du port fortifié de Saint-Martin-de-Ré (cité Vauban) offre un poste accessible avec du passage de poisson. Tu pêches à la flottante pour le mulet, la dorade royale et le sar le long de l'enrochement, au leurre pour le bar à l'entrée du chenal, et le congre tient dans les blocs à la nuit. Le maquereau passe l'été. Vise les bascules de marée.$$,
 $$Accès à pied depuis Saint-Martin-de-Ré, sur la digue extérieure (reste hors des accès pontons). ⚠️ Marnage important : surveille la marée, l'estran se recouvre vite. Enrochements glissants ; prudence de nuit.$$,
 array['submersion_maree','rochers_glissants'], 'public', false),

-- #3 Pointe du Fier / La Patache (île de Ré) — passe à courant.
($$Pointe du Fier — La Patache$$, 'pointe-du-fier-la-patache', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.4767, 46.2313), 4326)::geography, -- ⚠️ à recaler satellite (extrémité de la pointe du Fier)
 array['leurres','surfcasting','flottante'], array['bar','dorade_royale','congre','sar','maquereau'], 'passe', 3,
 $$À la pointe nord-ouest de l'île de Ré, la Pointe du Fier ferme la passe d'entrée du Fier d'Ars : un débouché à fort courant où le bar vient chasser dans la veine. Tu pêches au leurre et au surfcasting dans le courant de la passe, surtout quand l'eau sort, et à la flottante pour le sar et la dorade royale. Le congre tient dans les roches à la nuit. Les bascules de marée font la pêche.$$,
 $$Accès depuis Les Portes-en-Ré vers la pointe (La Patache). ⚠️ La réserve naturelle de Lilleau des Niges occupe le fond du Fier au nord : ne pêche pas dans la réserve, reste sur la passe et la côte. ⚠️ Courants forts dans la passe et marnage : l'estran se recouvre vite, surveille la marée et garde tes appuis. Secteur isolé.$$,
 array['courants_forts','submersion_maree','isolation'], 'public', false),

-- #4 Digue Richelieu / Le Mail (La Rochelle) — digue urbaine.
($$La Rochelle — digue Richelieu (Le Mail)$$, 'digue-richelieu-la-rochelle', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.1725, 46.154), 4326)::geography, -- ⚠️ à recaler satellite (enrochement de la digue, pas l'esplanade)
 array['surfcasting','leurres','flottante'], array['bar','dorade_royale','maquereau','orphie','mulet','sole'], 'digue', 1,
 $$La digue Richelieu, qui borde l'esplanade du Mail à La Rochelle, offre un poste urbain facile face au pertuis d'Antioche. Tu pêches au surfcasting pour la sole et la dorade royale sur les fonds de sable, à la flottante pour le mulet le long de l'enrochement, et au leurre pour le bar au coup du soir. Le maquereau passe l'été. Vise les marées qui poussent.$$,
 $$Accès direct depuis l'esplanade du Mail (La Rochelle), descente sur l'enrochement. Évite la plage de la Concurrence en baignade surveillée l'été. ⚠️ Marnage et enrochements glissants ; prudence sur les blocs et surveille la marée montante.$$,
 array['submersion_maree','rochers_glissants','ressac'], 'public', false),

-- #5 Jetée du port du Château-d'Oléron — digue portuaire (parcs à huîtres).
($$Le Château-d'Oléron — jetée du port$$, 'jetee-du-chateau-d-oleron', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.19, 45.8833), 4326)::geography, -- ⚠️ à recaler satellite (jetée extérieure du port)
 array['surfcasting','flottante','leurres'], array['bar','dorade_royale','mulet','sole','congre','sar'], 'digue', 2,
 $$La jetée du port du Château-d'Oléron, citadelle ostréicole face au coureau, donne un poste à mulet, dorade royale et bar dans un secteur riche de l'estran oléronais. Tu pêches à la flottante pour le mulet et le sar, au surfcasting pour la sole et la dorade sur le sable et la vase, au leurre pour le bar dans le courant du coureau. Le congre tient dans les blocs la nuit.$$,
 $$Accès à pied depuis Le Château-d'Oléron, sur la jetée extérieure. ⚠️ À CONFIRMER : autorisation de pêche sur la jetée portuaire (capitainerie). Interdiction de pêcher à moins de 25 m des parcs ostréicoles et de marcher dessus (concessions privées). La réserve de Moëze-Oléron est proche : reste sur le secteur du port. ⚠️ Marnage fort, l'estran se recouvre vite.$$,
 array['submersion_maree','isolation'], 'public', false),

-- #6 Plage des Saumonards (île d'Oléron) — surfcasting de référence.
($$Plage des Saumonards$$, 'plage-des-saumonards', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2532, 45.9911), 4326)::geography, -- ⚠️ à recaler satellite (estran, nord du chenal de Boyardville)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','maquereau','sar'], 'plage', 2,
 $$La plage des Saumonards, au nord-est d'Oléron face au fort Boyard, est un spot de surfcasting réputé : du sable, des fosses et de la profondeur à portée de lancer. Tu cherches le bar dans les bordures de bancs au coup du soir, la sole et la dorade royale sur le sable en été. Le maquereau passe l'été. Repère tes fosses à marée basse et laisse travailler ton montage à la montante.$$,
 $$Accès depuis Saint-Georges-d'Oléron (forêt des Saumonards), parking puis estran ; pêche au nord du chenal de Boyardville (hors réserve Moëze-Oléron). ⚠️ Marnage fort, baïnes possibles dans les fosses, et l'estran se recouvre vite : surveille la marée et méfie-toi des courants de retour.$$,
 array['submersion_maree','ressac','courants_forts'], 'public', false),

-- #7 Pointe de Suzac (Saint-Georges-de-Didonne) — pointe rocheuse de l'estuaire.
($$Pointe de Suzac$$, 'pointe-de-suzac', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-0.9919, 45.5776), 4326)::geography, -- ⚠️ à recaler satellite (OSM pointe de Suzac)
 array['surfcasting','leurres'], array['maigre','bar','sole','dorade_royale','maquereau'], 'pointe_rocheuse', 3,
 $$La pointe de Suzac, cap boisé entre Saint-Georges-de-Didonne et Meschers, domine l'embouchure de la Gironde : un poste à maigre et à bar où le courant de l'estuaire concentre les proies. Tu pêches au surfcasting dans le courant pour le maigre (en été) et la sole, au leurre pour le bar le long des roches et du sable. Vise les marées de vives eaux et le coup du jour.$$,
 $$Accès depuis Saint-Georges-de-Didonne (secteur de Suzac), parking puis sentier vers la plage et les roches. ⚠️ Courants forts de l'estuaire de la Gironde, marnage important et rochers glissants : surveille la marée montante (l'estran se recouvre vite) et garde une marge avec l'eau.$$,
 array['courants_forts','submersion_maree','rochers_glissants'], 'public', false),

-- ============================== GIRONDE (33) — Médoc, Bassin d'Arcachon ==============================

-- #8 Hourtin-Plage (plage centrale) — surfcasting océanique.
($$Hourtin-Plage$$, 'hourtin-plage', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.1712, 45.2234), 4326)::geography, -- ⚠️ à recaler satellite (estran plage centrale)
 array['surfcasting','leurres'], array['bar','maigre','sole','sar','dorade_royale','maquereau'], 'plage', 3,
 $$Hourtin-Plage déroule une grande plage océanique du Médoc, droite et puissante : un terrain de surfcasting où le bar et le maigre chassent dans les fosses. Tu lances lourd dans les bordures de bancs au coup du soir pour le bar, tu cherches la sole et la dorade royale sur le sable en été, et le maigre tient les fosses en saison. La nuit, par eau brassée, sortent les beaux poissons.$$,
 $$Accès depuis Hourtin-Plage, parking puis estran ; baignade surveillée l'été (pêche hors zone de bain). ⚠️ BAÏNES MORTELLES : ces courants de retour creusent des fosses entre les bancs et arrachent vers le large. Repère-les de jour à marée basse, ne te baigne jamais dans une baïne, et reste prudent à la montante. Vagues et ressac puissants, marnage important.$$,
 array['courants_forts','vagues','ressac','submersion_maree'], 'public', false),

-- #9 Carcans-Plage (plage centrale) — surfcasting océanique.
($$Carcans-Plage$$, 'carcans-plage', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.201, 45.0828), 4326)::geography, -- ⚠️ à recaler satellite (estran plage centrale)
 array['surfcasting','leurres'], array['bar','maigre','sole','sar','dorade_royale','maquereau'], 'plage', 3,
 $$Carcans-Plage, grande plage océanique du Médoc entre Hourtin et Lacanau, offre du sable à perte de vue et des fosses où le bar patrouille. Tu lances dans les bordures de bancs au coup du soir pour le bar, tu cherches la sole et la dorade royale sur le sable en été, et le maigre tient les fosses en saison. La nuit et par eau brassée, c'est le moment des beaux poissons.$$,
 $$Accès depuis Carcans-Plage, parking puis estran ; baignade surveillée l'été. ⚠️ BAÏNES MORTELLES : courants de retour entre les bancs qui arrachent vers le large. Repère-les de jour, reste prudent à la montante. Vagues et ressac puissants, marnage important.$$,
 array['courants_forts','vagues','ressac','submersion_maree'], 'public', false),

-- #10 Lacanau-Océan (plage centrale) — surfcasting océanique.
($$Lacanau-Océan$$, 'lacanau-ocean', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2022, 45.0016), 4326)::geography, -- ⚠️ à recaler satellite (estran plage centrale)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','maigre','sar','maquereau'], 'plage', 3,
 $$Lacanau-Océan, station de surf du Médoc, déroule une plage océanique réputée : du sable, des bancs et des fosses à bar à portée de lancer. Tu cherches le bar dans les bordures de bancs au coup du soir, la sole et la dorade royale sur le sable en été, et le maigre tient les fosses en saison. La nuit, par eau brassée, c'est le bon créneau.$$,
 $$Accès depuis Lacanau-Océan, parkings puis estran ; baignade surveillée l'été (pêche hors zone de bain). ⚠️ BAÏNES MORTELLES : courants de retour qui arrachent vers le large, repère-les de jour. Vagues et ressac puissants, marnage important ; prudence à la montante.$$,
 array['courants_forts','vagues','ressac','submersion_maree'], 'public', false),

-- #11 Digue de Port-Médoc (Le Verdon-sur-Mer) — digue d'embouchure de Gironde.
($$Le Verdon-sur-Mer — digue de Port-Médoc$$, 'digue-de-port-medoc', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.0559, 45.5525), 4326)::geography, -- ⚠️ à recaler satellite (enrochement de la digue)
 array['surfcasting','leurres','flottante'], array['bar','maigre','sar','congre','dorade_royale','mulet','maquereau','sole','alose'], 'digue', 2,
 $$À la pointe du Médoc, la digue de Port-Médoc (Le Verdon) garde l'entrée de l'estuaire de la Gironde : un poste à bar et à maigre où le courant de l'estuaire brasse une eau riche. Tu pêches au surfcasting dans le courant pour le maigre et le bar, à la flottante pour le mulet le long de l'enrochement, et le congre tient dans les blocs la nuit. L'alose remonte au printemps. Vise les marées de vives eaux.$$,
 $$Accès depuis Le Verdon-sur-Mer (secteur Port-Médoc). ⚠️ À CONFIRMER : zone portuaire active, autorisation de pêche sur l'enrochement à vérifier auprès de la capitainerie. ⚠️ Courants forts de l'embouchure de la Gironde, marnage important et enrochements glissants : surveille la marée, garde tes appuis. Secteur exposé et isolé.$$,
 array['courants_forts','submersion_maree','rochers_glissants','isolation'], 'public', false),

-- #12 Jetée du Canon (Lège-Cap-Ferret) — digue du Bassin d'Arcachon.
($$Lège-Cap-Ferret — jetée du Canon$$, 'jetee-du-canon', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2281, 44.6978), 4326)::geography, -- ⚠️ à recaler satellite (OSM jetée du Canon)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','maigre','sar','mulet','orphie','sole'], 'digue', 2,
 $$La jetée du Canon, côté Bassin du Cap Ferret, donne un poste à dorade royale, bar et maigre dans les courants des passes intérieures. Tu pêches à la flottante pour le mulet et la dorade royale, au leurre pour le bar dans la veine de courant, et au surfcasting pour la sole sur le sable. Le maigre passe en été. Les bascules de marée concentrent le poisson.$$,
 $$Accès depuis Lège-Cap-Ferret (secteur du Canon), pêche autorisée depuis la jetée. ⚠️ INTERDITE sur le ponton flottant et la passerelle d'embarquement. ⚠️ Courants forts des passes et marnage important : l'estran du Bassin se découvre loin et se recouvre vite, surveille la marée.$$,
 array['courants_forts','submersion_maree','ressac'], 'public', false),

-- #13 Jetée de Grand-Piquey (Lège-Cap-Ferret) — digue du Bassin.
($$Lège-Cap-Ferret — jetée de Grand-Piquey$$, 'jetee-de-grand-piquey', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2097, 44.7148), 4326)::geography, -- ⚠️ à recaler satellite (jetée de Grand-Piquey, pas la plage)
 array['flottante','leurres','surfcasting'], array['bar','maigre','dorade_royale','sar','orphie','mulet','sole'], 'digue', 2,
 $$La jetée de Grand-Piquey, sur la côte noroît du Cap Ferret, plonge dans les chenaux du Bassin d'Arcachon : un poste à bar, dorade royale et maigre dans des courants marqués. Tu pêches à la flottante pour le mulet et la dorade, au leurre pour le bar dans la veine, et au surfcasting pour la sole. Le maigre passe en été. Vise les bascules de marée.$$,
 $$Accès depuis Lège-Cap-Ferret (Grand-Piquey), pêche autorisée depuis la jetée. ⚠️ INTERDITE sur le ponton flottant et la passerelle. ⚠️ Courants forts dans le chenal et marnage important : surveille la marée, l'estran se recouvre vite.$$,
 array['courants_forts','submersion_maree','ressac'], 'public', false),

-- #14 Pointe de l'Aiguillon (Arcachon) — pointe d'entrée du Bassin.
($$Arcachon — pointe de l'Aiguillon$$, 'pointe-de-l-aiguillon-arcachon', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.1395, 44.6527), 4326)::geography, -- ⚠️ à recaler satellite (front de mer, hors parcs ostréicoles)
 array['surfcasting','leurres','flottante'], array['sole','dorade_royale','mulet','bar','maigre','maquereau'], 'pointe_rocheuse', 2,
 $$La pointe de l'Aiguillon, à l'est d'Arcachon, marque l'entrée du Bassin face aux chenaux : un poste à sole, dorade royale et bar où le courant de marée passe au plus près. Tu pêches au surfcasting pour la sole et la dorade sur le sable, à la flottante pour le mulet, et au leurre pour le bar dans la veine. Le maigre passe en été. Les marées qui poussent font la pêche.$$,
 $$Accès depuis le front de mer d'Arcachon (secteur de l'Aiguillon). Reste hors des zones ostréicoles (concessions privées). ⚠️ Courants forts des chenaux d'entrée du Bassin et marnage important : surveille la marée montante, l'estran se recouvre vite.$$,
 array['courants_forts','submersion_maree','ressac'], 'public', false),

-- #15 Plage de la Corniche / dune du Pilat (La Teste-de-Buch) — passe d'Arcachon.
($$La Teste-de-Buch — plage de la Corniche (dune du Pilat)$$, 'plage-de-la-corniche-pilat', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2183, 44.5893), 4326)::geography, -- ⚠️ à recaler satellite (estran au pied de la dune)
 array['surfcasting','leurres'], array['bar','dorade_royale','maigre','sar','sole','congre','mulet'], 'passe', 3,
 $$Au pied de la dune du Pilat, la plage de la Corniche fait face à la passe d'Arcachon et au banc d'Arguin : un poste sauvage et puissant où le bar et le maigre chassent dans des courants violents. Tu pêches au surfcasting dans les fosses et les bordures de bancs, au leurre pour le bar dans la veine de la passe. Le maigre tient en été. C'est une pêche d'eau forte, à respecter.$$,
 $$Accès depuis l'avenue Louis Gaume (La Teste-de-Buch), descente raide au pied de la dune. ⚠️ Le banc d'Arguin face à la plage est une réserve naturelle (ne pas débarquer). ⚠️ COURANTS DE LA PASSE D'ARCACHON très violents + BAÏNES côté océan + bancs mobiles + marnage : danger réel, repère le terrain de jour, ne te mets jamais dans l'eau dans le courant, surveille la marée.$$,
 array['courants_forts','vagues','submersion_maree','isolation'], 'public', false),

-- ============================== LANDES (40) — courants et plages océanes ==============================

-- #16 Embouchure du courant de Soustons (Vieux-Boucau) — estuaire à courant landais.
($$Vieux-Boucau — embouchure du courant de Soustons$$, 'embouchure-courant-de-soustons', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.4115, 43.7845), 4326)::geography, -- ⚠️ à recaler satellite (embouchure MOBILE)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','sar','orphie','maquereau','mulet'], 'estuaire', 3,
 $$À Vieux-Boucau, l'embouchure du courant de Soustons déverse l'eau du lac sur la plage : un débouché à courant où le bar vient chasser dans la veine. Tu pêches au surfcasting et au leurre dans le courant landais, surtout quand l'eau sort, et tu cherches la sole et la dorade royale sur le sable adjacent. Le coup du soir et la nuit, sur eau brassée, sortent les meilleurs poissons.$$,
 $$Accès depuis Vieux-Boucau (plage et embouchure), baignade surveillée l'été. ⚠️ COURANT LANDAIS dangereux (le courant de Soustons arrache vers le large) + BAÏNES sur la plage : ne te mets jamais dans l'eau dans le courant. L'embouchure se déplace : repère le terrain de jour. Marnage, vagues et ressac puissants.$$,
 array['courants_forts','vagues','submersion_maree','ressac'], 'public', false),

-- #17 Embouchure du courant de Contis (Saint-Julien-en-Born) — estuaire à courant landais.
($$Contis — embouchure du courant$$, 'embouchure-courant-de-contis', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.3235, 44.0915), 4326)::geography, -- ⚠️ à recaler satellite (embouchure MOBILE, sous le phare de Contis)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','sar','orphie','maquereau','mulet'], 'estuaire', 3,
 $$À Contis, sous le phare rayé, l'embouchure du courant déverse l'eau dans l'océan : un débouché à courant landais réputé pour le bar. Tu pêches au surfcasting et au leurre dans la veine du courant, surtout quand l'eau sort, et tu cherches la sole et la dorade royale sur le sable. La nuit et le coup du soir, par eau brassée, c'est le moment des beaux poissons.$$,
 $$Accès depuis Contis-Plage (Saint-Julien-en-Born), baignade surveillée l'été. ⚠️ COURANT LANDAIS dangereux + BAÏNES : ne te mets jamais dans l'eau dans le courant, il arrache vers le large. L'embouchure est mobile : repère le terrain de jour. Secteur isolé, marnage, vagues et ressac puissants.$$,
 array['courants_forts','vagues','submersion_maree','ressac','isolation'], 'public', false),

-- #18 Plage de Messanges (plage Nord) — surfcasting océanique.
($$Plage de Messanges$$, 'plage-de-messanges', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.4054, 43.817), 4326)::geography, -- ⚠️ à recaler satellite (estran plage Nord)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','sar','maquereau','orphie'], 'plage', 3,
 $$La plage de Messanges, longue plage océanique landaise, offre du sable et des fosses où le bar chasse au plus près du bord. Tu lances dans les bordures de bancs au coup du soir pour le bar, tu cherches la sole et la dorade royale sur le sable en été. La nuit, par eau brassée, sortent les beaux poissons. Repère tes fosses à marée basse.$$,
 $$Accès depuis Messanges-Plage, parking puis estran ; baignade surveillée l'été (pêche hors zone de bain). ⚠️ BAÏNES MORTELLES : courants de retour entre les bancs qui arrachent vers le large, repère-les de jour. Marnage, vagues et ressac puissants ; prudence à la montante.$$,
 array['courants_forts','submersion_maree','ressac','vagues'], 'public', false),

-- #19 Plage de Moliets (Lette Blanche, plage Nord) — surfcasting océanique.
($$Plage de Moliets — Lette Blanche$$, 'plage-de-moliets-lette-blanche', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.4, 43.854), 4326)::geography, -- ⚠️ à recaler satellite (plage Nord, au NORD de l'embouchure d'Huchet)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','sar','maquereau','orphie'], 'plage', 3,
 $$La plage de Moliets (secteur de la Lette Blanche, au nord de l'embouchure du courant d'Huchet) déroule du sable océanique landais : un poste à bar dans les fosses. Tu lances dans les bordures de bancs au coup du soir pour le bar, tu cherches la sole et la dorade royale sur le sable en été. La nuit, par eau brassée, c'est le bon créneau.$$,
 $$Accès depuis Moliets-Plage, parking puis estran ; reste au NORD de l'embouchure du courant d'Huchet (la réserve naturelle du courant d'Huchet est exclue de la pêche). ⚠️ BAÏNES MORTELLES + courants forts près de l'embouchure : repère le terrain de jour. Marnage, vagues et ressac puissants.$$,
 array['courants_forts','submersion_maree','ressac','vagues'], 'public', false),

-- #20 Biscarrosse-Plage (plage centrale) — surfcasting océanique.
($$Biscarrosse-Plage$$, 'biscarrosse-plage', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2511, 44.4444), 4326)::geography, -- ⚠️ à recaler satellite (estran, ~700 m vers le trait de côte)
 array['surfcasting','leurres'], array['bar','dorade_royale','sole','sar','maquereau','orphie','mulet'], 'plage', 3,
 $$Biscarrosse-Plage, grande station océanique au nord des Landes, offre une plage puissante et des fosses à bar à portée de lancer. Tu cherches le bar dans les bordures de bancs au coup du soir, la sole et la dorade royale sur le sable en été. La nuit, par eau brassée, sortent les beaux poissons. Repère tes fosses à marée basse.$$,
 $$Accès depuis Biscarrosse-Plage, parkings puis estran ; baignade surveillée l'été. ⚠️ BAÏNES MORTELLES : courants de retour qui arrachent vers le large, repère-les de jour. Marnage, vagues et ressac puissants ; prudence à la montante.$$,
 array['courants_forts','submersion_maree','ressac','vagues'], 'public', false),

-- #21 Le Gouf de Capbreton (depuis l'estacade / la passe) — fosse sous-marine.
($$Capbreton — le Gouf (depuis la passe)$$, 'le-gouf-de-capbreton', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.447, 43.654), 4326)::geography, -- ⚠️ à recaler satellite (poste = passe / estacade, le Gouf est au large)
 array['surfcasting','leurres','vif'], array['bar','maquereau','chinchard','maigre','congre','orphie','sar'], 'cassure', 4,
 $$Le Gouf de Capbreton, canyon sous-marin qui remonte jusqu'au pied de la côte, ramène la grande profondeur au plus près du bord, face à la passe : un secteur unique où le bar, le maigre et le congre tiennent les ruptures de fond. Tu pêches depuis la passe et les enrochements au surfcasting et au vif, au leurre pour le bar dans le courant. C'est une pêche d'eau forte et profonde, pour pêcheur averti.$$,
 $$Le poste se pêche depuis la passe et les ouvrages de Capbreton (le Gouf lui-même est au large, pas accessible à pied). ⚠️ Courants très forts face à la passe, marnage, vagues et ressac : ouvrage balayé par gros temps, n'y va pas par mer formée. Enrochements glissants. Baïnes sur la plage attenante.$$,
 array['courants_forts','submersion_maree','vagues','ressac'], 'public', false),

-- ============================== PYRÉNÉES-ATLANTIQUES (64) — Pays basque ==============================

-- #22 Fort de Socoa (Ciboure) — pointe rocheuse de la baie.
($$Fort de Socoa$$, 'fort-de-socoa-ciboure', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.6832, 43.3902), 4326)::geography, -- ⚠️ à recaler satellite (estran rocheux au pied du fort)
 array['leurres','flottante','surfcasting'], array['bar','dorade_royale','mulet','sar','orphie','maquereau'], 'pointe_rocheuse', 2,
 $$Au pied du fort de Socoa, à Ciboure, l'estran rocheux et la baie protégée de Saint-Jean-de-Luz offrent un poste à bar, dorade royale et mulet. Tu pêches au leurre pour le bar le long des roches et de la digue voisine, à la flottante pour le mulet et le sar, au surfcasting pour la dorade sur le sable de la baie. Le maquereau passe l'été. Vise les marées qui poussent et le coup du jour.$$,
 $$Accès depuis Socoa (Ciboure), estran rocheux au pied du fort. Distinct de la digue de Socoa (déjà au catalogue). ⚠️ Ne pars pas vers la corniche basque : le sentier littoral est fermé par arrêté (effondrement). ⚠️ Houle d'ouest, rochers glissants, marnage : surveille la marée et la mer.$$,
 array['vagues','rochers_glissants','submersion_maree','ressac'], 'public', false),

-- #23 Digue aux Chevaux / bd Thiers (Saint-Jean-de-Luz) — digue de promenade.
($$Saint-Jean-de-Luz — digue aux Chevaux$$, 'digue-aux-chevaux-saint-jean-de-luz', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.6599, 43.394), 4326)::geography, -- ⚠️ à recaler satellite (le mur/enrochement de la digue)
 array['flottante','leurres','surfcasting'], array['dorade_royale','bar','mulet','sar','maquereau'], 'digue', 1,
 $$La digue aux Chevaux, le long du boulevard Thiers à Saint-Jean-de-Luz, borde la grande plage de la baie : un poste urbain facile pour la dorade royale, le bar et le mulet. Tu pêches à la flottante pour le mulet et le sar le long du mur, au surfcasting pour la dorade royale sur le sable, et au leurre pour le bar au coup du soir. Le maquereau passe l'été.$$,
 $$Accès direct depuis le boulevard Thiers (Saint-Jean-de-Luz), promenade publique. ⚠️ Pêche interdite en zone de baignade surveillée l'été : décale-toi. ⚠️ Houle d'ouest qui passe par-dessus la digue par gros temps, marnage et enrochements glissants : surveille la mer.$$,
 array['submersion_maree','vagues','rochers_glissants'], 'public', false),

-- #24 Port et estran rocheux de Guéthary — pointe rocheuse (cantonnement).
($$Guéthary — port et estran rocheux$$, 'port-de-guethary', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.61, 43.4261), 4326)::geography, -- ⚠️ à recaler satellite (estran rocheux du port)
 array['leurres','flottante'], array['bar','sar','dorade_royale','pageot','maquereau','orphie'], 'pointe_rocheuse', 3,
 $$Le petit port de Guéthary et son estran rocheux ouvrent un poste de roche à bar et à sar sur la côte basque. Tu pêches au leurre pour le bar le long des tombants et dans les remous, à la flottante pour le sar, la dorade royale et le pageot dans les failles. L'eau claire demande de la discrétion ; aube, crépuscule et eau brassée après un coup de mer sont les meilleurs moments.$$,
 $$Accès depuis le port de Guéthary, estran rocheux. ⚠️ CANTONNEMENT DE PÊCHE (de Cenitz au port) : respecte le balisage des panneaux (zones autorisées/interdites) avant de t'installer. ⚠️ Rochers glissants, houle d'ouest, marnage et secteur exposé : surveille la mer et la marée.$$,
 array['rochers_glissants','submersion_maree','vagues','isolation'], 'public', false),

-- #25 Récif de Parlementia (Bidart) — estran rocheux exposé.
($$Bidart — récif de Parlementia$$, 'recif-de-parlementia', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.6069, 43.4282), 4326)::geography, -- ⚠️ à recaler satellite (estran récifal, frange du cantonnement)
 array['leurres','flottante'], array['bar','sar','dorade_royale','pageot','maquereau'], 'pointe_rocheuse', 4,
 $$Le récif de Parlementia, célèbre spot de surf de grosse houle entre Guéthary et Bidart, découvre un estran rocheux à marée basse : un poste à bar et à sar pour pêcheur averti. Tu pêches au leurre pour le bar le long des roches découvrantes et dans les veines d'eau, à la flottante pour le sar, la dorade royale et le pageot. L'eau forte au pied du récif tient de beaux poissons, mais le secteur est exposé.$$,
 $$Accès depuis Bidart vers l'estran de Parlementia (à marée basse). ⚠️ La frange sud peut être dans le cantonnement de Guéthary : vérifie le balisage. ⚠️ RÉCIF TRÈS EXPOSÉ : houle puissante, rochers glissants, marnage qui recouvre vite l'estran, secteur isolé. Ne pêche jamais dos à la mer, repère ta sortie et renonce dès que ça forcit.$$,
 array['rochers_glissants','submersion_maree','vagues','isolation','ressac'], 'public', false),

-- #26 Plage du Centre de Bidart — surfcasting de falaise.
($$Bidart — plage du Centre$$, 'plage-du-centre-bidart', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.5961, 43.4374), 4326)::geography, -- ⚠️ à recaler satellite (estran de la plage centrale)
 array['surfcasting','leurres','flottante'], array['bar','sar','dorade_royale','sole','maigre','mulet'], 'plage', 2,
 $$La plage du Centre de Bidart, encadrée de falaises sur la côte basque, offre un poste de surfcasting à bar, sole et dorade royale. Tu lances dans les fosses pour le bar au coup du soir, tu cherches la sole et la dorade royale sur le sable, et le sar tient près des estrans rocheux latéraux. Le maigre passe en été. La nuit, par eau brassée, sortent les beaux poissons.$$,
 $$Accès depuis Bidart (plage du Centre), descente vers l'estran. ⚠️ Pêche interdite en baignade surveillée l'été. ⚠️ Ne pêche pas au pied des falaises (chutes de pierres). Houle d'ouest, marnage, rochers glissants sur les estrans latéraux : surveille la mer et la marée.$$,
 array['vagues','submersion_maree','falaise','rochers_glissants'], 'public', false),

-- #27 Embouchure de l'Adour / plage de la Barre (Anglet) — estuaire à courant.
($$Anglet — embouchure de l'Adour (plage de la Barre)$$, 'embouchure-de-l-adour-anglet', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.5242, 43.526), 4326)::geography, -- ⚠️ à recaler satellite (épi sud, rive sud de l'Adour)
 array['surfcasting','leurres','vif'], array['bar','maigre','mulet','sole','dorade_royale','alose'], 'estuaire', 3,
 $$À Anglet, l'embouchure de l'Adour (plage de la Barre, rive sud) déverse l'eau du fleuve sur l'océan : un secteur à bar et à maigre où le courant de l'estuaire concentre les proies. Tu pêches au surfcasting et au leurre dans les veines de courant et le long de l'épi, au vif pour les gros bars et le maigre. L'alose remonte au printemps. Eau teintée après un coup d'eau, c'est le bon moment.$$,
 $$Accès depuis Anglet (plage de la Barre, rive sud de l'Adour ; la rive nord est à Tarnos/40). ⚠️ Pêche interdite sur les plages et ouvrages d'Anglet en période de surveillance baignade. ⚠️ COURANTS FORTS (fleuve + marée), blocs et enrochements glissants (huîtres), paquets de mer sur l'épi, marnage : danger réel, garde tes appuis et surveille la mer.$$,
 array['courants_forts','rochers_glissants','vagues','submersion_maree','ressac'], 'public', false),

-- #28 Baie de Txingudi / Bidassoa (Hendaye) — estuaire franco-espagnol.
($$Hendaye — baie de Txingudi (Bidassoa)$$, 'baie-de-txingudi-hendaye', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.7787, 43.3669), 4326)::geography, -- ⚠️ à recaler satellite (digues de la marina / estran)
 array['flottante','leurres','surfcasting'], array['bar','sole','mulet','dorade_royale','chinchard','maquereau','alose'], 'estuaire', 2,
 $$Au fond de la baie de Txingudi, l'estuaire de la Bidassoa (frontière franco-espagnole) à Hendaye offre des digues de marina et un estran riche : un poste à bar, sole et mulet dans des eaux calmes et productives. Tu pêches à la flottante pour le mulet et la dorade royale le long des digues, au surfcasting pour la sole sur le sable, au leurre pour le bar dans les chenaux. L'alose remonte au printemps. Vise les bascules de marée.$$,
 $$Accès depuis Hendaye (marina Sokoburu, baie de Txingudi), digues et estran publics. ⚠️ Plage Sokoburu surveillée l'été (pêche hors zone de bain). ⚠️ Courants de marée d'estuaire et marnage : l'estran se recouvre vite, surveille la marée. Zone frontalière (estuaire partagé avec l'Espagne).$$,
 array['courants_forts','submersion_maree','rochers_glissants','isolation'], 'public', false);

-- =====================================================================
-- Après validation + insertion : vérifier sur /carte que les 28 pins tombent
-- au bon endroit, recaler chaque coord au satellite (ports = musoir ; embouchures
-- landaises = bancs mobiles), puis passer verified=true spot par spot. geom_public
-- (flou ~500-900 m) est rempli par le trigger blur_spot_geom.
-- Bilan attendu : 17→7, 33→8, 40→6, 64→7 = 28 spots → prod 158→186.
-- =====================================================================
