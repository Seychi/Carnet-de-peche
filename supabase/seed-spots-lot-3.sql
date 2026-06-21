-- =====================================================================
-- Carnet de Pêche — LOT 3 de curation (Atlantique sud-ouest, 21 spots)
-- Charente-Maritime (17) + Gironde (33) + Landes (40) + Pays basque (64)
-- region 'nouvelle-aquitaine'
-- =====================================================================
-- ⚠️ NON INSÉRÉ — à valider par John. Le fix GPS (sprint 11.6, 028/029) est
--    en place (flou centroïde 510-899 m, geom non lisible par anon), donc
--    l'insertion est SÛRE dès ton OK.
--
-- Pipeline 2026-06-21 : 24 candidats → vérif réel/public/département + satellite
--    Esri + rédaction FR (docs/sprint-10/lot-3-verification.md).
-- Résultat : 21 retenus ici. 3 ÉCARTÉS (à trancher, NON inclus) :
--   • jetee-de-belisaire (33) — REJETÉ : pêche interdite (embarcadère navettes Cap Ferret).
--   • pointe-sainte-anne / Corniche basque (64) — TENU : accès estran interdit par
--     arrêtés municipaux + sentier littoral fermé depuis 2021 (à décider).
--   • digue-du-bourret (40) — TENU : ~60 m de l'estacade de Capbreton (quasi-doublon ;
--     à recoordonner sur la vraie digue nord ou à dropper).
--
-- Espèces : les vraies espèces des spots sont CONSERVÉES (sole, mulet, congre,
--   maigre… ajoutées à lib/labels.ts SPECIES_LABELS pour l'affichage ; le carnet/
--   onboarding restent sur les 6 cœur). Aucun lieu_jaune (rare au sud de la Loire).
--   Techniques → {leurres,surfcasting,flottante,vif} (rockfishing/lancer/posé/flotteur normalisés).
-- verified=false ; geom_public généré par le trigger ; visibility='public'.
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ========================= CHARENTE-MARITIME (17) =========================

-- #1 Phare de Chassiron (Saint-Denis-d'Oléron) — [satellite ✓ poste] — écluses à poissons (pêche interdite < 50 m)
($$Phare de Chassiron$$, 'phare-de-chassiron', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.408, 46.049), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar','maquereau'], 'pointe_rocheuse', 4,
 $$La pointe nord de l'île d'Oléron, sous le phare rayé de Chassiron : un grand platier rocheux qui s'avance dans le Pertuis d'Antioche, balayé par des courants puissants. C'est LE coin à bar du secteur, au leurre dur ou souple sur la roche découverte, et au buldo quand ça décroche au large. Le bar donne surtout en marée descendante et au coup du jour ; le sar chasse dans les cuvettes du platier et le maquereau passe en banc l'été quand l'eau monte. Avec du fond de surfcasting tu touches aussi le bar dans les vagues sur les bordures sableuses.$$,
 $$Parking au pied du phare de Chassiron (payant en saison), puis descente à pied vers l'estran par les sentiers — compte 5-10 min jusqu'à la roche. Les meilleurs postes sont sur les avancées rocheuses au nord-est de la pointe, à pêcher de mi-marée descendante à basse mer. Prudence absolue : la barre rocheuse fait lever des déferlantes très vite par mer formée (accidents graves quasi chaque année), les rochers sont glissants couverts d'algues, et la marée montante isole vite — surveille l'horaire et ne pêche pas dos à la houle. Interdiction de pêcher à moins de 50 m des écluses à poissons et de déplacer leurs pierres.$$,
 array['courants_forts','ressac','rochers_glissants','vagues','submersion_maree','isolation'], 'public', false),

-- #2 Pointe de la Fumée (Fouras) — [satellite ✓ poste] — embouchure Charente, concessions ostréicoles
($$Pointe de la Fumée$$, 'pointe-de-la-fumee', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.122, 46.0018), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau','sole'], 'pointe_rocheuse', 3,
 $$Longue pointe sablo-rocheuse qui ferme l'embouchure de la Charente, face à l'île d'Aix et au Fort Énet. L'extrémité découvre un estran de roche et d'algues léché par le courant du chenal : c'est LE poste à bar du coin, au leurre ou au buldo sur les coefficients moyens à forts, à la bascule de marée. À la descendante, surfcasting au ver pour la dorade royale qui suit le courant de l'estuaire ; le maquereau passe en chasse l'été. Pêche au tout début de montante puis lève le camp avant que ça se couvre.$$,
 $$Accès libre à pied depuis l'extrémité de la pointe (route de la Fumée, parking payant près de l'embarcadère de l'île d'Aix). Le meilleur poste est la roche découvrante au sud-ouest de la pointe, face au chenal. Reste sur l'estran rocheux : ne marche pas sur les parcs à huîtres (concessions privées) qui bordent la zone. Surveille la marée montante en permanence — la pointe est basse et l'estran se recouvre vite, on peut se faire piéger ; ne traîne pas vers Fort Énet à pied.$$,
 array['courants_forts','submersion_maree','rochers_glissants'], 'public', false),

