-- =====================================================================
-- Carnet de Pêche — LOT 6 de curation de spots (CORSE 2A/2B, 18 spots)
-- =====================================================================
-- ✅ INSÉRÉ EN PROD le 2026-06-22 via MCP execute_sql (OK explicite de John).
--    La prod passe de 139 à 157 spots (2B=9, 2A=9). COUVERTURE NATIONALE COMPLÈTE.
--    Vérifié : 18/18 geom_public généré (trigger), visibility=public, verified=false,
--    flou GPS 522-887 m, anon ne lit pas geom. NE PAS REJOUER (doublons de slug).
--    Fichier de DONNÉE, pas migration (CLAUDE.md §20.4).
--
-- Corse → COMPLÈTE la couverture nationale (5 façades : Bretagne, Atlantique,
-- Manche, Méditerranée continentale, Corse). Départements : 2B Haute-Corse (×9)
-- + 2A Corse-du-Sud (×9) = 18 spots. Résultat attendu : 139 → 157 spots.
--
-- ✅ GARDE-FOU n°1 (codes 2A/2B) — VÉRIFIÉ VERT, aucune migration nécessaire :
--   • lib/geo/departments.ts : COASTAL_DEPARTMENTS + DEPARTMENT_LABELS + DEPARTMENT_OPTIONS
--     contiennent '2A'/'2B' (tri numérique-puis-Corse OK).
--   • lib/geo/department-centroids.ts : DEPARTMENT_CENTROIDS a '2A' [8.95,41.72] et
--     '2B' [9.22,42.40] → le flyTo carte recentre bien sur la Corse.
--   • /fil/[department] : valide via isCoastalDepartment('2A') ✅.
--   • can_post_in_department (RPC tier) : liste inclut explicitement '2A','2B' + trim().
--   • Filtre carte itinérant : availableDepartments est DYNAMIQUE (new Set(spots.department))
--     → 2A/2B apparaissent dès l'insertion.
--   • spots.department char(3) : '2A ' (même padding que '66 ', déjà en prod).
--   ⚠️ Seul bémol mineur (non bloquant) : /fil/2a en MINUSCULE ferait 404 ; les liens
--     générés par l'app sont en majuscule '2A', donc OK. (Mis en place au sprint 11.6.)
--
-- Pipeline de qualité (2026-06-22) :
--   1. Coords VÉRIFIÉES SUR OPENSTREETMAP (filtre countrycodes=fr obligatoire — sans lui,
--      « Porto-Vecchio » tombe sur un homonyme à l'Île Maurice) — docs/sprint-10/lot-6-corse.md.
--   2. Schéma prod re-confirmé (supabase-guard / RO) : identique au lot 5. 0 spot Corse
--      existant, 0 collision de slug (vérifié).
--   3. Confirmation satellite (ortho Esri, 2 passes) → docs/sprint-10/lot-6-verification.md
--      (les coords corrigées sont marquées « COORD CORRIGÉE satellite » ligne par ligne).
--
-- Spécificités CORSE (honnêteté produit) :
--   • Espèces Med-correctes : bar (= « loup »), dorade_royale, sar, orphie.
--     ZÉRO lieu_jaune, ZÉRO vieille (atlantiques). PAS de maquereau dans ce lot.
--   • region = 'corse' (Collectivité de Corse, 2A + 2B).
--   • Dangers Med : PAS de submersion_maree (pas de marnage). Risques =
--     courants_forts, vagues, rochers_glissants, falaise, isolation.
--     ⚠️ BOUCHES DE BONIFACIO (#16 Pertusato, #17 Bonifacio) = courants + vents
--     parmi les plus violents de Méditerranée → danger EXPLICITE.
--     ⚠️ CAP CORSE (#1 Barcaggio) = courants + libeccio → danger explicite.
--   • Réserves naturelles signalées dans access_notes : #10 îles Sanguinaires
--     (la pointe de la Parata reste publique), #13 réserve de Scandola (golfe de
--     Porto), #16 réserve des Bouches de Bonifacio.
--
-- Conventions (identiques aux lots 1-5) :
--   • geom GEOGRAPHY : ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography.
--     ⚠️ ordre (lng, lat). Corse = longitudes POSITIVES (~8.6° à 9.55° E),
--     latitudes ~41.3° à 43.0° N. Une longitude négative = bug.
--   • geom_public (flou ~500-900 m) généré par le trigger spots_blur → NE PAS écrire.
--   • visibility = 'public' explicite ; verified = false ; department ∈ {'2A','2B'}.
--
-- Insertion après validation : MCP execute_sql (après OK de John).
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ============================ HAUTE-CORSE (2B) ============================

-- #1 Barcaggio — pointe du Cap Corse (Ersa) — EXPOSÉ : courants + libeccio + isolé.
($$Barcaggio — pointe du Cap Corse$$, 'barcaggio-cap-corse', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.4003, 43.0087), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.00611,9.40216 = village ; pointe rocheuse N du Cap Corse vérifiée)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 4,
 $$À l'extrême nord du Cap Corse, au-dessus du minuscule hameau de Barcaggio, les pointes rocheuses regardent l'île de la Giraglia : un poste sauvage et engagé pour le loup (bar) et le sar. Tu pêches au leurre le long des roches et dans les veines de courant, à la flottante pour le sar dans les failles et les herbiers. C'est un bout du monde battu par les vents — quand la mer le permet, le poisson est là, et beau.$$,
 $$Accès depuis Barcaggio (Ersa), au bout de la route du Cap Corse, puis sentier vers les pointes. ⚠️ Poste exposé et isolé : les courants entre le cap et la Giraglia sont puissants, le libeccio et la houle lèvent vite une grosse mer, et les secours sont loin. Ne pêche jamais seul, garde une marge avec l'eau et renonce dès que ça forcit.$$,
 array['courants_forts','vagues','isolation'], 'public', false),

