-- =====================================================================
-- Carnet de Pêche — LOT 2 de curation de spots (Atlantique sud, 24 spots)
-- Loire-Atlantique (44) + Vendée (85) — region 'pays-de-la-loire'
-- =====================================================================
-- ⚠️ NON INSÉRÉ — À VALIDER PAR JOHN, ET À INSÉRER UNIQUEMENT APRÈS LE FIX GPS
--    (cf docs/sprint-11.5/ADDENDUM-gps.md). Tant que le floutage est un no-op,
--    insérer = fuiter les coords exactes de 24 spots de plus.
--
-- Pipeline (2026-06-21) : 1 agent/spot — vérif réel/public/département (web+géo)
--    + confirmation satellite Esri du VRAI poste + rédaction FR. Audit :
--    docs/sprint-10/lot-2-verification.md.
-- Résultat : 24/24 réels, bon département. 20 [satellite ✓ poste], 4 [zone]
--    (#11 Tharon, #17 Payré/Veillon, #18 Conches, #21 La Tranche). 0 rejeté.
--
-- Normalisations appliquées (vs sortie agents) :
--   • espèces ramenées au set supporté {bar,dorade_royale,lieu_jaune,maquereau,
--     sar,orphie,vieille} ; "dorade royale"→dorade_royale ; chinchard/sole RETIRÉS
--     (à réintroduire avec l'extension "nouvelles espèces" + le fix grammaire SEO).
--   • techniques ramenées à {leurres,surfcasting,flottante,vif,stickbait} :
--     buldo/flotteur/peche_a_soutenir/appat→flottante ; lancer_*/peche_aux_leurres/
--     leurre→leurres.
--   • aucun lieu_jaune (les agents l'ont écarté à raison : rare au sud de la Loire).
--
-- verified=false ; geom_public généré par trigger ; visibility='public' explicite.
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ========================= LOIRE-ATLANTIQUE (44) =========================

-- #1 Pointe de Chémoulin (Saint-Nazaire) — [satellite ✓ poste]
($$Pointe de Chémoulin$$, 'pointe-de-chemoulin', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.2983, 47.2331), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar','maquereau','orphie'], 'pointe_rocheuse', 3,
 $$Pointe rocheuse classique de la Côte d'Amour, à l'ouest de Saint-Nazaire sous le sémaphore : un platier de roche qui plonge dans l'Atlantique avec du remous et des cassures qui brassent l'eau dès que ça lève. C'est un poste à bar reconnu — tu prospectes aux leurres (jerk, shad, surface au petit jour) sur les bordures de roche en marée montante et descendante, et tu poses du surfcasting sur les criques de sable de part et d'autre pour taper le sar et le bar de nuit. L'été, maquereau et orphie passent en surface devant la pointe au montant. Les meilleurs créneaux : tôt le matin, le soir, et les deux heures autour de l'étale de basse mer pour découvrir les roches.$$,
 $$Accès depuis le sentier côtier (GR / boulevard de la Côte d'Amour) entre Saint-Nazaire et Pornichet ; stationnement le long du front de mer puis descente à pied par les sentiers à travers le bois jusqu'aux rochers et aux petites criques sous le sémaphore. La descente sur le platier est raide et les roches sont glissantes (algues) — chaussures crantées obligatoires. Pêche ton poste à marée descendante de préférence : surveille le retour de l'eau, la pointe est exposée à la houle d'ouest et le ressac peut surprendre. Évite par gros temps et grandes marées montantes.$$,
 array['rochers_glissants','ressac','submersion_maree','vagues'], 'public', false),

-- #2 Pointe Saint-Gildas (Préfailles) — [satellite ✓ poste]
($$Pointe Saint-Gildas$$, 'pointe-saint-gildas', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.248, 47.1352), 4326)::geography,
 array['leurres','flottante','surfcasting'], array['bar','maquereau','sar','orphie'], 'pointe_rocheuse', 3,
 $$La Pointe Saint-Gildas, c'est l'extrémité ouest du pays de Retz : une grande pointe rocheuse balayée par les courants, avec le sémaphore en surplomb et l'estuaire de la Loire d'un côté, la baie de Bourgneuf de l'autre. Le bar est le poisson roi ici — les gros viennent chasser crevettes, crabes et gobies sur le platier dans très peu d'eau, donc tu attaques au lancer-ramener (shads et slugs 5-20 g) ou à gratter sur les zones marquées. Maquereau et orphie en surface l'été quand ça défile au large des roches, sar et autres au posé sur les fonds rocheux. Ça pêche surtout en marée descendante et basse mer pour accéder aux postes du platier, eau claire et vent calme idéal.$$,
 $$Accès à pied par le sentier des douaniers qui longe toute la pointe — parkings au niveau du sémaphore et le long de la route côtière de Préfailles. De là tu descends sur le platier rocheux côté seaward pour atteindre les postes au bord de l'eau. Attention : roches couvertes d'huîtres et d'algues très glissantes, courants forts au bout de la pointe, ressac qui peut monter vite avec la houle d'ouest. Surveille la marée montante qui isole certains postes du platier — ne te fais pas piéger. Chaussures à crampons et prudence par mer formée.$$,
 array['rochers_glissants','courants_forts','ressac','vagues','submersion_maree'], 'public', false),

-- #3 Pointe du Croisic — Côte Sauvage (Le Croisic) — [satellite ✓ poste]
($$Pointe du Croisic — Côte Sauvage$$, 'pointe-du-croisic', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.548, 47.2918), 4326)::geography,
 array['leurres'], array['bar','sar','dorade_royale','maquereau'], 'pointe_rocheuse', 4,
 $$La Côte Sauvage du Croisic, c'est une succession de pointes rocheuses granitiques battues par la houle atlantique, à la pointe ouest de la presqu'île guérandaise. Ce poste, posé sur la roche en bordure d'eau profonde, est un terrain de jeu classique pour le bar au leurre : tu prospectes les cassures et les remous au lancer-ramener, surtout en début et fin de descendante quand le courant pousse autour de la pointe. Le matin et le soir à la montante, le sar et la dorade rôdent dans les fonds rocheux, et l'été le maquereau passe à portée de jig en linéaire rapide.$$,
 $$Accès par la route côtière de la Côte Sauvage qui longe le secteur : plusieurs parkings le long du front de mer et au niveau de la pointe. De là, tu descends à pied par les sentiers et les rochers jusqu'au poste, à quelques minutes de marche. Le sentier douanier (GR34) longe toute la côte. Prudence absolue : roche très glissante (algues, embruns), ressac violent et vagues qui peuvent te surprendre par houle ou gros coef — ne tourne jamais le dos à la mer, garde une marge avec le bord et évite le poste par mer formée. Pêche idéalement à marée descendante et basse pour accéder aux rochers découverts.$$,
 array['ressac','rochers_glissants','vagues','submersion_maree','courants_forts'], 'public', false),

