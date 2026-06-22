-- =====================================================================
-- Carnet de Pêche — LOT 5 de curation de spots (Méditerranée, 30 spots)
-- =====================================================================
-- ✅ INSÉRÉ EN PROD le 2026-06-22 via MCP execute_sql (OK explicite de John).
--    La prod passe de 109 à 139 spots (66=4, 11=3, 34=5, 30=2, 13=6, 83=6, 06=4).
--    Vérifié : 30/30 geom_public généré (trigger), visibility=public, verified=false,
--    flou GPS 503-866 m, 2 régions. NE PAS REJOUER (doublons de slug). Trace conservée.
--    Fichier de DONNÉE, pas migration (CLAUDE.md §20.4).
--
-- Façade Méditerranée continentale → ouvre la 3ᵉ façade (zéro spot dessus
-- jusqu'ici). Départements : 66 (×4) · 11 (×3) · 34 (×5) · 30 (×2) · 13 (×6)
-- · 83 (×6) · 06 (×4) = 30 spots. La Corse (2A/2B) fera un Lot 6 séparé.
-- Résultat attendu : 109 → 139 spots, 3 façades couvertes (Atlantique + Manche
-- + Méditerranée).
--
-- Pipeline de qualité appliqué (2026-06-22) :
--   1. Proposition + coordonnées VÉRIFIÉES SUR OPENSTREETMAP (nœuds réels :
--      phares, caps, môles, jetées, plages, graus) — docs/sprint-10/lot-5-mediterranee.md.
--      Coords NON re-géocodées (consigne John : confiance OSM).
--   2. Confirmation schéma prod (supabase-guard, lecture seule, 2026-06-22) :
--      19 colonnes ; geom = geography(Point,4326) → cast ::geography ;
--      structure ∈ CHECK {digue,plage,pointe_rocheuse,estuaire,cale,passe,cassure} ;
--      techniques/species/hazards = text[] libres ; region = text libre ;
--      visibility CHECK {public,subscriber,private} défaut 'subscriber' → on force
--      'public' ; difficulty CHECK 1..5 ; verified défaut false ; department char(3)
--      (garder le zéro initial de '06'). Trigger spots_blur génère geom_public
--      (buffer recentré 500-900 m) → NE PAS l'écrire. Verrou colonne geom (anon ne
--      lit pas geom) intact (migrations 028/029).
--   3. Confirmation satellite (ortho Esri World Imagery), 2 passes, de chaque coordonnée
--      → docs/sprint-10/lot-5-verification.md. RÉSULTAT : 18 coords OK + 1 review gardée ;
--      11 coords hors-structure CORRIGÉES + 1 (#28 embouchure du Var) DÉPLACÉE vers le vrai
--      débouché du fleuve. Cause des erreurs OSM : le nœud captait l'objet NOMMÉ (phare au
--      sommet, village perché, centre-ville, mont) au lieu du poste au bord de l'eau. Les 12
--      corrections sont marquées « COORD CORRIGÉE satellite » ligne par ligne et restent
--      à VALIDER PAR JOHN avant insertion.
--
-- Spécificités MÉDITERRANÉE (≠ Atlantique/Manche — honnêteté produit) :
--   • Espèces Med-correctes : bar (= « loup »), dorade_royale, sar, orphie,
--     maquereau. ZÉRO lieu_jaune, ZÉRO vieille (espèces atlantiques absentes
--     de la Med). Le sar est enfin à sa place.
--   • Dangers Med : PAS de marnage → PAS de submersion_maree. Les vrais risques
--     = rochers_glissants, falaise, vagues (coup de mer / houle d'est qui
--     surprend sur les platiers exposés), courants_forts (graus, embouchures),
--     isolation (caps sauvages).
--   • Réglementations à signaler dans access_notes :
--      - #15 Callelongue + #16 Cassis Port-Miou : PARC NATIONAL DES CALANQUES
--        (zonage strict, zones de protection renforcée où la pêche est interdite).
--      - #17 Carry-le-Rouet + #18 Cap Couronne : PARC MARIN DE LA CÔTE BLEUE
--        (zones de cantonnement / no-take).
--      - #27 Cap d'Antibes / #29 Cap Ferrat / #30 Cap Martin : sentier du littoral
--        public mais sections bordées de propriétés privées.
--      - Môles/jetées portuaires Med (#3, #7, #8, #13, #22…) : la pêche est
--        FRÉQUEMMENT interdite par arrêté municipal/portuaire → rappel
--        « vérifier la signalétique sur place » systématique.
--
-- Conventions (identiques aux lots 1-4) :
--   • geom en GEOGRAPHY : ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography.
--     ⚠️ ST_MakePoint prend (lng, lat) dans cet ordre. Med = longitudes POSITIVES
--     (~3° à 7.5° E), latitudes ~42.5 à 43.8° N. Une longitude négative = bug.
--   • geom_public (flou ~500-900 m) généré par le trigger spots_blur → NE PAS écrire.
--   • visibility = 'public' explicite (défaut table = 'subscriber').
--   • verified = false (passé à true par John après revue terrain/satellite).
--   • Danger rochers/houle EXPLICITE pour les caps exposés (#1,2,5,9,15,16,18,
--     24,25,26,27,29) — responsabilité produit.
--
-- Insertion après validation : MCP execute_sql (après OK de John) ou
-- Supabase Studio → SQL Editor → coller → Run.
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ============== PYRÉNÉES-ORIENTALES (66) — Côte Vermeille / Salanque ==============

-- #1 Cap Béar (Port-Vendres) — EXPOSÉ : platiers + houle d'est + falaise.
($$Cap Béar — Port-Vendres$$, 'cap-bear', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.13669, 42.51557), 4326)::geography,
 array['leurres','flottante','vif'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 4,
 $$Sous le phare du Cap Béar, à la pointe de la Côte Vermeille, les platiers rocheux plongent dans une eau claire et profonde — un poste d'expert pour le loup (bar), le sar et la dorade royale. Tu prospectes au leurre (souple, surface au petit jour) le long des tombants et dans les remous qui lèchent la roche, à la flottante pour le sar dans les failles, et au vif pour les beaux loups qui patrouillent le bord. Les meilleurs moments : tôt le matin, à la tombée du jour, et quand une petite houle vient brasser le bord sans le rendre dangereux.$$,
 $$Tu te gares vers le phare du Cap Béar (route depuis Port-Vendres) puis tu descends sur les platiers. ⚠️ Cap très exposé : rochers glissants, sections de falaise, et surtout la houle d'est qui peut surprendre et balayer les platiers sans prévenir. Ne pêche jamais dos à la mer, garde une marge avec l'eau, repère ta sortie et renonce dès que ça forcit.$$,
 array['rochers_glissants','falaise','vagues'], 'public', false),