-- #2 Port de Centuri (Centuri) — petit port de pêche, familial.
($$Port de Centuri$$, 'port-de-centuri', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.35055, 42.96616), 4326)::geography,
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie'], 'digue', 1,
 $$Centuri, petit port de pêche emblématique de la côte ouest du Cap Corse (la capitale de la langouste), offre des jetées abritées et accessibles : un poste facile et plein de charme. Tu pêches à la flottante le long des quais et des enrochements — sar, dorade royale, orphie — et au leurre pour tenter le loup à l'entrée du port au coup du soir. L'orphie passe en surface à la belle saison.$$,
 $$Accès à pied depuis le port de Centuri, stationnement à proximité. Poste accessible et abrité ; prudence habituelle sur les pierres et par coup de mer. Reste à l'écart de l'activité du petit port de pêche et des zones de manœuvre.$$,
 array['vagues'], 'public', false),

-- #3 Port de Macinaggio (Rogliano) — marina, familial.
($$Port de Macinaggio$$, 'port-de-macinaggio', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.45479, 42.95942), 4326)::geography,
 array['flottante','leurres'], array['bar','dorade_royale','sar'], 'digue', 1,
 $$Macinaggio, principale marina de la côte est du Cap Corse, déroule de longues jetées accessibles : un poste simple, idéal pour débuter ou sortir en famille. Tu pêches à la flottante le long des enrochements pour le sar et la dorade royale, et au leurre pour le loup à l'entrée du port, surtout à l'aube et au crépuscule. Le secteur, départ des sentiers vers les plages sauvages d'Agriates, est très fréquenté l'été.$$,
 $$Accès à pied depuis la marina de Macinaggio (Rogliano), stationnement à proximité. Poste accessible et abrité ; prudence habituelle sur les pierres. Respecte l'activité du port et les zones de manœuvre des bateaux.$$,
 array[]::text[], 'public', false),