-- #4 Jetée du Tréhic (Le Croisic) — [satellite ✓ poste] — digue de 858 m, pêche tolérée 2 côtés
($$Jetée du Tréhic$$, 'jetee-du-trehic', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.522939, 47.307959), 4326)::geography,
 array['leurres','flottante','surfcasting'], array['maquereau','bar','orphie','dorade_royale','vieille'], 'digue', 2,
 $$Grande digue brise-lames en granit de 858 m qui ferme le port du Croisic et file jusqu'au phare du Tréhic — un des spots de pêche du bord les plus connus de Loire-Atlantique, pêche tolérée des deux côtés. Le maquereau et l'orphie tapent de fin printemps à l'automne en surface (bulle d'eau, mitraillette, petit leurre), tandis que le bar chasse le long des enrochements au montant et à la tombée du jour. Au bout de la jetée, dans l'eau plus profonde, tu touches aussi dorade royale et vieille au flotteur coulissant ou au surfcasting près des roches.$$,
 $$Accès à pied direct depuis le port et le parking du Croisic, la jetée est goudronnée et promenable sur toute sa longueur. Les meilleurs postes sont vers le bout, côté large, près du phare où c'est le plus dans la mer. Attention : l'enrochement extérieur est très glissant (algues), et par mer formée ou grand coefficient le ressac passe par-dessus la digue — reste sur le platelage par gros temps et évite les rochers de nuit.$$,
 array['rochers_glissants','ressac','vagues','submersion_maree'], 'public', false),

-- #5 Jetée de La Turballe — [satellite ✓ poste] — port de pêche actif (respecter zones de manœuvre)
($$Jetée de La Turballe$$, 'jetee-de-la-turballe', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.5152, 47.344), 4326)::geography,
 array['flottante','leurres'], array['maquereau','orphie','bar','dorade_royale'], 'digue', 2,
 $$La grande digue du port de La Turballe, premier port de pêche des Pays de la Loire, t'offre un poste enroché qui pousse loin dans la rade du Croisic. En été (juin-août), le maquereau et l'orphie débarquent en chasse le long de la digue : sors le bouchon coulissant à marée montante et pleine mer, esche fine, et ça tape côté large. Le bar suit les bancs aux leurres souples ou de surface au lever et à la tombée du jour, et la dorade royale traîne sur les fonds mêlés en été sur les appâts naturels. Le musoir (le bout de la digue) reste le meilleur poste quand l'eau pousse.$$,
 $$Accès à pied depuis le port : grand parking gratuit sur le terre-plein du port et le long du front de mer, à 5-10 min de marche de la digue. Le poste de référence est l'enrochement de la grande digue côté large, et surtout son musoir. Attention : c'est un port de pêche en activité — respecte les zones de manœuvre des bateaux et les éventuelles restrictions d'accès au terre-plein technique. Enrochements glissants à marée basse et par mer formée : chaussures qui accrochent, prudence par vent d'ouest qui lève du clapot sur la digue.$$,
 array['rochers_glissants','vagues','ressac'], 'public', false),