-- #2 Cap l'Abeille (Banyuls-sur-Mer) — EXPOSÉ : pêche de roche, falaise.
($$Cap l'Abeille — Banyuls-sur-Mer$$, 'cap-l-abeille-banyuls', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.15497, 42.47619), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 4,
 $$Les criques rocheuses du Cap l'Abeille, entre Banyuls et la frontière, sont une carte postale de la Côte Vermeille — et un terrain à loup et à sar pour qui aime la pêche de roche. Au leurre, tu cherches le loup le long des pointes et dans les veines d'eau ; à la flottante, le sar et la dorade royale répondent près des roches et des herbiers. Privilégie l'aube, le crépuscule et l'eau légèrement teintée après un coup de mer.$$,
 $$Accès par les sentiers du littoral depuis Banyuls-sur-Mer (Côte Vermeille), puis descente sur les criques. ⚠️ Rochers glissants et sections de falaise : chaussures qui accrochent, prudence à la descente, et méfie-toi de la houle d'est qui remonte vite sur les platiers bas.$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #3 Port d'Argelès-sur-Mer — digue + embouchure du Tech, familial.
($$Port d'Argelès-sur-Mer$$, 'port-d-argeles', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.054, 42.5442), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 42.54380,3.03717 = centre-ville ; marina Port-Argelès vérifiée)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'digue', 1,
 $$Les jetées du port de plaisance d'Argelès-sur-Mer offrent un poste facile et accessible, idéal pour débuter ou sortir en famille. Tu pêches à la flottante le long des enrochements de la marina, au leurre pour tenter le loup à l'entrée du port au coup du soir, et au surfcasting sur la grande plage d'Argelès voisine pour la dorade royale en été. Les changements de lumière, à l'aube et à la tombée du jour, et l'eau un peu brassée réveillent le poisson.$$,
 $$Accès simple à pied depuis le port d'Argelès-sur-Mer, stationnement à proximité. ⚠️ Sur les môles et jetées portuaires de Méditerranée, la pêche est souvent réglementée par arrêté municipal/portuaire : vérifie la signalétique sur place avant de t'installer. Reste à l'écart des zones de manœuvre des bateaux.$$,
 array[]::text[], 'public', false),

-- #4 Le Barcarès — grau de Sainte-Marie (*) — estuaire à courant.
($$Le Barcarès — grau de Sainte-Marie$$, 'grau-de-sainte-marie-barcares', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.0414, 42.7984), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 42.79468,3.03352 = port intérieur ; débouché du grau en mer vérifié)
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'estuaire', 2,
 $$Le grau de Sainte-Marie, entre Le Barcarès et Sainte-Marie-la-Mer, fait communiquer les étangs avec la mer : un débouché à courant où le loup vient chasser et où la dorade royale fouille le sable. Tu pêches au surfcasting sur le lido et au leurre dans la veine du grau, surtout quand l'eau sort et concentre les proies. Le coup du soir et la nuit, sur eau brassée, sortent les meilleurs poissons.$$,
 $$Poste sur les jetées du grau et le long du lido, accès depuis Le Barcarès ou Sainte-Marie-la-Mer. ⚠️ Courants forts dans le grau quand l'eau passe : garde tes appuis, ne te laisse pas surprendre, et prudence sur les enrochements glissants.$$,
 array['courants_forts'], 'public', false),