-- #4 Saint-Florent — port — digue, fond de golfe.
($$Saint-Florent — port$$, 'port-de-saint-florent', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.29932, 42.67994), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'digue', 1,
 $$Au fond de son golfe, entre le Cap Corse et le désert des Agriates, Saint-Florent offre les jetées de son port et de sa marina : un poste accessible et abrité. Tu pêches à la flottante pour le sar et la dorade royale le long des enrochements, au leurre pour le loup à l'entrée du port, et au surfcasting sur les plages voisines. L'aube et la tombée du jour sont les meilleurs moments.$$,
 $$Accès à pied depuis le port de Saint-Florent, stationnement à proximité. ⚠️ Le fond du golfe peut prendre la houle par vent de nord/nord-ouest : prudence sur les jetées par coup de mer. Respecte l'activité du port.$$,
 array['vagues'], 'public', false),

-- #5 L'Île-Rousse — phare de la Pietra — îlot relié par chaussée.
($$L'Île-Rousse — phare de la Pietra$$, 'phare-de-la-pietra-ile-rousse', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(8.93208, 42.64456), 4326)::geography,
 array['flottante','leurres'], array['bar','sar','dorade_royale'], 'digue', 2,
 $$À L'Île-Rousse, l'îlot de la Pietra, relié à la ville par une chaussée, porte son phare et abrite le port : ses rochers et sa jetée offrent un poste réputé. Tu pêches à la flottante pour le sar et la dorade royale dans les failles et le long des enrochements, au leurre pour le loup le long de la jetée et à l'entrée du port. Vise l'aube, le crépuscule et l'eau brassée.$$,
 $$Accès par la chaussée qui relie L'Île-Rousse à l'îlot de la Pietra, puis rochers et jetée du port. ⚠️ Rochers glissants sur l'îlot et coups de mer par vent d'ouest/nord-ouest : prudence à la descente et garde une marge avec l'eau.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #6 Bastia — jetée du Dragon / Vieux-Port — urbain.
($$Bastia — jetée du Dragon$$, 'jetee-du-dragon-bastia', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.45399, 42.69372), 4326)::geography,
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie'], 'digue', 1,
 $$Au cœur de Bastia, la jetée du Dragon ferme le Vieux-Port sous la citadelle : un poste urbain facile et accessible. Tu pêches à la flottante le long de la jetée — sar, dorade royale, orphie — et au leurre pour tenter le loup à l'entrée du port au coup du soir. L'orphie et les petits poissons passent en surface l'été quand les bancs entrent avec la lumière.$$,
 $$Accès à pied depuis le Vieux-Port de Bastia, le long de la jetée du Dragon. ⚠️ Ouvrage exposé à la houle d'est par coup de mer : prudence sur les pierres glissantes. Respecte l'activité du port et reste à l'écart des zones de manœuvre.$$,
 array['vagues'], 'public', false),

-- #7 Plage de la Marana (Borgo) — lido sableux, surfcasting.
($$Plage de la Marana$$, 'plage-de-la-marana', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.52313, 42.57267), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$Au sud de Bastia, le long lido de la Marana déroule des kilomètres de sable entre les étangs et la mer : un terrain de surfcasting réputé de la plaine orientale. Tu lances lourd dans les fosses et les bordures de bancs pour le loup, et tu cherches la dorade royale au crabe ou au ver sur le sable en été. Le coup du soir et la nuit, par eau brassée, sortent les meilleurs poissons.$$,
 $$Accès depuis la Marana (Borgo / Lucciana), nombreux accès le long du lido, stationnement près des plages. ⚠️ Courants le long du lido et près des graus des étangs : garde tes appuis et reste prudent par mer formée. Préviens quelqu'un, le secteur est long et peu habité de nuit.$$,
 array['courants_forts'], 'public', false),