-- #6 Môle du Pouliguen — [satellite ✓ poste] — courant fort dans l'étier
($$Môle du Pouliguen$$, 'mole-du-pouliguen', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.424, 47.2733), 4326)::geography,
 array['flottante','leurres'], array['maquereau','orphie','bar','dorade_royale'], 'digue', 2,
 $$Le môle du Pouliguen, c'est la digue de pierre qui protège l'entrée de l'étier, à la sortie du port de plaisance et au pied de la plage du Nau. Tu pêches le chenal et la passe : le courant y est costaud à mi-marée et concentre le poisson. De fin avril à octobre, l'orphie et le maquereau tournent en surface au flotteur (lamelle de maquereau pour l'orphie) ; le bar attaque aux leurres dans le courant, surtout en montante au lever et à la tombée du jour. La dorade royale traîne dans l'étier en été. Les changements de marée sont les meilleurs créneaux.$$,
 $$Accès à pied facile depuis le quai du port du Pouliguen ou le bas de la plage du Nau ; parkings dans le bourg et le long du port, ça se remplit vite l'été. Les meilleurs postes sont en bout de môle, côté passe, face au chenal. Attention : les pierres de la digue sont glissantes (algues, embruns), le courant dans l'étier est fort à mi-marée — ne descends pas sur l'enrochement bas en marée montante, ça recouvre vite. Spot familial mais reste prudent près de l'eau avec des enfants.$$,
 array['courants_forts','rochers_glissants','submersion_maree'], 'public', false),

-- #7 Pointe de Penchâteau (Le Pouliguen) — [satellite ✓ poste] — début de la Côte Sauvage
($$Pointe de Penchâteau$$, 'pointe-de-penchateau', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.4218, 47.2586), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar'], 'pointe_rocheuse', 3,
 $$Pointe granitique qui ferme la baie du Pouliguen à l'ouest et ouvre sur la Côte Sauvage : un enchaînement de cassures rocheuses, de petites criques et de plateaux battus par la houle atlantique. C'est un secteur à bar reconnu, qui se pêche aux leurres souples et de surface autour des roches, surtout au montant et au descendant quand l'eau brasse sur les pointes — tôt le matin ou à la tombée du jour. Le sar se tient sur les cassures et les fonds rocheux en été ; le surfcasting depuis les postes sableux entre les rochers complète le tableau.$$,
 $$Accès à pied par le sentier des douaniers (GR34) qui longe toute la pointe depuis le bourg et le port du Pouliguen ; stationnement le long de la côte (parkings de la Côte Sauvage côté Penchâteau). Descends sur les plateaux rocheux à mi-marée descendante pour attaquer les pointes ; repère ta zone avant l'eau montante. Côte exposée : ressac et vagues sournoises, granite glissant couvert d'algues, et roches recouvertes à pleine mer — garde toujours une voie de repli et ne pêche pas dans les rochers de nuit. Évite par grosse houle d'ouest/sud-ouest.$$,
 array['ressac','rochers_glissants','vagues','submersion_maree'], 'public', false),

-- #8 Môle de Pornichet — [satellite ✓ poste] — NB : distinct du "vieux môle" de 1923
($$Môle de Pornichet$$, 'mole-de-pornichet', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.3533, 47.258), 4326)::geography,
 array['flottante','surfcasting','leurres'], array['maquereau','orphie','dorade_royale','bar'], 'digue', 2,
 $$La digue du port de plaisance de Pornichet, dans la baie de La Baule : un long enrochement qui ferme le bassin et se termine par une tête arrondie portant le feu d'entrée, juste au-dessus de la passe. C'est un poste accessible et productif. L'été, ça tape fort en surface au lever et au coucher du jour : maquereaux à la mitraillette et orphies à la flottante avec une perle au-dessus de l'eau, petit appât. La dorade royale fréquente le secteur sablo-vaseux de la baie au flot, et le bar chasse dans la passe et le long de l'enrochement, au leurre de surface ou au vif. Travaille de préférence le coefficient moyen à fort, en marée montante, quand l'eau revient sur les cailloux.$$,
 $$Accès à pied facile depuis le port de plaisance : parkings le long du port et au niveau de la capitainerie, puis on rejoint l'enrochement à pied. Le meilleur poste est la tête de digue, au feu, qui domine la passe — c'est là que l'eau est la plus profonde et que ça chasse. Attention : les blocs d'enrochement sont glissants à marée basse et avec les embruns, chaussures qui accrochent obligatoires. Évite la tête de digue par fort vent de sud-ouest et grosse houle, le ressac y passe par-dessus.$$,
 array['rochers_glissants','ressac','vagues'], 'public', false),

