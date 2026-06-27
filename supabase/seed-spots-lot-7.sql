-- =====================================================================
-- Carnet de Pêche — LOT 7 de curation (Méditerranée densification, 30 spots)
-- Façades sous-couvertes : 66 · 11 · 34 · 30 · 13 · 83 · 06
-- region 'occitanie' / 'provence-alpes-cote-d-azur'
-- =====================================================================
-- ⚠️ NON INSÉRÉ — PROPOSITION à valider par John, spot par spot (sprint 41, WS B).
--    NE PAS REJOUER une fois inséré (collisions de slug). Fichier = trace/source.
--    Fichier de DONNÉE, pas migration (CLAUDE.md §20.4).
--
-- Pipeline de qualité (sprint 41, 2026-06-27) :
--   1. Recherche documentaire (structures réelles, nommées, publiques :
--      OSM/Géoportail + croisement guides/ports). AUCUNE invention de spot
--      ni de coordonnée. docs/sprint-41/osm-review-note.md.
--   2. Coordonnées APPROXIMATIVES (poste de pêche au bord de l'eau, pas le
--      centre du village ni le sommet d'un phare). ⚠️ À RECALER AU SATELLITE
--      (ortho Esri) spot par spot AVANT insertion, comme les lots 1-6.
--   3. Schéma prod confirmé (supabase-guard, lecture seule) : structure ∈ CHECK
--      {digue,plage,pointe_rocheuse,estuaire,cale,passe,cassure} ; visibility
--      CHECK {public,subscriber,private} défaut 'subscriber' → on force 'public' ;
--      difficulty 1..5 ; verified défaut false ; department char(3) (garder le
--      zéro initial de '06'). source OMIS → default 'curated'. Trigger blur_spot_geom
--      remplit geom_public (flou ~500-900 m) → NE PAS l'écrire. Verrou colonne geom
--      (anon ne lit pas geom) intact.
--
-- Spécificités MÉDITERRANÉE (honnêteté produit, identiques au lot 5) :
--   • Espèces Med-correctes : bar (= « loup »), dorade_royale, sar, orphie,
--     maquereau. ZÉRO lieu_jaune, ZÉRO vieille (espèces atlantiques absentes).
--   • Dangers Med : PAS de marnage → PAS de submersion_maree. Vrais risques =
--     rochers_glissants, falaise, vagues (coup de mer / houle), courants_forts
--     (graus, embouchures), isolation (caps sauvages).
--   • Réglementations signalées dans access_notes : réserve Cerbère-Banyuls,
--     Parc Marin de la Côte Bleue (cantonnements no-take), Parc National des
--     Calanques, arrêtés portuaires/municipaux fréquents, interdiction de pêche
--     en heures de baignade surveillée.
--
-- Conventions (identiques aux lots 1-6) :
--   • geom GEOGRAPHY : ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography.
--     ⚠️ (lng, lat) dans cet ordre. Med = longitudes POSITIVES (~2.8° à 7.5° E),
--     latitudes ~42.4 à 43.8° N. Une longitude négative = bug.
--   • visibility = 'public' explicite. verified = false (true après revue John).
--   • Danger rochers/houle EXPLICITE pour les caps exposés.
--
-- Répartition : 66=5 · 11=4 · 34=4 · 30=4 · 13=5 · 83=5 · 06=3 = 30 spots.
-- Résultat attendu : 158 → 188 spots publics (curés).
--
-- ⚠️ SPOTS À RISQUE LÉGAL ÉCARTÉS de ce lot (documentés dans la note de revue,
--    NON inclus ici) : Carnon digue + grau (34, arrêté municipal digues) ;
--    Port-la-Nouvelle digues du grau (11, port de commerce) ; Digue Est de
--    Port-Camargue (30, périmètre arrêté 2024 incertain) ; anse de Sainte-Croix
--    / La Couronne (13, limitrophe cantonnement Cap Couronne). Sormiou/Morgiou,
--    Cap Nègre/Bénat, Cap Sicié, Cagnes-sur-Mer également écartés (cf note).
--
-- Insertion après validation : Supabase Studio → SQL Editor → coller → Run
-- (ou MCP execute_sql après OK explicite de John).
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ===================== PYRÉNÉES-ORIENTALES (66) — Côte Vermeille / Salanque =====================

-- #1 Pointe Saint-Vincent / Collioure — pointe rocheuse au cœur de la baie.
($$Pointe Saint-Vincent — Collioure$$, 'pointe-saint-vincent-collioure', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.08745, 42.52831), 4326)::geography, -- ⚠️ à recaler satellite (OSM chapelle/pointe St-Vincent)
 array['leurres','flottante'], array['sar','dorade_royale','bar'], 'pointe_rocheuse', 3,
 $$Au pied de la chapelle Saint-Vincent, la pointe rocheuse qui ferme la baie de Collioure est un poste de roche réputé de la Côte Vermeille. Tu pêches au leurre le long des tombants pour le loup, à la flottante pour le sar et la dorade royale dans les failles, dans une eau souvent claire qui demande de la discrétion. Vise l'aube, le crépuscule et l'eau légèrement brassée après un petit coup de mer.$$,
 $$Accès à pied depuis le centre de Collioure, le long de la pointe Saint-Vincent (hors réserve marine). ⚠️ Rochers glissants et houle d'est qui remonte vite sur les platiers bas : garde une marge avec l'eau et renonce dès que ça forcit. Spot très fréquenté en saison.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #2 Môle du port de Port-Vendres — digue de port en eau profonde.