-- #8 Plage de Padulone — embouchure du Tavignano (Aléria) — estuaire, loup réputé.
($$Plage de Padulone — embouchure du Tavignano$$, 'plage-de-padulone-aleria', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.55021, 42.10784), 4326)::geography,
 array['surfcasting','leurres','vif'], array['bar','dorade_royale'], 'estuaire', 2,
 $$À Aléria, sur la côte est, l'embouchure du Tavignano et la plage de Padulone forment un secteur à loup réputé : le fleuve déverse une eau riche que le bar adore. Tu pêches au surfcasting et au leurre dans les veines de courant et les bordures, au vif pour les gros loups qui chassent près de l'embouchure. La dorade royale fouille le sable en été. Eau teintée après un coup d'eau = le bon moment.$$,
 $$Accès depuis Aléria vers la plage de Padulone et l'embouchure du Tavignano. ⚠️ Courants forts à l'embouchure du fleuve : ne te laisse pas surprendre par les veines d'eau, garde tes appuis sur le sable mou et préviens quelqu'un car le secteur est isolé.$$,
 array['courants_forts'], 'public', false),

-- #9 Port de Taverna / Campoloro (Santa-Maria-Poghju) — plus grand port côte est.
($$Port de Taverna / Campoloro$$, 'port-de-campoloro', '2B', 'corse',
 ST_SetSRID(ST_MakePoint(9.54099, 42.34012), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'digue', 1,
 $$Campoloro (Taverna), le plus grand port de la côte est de Corse, offre de longues jetées accessibles : un poste simple et productif. Tu pêches à la flottante pour le sar et la dorade royale le long des enrochements, au leurre pour le loup à l'entrée du port, et au surfcasting sur les plages voisines. L'aube et le crépuscule sont les meilleurs créneaux.$$,
 $$Accès à pied depuis le port de Campoloro (Santa-Maria-Poghju / Taverna), stationnement à proximité. Poste accessible ; prudence habituelle sur les pierres et près du chenal. Respecte l'activité du port (pêche, plaisance).$$,
 array[]::text[], 'public', false),

-- ============================ CORSE-DU-SUD (2A) ============================

-- #10 Pointe de la Parata / Sanguinaires (Ajaccio) — pointe rocheuse + réserve îles.
($$Pointe de la Parata — Sanguinaires$$, 'pointe-de-la-parata', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(8.61243, 41.89865), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$À l'ouest d'Ajaccio, la pointe de la Parata avance ses rochers rouges face aux îles Sanguinaires, sous sa tour génoise : un poste magnifique pour le loup et le sar, dans un cadre de carte postale. Tu pêches au leurre le long des pointes et des tombants, à la flottante pour le sar et la dorade royale dans les failles. Aube et crépuscule, sous une petite houle, sont les meilleurs moments.$$,
 $$Accès depuis le parking de la Parata (route des Sanguinaires, Ajaccio), puis sentier vers la pointe sous la tour génoise. ⚠️ Rochers glissants et coups de mer sur la pointe exposée : garde une marge avec l'eau, ne pêche pas dos à la mer. ⚠️ Les îles Sanguinaires sont une réserve naturelle (accès/pêche réglementés au large) — la pointe de la Parata reste publique, mais renseigne-toi sur le zonage avant de pêcher vers les îles.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #11 Ajaccio — port Tino Rossi / jetée — vieux port urbain.
($$Ajaccio — port Tino Rossi$$, 'port-tino-rossi-ajaccio', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(8.74136, 41.91873), 4326)::geography,
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie'], 'digue', 1,
 $$Au pied de la citadelle d'Ajaccio, les jetées du vieux port Tino Rossi offrent un poste urbain facile et abrité, parfait pour débuter ou sortir en famille. Tu pêches à la flottante le long des quais — sar, dorade royale, orphie — et au leurre pour tenter le loup à l'entrée du port au coup du soir. L'orphie passe en surface à la belle saison.$$,
 $$Accès à pied depuis le vieux port Tino Rossi (Ajaccio), stationnement à proximité. Poste accessible et abrité ; prudence habituelle sur les pierres. Respecte l'activité du port et les zones de manœuvre des bateaux.$$,
 array[]::text[], 'public', false),

-- #12 Capo di Feno (Ajaccio) — pointe rocheuse sauvage, exposé.
($$Capo di Feno$$, 'capo-di-feno', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(8.59237, 41.96332), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Au nord-ouest d'Ajaccio, le Capo di Feno dresse ses pointes rocheuses sauvages au-dessus de plages réputées pour le surf : un poste à loup et à sar battu par le large. Tu pêches au leurre le long des roches et dans les remous, à la flottante pour le sar et la dorade royale dans les failles. Le bord exposé travaille bien sous une houle d'ouest — mais reste prudent.$$,
 $$Accès depuis Ajaccio vers le Capo di Feno (route puis sentiers), secteur sauvage. ⚠️ Rochers glissants, coups de mer et isolement : la houle d'ouest balaie les pointes, garde une marge avec l'eau, ne descends pas seul et renonce par forte mer.$$,
 array['rochers_glissants','vagues','isolation'], 'public', false),

-- #13 Marine de Porto — tour génoise (Ota) — golfe UNESCO + réserve Scandola.
($$Marine de Porto — tour génoise$$, 'marine-de-porto', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(8.6882, 42.2722), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 42.26750,8.69628 = maquis ~430m intérieur ; promontoire rocheux sous la tour vérifié)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Au fond du golfe de Porto, classé à l'UNESCO, la marine de Porto et sa tour génoise dominent des postes rocheux spectaculaires au pied des falaises de granit rouge : un terrain à loup et à sar dans un décor unique. Tu pêches au leurre le long des roches et des tombants, à la flottante pour le sar et la dorade royale dans les failles. L'eau claire et profonde demande de la discrétion.$$,
 $$Accès depuis la marine de Porto (Ota), postes rocheux au pied de la tour génoise. ⚠️ Rochers glissants et sections de falaise : prudence à la descente et garde une marge avec l'eau. ⚠️ La réserve naturelle de Scandola est toute proche (pêche interdite dans son périmètre) — vérifie le zonage avant de pêcher vers le nord du golfe.$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #14 Port de Propriano (Golfe du Valinco) — digue, fond de golfe.
($$Port de Propriano$$, 'port-de-propriano', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(8.89862, 41.67726), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'digue', 1,
 $$Au fond du golfe du Valinco, Propriano offre les jetées de son port et de sa marina : un poste accessible et abrité. Tu pêches à la flottante pour le sar et la dorade royale le long des enrochements, au leurre pour le loup à l'entrée du port, et au surfcasting sur les plages du golfe. L'aube et le crépuscule sont les meilleurs moments.$$,
 $$Accès à pied depuis le port de Propriano, stationnement à proximité. Poste accessible et abrité ; prudence habituelle sur les pierres et près du chenal. Respecte l'activité du port.$$,
 array[]::text[], 'public', false),

-- #15 Tour de Campomoro (Belvédère-Campomoro) — pointe rocheuse, isolée.
($$Tour de Campomoro$$, 'tour-de-campomoro', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(8.8033, 41.639), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 41.63885,8.80725 = tour génoise dans le maquis ; pointe rocheuse O de la tour vérifiée)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$À la pointe sud du golfe du Valinco, Campomoro abrite sous la plus grande tour génoise de Corse une pointe rocheuse sauvage : un poste à loup et à sar pour les amateurs de pêche de roche. Tu pêches au leurre le long des roches et dans les remous, à la flottante pour le sar et la dorade royale dans les failles. Le secteur, préservé, tient bien le poisson — aube et crépuscule en priorité.$$,
 $$Accès depuis Campomoro (Belvédère-Campomoro), sentier vers la pointe et la tour génoise. ⚠️ Rochers glissants et secteur isolé : garde une marge avec l'eau, ne descends pas seul et renonce par forte houle. Le sentier du littoral est préservé — respecte le site.$$,
 array['rochers_glissants','isolation'], 'public', false),