-- ===================== AUDE (11) — Corbières maritimes / Narbonnaise =====================

-- #5 Cap Leucate (Leucate) — EXPOSÉ : falaise + tramontane.
($$Cap Leucate$$, 'cap-leucate', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.06017, 42.91773), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Les falaises du Cap Leucate dominent la mer entre la Salanque et la côte audoise, balayées par la tramontane. Côté mer, les postes rocheux au pied du cap donnent du loup au leurre et du sar à la flottante, dans une eau souvent claire et venteuse. Le vent d'ici est un allié quand il brasse le bord et active la chasse — mais il commande aussi la prudence.$$,
 $$Accès depuis le plateau du Cap Leucate (Leucate) puis descente vers les postes du bas. ⚠️ Falaises et rochers glissants ; la tramontane comme le vent marin lèvent vite une mer hachée et des vagues qui surprennent sur les platiers. Ne descends pas par gros vent d'est ou de sud-est, repère ta sortie et garde une marge avec l'eau.$$,
 array['falaise','rochers_glissants','vagues'], 'public', false),

-- #6 Gruissan — plage & port (*) — surfcasting réputé.
($$Gruissan — plage & port$$, 'gruissan-plage', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.08584, 43.10321), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','sar'], 'plage', 2,
 $$Gruissan déroule de grandes plages de sable entre l'étang et la mer, prolongées par les digues du port et du grau : un terrain de surfcasting réputé de la côte audoise. Tu cherches le loup au lancer dans les fosses et les bordures de bancs, la dorade royale au crabe ou au ver sur le sable en été, et le sar près des enrochements du port. Le coup du soir et la nuit, par eau un peu brassée, sont les meilleurs créneaux.$$,
 $$Accès depuis Gruissan-Plage, stationnement le long du front de mer, puis tu attaques l'estran. Poste accessible ; prudence sur les digues du port et du grau (pierres glissantes) et pense à vérifier l'éventuel arrêté de pêche sur les môles portuaires.$$,
 array[]::text[], 'public', false),

-- #7 Port-la-Nouvelle — jetée (phare) — port de commerce.
($$Port-la-Nouvelle — jetée$$, 'jetee-de-port-la-nouvelle', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.06980, 43.01237), 4326)::geography,
 array['flottante','surfcasting','leurres'], array['bar','dorade_royale','maquereau'], 'digue', 1,
 $$La grande jetée de Port-la-Nouvelle file vers son phare à l'entrée du port de commerce : un poste simple avec du fond au bout, classique de la côte audoise. Tu pêches à la flottante et au leurre — loup à l'entrée du chenal au coup du soir, dorade royale sur les fonds de sable — et le maquereau passe en surface à la belle saison. Vise les changements de lumière et l'eau brassée.$$,
 $$Accès à pied depuis Port-la-Nouvelle, stationnement à proximité, puis jetée jusqu'au phare. ⚠️ Ouvrage exposé : par coup de mer la jetée prend des paquets d'eau, n'y va pas. ⚠️ Port de commerce en activité : la pêche peut être réglementée par arrêté portuaire — vérifie la signalétique et respecte le chenal de navigation.$$,
 array['vagues'], 'public', false),

-- ============================ HÉRAULT (34) — Languedoc ============================

-- #8 Sète — môle Saint-Louis — institution de la pêche du bord.
($$Sète — môle Saint-Louis$$, 'mole-saint-louis-sete', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.70141, 43.39625), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie'], 'digue', 2,
 $$Le môle Saint-Louis, le grand brise-lames qui protège l'entrée du port de Sète, est une institution de la pêche du bord héraultaise : des centaines de mètres d'ouvrage, du fond et du passage de poisson. Tu tapes le loup au leurre et à la flottante le long du parement et au musoir, le sar près des blocs, et l'orphie comme le maquereau en surface l'été. Les meilleurs moments : le coup du soir, la nuit, et quand l'eau du port se brasse.$$,
 $$Accès à pied depuis Sète, le long du môle Saint-Louis. ⚠️ Ouvrage exposé à la houle, dangereux par gros temps. ⚠️ Port en activité : la pêche sur le môle peut être encadrée par arrêté portuaire (zones, horaires) — vérifie la signalétique sur place. Prudence sur les blocs glissants et au musoir.$$,
 array['vagues'], 'public', false),