($$Port-Vendres — môle du port$$, 'mole-de-port-vendres', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.11756, 42.52288), 4326)::geography, -- ⚠️ à recaler satellite (musoir du môle, pas les quais commerce)
 array['flottante','leurres','vif'], array['sar','dorade_royale','bar','orphie','maquereau'], 'digue', 2,
 $$Port-Vendres, seul port en eau profonde du Roussillon, offre un môle où le fond arrive vite : un classique de la pêche du bord catalane. Tu pêches à la flottante le long du parement pour le sar et la dorade royale, au leurre pour le loup à l'entrée du chenal au coup du soir, et au vif pour les beaux loups qui patrouillent. L'orphie et le maquereau passent en surface à la belle saison.$$,
 $$Accès à pied depuis Port-Vendres, sur le môle extérieur. ⚠️ Port de commerce en activité : la pêche est interdite sur les quais de commerce et peut être encadrée par arrêté portuaire. Vérifie la signalétique sur place et respecte le chenal de navigation. Prudence sur les blocs glissants par coup de mer.$$,
 array['rochers_glissants','vagues','courants_forts'], 'public', false),

-- #3 Anse de Paulilles — plage protégée entre deux caps.
($$Anse de Paulilles$$, 'anse-de-paulilles', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.12551, 42.50255), 4326)::geography, -- ⚠️ à recaler satellite (OSM anse de Paulilles)
 array['surfcasting','leurres','flottante'], array['dorade_royale','sar','bar'], 'plage', 2,
 $$L'anse de Paulilles, site naturel préservé entre le Cap Béar et le Cap l'Abeille, alterne plage de galets et pointes rocheuses : un cadre superbe pour la dorade royale, le sar et le loup. Tu cherches la dorade royale au surfcasting sur le galet en été, le sar à la flottante près des roches, et le loup au leurre au coup du jour. L'eau claire récompense la discrétion.$$,
 $$Accès par le site classé de Paulilles (Port-Vendres), parking puis descente à pied. ⚠️ Rochers glissants et sections de falaise sur les pointes ; prudence à la houle d'est. Vérifie la réglementation locale du site (ramassage des crustacés réglementé, secteur protégé).$$,
 array['rochers_glissants','falaise','isolation'], 'public', false),

-- #4 Jetée du port de Canet-en-Roussillon — digue familiale.
($$Canet-en-Roussillon — jetée du port$$, 'jetee-du-port-canet', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.0433, 42.7036), 4326)::geography, -- ⚠️ à recaler satellite (musoir de la jetée sud)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie'], 'digue', 1,
 $$La jetée du port de Canet-en-Roussillon donne un poste simple et accessible, idéal pour débuter ou sortir en famille. Tu pêches à la flottante le long des enrochements pour le sar et la dorade royale, au leurre pour tenter le loup à l'entrée du port au coup du soir, et au surfcasting sur la grande plage voisine. L'orphie passe en surface à la belle saison.$$,
 $$Accès à pied depuis le port de Canet-en-Roussillon, stationnement à proximité. ⚠️ Sur les jetées portuaires, la pêche est souvent réglementée (arrêté municipal/portuaire, zones de baignade) : vérifie la signalétique sur place. Reste à l'écart des manœuvres de bateaux.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #5 Port de Cerbère — digue à l'extrême sud, lisière de réserve.
($$Cerbère — digue du port$$, 'digue-de-cerbere', '66', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.16721, 42.44169), 4326)::geography, -- ⚠️ à recaler satellite (digue du port de Cerbère)
 array['flottante','leurres'], array['dorade_royale','sar','bar','maquereau'], 'digue', 2,
 $$Cerbère, dernier port avant l'Espagne, blottit sa digue sous des collines abruptes : un poste de roche et de port à l'extrême sud de la Côte Vermeille. Tu pêches à la flottante pour le sar et la dorade royale le long du parement, au leurre pour le loup dans les remous, et le maquereau passe l'été. L'eau profonde et claire tient bien le poisson.$$,
 $$Accès à pied depuis Cerbère, sur la digue du port. ⚠️ IMPORTANT : la côte au nord de Cerbère (de l'Île Grosse au Cap Peyrefite) est dans la réserve naturelle marine de Cerbère-Banyuls, où la pêche est strictement réglementée (zones interdites, pêche sur autorisation). Reste sur le port et vérifie le zonage avant de t'éloigner. Rochers glissants et houle d'est.$$,
 array['rochers_glissants','falaise','courants_forts'], 'public', false),