-- #9 Plage de la Courance (Saint-Marc-sur-Mer, Saint-Nazaire) — [satellite ✓ poste]
($$Plage de la Courance$$, 'plage-de-la-courance', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.2725, 47.2395), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$Grande courbe de sable exposée plein sud entre la Butte du Chat et la Pointe de l'Ève, sur la Côte d'Amour — un classique du surfcasting nazairien. Ça donne surtout au coup du soir et de nuit sur la montante, bar en chasse dans le ressac de printemps à l'automne et dorade royale qui fouille les bancs de sable l'été par eau chaude. Pêche les cassures et trous de bordure quand la houle remue le fond : les poissons viennent chercher les vers et coquillages décrochés.$$,
 $$Accès direct par la Route du Fort de l'Ève à Saint-Marc-sur-Mer (quartier de Saint-Nazaire) ; arrêt de bus La Courance à 200 m, stationnement le long de la route côtière. Tu poses sur tout le linéaire de sable ; vise les cassures et trous de bordure à marée basse pour les repérer, puis pêche-les sur la montante. Plage exposée à la houle (spot de surf reconnu) : attention au ressac, aux courants de baïne et à la mer qui remonte vite sur le sable plat. Falaises aux deux extrémités, ne te fais pas piéger par la marée. Surveillée en juillet-août seulement.$$,
 array['ressac','vagues','courants_forts','submersion_maree'], 'public', false),

-- #10 Corniche de Gourmalon (Pornic) — [satellite ✓ poste]
($$Corniche de Gourmalon$$, 'corniche-de-gourmalon', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.1078, 47.1086), 4326)::geography,
 array['leurres','flottante'], array['bar','dorade_royale','sar'], 'pointe_rocheuse', 3,
 $$Beau secteur de roche du bord sur la corniche sud de Gourmalon, à Pornic : tu pêches des postes mixtes roche/eau profonde exposés plein sud sur la baie de Bourgneuf. Le bar tient les zones de chasse au pied des cassures rocheuses, à attaquer aux leurres en montante et autour de la pleine mer (les deux heures avant/après PM sont les meilleures). La dorade royale et le sar restent sur les secteurs rocheux et se prennent bien à la flottante (appâts type crabe/ver/moule) de juin à octobre, sur l'étale et le début de descendante.$$,
 $$Accès à pied par le sentier des douaniers (GR8) qui longe la corniche depuis le quartier de Gourmalon, à ~500 m du centre et de la gare de Pornic. Stationnement dans les rues du quartier au-dessus de la corniche puis descente sur les rochers. Les rochers sont accessibles à mi-marée descendante ; le meilleur poste est la pointe de roche au ras de l'eau. Attention : roche couverte d'huîtres très coupante et glissante (chaussures à crampons indispensables), façade exposée à la houle d'ouest — surveille le ressac et la marée montante qui isole vite les postes bas.$$,
 array['rochers_glissants','ressac','vagues','submersion_maree'], 'public', false),

-- #11 Plage de Tharon (Saint-Michel-Chef-Chef) — [satellite ✓ zone] — baïnes
($$Plage de Tharon$$, 'plage-de-tharon', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.16975, 47.16725), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau'], 'plage', 2,
 $$Grande plage de sable de plus d'un kilomètre sur la côte de Jade, c'est un classique du surfcasting au sud de la Loire. Tu pêches le bar dans le ressac et les bancs de sable, surtout de nuit et sur la marée montante avec un peu de houle qui brasse le fond. La dorade royale arrive en force à la belle saison (mai à septembre) au crabe vert ou au ver, et le maquereau passe en bordure l'été quand l'eau se réchauffe — pense à repérer les baïnes et les cassures de pente à marée basse, c'est là que le poisson chasse au flot.$$,
 $$Accès très facile depuis le centre de Tharon-Plage : nombreux parkings gratuits toute l'année à une dizaine de mètres du sable, descente bitumée. Le meilleur poste est la partie centrale et nord de la grande plage, plus dégagée et hors zone de baignade surveillée l'été — éloigne-toi des baigneurs en saison. Pêche de préférence de la mi-marée montante à la pleine mer. Prudence : la plage est exposée plein ouest, le ressac peut être costaud par vent d'ouest, et il y a des baïnes (courants de retour) — repère les couloirs d'eau plus sombre à marée basse et ne te laisse pas surprendre par la marée montante sur les bancs de sable.$$,
 array['ressac','baines','courants_forts','submersion_maree'], 'public', false),

-- #12 Plage de Saint-Brevin (Saint-Brevin-les-Pins) — [satellite ✓ poste]
($$Plage de Saint-Brevin$$, 'plage-de-saint-brevin', '44', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.1795, 47.2273), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$Grande plage de sable atlantique sur la rive sud de l'estuaire de la Loire, la plage de l'Océan est le spot surfcasting historique de Saint-Brevin. Tu repères les cassures et trous d'eau au jusant : c'est là que le bar et la dorade royale viennent fouiller à la montante, surtout sur les grands coefficients de printemps-été. Lancer ver de chalut, couteau ou crabe mou par-dessus la barre de sable ; le bar se prend aussi au leurre dans le ressac au coup du soir.$$,
 $$Accès direct par la promenade du front de mer (secteur Bureau de l'Océan, place René Guy Cadou). Parkings gratuits le long du boulevard de l'Océan et accès plage de plain-pied, pratique pour porter le matériel. Meilleur poste : descends sur le bas de plage à marée basse pour repérer les baïnes et cassures, puis pose-toi en bordure de la barre. Prudence : la plage est balnéaire l'été (pêche hors zones de baignade et hors horaires de baignade), le ressac et les courants de baïnes peuvent être forts à la marée montante — ne te laisse pas piéger par la remontée d'eau dans les cuvettes.$$,
 array['ressac','courants_forts','baines'], 'public', false),