-- #9 Cap d'Agde — rochers volcaniques — EXPOSÉ : basalte glissant.
($$Cap d'Agde — rochers volcaniques$$, 'cap-d-agde', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.5152, 43.2755), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.29833,3.50300 = Mont Saint-Loup/colline ; rochers basaltiques au ras de l'eau vérifiés)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Le Cap d'Agde dresse ses rochers basaltiques noirs, héritage volcanique unique sur la côte sableuse du Languedoc : un vrai relief à loup et à sar au milieu des plages. Tu prospectes au leurre le long des roches et des môles, à la flottante pour le sar et la dorade royale dans les failles. La structure rocheuse concentre le poisson — vise l'aube, le crépuscule et l'eau brassée après un coup de mer.$$,
 $$Accès depuis Le Cap d'Agde, postes sur les rochers volcaniques et les môles du secteur. ⚠️ Rochers basaltiques glissants et coups de mer qui balaient les platiers bas : prudence à la descente, garde une marge avec l'eau, et renonce par forte houle.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #10 Palavas-les-Flots — embouchure du Lez — courants.
($$Palavas-les-Flots — embouchure du Lez$$, 'palavas-les-flots', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.93153, 43.52781), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale'], 'estuaire', 1,
 $$À Palavas-les-Flots, les jetées qui encadrent l'embouchure du Lez sont un poste à loup reconnu : le fleuve débouche en mer et concentre les proies dans sa veine. Tu pêches au leurre et à la flottante dans le courant et sur les bordures, et au surfcasting sur les plages voisines pour la dorade royale en été. Le meilleur moment, c'est quand l'eau du Lez sort et que le loup tient le courant.$$,
 $$Accès à pied depuis Palavas-les-Flots, stationnement à proximité des jetées de l'embouchure. ⚠️ Courants forts à l'embouchure du Lez : garde tes appuis, prudence sur les enrochements glissants, et respecte le chenal de navigation.$$,
 array['courants_forts'], 'public', false),

-- #11 Frontignan-Plage / la Corniche — surfcasting.
($$Frontignan-Plage — la Corniche$$, 'plage-de-frontignan', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.80080, 43.44386), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$La longue plage de Frontignan, entre Sète et Palavas, est un classique du surfcasting héraultais : du sable à perte de vue et des fosses où le loup vient chasser. Tu lances lourd dans les bordures de bancs pour le loup au coup du soir et de nuit, et tu cherches la dorade royale au crabe ou au ver sur le sable en été. Repère tes fosses par mer calme et laisse travailler ton montage par eau brassée.$$,
 $$Accès depuis Frontignan-Plage (la Corniche), stationnement le long du front de mer, puis tu attaques l'estran. Poste accessible et sans danger particulier ; prudence habituelle de nuit et par mer formée.$$,
 array[]::text[], 'public', false),

-- #12 Le Grau-d'Agde — embouchure de l'Hérault — courants.
($$Le Grau-d'Agde — embouchure de l'Hérault$$, 'le-grau-d-agde', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.4436, 43.2809), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.28578,3.44572 = bâti du village ; jetées du grau en mer vérifiées)
 array['flottante','surfcasting','leurres'], array['bar','dorade_royale'], 'estuaire', 1,
 $$Au Grau-d'Agde, les jetées de l'embouchure de l'Hérault donnent un poste facile et productif : le fleuve sort en mer et le loup vient y chasser dans le courant. Tu pêches à la flottante et au leurre dans la veine, au surfcasting sur les plages adjacentes pour la dorade royale en été. Vise les moments où l'eau de l'Hérault passe et concentre les proies.$$,
 $$Accès à pied depuis Le Grau-d'Agde, stationnement à proximité, puis jetées de l'embouchure. ⚠️ Courants forts à l'embouchure de l'Hérault : prudence avec le courant et les enrochements glissants, respecte le chenal et l'activité du grau.$$,
 array['courants_forts'], 'public', false),

-- ============================== GARD (30) — Petite Camargue ==============================