-- =========================== AUDE (11) — Narbonnaise ===========================

-- #6 Jetée nord de Port-Leucate — digue de marina.
($$Port-Leucate — jetée nord$$, 'jetee-nord-port-leucate', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.0509, 42.8742), 4326)::geography, -- ⚠️ à recaler satellite (musoir jetée nord)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 1,
 $$La jetée nord de Port-Leucate protège l'entrée de la grande marina : un poste accessible avec du passage de poisson, classique de la côte audoise. Tu pêches à la flottante pour le sar et la dorade royale le long des enrochements, au leurre pour le loup à l'entrée du chenal au coup du soir, et au surfcasting sur la plage voisine. Orphie et maquereau en surface l'été.$$,
 $$Accès à pied depuis Port-Leucate, stationnement à proximité. ⚠️ Arrêté portuaire saisonnier possible et zones de baignade balisées : vérifie la signalétique. Prudence sur les enrochements glissants par mer formée.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #7 Roc de la Batterie / Saint-Pierre-la-Mer — pointe rocheuse de la Clape.
($$Roc de la Batterie — Saint-Pierre-la-Mer$$, 'roc-de-la-batterie', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.19149, 43.17655), 4326)::geography, -- ⚠️ à recaler satellite (OSM Roc de la Batterie)
 array['leurres','flottante'], array['bar','dorade_royale','sar','orphie'], 'pointe_rocheuse', 3,
 $$Au pied du massif de la Clape, le Roc de la Batterie dresse un relief rocheux rare sur la côte sableuse audoise, à Saint-Pierre-la-Mer : un vrai poste à loup et à sar au milieu des plages. Tu prospectes au leurre le long des roches et des avancées, à la flottante pour le sar et la dorade royale dans les failles. La structure concentre le poisson, surtout à l'aube et après un coup de mer.$$,
 $$Accès depuis Saint-Pierre-la-Mer (Fleury-d'Aude), postes sur les roches au bord de l'eau. ⚠️ Rochers glissants et coups de mer qui balaient les platiers bas : prudence à la descente, garde une marge avec l'eau, renonce par forte houle.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #8 Jetée du port de Narbonne-Plage — digue.
($$Narbonne-Plage — jetée du port$$, 'jetee-de-narbonne-plage', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.18268, 43.16961), 4326)::geography, -- ⚠️ à recaler satellite (musoir de la jetée)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 1,
 $$La jetée du port de Narbonne-Plage offre un poste facile et abrité au pied du massif de la Clape. Tu pêches à la flottante pour le sar et la dorade royale le long des enrochements, au leurre pour le loup à l'entrée du port au coup du soir, et au surfcasting sur la plage attenante. Le maquereau passe en surface à la belle saison.$$,
 $$Accès à pied depuis Narbonne-Plage, stationnement à proximité. ⚠️ Zones portuaires balisées et arrêté possible : vérifie la signalétique. Prudence sur les enrochements glissants.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #9 Grande plage de La Franqui — surfcasting réputé.
($$La Franqui — grande plage$$, 'plage-de-la-franqui', '11', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.03529, 42.93231), 4326)::geography, -- ⚠️ à recaler satellite (OSM plage de La Franqui)
 array['surfcasting','leurres'], array['bar','dorade_royale','sar','orphie'], 'plage', 2,
 $$La grande plage de La Franqui, à Leucate, déroule un long ruban de sable battu par la tramontane : un terrain de surfcasting reconnu de la côte audoise. Tu lances lourd dans les fosses pour le loup au coup du soir et de nuit, et tu cherches la dorade royale au crabe ou au ver sur le sable en été. Le vent qui brasse le bord active la chasse, mais commande aussi la prudence.$$,
 $$Accès depuis La Franqui (Leucate), stationnement le long du front de mer. ⚠️ Pêche interdite dans les zones de baignade surveillée en saison : décale-toi. Courants et vagues levés par la tramontane et le vent marin ; prudence de nuit et par mer formée.$$,
 array['vagues','courants_forts'], 'public', false),

-- =========================== HÉRAULT (34) — Languedoc ===========================