-- #3 Estacade de Châtelaillon-Plage — [satellite ✓, confiance moyenne] — zones baignade été + bouchots (<50 m)
($$Estacade de Châtelaillon-Plage$$, 'estacade-de-chatelaillon', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.0945, 46.072), 4326)::geography,
 array['flottante','surfcasting'], array['bar','dorade_royale','maquereau','orphie','mulet'], 'digue', 2,
 $$L'estacade de Châtelaillon, c'est la jetée du front de mer qui s'avance sur l'estran sableux au centre de la station, en contrebas du casino. Tu pêches depuis la structure ou sur le sable autour : au surfcasting sur le coup de marée montante pour le bar et la dorade royale (la baie de Châtelaillon est un bon coin à dorade en été), à la flottante ou au flotteur coulissant pour l'orphie quand l'eau remonte le long des pieux. Les maquereaux et les orphies passent par bancs de mai à septembre ; le bar mord bien à la tombée du jour et de nuit, l'estacade restant éclairée. Joue les marées de coefficient moyen à fort : ici l'estran se découvre sur 200 à 300 m aux grandes marées.$$,
 $$Accès à pied direct depuis la promenade du front de mer, centre-ville de Châtelaillon (parkings le long de l'avenue de la falaise et près du casino, gratuits hors saison). Le meilleur poste est l'extrémité de la jetée à mi-marée montante, ou le sable juste au sud de la structure. Attention : en été, respecte les zones de baignade balisées par bouées jaunes (amende 135 €) et reste à l'écart des bouchots à coquillages au sud (interdiction de pêche à moins de 50 m des concessions). Aux grandes marées (coef > 100, marnage 5 m+) la mer remonte vite sur l'estran plat — surveille le retour d'eau pour ne pas te faire piéger. Sol vaseux et pieux glissants : chaussures qui accrochent recommandées.$$,
 array['submersion_maree','rochers_glissants','vagues'], 'public', false),

-- #4 Phare des Baleines (Saint-Clément-des-Baleines, Île de Ré) — [satellite ✓ zone] — estran rocheux étendu
($$Phare des Baleines$$, 'phare-des-baleines', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.5613, 46.2457), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar','dorade_royale','mulet','congre'], 'pointe_rocheuse', 4,
 $$La pointe ouest de l'île de Ré, sous le grand phare : un immense estran rocheux truffé de vieilles écluses à poissons qui se découvre à marée basse. Au leurre, tu cherches le bar le long des cassures et des trous de roche, surtout sur les deux heures qui précèdent la basse mer et au début du flot. Au surfcasting depuis les plateaux, ça donne du sar et de la dorade royale (à partir de juillet). Repère couru de l'île de Ré.$$,
 $$Suis la D735 jusqu'à son extrémité nord après Saint-Clément-des-Baleines : grand parking gratuit à la pointe. Le site du phare est une attraction payante, mais l'estran et la côte restent libres d'accès à pied. Meilleurs postes : le bord du plateau rocheux au nord-ouest du phare, là où la roche plonge vers le chenal. Prudence absolue : la marée remonte vite et peut t'encercler sur l'estran (vérifie l'horaire de basse mer, démarre 2 h avant, rentre dès l'étale) ; rochers très glissants ; par houle d'ouest, même petite, les hauts-fonds créent des déferlantes qui cassent sur les roches. Ne pêche pas seul, en cas de problème appelle le 196.$$,
 array['submersion_maree','courants_forts','rochers_glissants','vagues','ressac'], 'public', false),

-- #5 La Cotinière (Saint-Pierre-d'Oléron) — [satellite ✓ poste] — port de pêche actif
($$La Cotinière$$, 'la-cotiniere', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.3289, 45.9105), 4326)::geography,
 array['leurres','flottante'], array['bar','maquereau','dorade_royale'], 'digue', 2,
 $$La digue d'enrochements qui protège l'entrée du port de la Cotinière, sur la côte ouest d'Oléron (1er port de pêche de Charente-Maritime). Tu pêches le long du bras de cailloux : le bar aux leurres (surface ou souples) se prend surtout au début de la montante, à la nuit tombante ou tôt le matin, sur des petits coefs. En été, maquereau qui chasse à l'entrée du chenal et dorade royale au posé à la flottante (crabe vert, ver) sur le ressac qui brasse le long des roches. Le mouvement d'eau à l'entrée du port concentre le poisson sur la montée.$$,
 $$Accès à pied depuis le port de la Cotinière : grand parking gratuit derrière la criée et le front de mer, puis tu rejoins la digue à pied. Le meilleur poste est le long du bras d'enrochements, côté chenal d'entrée. Les blocs sont glissants à marée basse et avec l'humidité — chaussures qui accrochent, et reste prudent par mer formée : le ressac monte sur les cailloux les jours de houle d'ouest. Port de pêche actif : laisse le passage aux bateaux et ne gêne pas la criée.$$,
 array['rochers_glissants','ressac','vagues'], 'public', false),