-- #13 Le Grau-du-Roi — jetées (*) — chenal / Port-Camargue, courants.
($$Le Grau-du-Roi — jetées$$, 'jetees-du-grau-du-roi', '30', 'occitanie',
 ST_SetSRID(ST_MakePoint(4.13718, 43.53601), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale'], 'digue', 1,
 $$Les jetées du Grau-du-Roi et de Port-Camargue encadrent le débouché du chenal en mer : un poste accessible et très fréquenté, entre fleuve, étangs et Méditerranée. Tu pêches à la flottante et au leurre dans le courant du grau pour le loup, et au surfcasting sur les plages voisines pour la dorade royale. Le poisson suit les passages d'eau — vise les changements et le coup du soir.$$,
 $$Poste sur les jetées du grau / Port-Camargue, accès depuis Le Grau-du-Roi. ⚠️ Courants forts dans le chenal quand l'eau passe. ⚠️ Secteur portuaire très fréquenté : la pêche peut être réglementée sur certains môles (arrêté municipal/portuaire) — vérifie la signalétique et respecte le chenal de navigation.$$,
 array['courants_forts'], 'public', false),

-- #14 Pointe de l'Espiguette (Le Grau-du-Roi) — plage sauvage de Camargue.
($$Pointe de l'Espiguette$$, 'pointe-de-l-espiguette', '30', 'occitanie',
 ST_SetSRID(ST_MakePoint(4.1349, 43.48405), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.48768,4.14176 = massif dunaire ; estran au contact de l'eau vérifié)
 array['surfcasting','leurres'], array['bar','dorade_royale','sar'], 'plage', 2,
 $$La pointe de l'Espiguette, immense plage sauvage de Camargue au pied de son phare, est un terrain de surfcasting mythique : des kilomètres de sable, des bancs mouvants et des fosses où le loup patrouille. Tu lances lourd dans les baïnes et les bordures de bancs pour le loup, tu cherches la dorade royale et le sar sur le sable en été. La nuit et le coup du soir, par eau brassée, c'est le moment des beaux poissons.$$,
 $$Accès depuis Le Grau-du-Roi vers le phare de l'Espiguette (parking payant en saison), puis longue marche sur le sable. ⚠️ Courants et bancs mouvants : les fosses et les passages d'eau créent des courants qui peuvent surprendre. Repère tes fosses de jour, méfie-toi du déplacement des bancs, et préviens quelqu'un car le secteur est vaste et isolé.$$,
 array['courants_forts'], 'public', false),

-- ====================== BOUCHES-DU-RHÔNE (13) — Calanques / Côte Bleue / Camargue ======================

-- #15 Marseille — Callelongue / Cap Croisette — EXPOSÉ + Parc National des Calanques.
($$Marseille — Callelongue / Cap Croisette$$, 'callelongue-cap-croisette', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.35420, 43.21273), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$À la pointe sud de Marseille, Callelongue et le Cap Croisette ouvrent la porte des Calanques : des rochers blancs qui plongent dans une eau translucide, royaume du sar, du loup et de la dorade royale. Tu pêches au leurre le long des pointes et des tombants, à la flottante pour le sar dans les failles et les herbiers. C'est une pêche de roche exigeante et magnifique — aube et crépuscule sont les meilleurs moments.$$,
 $$Accès depuis Callelongue (bout de la route des Goudes, Marseille), puis sentiers rocheux. ⚠️ Tu es dans le périmètre du Parc National des Calanques : la réglementation y est stricte et certaines zones sont en protection renforcée (pêche interdite) — vérifie impérativement le zonage et les règles en vigueur avant de pêcher. ⚠️ Rochers glissants et falaises : prudence à la descente et méfie-toi de la houle.$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #16 Cassis — calanque de Port-Miou (*) — EXPOSÉ + Parc National des Calanques.
($$Cassis — calanque de Port-Miou$$, 'cassis-port-miou', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.5149, 43.20485), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.21404,5.53963 = centre-ville Cassis ; entrée de la calanque de Port-Miou vérifiée)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Port-Miou, la première des calanques de Cassis, entaille les falaises de calcaire sur près d'un kilomètre : un décor spectaculaire où le sar, le loup et la dorade royale tiennent les bordures rocheuses. Tu pêches au leurre et à la flottante depuis les rochers de l'entrée et le long du chenal, dans une eau d'une clarté redoutable qui rend le poisson méfiant. Discrétion, fil fin et créneaux d'aube/crépuscule font la différence.$$,
 $$Poste à l'entrée de Port-Miou et sur les rochers du secteur, accès depuis Cassis (à pied, le secteur est réglementé en voiture). ⚠️ Tu es dans le Parc National des Calanques : réglementation stricte, zones de protection renforcée possibles (pêche interdite) — vérifie le zonage et les règles avant de pêcher. ⚠️ Falaises et rochers glissants : prudence absolue près des à-pics.$$,
 array['falaise','rochers_glissants'], 'public', false),

-- #17 Carry-le-Rouet — port & Côte Bleue — Parc Marin de la Côte Bleue.
($$Carry-le-Rouet — Côte Bleue$$, 'carry-le-rouet', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.15244, 43.32937), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 2,
 $$Carry-le-Rouet, station de la Côte Bleue entre Marseille et Martigues, alterne port abrité et petites criques rocheuses : un poste varié et plutôt accessible pour le sar, le loup et la dorade royale. Tu pêches au leurre le long des roches et des digues, à la flottante pour le sar dans les failles et les herbiers. Le relief de la Côte Bleue tient bien le poisson, surtout à l'aube et au crépuscule.$$,
 $$Accès depuis Carry-le-Rouet (port et criques de la Côte Bleue), postes faciles à modérés. ⚠️ Rochers glissants dans les criques ; prudence habituelle. ⚠️ Vérifie la réglementation du Parc Marin de la Côte Bleue : il comprend des zones de cantonnement où toute pêche est interdite — renseigne-toi sur le zonage local, et sur l'éventuel arrêté portuaire des digues.$$,
 array['rochers_glissants'], 'public', false),