-- #10 Plage du Lazaret / la Corniche de Sète — surfcasting urbain.
($$Sète — plage du Lazaret (la Corniche)$$, 'plage-du-lazaret-sete', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.6731, 43.39202), 4326)::geography, -- ⚠️ à recaler satellite (OSM plage du Lazaret)
 array['surfcasting','leurres','flottante'], array['bar','dorade_royale','sar','orphie','maquereau'], 'plage', 2,
 $$Au pied du mont Saint-Clair, la plage du Lazaret et la Corniche de Sète offrent du sable et des enrochements en plein cadre urbain : un poste accessible et productif. Tu cherches le loup au surfcasting dans les fosses au coup du soir, la dorade royale sur le sable en été, et le sar à la flottante près des roches de la corniche. Maquereau et orphie passent en surface à la belle saison.$$,
 $$Accès direct depuis la Corniche de Sète, stationnement le long du front de mer. Poste urbain accessible ; prudence habituelle de nuit, par mer formée, et près des zones de baignade réglementées en saison.$$,
 array['vagues'], 'public', false),

-- #11 Jetée / embouchure de l'Orb à Valras-Plage — estuaire à courant.
($$Valras-Plage — embouchure de l'Orb$$, 'embouchure-de-l-orb-valras', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.29662, 43.24682), 4326)::geography, -- ⚠️ à recaler satellite (OSM jetée/embouchure Orb)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie'], 'estuaire', 2,
 $$À Valras-Plage, l'embouchure de l'Orb fait communiquer le fleuve avec la mer : un débouché à courant où le loup vient chasser et où la dorade royale fouille le sable. Tu pêches à la flottante et au leurre dans la veine du grau, surtout quand l'eau sort et concentre les proies, et au surfcasting sur la plage voisine. Le coup du soir et la nuit, sur eau brassée, sortent les meilleurs poissons.$$,
 $$Poste sur les jetées de l'embouchure et le long de la plage, accès depuis Valras-Plage. ⚠️ Courants forts dans le grau quand l'eau passe : garde tes appuis, prudence sur les enrochements glissants, respecte le chenal de navigation.$$,
 array['vagues','courants_forts'], 'public', false),

-- #12 Digues du grau de Marseillan-Plage — estuaire étang/mer.
($$Marseillan-Plage — digues du grau$$, 'digues-du-grau-marseillan', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.539, 43.314), 4326)::geography, -- ⚠️ à recaler satellite (débouché du grau en mer)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar'], 'estuaire', 2,
 $$À Marseillan-Plage, les digues du grau relient l'étang de Thau à la mer : un débouché à courant prisé pour le loup et la dorade royale. Tu pêches à la flottante et au leurre dans la veine quand l'eau passe, et au surfcasting sur la longue plage pour la dorade en été. Vise les changements d'eau et le coup du soir.$$,
 $$Accès depuis Marseillan-Plage, postes sur les digues du grau et la plage. ⚠️ Courants forts dans le grau et enrochements glissants : prudence, et respecte l'activité du chenal.$$,
 array['rochers_glissants','courants_forts','vagues'], 'public', false),

-- #13 Embouchure du Libron / Vias-Plage — estuaire sauvage.
($$Vias-Plage — embouchure du Libron$$, 'embouchure-du-libron-vias', '34', 'occitanie',
 ST_SetSRID(ST_MakePoint(3.42, 43.292), 4326)::geography, -- ⚠️ à recaler satellite (embouchure du Libron)
 array['surfcasting','leurres'], array['bar','dorade_royale','sar','orphie'], 'estuaire', 2,
 $$À Vias, l'embouchure du Libron débouche sur une plage encore sauvage bordée de dunes : un secteur à loup et à dorade royale où le petit fleuve concentre les proies. Tu pêches au surfcasting sur le sable et au leurre dans la veine du grau, surtout quand l'eau sort. La nuit et le coup du soir, sur eau brassée, c'est le meilleur moment.$$,
 $$Accès depuis Vias-Plage vers le secteur naturel des dunes du Libron. ⚠️ Courants à l'embouchure et secteur isolé : garde tes appuis, préviens quelqu'un, et respecte la zone naturelle protégée (dunes).$$,
 array['courants_forts','isolation'], 'public', false),

-- =========================== GARD (30) — Petite Camargue ===========================