-- ========================= VENDÉE (85) =========================

-- #13 Grande jetée de Saint-Gilles-Croix-de-Vie (jetée de la Garenne) — [satellite ✓ poste]
($$Grande jetée de Saint-Gilles-Croix-de-Vie$$, 'grande-jetee-de-saint-gilles', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.953, 46.6927), 4326)::geography,
 array['leurres','surfcasting','flottante'], array['bar','maquereau','orphie','dorade_royale'], 'digue', 3,
 $$La Grande jetée, c'est la jetée de la Garenne : un long ouvrage en enrochement qui protège l'embouchure de la Vie côté Croix-de-Vie et s'avance vers le large sur plusieurs centaines de mètres. Tu y pêches à la fois le chenal (côté port) et le large (côté plage), ce qui en fait l'un des spots du bord majeurs de Vendée. Au montant et au descendant, le bar chasse dans le courant de l'embouchure aux leurres souples ou en surface, surtout au lever et au crépuscule de la fin du printemps à l'automne ; le maquereau et l'orphie passent en bancs l'été en surface (mitraillette, plume, flottante), et la dorade royale se tente au posé près du chenal en été sur appâts (crabe, ver, couteau).$$,
 $$Accès à pied depuis la dune de la Garenne / la Grande Plage côté Croix-de-Vie ; parkings publics à proximité du front de mer, puis tu rejoins le pied de la jetée par le sentier. La jetée se parcourt à pied jusqu'à la tête : les meilleurs postes sont la tête (SO) pour le bar aux leurres dans le courant et la partie médiane élargie pour le surfcasting et la flottante. Prudence : enrochements glissants par endroits, ressac et paquets de mer par vent d'ouest / mer formée, et zone exposée à la submersion lors des grands coefficients — ne pas s'y aventurer par grosse houle, garder de bonnes chaussures et rester à distance du bord côté large.$$,
 array['ressac','rochers_glissants','submersion_maree','vagues'], 'public', false),

-- #14 Jetée de la Chaume — grande jetée Saint-Nicolas (Les Sables-d'Olonne) — [satellite ✓ poste]
($$Jetée de la Chaume$$, 'jetee-de-la-chaume', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.7929, 46.4876), 4326)::geography,
 array['leurres','flottante','surfcasting'], array['bar','dorade_royale','maquereau','sar'], 'digue', 3,
 $$La grande jetée Saint-Nicolas, côté La Chaume, ferme l'entrée du chenal des Sables-d'Olonne : une longue digue de granit qui plonge dans le courant à la sortie du port. C'est LE poste à bar du secteur — le poisson-roi vendéen chasse dans le courant de marée à l'entrée du chenal, surtout au montant et au début du descendant, à l'aube et à la tombée du jour. Aux leurres (jerk, shad, surface l'été) le long de l'enrochement et dans la veine de courant, à la flottante pour gratter bar et sar près des blocs, et à la mitraillette quand les bancs de maquereaux passent en surface (mai à septembre). La dorade royale se pioche au posé sur fond plus tendre en été.$$,
 $$Accès à pied par le quai des Boucaniers et le front de mer de La Chaume, puis on remonte la jetée à pied. Stationnement dans La Chaume (parkings du quartier maritime, à compléter en saison où c'est très fréquenté). Le meilleur poste est la section médiane à terminale de la digue, vers le phare rouge, où le courant du chenal est le plus marqué. Prudence : enrochements glissants (algues), ressac et paquets de mer par vent d'ouest/sud-ouest et grosse houle — la jetée peut être balayée et dangereuse aux coefficients forts et en mer formée. À éviter par tempête ; rester sur le haut de la structure quand ça tape.$$,
 array['ressac','rochers_glissants','courants_forts','submersion_maree','vagues'], 'public', false),

-- #15 Pointe de Grosse Terre (Saint-Hilaire-de-Riez) — [satellite ✓ poste]
($$Pointe de Grosse Terre$$, 'pointe-de-grosse-terre', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.965843, 46.691798), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','maquereau','orphie'], 'pointe_rocheuse', 3,
 $$Pointe rocheuse de granit en plein cœur de la Corniche vendéenne, sous le feu de Grosse Terre, exposée plein large sur l'Atlantique. C'est un poste à bar de référence : tu prospectes au leurre (jerk, shad, surface) le long des cassures rocheuses et dans les remous, surtout en fin de descendante et au lever/coucher du jour, quand le bar chasse dans les bouillons. Le sar se prend à soutenir ou au flotteur près des failles et des trous garnis de moules ; maquereau et orphie passent en surface l'été. Les coefficients moyens à forts avec un peu de houle qui brasse activent nettement la zone.$$,
 $$Accès à pied facile depuis le parking de la Corniche / villa Grosse Terre à Saint-Hilaire-de-Riez, puis sentier côtier qui longe la pointe. Les meilleurs postes sont les avancées rocheuses au bas de l'estran, devant le feu — descends sur les rochers uniquement à marée descendante ou basse. Attention : granite très glissant (algues), ressac et paquets de mer par jour de houle ou de vent d'ouest ; ne jamais tourner le dos à la mer et remonter avant que la marée n'isole le poste. Chaussures à crampons et gilet recommandés par mer formée.$$,
 array['rochers_glissants','ressac','vagues','submersion_maree','courants_forts'], 'public', false),