-- #18 Cap Couronne (Martigues / Carro) — EXPOSÉ + Parc Marin de la Côte Bleue.
($$Cap Couronne — Carro$$, 'cap-couronne', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.05306, 43.32555), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Le Cap Couronne, à la pointe de la Côte Bleue près de Carro, déroule un grand platier calcaire sous son phare : un poste à loup et à sar battu par le large. Tu pêches au leurre le long des roches et dans les remous, à la flottante pour le sar et la dorade royale. Le platier travaille bien quand une houle d'ouest vient le brasser — mais c'est aussi là que le danger commence.$$,
 $$Accès depuis Carro / le phare du Cap Couronne (Martigues), puis platier rocheux. ⚠️ Rochers glissants et coups de mer : le platier bas est balayé par la houle d'ouest, garde une marge avec l'eau et ne pêche pas dos à la mer. ⚠️ Vérifie la réglementation du Parc Marin de la Côte Bleue (zone de cantonnement du Cap Couronne, pêche interdite par endroits).$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #19 Saintes-Maries-de-la-Mer (*) — digue + plages de Camargue.
($$Saintes-Maries-de-la-Mer$$, 'saintes-maries-de-la-mer', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(4.42772, 43.45159), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$Aux Saintes-Maries-de-la-Mer, capitale de la Camargue, la digue et les longues plages de sable offrent un grand terrain de surfcasting face au golfe. Tu lances lourd dans les fosses pour le loup au coup du soir et de nuit, et tu cherches la dorade royale au crabe ou au ver sur le sable en été. Le secteur, entre Petit Rhône et mer, brasse une eau riche que le poisson apprécie.$$,
 $$Accès depuis Les Saintes-Maries-de-la-Mer, stationnement le long du front de mer, puis digue et plages. ⚠️ Courants le long de la digue et près des graus : garde tes appuis et reste prudent par mer formée. Pense à vérifier les éventuelles zones de baignade réglementées en saison.$$,
 array['courants_forts'], 'public', false),

-- #20 Port-Saint-Louis — plage Napoléon (embouchure du Grand Rhône) — courants.
($$Port-Saint-Louis — plage Napoléon$$, 'plage-napoleon-port-saint-louis', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(4.88636, 43.35641), 4326)::geography,
 array['surfcasting','leurres','vif'], array['bar','dorade_royale'], 'plage', 2,
 $$À Port-Saint-Louis-du-Rhône, la plage Napoléon borde l'embouchure du Grand Rhône : un secteur sauvage où le fleuve déverse une eau chargée que le loup adore. Tu pêches au surfcasting et au leurre dans les veines de courant et les bordures, au vif pour les gros loups qui chassent près de l'embouchure. La dorade royale fouille le sable en été. Eau teintée et coup du soir = le combo gagnant.$$,
 $$Accès depuis Port-Saint-Louis-du-Rhône vers la plage Napoléon (embouchure du Grand Rhône). ⚠️ Courants forts à l'embouchure du fleuve : ne te laisse pas surprendre par les veines d'eau, garde tes appuis sur le sable mou et préviens quelqu'un car le secteur est isolé.$$,
 array['courants_forts'], 'public', false),

-- ============================== VAR (83) — de La Ciotat à Saint-Raphaël ==============================

-- #21 La Ciotat — bec de l'Aigle / port.
($$La Ciotat — bec de l'Aigle$$, 'la-ciotat', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.62700, 43.18709), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 2,
 $$La Ciotat, dominée par le Bec de l'Aigle et ses falaises de poudingue, mêle grand port et rochers : un poste varié pour le loup, le sar et la dorade royale. Tu pêches au leurre le long des digues et des roches sous le Bec, à la flottante pour le sar dans les failles. Le relief sous-marin abrupt concentre le poisson — vise l'aube, le crépuscule et l'eau brassée.$$,
 $$Accès depuis La Ciotat (port et secteur du Bec de l'Aigle), postes mixtes digues/rochers. ⚠️ Rochers glissants sous le Bec de l'Aigle ; prudence à la descente. Sur les môles du port, vérifie l'éventuel arrêté de pêche.$$,
 array['rochers_glissants'], 'public', false),

-- #22 Sanary-sur-Mer — port & pointe de la Cride — familial.
($$Sanary-sur-Mer — port & pointe de la Cride$$, 'sanary-sur-mer', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.80086, 43.11616), 4326)::geography,
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie'], 'digue', 1,
 $$Sanary-sur-Mer, joli port varois, offre des jetées abritées et la pointe de la Cride toute proche : un poste facile et familial pour la flottante. Tu pêches le sar, la dorade royale et l'orphie le long des enrochements et des jetées, et tu tentes le loup au leurre à l'entrée du port au coup du soir. L'orphie et le maquereau passent en surface à la belle saison.$$,
 $$Accès à pied depuis le port de Sanary-sur-Mer, jetées et pointe de la Cride. Poste accessible et abrité ; prudence habituelle sur les pierres. ⚠️ Sur les jetées du port, vérifie l'éventuel arrêté municipal de pêche et reste à l'écart des zones de manœuvre des bateaux.$$,
 array[]::text[], 'public', false),