-- #14 Plage Sud de Port-Camargue — surfcasting de bord de dune.
($$Le Grau-du-Roi — plage Sud de Port-Camargue$$, 'plage-sud-port-camargue', '30', 'occitanie',
 ST_SetSRID(ST_MakePoint(4.12227, 43.51073), 4326)::geography, -- ⚠️ à recaler satellite (OSM plage Sud)
 array['surfcasting','leurres'], array['bar','dorade_royale','sar','orphie'], 'plage', 2,
 $$La plage Sud de Port-Camargue, au Grau-du-Roi, déroule du sable au pied des dunes Natura 2000 : un terrain de surfcasting tranquille pour le loup et la dorade royale. Tu lances dans les fosses pour le loup au coup du soir, tu cherches la dorade au crabe ou au ver sur le sable en été. Le sar tient près des enrochements voisins. Eau brassée et tombée du jour = le bon combo.$$,
 $$Accès depuis Port-Camargue (Le Grau-du-Roi), parking puis estran. ⚠️ Dunes protégées (Natura 2000) : pêche sur l'estran, ne dégrade pas la dune. Courants et vagues le long du bord ; prudence de nuit.$$,
 array['vagues','courants_forts'], 'public', false),

-- #15 Épis rocheux du Boucanet — enrochements de protection.
($$Le Grau-du-Roi — épis du Boucanet$$, 'epis-du-boucanet', '30', 'occitanie',
 ST_SetSRID(ST_MakePoint(4.11985, 43.5468), 4326)::geography, -- ⚠️ à recaler satellite (OSM épis du Boucanet)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie'], 'digue', 2,
 $$Sur la plage du Boucanet, les épis rocheux qui protègent le trait de côte créent du relief sur le sable : autant de petits postes à sar, dorade royale et loup. Tu pêches à la flottante le long des enrochements, au leurre pour le loup au coup du soir, et au surfcasting entre les épis pour la dorade en été. La structure tient le poisson là où la plage en manque.$$,
 $$Accès depuis la plage du Boucanet (Le Grau-du-Roi). ⚠️ Enrochements glissants : chaussures qui accrochent, prudence à la marche sur les blocs. Vagues par mer formée. Pêche hors zones de baignade surveillée en saison.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #16 Plage Rive Gauche / Le Grau-du-Roi — plage urbaine.
($$Le Grau-du-Roi — plage Rive Gauche$$, 'plage-rive-gauche-grau-du-roi', '30', 'occitanie',
 ST_SetSRID(ST_MakePoint(4.13977, 43.52754), 4326)::geography, -- ⚠️ à recaler satellite (OSM plage Rive Gauche)
 array['surfcasting','leurres'], array['bar','dorade_royale','orphie','maquereau'], 'plage', 1,
 $$La plage Rive Gauche du Grau-du-Roi est une grande plage de sable urbaine et accessible, parfaite pour le surfcasting du soir. Tu cherches le loup au lancer dans les fosses à la tombée du jour, la dorade royale sur le sable en été, et l'orphie comme le maquereau passent en surface à la belle saison. Repère tes fosses par mer calme.$$,
 $$Accès direct depuis le front de mer du Grau-du-Roi, stationnement à proximité. Poste accessible ; pêche hors zones de baignade surveillée en saison, prudence habituelle de nuit et par mer formée.$$,
 array['vagues','courants_forts'], 'public', false),

-- #17 Plage de l'Espiguette (section ouest) — plage sauvage de Camargue.
($$Pointe de l'Espiguette — section ouest$$, 'espiguette-section-ouest', '30', 'occitanie',
 ST_SetSRID(ST_MakePoint(4.12714, 43.49937), 4326)::geography, -- ⚠️ à recaler satellite (OSM section ouest Espiguette)
 array['surfcasting','leurres'], array['bar','dorade_royale','sar','orphie','maquereau'], 'plage', 2,
 $$La section ouest de l'immense plage de l'Espiguette, au pied du phare, prolonge ce terrain de surfcasting mythique de Camargue : des kilomètres de sable, des bancs mouvants et des fosses où le loup patrouille. Tu lances lourd dans les baïnes et les bordures de bancs, tu cherches la dorade royale et le sar sur le sable en été. La nuit et le coup du soir, par eau brassée, c'est le moment des beaux poissons.$$,
 $$Accès depuis Le Grau-du-Roi vers le phare de l'Espiguette (parking payant en saison), puis marche sur le sable. ⚠️ Grand Site / Natura 2000 : dunes fermées, pêche sur l'estran uniquement. Courants et bancs mouvants : repère tes fosses de jour, méfie-toi des passages d'eau et de l'isolement du secteur.$$,
 array['vagues','courants_forts','isolation'], 'public', false),

-- ====================== BOUCHES-DU-RHÔNE (13) — Marseille / Côte Bleue ======================

-- #18 Môle de la Pointe Rouge / Marseille — digue urbaine.
($$Marseille — môle de la Pointe Rouge$$, 'mole-de-la-pointe-rouge', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.365, 43.243), 4326)::geography, -- ⚠️ à recaler satellite (digue du large du port de la Pointe Rouge)
 array['flottante','leurres'], array['dorade_royale','sar','bar','orphie'], 'digue', 2,
 $$Au sud de Marseille, le môle du port de la Pointe Rouge avance dans la rade : un poste de digue facile et urbain, hors du Parc des Calanques, prisé pour le sar et la dorade royale. Tu pêches à la flottante le long du parement, au leurre pour le loup à l'entrée du port au coup du soir. L'orphie passe en surface l'été. Aube et crépuscule en priorité.$$,
 $$Accès à pied depuis le port de la Pointe Rouge (Marseille 8e). ⚠️ Sur les môles portuaires, la pêche peut être encadrée par arrêté : vérifie la signalétique et reste à l'écart des zones de manœuvre. Blocs glissants par mer formée.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #19 Port de Carro / Martigues — digues à la pointe de la Côte Bleue.