-- #16 Rochers de la Normandelière (Brétignolles-sur-Mer) — [satellite ✓ poste] — pêchable à marée basse
($$Rochers de la Normandelière$$, 'rochers-de-la-normandeliere', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.8643, 46.6128), 4326)::geography,
 array['leurres','flottante'], array['bar','sar'], 'pointe_rocheuse', 3,
 $$À droite de la plage de la Normandelière, la côte se hérisse de roches qui plongent dans l'eau : une vraie pointe rocheuse avec son plateau qui découvre à marée basse. C'est un poste à bar au leurre — tu prospectes les contre-courants autour des têtes de roche, surtout au lever du jour et sur le bas de l'eau jusqu'au début du montant, quand le bar vient chasser crevettes et petits crabes dans les failles. Le sar se tient sur ce même plateau et se prend plutôt au crabe ou au ver depuis les roches. Évite les gros coefficients en pleine houle d'ouest, le secteur est exposé.$$,
 $$Accès facile : parking de la Normandelière au bout de la rue de la Normandelière (base nautique + restaurant sur place), puis on rejoint la pointe à pied par la plage en allant vers le sud-ouest. Le plateau rocheux n'est pêchable qu'à marée basse — arrive environ une heure avant l'étale de basse mer et décroche dès que le flot remonte. Roches très glissantes (algues), chaussures à crampons indispensables. Garde toujours un œil sur le retour de marée pour ne pas te faire couper, et reste prudent par mer formée : côte ouest exposée au ressac et à la houle d'Atlantique.$$,
 array['rochers_glissants','ressac','submersion_maree','vagues'], 'public', false),

-- #17 Pointe du Payré — Le Veillon (Talmont-Saint-Hilaire) — [satellite ✓ zone, confiance MOYENNE]
($$Pointe du Payré — Le Veillon$$, 'pointe-du-payre-le-veillon', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.658, 46.426), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale','maquereau'], 'estuaire', 3,
 $$Embouchure du Payré, à la pointe sud de la plage du Veillon : un estuaire de sable où le chenal vient lécher la mer. C'est un coin à bar et à dorade royale — l'eau réchauffée et la nourriture des bancs attirent la dorade en été/automne, et le bar se cale dans les veines de courant à la descendante pour chasser ce qui dérive. Pêche au lancer (leurres souples, poissons-nageurs) sur le chenal, ou surfcasting appâté (couteau, ver, crabe mou) posé sur la cassure de banc.$$,
 $$Accès par le grand parking gratuit de la plage du Veillon (av. de la Plage, Talmont-Saint-Hilaire), puis longe la plage plein sud-ouest vers l'embouchure. Le meilleur poste est la pointe sablonneuse au bord du chenal, à pêcher de la mi-marée à la basse mer. Attention : le banc bouge avec les marées et les saisons, le chenal porte un vrai courant et la pointe peut se couper sur un flot rapide — surveille la montante, ne te fais pas piéger. Bottes ou waders utiles. La Pointe du Payré proprement dite (rochers) est sur la rive d'en face, commune de Jard-sur-Mer, accessible seulement par le sentier côtier (~2,5 km de marche).$$,
 array['courants_forts','submersion_maree','ressac','isolation'], 'public', false),

-- #18 Plage des Conches (Longeville-sur-Mer) — [satellite ✓ zone]
($$Plage des Conches$$, 'plage-des-conches', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.49557, 46.38806), 4326)::geography,
 array['surfcasting'], array['bar','dorade_royale'], 'plage', 2,
 $$Grande plage de sable rectiligne exposée plein ouest sur l'Atlantique, une vraie référence surfcasting du sud-Vendée — le sable s'étire sur près de 3 km jusqu'à La Tranche. Tu balances à grande distance dans le ressac : ça donne surtout au montant et autour de l'étale de basse, tôt le matin ou en fin de journée. Le bar chasse dans les rouleaux dès que ça remue, et la dorade royale prospecte les fonds sableux et les baïnes en été (avril à octobre).$$,
 $$Accès n°13 par l'avenue du Docteur Joussemet, grand parking gratuit derrière la dune. Compte 2-3 min à pied par le sentier dans la dune jusqu'au sable. Meilleur poste : le bas de plage sur le sable ferme et mouillé, en repérant les baïnes et cuvettes creusées par le courant à marée basse — c'est là que le poisson circule. Plage surveillée mi-juin à mi-septembre ; pêche plutôt hors créneaux de baignade. Prudence : ressac puissant, courants de baïnes traîtres, ne pas pêcher les pieds dans l'eau au montant.$$,
 array['ressac','courants_forts','baines','vagues'], 'public', false),