-- #6 Pointe de la Coubre (La Tremblade) — [satellite ✓ zone] — Côte Sauvage, baïnes mortelles
($$Pointe de la Coubre$$, 'pointe-de-la-coubre', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2375, 45.6967), 4326)::geography,
 array['surfcasting'], array['bar','dorade_royale','sole'], 'plage', 4,
 $$Grande plage océane sauvage qui court sous le phare de la Coubre, sur la Côte Sauvage de la presqu'île d'Arvert. Un terrain de surfcasting classique du 17 : la plage est creusée de baïnes et de bancs de sable bien visibles, et c'est exactement là-dessus qu'il faut jouer — tu lances derrière le banc à marée basse, et tu pêches sur les deux premières heures de montante quand l'eau rentre dans les fosses. Le bar tape fort dès que le ressac travaille, la dorade royale s'invite de fin mai à novembre sur ver et crabe. Les gros coefficients (>80) accélèrent la vidange des baïnes : ça pêche, mais ça devient technique et dangereux.$$,
 $$Parking gratuit sous les pins au pied du phare de la Coubre (D25), puis ~15 min de marche par le sentier qui traverse la dune jusqu'à la plage. Pêche autorisée du Galon d'Or jusqu'au phare. Le meilleur poste : la plage face à l'océan, en se calant à hauteur d'un banc de sable repéré à basse mer. Prudence absolue — courant latéral très puissant, baïnes (courants de retour vers le large) qui peuvent emporter même un bon nageur, ressac et submersion rapide sur la montante. Plage isolée, longue à rejoindre, secours difficiles : ne pêche jamais les pieds dans l'eau sur gros coef, surveille la marée montante derrière toi, et évite seul de nuit.$$,
 array['baines','courants_forts','ressac','submersion_maree','isolation','vagues'], 'public', false),

-- #7 Pointe du Chay (Angoulins) — [satellite ✓ poste] (nom candidat « Pointe du Rocher » corrigé) — écluses/bouchots
($$Pointe du Chay (Angoulins)$$, 'pointe-du-chay', '17', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.1425, 46.1085), 4326)::geography,
 array['leurres','flottante'], array['bar','dorade_royale','sar','maquereau'], 'pointe_rocheuse', 3,
 $$Promontoire calcaire qui s'avance dans le Pertuis d'Antioche, ceinturé d'un estran rocheux étendu : un des spots de bord les plus connus du secteur rochelais pour le bar au leurre. Ça pêche au mieux sur le début de montante et les premières heures de descendante, quand le courant lèche les têtes de roche du bout de la pointe et concentre les proies. Bar et sar tiennent sur la roche, la dorade royale rôde l'été sur les zones mêlant cailloux, sable et coquillages, et le maquereau passe au large du bout quand l'eau se réchauffe.$$,
 $$Accès libre et facile : parking à la Pointe du Chay (rue du Chay, côté plage de la Platère / club nautique), puis sentier littoral jusqu'au bout de la pointe. Le meilleur poste est la frange rocheuse exposée à l'ouest, en marchant sur l'estran à marée descendante. Attention : le marnage est fort dans les Pertuis et l'estran très étendu — surveille la pendule de marée pour ne pas te faire piéger par la montante, les dalles sont glissantes (algues), méfie-toi du ressac par vent d'ouest. Respecte la distance réglementaire (25-50 m) avec les écluses à poissons, carrelets et bouchots du secteur.$$,
 array['rochers_glissants','ressac','submersion_maree','isolation'], 'public', false),

-- ========================= GIRONDE (33) =========================