($$Carro — port et jetées$$, 'port-de-carro', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.0403, 43.3297), 4326)::geography, -- ⚠️ à recaler satellite (OSM jetées du port de Carro)
 array['flottante','leurres'], array['dorade_royale','sar','bar','orphie','maquereau'], 'digue', 2,
 $$Carro, petit port de pêche à la pointe ouest de la Côte Bleue, offre des jetées battues par le large et des criques rocheuses tout autour : un poste varié pour le sar, la dorade royale et le loup. Tu pêches à la flottante le long des digues et des roches, au leurre pour le loup dans les remous. Le relief de la Côte Bleue tient bien le poisson, surtout à l'aube.$$,
 $$Accès depuis Carro (Martigues), postes sur les jetées et les roches voisines. ⚠️ Vérifie la réglementation du Parc Marin de la Côte Bleue : il comprend des zones de cantonnement où toute pêche est interdite, renseigne-toi sur le zonage local. Rochers glissants et coups de mer.$$,
 array['rochers_glissants','vagues','courants_forts'], 'public', false),

-- #20 Port de Sausset-les-Pins — digues de la Côte Bleue.
($$Sausset-les-Pins — digues du port$$, 'digues-de-sausset-les-pins', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.1075, 43.3302), 4326)::geography, -- ⚠️ à recaler satellite (digues du port de Sausset)
 array['flottante','leurres'], array['dorade_royale','sar','bar','orphie','maquereau'], 'digue', 1,
 $$Sausset-les-Pins, station de la Côte Bleue, abrite un port aux digues accessibles bordées de criques rocheuses : un poste plutôt facile pour le sar, la dorade royale et le loup. Tu pêches à la flottante le long des enrochements et au leurre pour le loup au coup du soir. Maquereau et orphie passent en surface l'été. Aube et crépuscule sont les meilleurs créneaux.$$,
 $$Accès à pied depuis Sausset-les-Pins, sur les digues du port. ⚠️ Parc Marin de la Côte Bleue : vérifie le zonage (zones de cantonnement no-take à proximité). Sur les digues, arrêté portuaire possible : signalétique sur place. Rochers glissants.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #21 Calanque de Niolon / Le Rove — pointe rocheuse de la Côte Bleue.
($$Niolon — calanque et roches$$, 'calanque-de-niolon', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.256, 43.3385), 4326)::geography, -- ⚠️ à recaler satellite (OSM port de Niolon)
 array['leurres','flottante'], array['bar','sar','dorade_royale','orphie'], 'pointe_rocheuse', 3,
 $$Niolon, petite calanque du Rove sur la Côte Bleue, plonge ses rochers blancs dans une eau translucide : un poste de roche pour le loup, le sar et la dorade royale. Tu pêches au leurre le long des pointes et des tombants, à la flottante pour le sar dans les failles et les herbiers. C'est une pêche de roche exigeante et magnifique, à l'aube et au crépuscule.$$,
 $$Accès à Niolon (Le Rove) limité en voiture : le train de la Côte Bleue dessert la calanque. ⚠️ Parc Marin de la Côte Bleue : vérifie le zonage. Rochers glissants, sections de falaise et secteur isolé : prudence à la descente et garde une marge avec l'eau.$$,
 array['rochers_glissants','falaise','isolation'], 'public', false),

-- #22 Plage du Cavaou / Fos-sur-Mer — surfcasting du golfe.
($$Fos-sur-Mer — plage du Cavaou$$, 'plage-du-cavaou', '13', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(4.92477, 43.4324), 4326)::geography, -- ⚠️ à recaler satellite (OSM plage du Cavaou)
 array['surfcasting','leurres'], array['bar','dorade_royale','sar','maquereau','orphie'], 'plage', 2,
 $$La plage du Cavaou, à Fos-sur-Mer au fond du golfe de Fos, est une grande plage de sable où le loup vient chasser dans les fosses : un terrain de surfcasting honnête, hors parc. Tu lances dans les bordures de bancs pour le loup au coup du soir, tu cherches la dorade royale sur le sable en été. Maquereau et orphie passent en surface à la belle saison.$$,
 $$Accès depuis Fos-sur-Mer (plage du Cavaou), parking puis estran ; plage surveillée l'été. ⚠️ Pêche hors zones de baignade surveillée en saison. Courants et vagues le long du bord ; prudence habituelle de nuit.$$,
 array['vagues','courants_forts'], 'public', false),