-- #19 Jetée de L'Herbaudière (Noirmoutier-en-l'Île) — [satellite ✓ poste]
($$Jetée de L'Herbaudière$$, 'jetee-de-l-herbaudiere', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.2985, 47.0281), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','dorade_royale','maquereau','orphie'], 'digue', 2,
 $$La grande digue (jetée Ouest) qui ferme le port de pêche de L'Herbaudière, au nord de Noirmoutier, est un poste connu et accessible. Tu pêches le bar et la dorade royale au leurre ou à la flottante le long de l'enrochement et à la tête de jetée, surtout sur le montant et l'étale de pleine mer quand l'eau revient sur les blocs. En été, maquereaux et orphies s'attrapent à vue à la traîne légère ou au plomb palette dans le chenal d'entrée ; les belles dorades tombent plutôt à la tombée du jour, près du marnage propre.$$,
 $$Accès à pied direct depuis le port : parking gratuit le long du quai et près de la criée, puis tu marches sur la digue. Le meilleur poste est la tête de jetée côté chenal d'entrée et l'enrochement extérieur exposé au large. Attention : les blocs sont glissants à marée basse et la digue prend les paquets de mer par vent de nord-ouest et fort coefficient — reste sur le haut par gros temps. La pêche à pied est interdite dans tout le domaine portuaire et à moins de 100 m des jetées (la pêche à la canne depuis la digue reste autorisée).$$,
 array['rochers_glissants','vagues','ressac'], 'public', false),

-- #20 Estacade de Saint-Jean-de-Monts — [satellite ✓ poste] — pêche plage interdite 1er juil-31 août
($$Estacade de Saint-Jean-de-Monts$$, 'estacade-de-saint-jean-de-monts', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.0854, 46.7848), 4326)::geography,
 array['flottante','surfcasting'], array['bar','dorade_royale','maquereau'], 'digue', 2,
 $$L'estacade de Saint-Jean-de-Monts, c'est LE poste de pêche emblématique du coin : une jetée en bois de plus de 400 m qui t'amène loin au-dessus de l'eau, au-delà de la zone de déferlante. Tu pêches le mieux le matin tôt ou en soirée, et surtout par vent d'ouest soutenu sur la marée montante quand les bancs remontent. Du bout de l'estacade, la pêche à la flottante donne maquereaux et bars en été, parfois dorade ; sur les plages voisines, le surfcasting sort bars, plats et dorades royales (gros plombs, longs lancers) — les dorades passent surtout en fin d'été.$$,
 $$Accès à pied direct depuis l'Esplanade de la Mer, en plein centre balnéaire — c'est une promenade aménagée avec garde-corps, donc familiale et sûre. Parkings gratuits et payants à proximité immédiate au pied de l'estacade. Le meilleur poste, c'est le bout de la jetée (la plateforme élargie), où tu domines le chenal. Point important : la pêche sur la plage est interdite du 1er juillet au 31 août — pendant cette période, l'estacade reste l'un des seuls endroits où tu peux pêcher. Attention au ressac et aux courants de marée sur cette côte atlantique exposée, et surveille la montante si tu pêches l'accès plage.$$,
 array['ressac','courants_forts','submersion_maree','vagues'], 'public', false),

-- #21 Plage de La Tranche-sur-Mer (secteur Plage du Phare / Youte) — [satellite ✓ zone]
($$Plage de La Tranche-sur-Mer$$, 'plage-de-la-tranche', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.459, 46.342), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$Longue plage de sable du sud-Vendée, exposée plein sud face à l'île de Ré : du surfcasting de manuel. Le secteur de la Plage du Phare (dite plage de la Youte), à l'ouest du bourg, déroule un beau cordon dunaire et une pente douce qui travaillent bien au lancer lointain. Ça pêche surtout au montant et sur les deux premières heures de la nuit : tu y poses le bar (au ver ou au lançon, et au leurre souple dans la barre quand il chasse) et la dorade royale sur appâts (couteau, ver, crabe mou) aux belles eaux chaudes de la fin d'été. Repère les baïnes et les cassures dans le sable à marée basse, c'est là que le poisson circule au flot.$$,
 $$Accès depuis le bourg par la rue du Phare ; parking près de l'impasse de la Youte, puis franchissement de la dune par les sentes balisées (respecte les passages, dune protégée). Pêche autorisée jour et nuit, sans permis. Les meilleurs postes : les trous et les baïnes repérés à basse mer, à pêcher au montant. Prudence — plage très ouverte à la houle d'ouest/sud-ouest : ressac et baïnes (courants de retour) dangereux, attention au coefficient et à la remontée rapide de l'eau sur une plage plate ; ne laisse pas ton matériel trop bas au flot.$$,
 array['ressac','vagues','baines','courants_forts','submersion_maree'], 'public', false),