-- #23 Toulon — plages du Mourillon — urbain abrité.
($$Toulon — plages du Mourillon$$, 'mourillon-toulon', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.94971, 43.10714), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'plage', 1,
 $$Les plages du Mourillon, à Toulon, alternent sable, digues et enrochements dans un cadre urbain abrité par la rade : un poste facile, parfait pour débuter ou sortir en famille. Tu pêches à la flottante le long des digues pour le sar et la dorade royale, au leurre pour tenter le loup au coup du soir, et au surfcasting sur les plages. Le secteur travaille bien tôt le matin et à la tombée du jour.$$,
 $$Accès direct depuis le front de mer du Mourillon (Toulon), stationnement à proximité. Poste urbain accessible et abrité ; prudence habituelle sur les digues et près des zones de baignade (réglementation en saison).$$,
 array[]::text[], 'public', false),

-- #24 Presqu'île de Giens (Hyères) — EXPOSÉ : pointes rocheuses (La Madrague).
($$Presqu'île de Giens$$, 'presqu-ile-de-giens', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.112, 43.034), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.03919,6.11269 = lotissement central ; platier rocheux côte sud vérifié)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$La presqu'île de Giens, reliée à Hyères par son double tombolo, offre des pointes rocheuses sauvages comme La Madrague face au large : un terrain à loup et à sar pour les amateurs de pêche de roche. Tu pêches au leurre le long des tombants et dans les remous, à la flottante pour le sar dans les failles et les herbiers de posidonie. Le bord exposé travaille bien sous une petite houle — mais reste prudent.$$,
 $$Accès depuis la presqu'île de Giens (Hyères), sentiers vers les pointes rocheuses (La Madrague). ⚠️ Rochers glissants et coups de mer sur les platiers exposés : garde une marge avec l'eau, ne pêche pas dos à la mer et renonce par forte houle.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #25 Cap Dramont (Saint-Raphaël) — EXPOSÉ : roches rouges de l'Estérel.
($$Cap Dramont — Saint-Raphaël$$, 'cap-dramont', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.8525, 43.4114), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.41398,6.85272 = sommet boisé ; roches rouges au ras de l'eau vérifiées)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Le Cap Dramont, sous son sémaphore, dresse les roches rouges de l'Estérel face à l'île d'Or : un décor spectaculaire et un vrai poste à loup et à sar. Tu pêches au leurre le long des pointes de porphyre et dans les remous, à la flottante pour le sar et la dorade royale dans les failles. L'eau profonde au pied des roches concentre le poisson — aube et crépuscule en tête.$$,
 $$Accès depuis Le Dramont (Saint-Raphaël), sentier du littoral vers les roches rouges sous le sémaphore. ⚠️ Rochers glissants et sections de falaise de l'Estérel : prudence à la descente, garde une marge avec l'eau et méfie-toi de la houle d'est.$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #26 Cap Camarat (Ramatuelle) — EXPOSÉ + isolé : platiers d'expert.
($$Cap Camarat — Ramatuelle$$, 'cap-camarat', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.67942, 43.19936), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.20095,6.67451 = plateau garrigue ; platier sous le phare vérifié)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 4,
 $$Le Cap Camarat, sous l'un des plus hauts phares de France, domine la mer entre Pampelonne et l'Escalet : des platiers de roche sauvages et profonds, poste d'expert pour le loup et le sar. Tu pêches au leurre le long des tombants et dans les veines d'eau, à la flottante pour le sar dans les failles. C'est une pêche engagée, loin de tout — mais l'eau profonde au bord tient de beaux poissons.$$,
 $$Accès par le sentier du littoral depuis le phare de Camarat ou l'Escalet (Ramatuelle), descente raide vers les platiers. ⚠️ Poste exposé et isolé : rochers glissants, sections de falaise, et secteur sans secours rapide. Ne descends jamais seul, garde une marge avec l'eau, repère ta sortie et renonce dès que la houle forcit.$$,
 array['rochers_glissants','falaise','isolation'], 'public', false),

-- ============================== ALPES-MARITIMES (06) — Côte d'Azur ==============================