-- #8 Pointe de Grave (Le Verdon-sur-Mer) — [satellite ✓ zone] — embouchure Gironde, baïnes + courants
($$Pointe de Grave$$, 'pointe-de-grave', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.0645, 45.5722), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau','maigre'], 'plage', 4,
 $$À l'extrême pointe nord du Médoc, là où la Gironde se jette dans l'Atlantique, c'est une des plages reines du surfcasting girondin. Le grand banc de sable du bout de la pointe pêche fort sur le courant de l'embouchure : tu poses tes lignes à la tombée de la nuit pour le bar, et la dorade royale rapplique l'été en marée montante. Le maquereau passe en bancs sur la plage aux beaux jours, et c'est aussi un beau secteur aux leurres pour chercher le bar qui chasse dans les remous de la passe.$$,
 $$Accès à pied depuis le parking de la Pointe de Grave (près du phare/sémaphore et de Port-Médoc), 5-10 min à travers la dune. Site du Conservatoire du littoral : reste sur les cheminements balisés, pas de véhicule sur la dune. Le meilleur poste est sur le sable du bout de la pointe face au courant de l'embouchure ; pour le surfcasting, décale-toi de 300-400 m du port pour éviter le monde. Le jusant tombe à pic au crépuscule et la nuit. Respecte les tailles et quotas en vigueur dans l'estuaire de la Gironde.$$,
 array['baines','courants_forts','submersion_maree','vagues','ressac'], 'public', false),

-- #9 Plage de Soulac-sur-Mer — [satellite ✓ zone] — plage océane Médoc, baïnes
($$Plage de Soulac-sur-Mer$$, 'plage-de-soulac', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.13028, 45.51707), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau','sar','sole'], 'plage', 3,
 $$Grande plage océane médocaine en plein sable, face à l'Atlantique, juste devant l'esplanade et le poste de secours de Soulac. C'est du surfcasting pur : tu cherches les baïnes (les cuvettes et chenaux qui se dessinent à marée basse) où le poisson chasse à la remontée du flot. Le bar donne bien sur la montante en début et fin de journée, la dorade royale et le sar tapent au crabe ou au ver dans les fosses l'été et début automne, le maquereau complète selon la saison. Repère tes baïnes à basse mer, pêche-les sur les deux premières heures de montante.$$,
 $$Accès direct à pied depuis l'esplanade du front de mer (boulevard du Front de Mer / boulevard Charcot), parkings gratuits nombreux en centre-ville et descentes aménagées. Le meilleur poste se cale en bordure des baïnes repérées à marée basse, à distance des zones de baignade surveillées en été. Prudence absolue : les baïnes génèrent des courants de retour violents, ne descends jamais dans une cuvette quand le flot remonte, surveille la montante qui peut te couper du haut de plage, et méfie-toi du ressac sur les bancs.$$,
 array['baines','courants_forts','ressac','vagues','submersion_maree'], 'public', false),

-- #10 Plage de la Salie Sud (La Teste-de-Buch) — [satellite ✓ zone] — NB : le wharf lui-même = émissaire INTERDIT ; on pêche la plage adjacente. Baïnes + zone interdite autour du rejet.
($$Plage de la Salie Sud$$, 'wharf-de-la-salie', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2563, 44.5137), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau','maigre'], 'plage', 4,
 $$Grande plage océane au pied du wharf de la Salie, au sud du bassin d'Arcachon. Le vrai poste, c'est la plage de la Salie Sud et ses baïnes : tu repères la cuvette qui se vide à marée descendante, tu poses ton appât dans la fosse et tu recules au fur et à mesure que la mer remonte. Ça donne le mieux au bar en surfcasting de la fin de printemps à l'automne, de la dorade royale sur fond ; le maquereau passe par bancs l'été. Bonne pêche aussi aux leurres au bord des baïnes au lever et au coucher du jour. À savoir : le wharf lui-même (l'estacade qui rejette les eaux traitées) est fermé par une grille et interdit au public — on ne pêche pas dessus.$$,
 $$Accès par le parking surveillé de la Salie Sud (payant l'été), depuis la D218 Pyla–Biscarrosse ou par la piste cyclable. Caillebotis puis sentier dans la dune jusqu'à la plage. Pêche-toi à l'écart du wharf : une zone autour de l'estacade est interdite à la baignade et à la pêche à pied à cause des baïnes et du rejet. Le meilleur poste se trouve sur une baïne franche, en partant à marée basse et en reculant à la montante. Ne te laisse jamais piéger sur un banc de sable quand l'eau remonte : les courants de retour des baïnes sont mortels ici. Plage non surveillée hors saison, isolée, prévois ton matos.$$,
 array['baines','courants_forts','submersion_maree','ressac','vagues','rejet_eaux_usees'], 'public', false),

-- #11 Plage du Truc Vert (Cap Ferret) — [satellite ✓ zone] — NB : pointe sud du Cap Ferret = pêche interdite ; le Truc Vert (nord) reste autorisé. Baïnes.
($$Plage du Truc Vert (Cap Ferret)$$, 'plage-du-cap-ferret', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.2535, 44.7156), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','sar'], 'plage', 3,
 $$Longue plage océane de sable du Cap Ferret (secteur du Truc Vert), exposée plein ouest sur l'Atlantique : du surfcasting de manuel, sur un cordon qui s'étire sur plus d'un kilomètre avec sa série de baïnes. Tu repères les baïnes et les cassures de pente à marée basse (couloirs d'eau plus sombre où le courant creuse) puis tu pêches au flot, surtout au montant, tôt le matin ou à la tombée du jour. Le bar chasse dans le ressac et les rouleaux dès que ça remue, la dorade royale prospecte les fonds de sable et les bordures de baïne à la belle saison (mai à octobre), et le sar tient les zones plus dures. Le bar se tente aussi au leurre souple dans la barre quand il est en chasse.$$,
 $$Accès facile depuis la route forestière du Truc Vert à Lège-Cap-Ferret : grand parking gratuit à moins de 300 m, puis franchissement de la dune par les accès en caillebotis (respecte les passages, dune protégée). Plage surveillée de mi-juin à mi-octobre — pêche hors zone et hors horaires de baignade en saison. Le meilleur poste, c'est le bas de plage sur le sable ferme et mouillé, en visant les baïnes repérées à marée basse. Prudence maximale : les baïnes du Cap Ferret sont de vrais courants de retour, dangereux et bien connus — ne pêche jamais les pieds dans l'eau au montant. NB : plus au sud, la pêche est interdite (sécurité/érosion) de l'extrémité de la Pointe du Cap Ferret jusqu'à Lavergne — le secteur du Truc Vert, lui, reste ouvert et autorisé.$$,
 array['baines','courants_forts','ressac','vagues','submersion_maree'], 'public', false),