-- ====================== VAR (83) — de Bandol à Saint-Tropez ======================

-- #23 Môle Jean Réveille / Saint-Tropez — digue emblématique.
($$Saint-Tropez — môle Jean Réveille$$, 'mole-jean-reveille-saint-tropez', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.63579, 43.27321), 4326)::geography, -- ⚠️ à recaler satellite (OSM môle Jean Réveille)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 2,
 $$Le môle Jean Réveille, la grande jetée qui ferme le vieux port de Saint-Tropez, est un poste emblématique avec du fond et du passage de poisson. Tu pêches à la flottante pour le sar et la dorade royale le long du parement, au leurre pour le loup à l'entrée du port au coup du soir, et le maquereau comme l'orphie passent en surface l'été. Aube et crépuscule en priorité.$$,
 $$Accès à pied depuis le vieux port de Saint-Tropez, sur le môle Jean Réveille. ⚠️ Arrêtés municipaux ponctuels (manifestations, chantiers) : vérifie la signalétique. Prudence sur les blocs glissants par coup de mer et à l'écart des manœuvres.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #24 Digue du port de Bandol — digue familiale.
($$Bandol — digue du port$$, 'digue-du-port-de-bandol', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.75474, 43.13361), 4326)::geography, -- ⚠️ à recaler satellite (digue extérieure du port)
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 1,
 $$Bandol, joli port varois abrité, offre une digue extérieure accessible pour la flottante en famille. Tu pêches le sar, la dorade royale et l'orphie le long des enrochements, et tu tentes le loup au leurre à l'entrée du port au coup du soir. Maquereau et orphie passent en surface à la belle saison. Poste facile et tranquille.$$,
 $$Accès à pied depuis le port de Bandol, sur la digue extérieure. ⚠️ Pêche interdite dans l'enceinte du port et hors zones de baignade ; vérifie la signalétique. Prudence habituelle sur les blocs.$$,
 array['rochers_glissants'], 'public', false),

-- #25 Presqu'île du Gaou / Le Brusc — pointe rocheuse Natura 2000.
($$Le Brusc — presqu'île du Gaou$$, 'presqu-ile-du-gaou', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(5.793, 43.07), 4326)::geography, -- ⚠️ à recaler satellite (OSM île du Gaou)
 array['leurres','flottante'], array['bar','sar','dorade_royale','orphie','maquereau'], 'pointe_rocheuse', 3,
 $$La presqu'île du Gaou, au Brusc (Six-Fours), est un site naturel rocheux relié par une passerelle, face à l'archipel des Embiez : un poste de roche pour le loup, le sar et la dorade royale. Tu pêches au leurre le long des pointes et des tombants, à la flottante pour le sar dans les failles et les herbiers de posidonie. L'eau claire demande de la discrétion ; aube et crépuscule en tête.$$,
 $$Accès à pied par la passerelle de l'île du Gaou (Le Brusc, Six-Fours-les-Plages). ⚠️ Site naturel protégé (Natura 2000, herbiers de posidonie) : respecte les sentiers et le milieu. Rochers glissants, coups de mer et secteur exposé : prudence sur les platiers.$$,
 array['rochers_glissants','vagues','isolation'], 'public', false),

-- #26 Digue du port du Lavandou — digue.
($$Le Lavandou — digue du port$$, 'digue-du-port-du-lavandou', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.37513, 43.13663), 4326)::geography, -- ⚠️ à recaler satellite (digue extérieure du port)
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 1,
 $$Le Lavandou, port familial face aux îles d'Hyères, offre une digue extérieure accessible pour la pêche du bord. Tu pêches à la flottante le sar, la dorade royale et l'orphie le long des enrochements, et tu tentes le loup au leurre à l'entrée du port au coup du soir. Maquereau l'été en surface. Poste facile, idéal pour débuter.$$,
 $$Accès à pied depuis le port du Lavandou, sur la digue extérieure. ⚠️ Pêche hors zones de baignade et hors enceinte du port ; vérifie la signalétique. Prudence sur les blocs glissants.$$,
 array['rochers_glissants'], 'public', false),