-- #27 Cap d'Antibes — phare de la Garoupe — EXPOSÉ + sentier public/sections privées.
($$Cap d'Antibes — phare de la Garoupe$$, 'cap-d-antibes', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(7.1388, 43.5642), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.56434,7.13272 = phare de la Garoupe/sommet ; rochers du sentier de Tirepoil vérifiés)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Le Cap d'Antibes, entre Antibes et Juan-les-Pins, offre les rochers du sentier de Tirepoil sous le phare de la Garoupe : un poste à loup et à sar dans un cadre prestigieux. Tu pêches au leurre le long des pointes et des tombants, à la flottante pour le sar et la dorade royale dans les failles. L'eau claire et profonde demande de la discrétion — aube et crépuscule sont les meilleurs moments.$$,
 $$Accès par le sentier du littoral de Tirepoil (Cap d'Antibes). ⚠️ Le sentier est public mais traverse des sections bordées de propriétés privées : reste sur le domaine public maritime et respecte les accès. ⚠️ Rochers glissants et sections de falaise : prudence à la descente et méfie-toi de la houle d'est qui balaie les platiers.$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #28 Nice — embouchure du Var — courants.
($$Nice — embouchure du Var$$, 'embouchure-du-var-nice', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(7.2008, 43.6538), 4326)::geography, -- COORD CORRIGÉE/DÉPLACÉE satellite (OSM 43.65583,7.18222 = marina St-Laurent-du-Var ; galets de l'embouchure du Var rive est vérifiés)
 array['leurres','surfcasting','vif'], array['bar','dorade_royale'], 'estuaire', 2,
 $$À l'ouest de Nice, l'embouchure du Var, entre Nice et Saint-Laurent-du-Var, déverse l'eau du fleuve sur les galets : un secteur à loup reconnu de la Côte d'Azur. Tu pêches au leurre et au surfcasting dans les veines de courant et les bordures, au vif pour les gros loups qui chassent près de l'embouchure. La dorade royale fouille les galets et le sable en été. Eau teintée après un coup d'eau = le bon moment.$$,
 $$Accès depuis les galets de l'embouchure du Var (Nice / Saint-Laurent-du-Var). ⚠️ Courants forts à l'embouchure du fleuve : garde tes appuis sur les galets, ne te laisse pas surprendre par les veines d'eau, et reste prudent après les épisodes de crue.$$,
 array['courants_forts'], 'public', false),

-- #29 Cap Ferrat (Saint-Jean-Cap-Ferrat) — EXPOSÉ : pointe Saint-Hospice.
($$Cap Ferrat — pointe Saint-Hospice$$, 'cap-ferrat', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(7.32687, 43.67520), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Le Cap Ferrat, presqu'île chic entre Villefranche et Beaulieu, offre le sentier du littoral et la pointe Saint-Hospice : des rochers qui plongent dans une eau profonde, terrain à loup et à sar. Tu pêches au leurre le long des tombants et dans les remous, à la flottante pour le sar et la dorade royale dans les failles. La clarté de l'eau impose discrétion et fil fin — vise l'aube et le crépuscule.$$,
 $$Accès par le sentier du littoral de Saint-Jean-Cap-Ferrat (pointe Saint-Hospice). ⚠️ Rochers glissants et sections de falaise le long du sentier : prudence à la descente, garde une marge avec l'eau et méfie-toi de la houle d'est. Respecte les accès (sections bordées de propriétés privées).$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #30 Cap Martin (Roquebrune-Cap-Martin) (*) — pointe rocheuse, sentier Le Corbusier.
($$Cap Martin — Roquebrune$$, 'cap-martin', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(7.4765, 43.75095), 4326)::geography, -- COORD CORRIGÉE satellite (OSM 43.76506,7.45994 = village perché de Roquebrune ; pointe rocheuse sentier Le Corbusier vérifiée)
 array['leurres','flottante'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$Le Cap Martin, entre Monaco et Menton, déroule le sentier Le Corbusier au pied de ses villas, avec des pointes rocheuses qui plongent dans la grande bleue : un poste à loup et à sar à l'extrême est de la côte française. Tu pêches au leurre le long des roches et des tombants, à la flottante pour le sar et la dorade royale dans les failles. L'eau profonde au bord tient de beaux poissons — aube et crépuscule en priorité.$$,
 $$Poste sur la pointe du Cap-Martin, accès par le sentier du littoral Le Corbusier (Roquebrune-Cap-Martin). ⚠️ Rochers glissants ; prudence à la descente et méfie-toi de la houle d'est qui remonte sur les platiers. Respecte les accès (sections bordées de propriétés privées).$$,
 array['rochers_glissants'], 'public', false);

-- =====================================================================
-- Après validation + insertion : vérifier sur /carte que les 30 pins tombent
-- au bon endroit (cap rocheux / môle / grau / plage), puis passer verified=true
-- spot par spot. geom_public (flou ~500-900 m) est rempli par le trigger spots_blur.
-- Bilan attendu : 66→4, 11→3, 34→5, 30→2, 13→6, 83→6, 06→4 = 30 spots → prod 109→139.
-- =====================================================================