-- #12 Plage de Montalivet (Vendays-Montalivet) — [satellite ✓ zone] — baïnes (Plage Nord non surveillée dangereuse)
($$Plage de Montalivet$$, 'plage-de-montalivet', '33', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.16068, 45.36423), 4326)::geography,
 array['surfcasting'], array['bar','dorade_royale','sar','maigre'], 'plage', 3,
 $$Grande plage océane du Médoc, la Plage Centrale de Montalivet aligne des kilomètres de sable battu par la houle atlantique — un terrain de surfcasting de référence. Tu lances par-dessus la barre pour poser tes lignes dans les fosses creusées par les baïnes : ce sont elles qui concentrent le poisson. Le bar est le poisson roi, surtout en montante et autour des étales, de nuit et au petit jour ; tu prends aussi du sar et de la dorade royale au posé sur ver et lançon. Les meilleurs créneaux : la montante et les deux heures après une grosse marée, mer un peu remuée mais pas démontée.$$,
 $$Accès direct par le boulevard du Front de Mer à Montalivet-les-Bains, parking gratuit en bordure de plage, puis quelques pas sur le sable. Le poste change avec les bancs et les baïnes : repère à marée basse les fosses et les courants de retour (eau plus sombre, vagues qui ne déferlent pas) — c'est là que tu lances, mais ne te baigne jamais dedans et ne te laisse pas piéger par le retour de l'eau. Plage centrale surveillée l'été ; la Plage Nord, non surveillée, a des courants réputés violents. Surveille la marée montante qui mange vite le haut de plage, et évite par grosse houle / submersion.$$,
 array['baines','courants_forts','ressac','submersion_maree','vagues'], 'public', false),

-- ========================= LANDES (40) =========================

-- #13 Estacade de Capbreton — [satellite ✓ poste] — jetée historique sur le gouf, passe du Boucarot
($$Estacade de Capbreton$$, 'estacade-de-capbreton', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.4467, 43.6557), 4326)::geography,
 array['surfcasting','leurres','flottante'], array['bar','dorade_royale','maquereau','sar','congre'], 'digue', 3,
 $$L'estacade de Capbreton, c'est LE poste du bord du coin : une jetée historique (1858, Napoléon III) qui s'avance sur l'océan jusqu'au phare, en bordure directe du gouf, le canyon sous-marin qui ramène le poisson tout près du bord. Tu y pêches le bar aux leurres ou au vif dans les remous de la passe, surtout en montante et autour de la marée, le maquereau en été quand les bancs passent, et la dorade royale au posé (crabe, ver) sur les fonds sableux côté plage. Au pied du phare à marée basse, le sar tient dans les enrochements.$$,
 $$Accès à pied direct depuis le centre de Capbreton et le front de mer : tu marches sur l'estacade jusqu'au poste choisi. Parkings le long du boulevard Front de Mer et près du port de plaisance, ça sature vite l'été — viens tôt. Le meilleur poste est la section extérieure vers le phare pour attaquer la passe et le gouf, mais c'est aussi le plus exposé. Prudence absolue : la jetée prend le ressac et les paquets de mer par houle d'ouest, le revêtement est glissant, et les courants dans la passe sont violents. Ne pas s'aventurer sur l'estacade par grosse mer ou coefficient fort — recule sur la partie abritée.$$,
 array['ressac','courants_forts','rochers_glissants','submersion_maree','vagues'], 'public', false),