-- #16 Phare de Pertusato (Bonifacio) — EXPOSÉ MAX : Bouches de Bonifacio, expert.
($$Phare de Pertusato — Bonifacio$$, 'phare-de-pertusato', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(9.1847, 41.3663), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 41.36751,9.18443 = phare sur le plateau ; pointe rocheuse Capu Pertusato ~160m S vérifiée)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 5,
 $$À la pointe sud de la Corse, sous le phare de Pertusato, les rochers dominent les Bouches de Bonifacio face à la Sardaigne : un poste d'expert, l'un des plus sauvages et des plus exigeants de l'île. Tu pêches au leurre le long des tombants et dans les veines de courant, à la flottante pour le sar dans les failles. L'eau profonde au bord tient de très beaux loups et sars — mais ici, la mer commande tout.$$,
 $$Accès depuis Bonifacio vers le phare de Pertusato (route puis sentier au bord des falaises), descente engagée. ⚠️ DANGER MAJEUR : les Bouches de Bonifacio comptent parmi les courants et les vents les plus violents de Méditerranée, au pied de hautes falaises, en secteur isolé sans secours rapide. Réservé aux pêcheurs expérimentés ; ne descends jamais seul, surveille le vent et la mer en permanence, et renonce au moindre doute. ⚠️ Réserve naturelle des Bouches de Bonifacio à proximité : vérifie les zones réglementées.$$,
 array['courants_forts','falaise','isolation'], 'public', false),