-- #22 Plage de Notre-Dame-de-Monts (Pont d'Yeu) — [satellite ✓ poste]
($$Plage de Notre-Dame-de-Monts$$, 'plage-de-notre-dame-de-monts', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-2.1288, 46.8088), 4326)::geography,
 array['surfcasting'], array['bar','dorade_royale'], 'plage', 2,
 $$Grande plage de sable du Pont d'Yeu, face au célèbre haut-fond de galets et de roche qui file vers l'île d'Yeu et ne se découvre qu'aux grandes marées. Tu surfcastes depuis le sable : balance tes lignes dans les baïnes et les fosses au montant, le bar chasse dans le ressac à la tombée du jour et la dorade royale rapplique sur les coques et moules du secteur l'été (juin à septembre), sur appâts naturels type ver ou crabe mou. Les coefficients forts qui dégagent le platier dopent l'activité.$$,
 $$Depuis Notre-Dame-de-Monts, direction Saint-Jean puis rue du Pont d'Yeu jusqu'au parking de plage (gratuit et payant selon zone). Sentiers sur pilotis qui traversent la dune pour rejoindre le sable. Meilleur poste : le bas de plage au début du montant, en visant les fosses devant toi. Prudence : la marée remonte vite et loin sur cet estran très plat — ne te fais pas piéger en allant trop loin à marée basse, et méfie-toi du ressac et des courants quand ça pousse.$$,
 array['submersion_maree','ressac','courants_forts'], 'public', false),

-- #23 Jetée de Jard-sur-Mer — [satellite ✓ poste]
($$Jetée de Jard-sur-Mer$$, 'jetee-de-jard-sur-mer', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.5808, 46.4067), 4326)::geography,
 array['flottante','surfcasting','leurres'], array['bar','dorade_royale','maquereau','orphie'], 'digue', 2,
 $$La grande digue d'enrochement qui protège le port d'échouage de Jard-sur-Mer : tu pêches le bassin et ses corps-morts d'un côté, l'eau ouverte de l'autre, ce qui en fait un poste polyvalent et familial. À la montante et autour de la pleine mer, c'est l'heure du bar et de la dorade royale au ver ou au crabe le long des enrochements ; en été, maquereau et orphie tapent à la traîne légère ou au flotteur dès que l'eau remonte. Le matin tôt et le coup du soir restent les meilleurs créneaux, surtout sur les forts coefficients.$$,
 $$Accès très simple : grand parking gratuit au pied du port (capitainerie rue du Commandant Guilbaud), puis tu marches sur la digue. Les meilleurs postes sont à mi-longueur et vers le musoir côté mer pour atteindre l'eau plus profonde. Les enrochements sont glissants à marée basse et aux algues — chaussures à crampons conseillées. Reste prudent par mer formée d'ouest/sud-ouest : la digue prend les vagues et les paquets de mer, évite le bout par gros temps.$$,
 array['rochers_glissants','vagues','ressac'], 'public', false),

-- #24 Corniche vendéenne — Sion-sur-l'Océan (Saint-Hilaire-de-Riez) — [satellite ✓ poste]
($$Corniche vendéenne (Sion-sur-l'Océan)$$, 'corniche-vendeenne', '85', 'pays-de-la-loire',
 ST_SetSRID(ST_MakePoint(-1.9791, 46.7043), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar','maquereau','orphie'], 'pointe_rocheuse', 4,
 $$Estran rocheux et falaises de schiste de la corniche de Sion : tu pêches au pied des roches, au-dessus du plateau et des rochers des Cinq Pineaux qui découvrent à marée basse. Le bar se traque au leurre (souple sur tête plombée, jerkbait ou surface) le long des cassures et dans les remous, surtout en fin de montante et début de descendante quand l'eau brasse sur les têtes de roche. Le sar tape sur les fonds mêlés, le maquereau et l'orphie débarquent à la belle saison quand l'eau se réchauffe. Les meilleurs moments : tôt le matin, le soir, et par mer un peu formée qui réveille les bars.$$,
 $$Accès à pied direct depuis l'avenue de la Corniche à Sion-sur-l'Océan ; stationnement le long de la corniche et parkings de la plage de Sion à proximité. Descends sur l'estran rocheux au pied des falaises (chemins entre les roches) et poste-toi sur les plateaux émergés autour des Cinq Pineaux. À faire à marée descendante / basse pour accéder aux rochers du large, mais surveille la remontée : la mer revient vite et coupe le retour. Roche très glissante (algues), prévois de bonnes chaussures et ne tourne jamais le dos à la mer — ressac et vagues scélérates fréquents. Gilet conseillé, évite seul et par grosse houle.$$,
 array['ressac','rochers_glissants','vagues','submersion_maree'], 'public', false);

-- =====================================================================
-- Après validation John + FIX GPS appliqué : insérer, vérifier les 28+24
-- pins sur /carte, passer verified=true. Prod passerait de 38 à 62 spots
-- (29=18, 22=8, 35=5, 56=7, 44=12, 85=12).
-- Lot 3 (à suivre) : Charente-Maritime 17, Gironde 33, Landes 40, Pays basque 64.
-- =====================================================================