-- #14 Plage d'Hossegor (Soorts-Hossegor) — [satellite ✓ poste] — plage océane, baïnes
($$Plage d'Hossegor$$, 'plage-d-hossegor', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.4449, 43.6626), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau'], 'plage', 3,
 $$Grande plage océane des Landes, plein ouest face à la houle atlantique. C'est du surfcasting pur : tu lis les baïnes (ces cuvettes et trous creusés entre les bancs de sable, bien visibles à marée basse) et tu poses tes plombs dans la fosse et sur ses bordures, là où le bar et la dorade royale viennent chasser. Ça donne surtout au montant et sur les deux premières heures de descendant, tôt le matin ou au crépuscule. Le bar mord au ver, au crabe et aux bouchées de poisson ; la dorade royale d'été se prend au ver et au crabe mou. Quelques maquereaux par bancs en plein été.$$,
 $$Accès à pied direct depuis la Place des Landais et le boulevard de la Dune, plusieurs parkings gratuits le long du front de mer. Tu descends sur le sable par les rampes. Le meilleur poste se lit à marée basse : repère la baïne (le chenal plus sombre/creusé) et installe-toi sur ses bords. ATTENTION : baïnes et courants de retour très dangereux ici, ne rentre jamais dans l'eau au-delà des cuisses, surveille la marée montante qui réduit vite la plage. En été (mi-juin à fin septembre) la zone de baignade est surveillée et fréquentée — pêche en dehors du créneau surveillé, à l'écart des baigneurs, ou hors saison.$$,
 array['baines','courants_forts','ressac','vagues','submersion_maree'], 'public', false),

-- #15 Embouchure du courant de Mimizan — [satellite ✓ poste] — digues du chenal + plage, baïnes
($$Embouchure du courant de Mimizan$$, 'plage-de-mimizan', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.29917, 44.21167), 4326)::geography,
 array['surfcasting','leurres','flottante'], array['bar','dorade_royale','mulet'], 'estuaire', 4,
 $$L'embouchure du courant de Mimizan, c'est LE poste de Mimizan-Plage : le fleuve côtier qui draine le lac d'Aureilhan se jette dans l'Atlantique entre deux digues. À marée basse et en début de montante, le gros bar se tient en embuscade en bout de digue, à la sortie du chenal, là où deux courants opposés se rencontrent et créent un remous. Tu attaques au surfcasting sur la plage attenante (plombs araignée 150 g mini à cause du ressac) ou au leurre dans la veine de courant du chenal. La dorade royale tape l'été sur les bordures de digue et le sable mêlé. Ça pêche fort à la tombée du jour et de nuit.$$,
 $$Accès facile depuis Mimizan-Plage : grands parkings côté plage sud et près du courant, tout est à pied. Le meilleur poste est le bout de la digue sud / la sortie du chenal pour le bar à basse mer, et la plage 100 m de part et d'autre du poste de secours pour le surfcasting. Prudence absolue : courants d'embouchure très forts (marée + débit du lac), baïnes typiques de la côte aquitaine sur la plage océane, ressac puissant. Les blocs et la digue sont glissants — ne descends pas sur les enrochements par mer formée.$$,
 array['baines','courants_forts','ressac','vagues','submersion_maree','rochers_glissants'], 'public', false),

-- #16 Courant d'Huchet (embouchure, Moliets-et-Maâ) — [satellite ✓ zone] — ⚠️ réserve naturelle : pêche INTERDITE dans le courant ; OK côté océan uniquement
($$Courant d'Huchet (embouchure)$$, 'courant-d-huchet', '40', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.3915, 43.8595), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'estuaire', 4,
 $$L'embouchure du courant d'Huchet, c'est LE spot du coin pour le bar et la dorade royale. Le courant se jette dans l'océan en creusant un chenal mobile dans le sable — cette zone de mélange eau douce/eau salée concentre le poisson, surtout en marée descendante quand le courant chasse vers le large. Au surfcasting de nuit tu vises le bar et la dorade dans la veine du chenal et le ressac ; au leurre tôt le matin et au coucher du soleil, tu prospectes les remous du chenal pour le bar actif.$$,
 $$Plage sauvage au nord de Moliets-plage, après la passe. Parking de Pichelèbe puis ~5 min à pied, ou par la plage surveillée du bourg en remontant vers le nord. ⚠️ RÉGLEMENTATION : la réserve naturelle nationale du courant d'Huchet interdit la pêche DANS le courant et l'étang en amont — tu pêches uniquement côté océan, sur la plage et dans le ressac à l'embouchure (domaine public maritime). Ne remonte pas dans le chenal. Meilleur poste : sur le banc de sable à la jonction chenal/surf, côté mer. Le chenal se déplace au fil des saisons, repère la veine du jour. Baïnes et baignade dangereuse à l'embouchure.$$,
 array['baines','courants_forts','submersion_maree','isolation'], 'public', false),