-- #27 Digue du port de Cavalaire-sur-Mer — digue.
($$Cavalaire-sur-Mer — digue du port$$, 'digue-de-cavalaire', '83', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.53844, 43.17212), 4326)::geography, -- ⚠️ à recaler satellite (digue extérieure du port)
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 1,
 $$Cavalaire-sur-Mer, au fond de sa grande baie, abrite un port aux digues accessibles bordé d'une longue plage : un poste mixte pour le loup, la dorade royale et le sar. Tu pêches à la flottante le long des enrochements, au surfcasting sur la plage pour la dorade en été, et au leurre pour le loup à l'entrée du port au coup du soir. Maquereau et orphie en surface à la belle saison.$$,
 $$Accès à pied depuis le port de Cavalaire-sur-Mer, sur la digue extérieure. ⚠️ Pêche hors zones de baignade et hors enceinte du port ; vérifie la signalétique. Prudence sur les blocs.$$,
 array['rochers_glissants'], 'public', false),

-- ====================== ALPES-MARITIMES (06) — Côte d'Azur ======================

-- #28 Jetée du large (phare) du port Lympia / Nice — digue.
($$Nice — jetée du large du port Lympia$$, 'jetee-du-large-nice', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(7.28833, 43.69056), 4326)::geography, -- ⚠️ à recaler satellite (OSM jetée du large / phare)
 array['flottante','leurres','vif'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 2,
 $$La jetée du large du port Lympia, sous son phare, ferme le vieux port de Nice : un poste de digue avec du fond, classique de la pêche du bord niçoise. Tu pêches à la flottante pour le sar et la dorade royale le long du parement, au leurre et au vif pour le loup à l'entrée du port au coup du soir. Maquereau et orphie passent en surface l'été. Aube et crépuscule en priorité.$$,
 $$Accès à pied depuis le port Lympia (Nice), hors enceinte du port, sur la jetée du large. ⚠️ Pêche interdite pendant les heures de surveillance baignade et dans l'enceinte portuaire : vérifie la signalétique. Prudence sur les blocs glissants par coup de mer.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #29 Digue extérieure du Port Vauban / Antibes — digue.
($$Antibes — digue du Port Vauban$$, 'digue-du-port-vauban', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(7.12867, 43.58679), 4326)::geography, -- ⚠️ à recaler satellite (digue extérieure côté mer)
 array['flottante','leurres'], array['bar','dorade_royale','sar','orphie','maquereau'], 'digue', 2,
 $$Le Port Vauban d'Antibes, l'un des plus grands ports de plaisance de Méditerranée, offre une digue extérieure côté mer où l'on pêche le sar, la dorade royale et le loup. Tu pêches à la flottante le long de l'enrochement, au leurre pour le loup au coup du soir. Maquereau et orphie en surface l'été. La vieille ville et le fort Carré complètent le décor.$$,
 $$Accès à pied côté extérieur de la digue du Port Vauban (Antibes). ⚠️ Pêche interdite dans l'enceinte du port (pontons, anneaux) : reste sur l'enrochement extérieur et vérifie la signalétique. Prudence sur les blocs par mer formée.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #30 Pointe de l'Aiguille / Théoule-sur-Mer — pointe rocheuse de l'Estérel.
($$Théoule-sur-Mer — pointe de l'Aiguille$$, 'pointe-de-l-aiguille-theoule', '06', 'provence-alpes-cote-d-azur',
 ST_SetSRID(ST_MakePoint(6.95363, 43.50646), 4326)::geography, -- ⚠️ à recaler satellite (OSM pointe de l'Aiguille)
 array['leurres','flottante'], array['bar','dorade_royale','sar','orphie','maquereau'], 'pointe_rocheuse', 3,
 $$La pointe de l'Aiguille, à Théoule-sur-Mer, dresse les roches rouges de l'Estérel dans un parc départemental préservé : un poste de roche pour le loup, le sar et la dorade royale. Tu pêches au leurre le long des pointes et des tombants, à la flottante pour le sar dans les failles. L'eau claire et profonde au pied des roches tient de beaux poissons ; aube et crépuscule en priorité.$$,
 $$Accès par le parc départemental de la pointe de l'Aiguille (Théoule-sur-Mer), sentiers vers les roches. La pêche à la ligne est autorisée (chasse sous-marine restreinte). ⚠️ Rochers glissants, sections de falaise et secteur exposé : prudence à la descente, garde une marge avec l'eau et méfie-toi de la houle d'est.$$,
 array['rochers_glissants','falaise','isolation'], 'public', false);

-- =====================================================================
-- Après validation + insertion : vérifier sur /carte que les 30 pins tombent
-- au bon endroit (cap rocheux / môle / grau / plage), recaler chaque coord au
-- satellite, puis passer verified=true spot par spot. geom_public (flou ~500-900 m)
-- est rempli par le trigger blur_spot_geom. Bilan attendu : 158 → 188 spots.
-- =====================================================================