-- #17 Bonifacio — goulet / port (*) — quais du goulet, courants.
($$Bonifacio — goulet / port$$, 'port-de-bonifacio', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(9.1587, 41.3891), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 41.38772,9.16858 = vieille ville ~850m E ; quais de la marina dans le goulet vérifiés)
 array['flottante','leurres'], array['bar','dorade_royale','sar'], 'digue', 2,
 $$Bonifacio cache son port au fond d'un goulet spectaculaire, entaillé dans les falaises de calcaire blanc : les quais du goulet offrent un poste à loup et à sar dans un décor unique au monde. Tu pêches à la flottante le long des quais et des enrochements, au leurre pour le loup à l'entrée du goulet, là où l'eau circule. L'eau claire et profonde demande de la discrétion.$$,
 $$Poste sur les quais du goulet et du port de Bonifacio, accès à pied depuis la marine. ⚠️ Courants forts à l'entrée du goulet (Bouches de Bonifacio) : prudence près de l'eau et respecte l'intense trafic de bateaux (navettes, plaisance). Vérifie l'éventuel arrêté portuaire de pêche.$$,
 array['courants_forts'], 'public', false),

-- #18 Porto-Vecchio — port / golfe (*) — marina, familial.
($$Porto-Vecchio — port / golfe$$, 'port-de-porto-vecchio', '2A', 'corse',
 ST_SetSRID(ST_MakePoint(9.2848, 41.5902), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 41.59114,9.27945 = vieille ville perchée ~700m ; bassin de la marina au bord du golfe vérifié)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'digue', 1,
 $$Au fond de son golfe, Porto-Vecchio (la troisième ville de Corse) offre les jetées de sa marina : un poste accessible et abrité, idéal pour débuter ou sortir en famille. Tu pêches à la flottante pour le sar et la dorade royale le long des enrochements, au leurre pour le loup à l'entrée du port, et au surfcasting sur les plages du golfe. L'aube et le crépuscule sont les meilleurs créneaux.$$,
 $$Poste sur les jetées de la marina de Porto-Vecchio, accès depuis le port, stationnement à proximité. Poste accessible et abrité ; prudence habituelle sur les pierres et près du chenal. Respecte l'activité du port.$$,
 array[]::text[], 'public', false);

-- =====================================================================
-- Après validation + insertion : vérifier sur /carte que les 18 pins tombent
-- au bon endroit (cap / port / plage), que /fil/2A et /fil/2B existent, puis
-- passer verified=true spot par spot. geom_public rempli par le trigger spots_blur.
-- Bilan attendu : 2B→9, 2A→9 = 18 spots → prod 139→157, COUVERTURE NATIONALE COMPLÈTE.
-- =====================================================================