-- ========================= PYRÉNÉES-ATLANTIQUES / PAYS BASQUE (64) =========================

-- #17 Pointe Saint-Martin (Biarritz) — [satellite ✓, confiance moyenne] — postes au pied (plage de la Milady), pas la falaise
($$Pointe Saint-Martin$$, 'pointe-saint-martin', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.5556, 43.4906), 4326)::geography,
 array['leurres'], array['bar','sar'], 'pointe_rocheuse', 4,
 $$La Pointe Saint-Martin, coiffée du phare de Biarritz, marque la bascule entre les plages de sable des Landes et la côte rocheuse basque : un cap exposé plein gros temps d'ouest. Tu ne pêches pas du haut de la falaise (75 m, inaccessible) mais des plateaux rocheux à son pied, côté nord de la plage de la Milady, là où la roche plonge dans le ressac. Le bar au leurre (shad, jerk) se traque dans les remous et la mousse autour des cailloux, surtout en montante et au lever/coucher du jour ; le sar tient sur la roche et répond au petit leurre près du fond. Ça pêche d'avril à novembre, mieux par mer formée mais pas démontée.$$,
 $$Accès à pied par la promenade de la Milady (parking rue du Moulin de Chabiague, près du centre de thalasso, au sud de Biarritz). Tu descends sur la plage et tu rejoins les rochers à son extrémité nord, au pied de la pointe. Pêche ces cailloux à marée basse à mi-montante : surveille l'heure de pleine mer, le ressac et les séries de vagues qui recouvrent la roche très vite et peuvent te couper le retour. Rochers gras et glissants, semelles cloutées indispensables, ne tourne jamais le dos à l'eau. Poste exposé, à éviter par grosse houle ou tempête.$$,
 array['ressac','rochers_glissants','vagues','submersion_maree','courants_forts'], 'public', false),

-- #18 Rocher de la Vierge (Biarritz) — [satellite ✓ poste] — monument très fréquenté en journée
($$Rocher de la Vierge$$, 'rocher-de-la-vierge', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.56841, 43.4834), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar'], 'pointe_rocheuse', 4,
 $$Pointe rocheuse iconique de Biarritz : le Rocher de la Vierge et les plateaux de roche qui l'entourent, reliés à la terre par une passerelle. Tu pêches le bar aux leurres le long des cassures et dans la zone d'écume, surtout au petit jour et à la tombée de la nuit, quand la houle reste raisonnable. Marée montante et descendante donnent toutes deux du poisson actif ; le sar se prend plus près des roches, au ras des fonds. Spot exposé plein océan, qui marche mieux d'avril à novembre.$$,
 $$Accès à pied par le plateau de l'Atalaye et la passerelle (gratuit, ouvert), parking en ville côté Port-Vieux / Grande Plage. C'est un monument ultra-fréquenté en journée et en saison : pêche tôt le matin ou en soirée pour avoir la place et le calme. Poste sur les plateaux rocheux et la cassure côté large. Prudence absolue : roches glissantes, ressac qui balaie la passerelle, submersion possible à marée haute par grosse houle — ne jamais pêcher en mer formée, garde toujours un œil sur les séries.$$,
 array['ressac','rochers_glissants','submersion_maree','vagues','courants_forts'], 'public', false),

-- #19 Digue de Socoa (Ciboure) — [satellite ✓ poste] — pêche à la ligne autorisée (pêche à pied restreinte)
($$Digue de Socoa$$, 'digue-de-socoa', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.6818, 43.3973), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','maquereau','sar','mulet'], 'digue', 3,
 $$La digue de Socoa, c'est l'ouvrage napoléonien qui ferme la baie de Saint-Jean-de-Luz au pied du fort. Tu pêches le long du mur, dans l'eau, avec deux ambiances : côté baie calme à la flottante pour le sar et la dorade, et au bout côté large aux leurres ou au surfcasting pour taquiner le bar et chopper du maquereau en chasse l'été. Ça donne surtout sur la marée montante et autour des changements de marée ; au plus fort des coefs, le bar vient longer les enrochements côté océan.$$,
 $$Accès à pied facile depuis le parking du fort de Socoa et le petit port (commune de Ciboure) ; tu remontes la digue à pied sur sa longueur. Le meilleur poste est vers le milieu et le bout de la digue, côté large pour le bar et le maquereau. La pêche à la ligne (canne) est autorisée — seule la pêche à pied (coquillages) est restreinte par la zone des 500 m. Prudence : le côté océan est frappé par la houle à marée montante et par gros temps, les enrochements sont glissants — reste sur la promenade et ne descends pas sur le mur exposé quand ça tape.$$,
 array['ressac','vagues','submersion_maree','rochers_glissants'], 'public', false),

-- #20 Pointe Sainte-Barbe (Saint-Jean-de-Luz) — [satellite ✓ poste] — digue consolidée en 2025, prudence
($$Pointe Sainte-Barbe$$, 'pointe-sainte-barbe', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.66645, 43.39927), 4326)::geography,
 array['leurres','flottante','vif'], array['bar','dorade_royale','sar','mulet'], 'digue', 3,
 $$La digue de Sainte-Barbe, accolée à la pointe rocheuse qui ferme la baie de Saint-Jean-de-Luz au nord, te donne un accès direct aux eaux profondes de l'entrée de baie — c'est LE spot du coin. Le bar tape aux leurres dans le ressac et les remous autour de la tête de digue, surtout à la montante et autour de la pleine mer ; sar et belles dorades se prennent à la flottante ou au vif le long des enrochements et de l'estran rocheux. Les eaux remuées par la houle d'ouest sont souvent les plus payantes quand la mer reste pêchable.$$,
 $$Tu rejoins la pointe et la digue par le sentier littoral qui descend de la colline Sainte-Barbe depuis le centre-ville (parking en ville, fin du parcours à pied). Les meilleurs postes sont le long de la digue et sur les rochers en bord d'eau côté baie. Attention : la digue est exposée à la houle, les enrochements sont glissants et le ressac peut balayer la structure — ne t'aventure pas sur la tête de digue par mer formée ou grosse marée. La digue a fait l'objet de travaux de consolidation récents ; reste sur les parties stables et surveille les vagues.$$,
 array['ressac','rochers_glissants','vagues','submersion_maree'], 'public', false),

-- #21 Plage d'Hendaye — [satellite ✓ zone] — grande plage basque, baïnes signalées
($$Plage d'Hendaye$$, 'plage-d-hendaye', '64', 'nouvelle-aquitaine',
 ST_SetSRID(ST_MakePoint(-1.796, 43.38), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','sar'], 'plage', 2,
 $$La Grande Plage d'Hendaye, c'est 3 km de sable ouverts entre les Rochers des Deux Jumeaux à l'ouest et la pointe de Sokoburu à l'embouchure de la Bidassoa. Du sable franc fait de cette plage un classique du surfcasting : tu lances tes lignes dans le ressac pour le bar, actif dans les zones de vagues, et la dorade royale qui vient gratter sur appâts (ver, crabe, couteau). Le bar tape surtout au lever et au coucher du jour, sur le montant et le descendant ; la dorade se joue plutôt l'été. Vers les Jumeaux, la zone rocheuse ajoute du sar au leurre ou au flotteur.$$,
 $$Accès très facile : grands parkings le long de la promenade (boulevard de la Mer, secteur casino / base nautique) et descentes directes sur le sable. Le meilleur poste de surf reste la grande étendue de sable centrale, à l'écart des zones de baignade surveillées l'été (pêche tôt le matin ou en soirée hors saison). Pour cibler le sar, marche vers l'extrémité ouest, côté Deux Jumeaux, mais attention aux rochers découvrants à marée basse. Évite l'extrême est (chenal de la Bidassoa / port) : courants forts et trafic de bateaux. Surveille le coefficient et le retour de marée, la plage se découvre largement à basse mer.$$,
 array['baines','courants_forts','ressac','submersion_maree','vagues'], 'public', false);

-- =====================================================================
-- Après validation John + insertion : prod passerait de 62 à 83 spots
-- (17=7, 33=5, 40=4, 64=5). Vérifier les pins sur /carte, passer verified=true.
-- À TRANCHER (non inclus) : pointe-sainte-anne/Corniche basque (accès estran
-- interdit par arrêtés + sentier fermé 2021), digue-du-bourret (quasi-doublon
-- de l'estacade de Capbreton — recoordonner ou dropper), jetee-de-belisaire (rejeté).
-- Lot 4 (à suivre) : Manche (50, 14, 76, 62, 59). Lot 5 : Méditerranée (66, 11, 34, 30, 13, 83, 06).
-- =====================================================================
