-- =====================================================================
-- Carnet de Pêche — LOT 1 de curation de spots (Bretagne, 28 spots)
-- =====================================================================
-- ⚠️ NON INSÉRÉ — À VALIDER PAR JOHN AVANT EXÉCUTION.
--
-- Pipeline de qualité appliqué (2026-06-15) :
--   1. Proposition (docs/sprint-10/spots-curation.md §5).
--   2. Vérif adversariale réel/public/département (28 agents web+géo)
--      → docs/sprint-10/lot-1-verification.md. Tous réels, bon département.
--   3. CONFIRMATION SATELLITE de CHAQUE coordonnée sur ortho Esri (28 agents
--      qui ont regardé l'image et calé le pin sur le VRAI poste de pêche).
--      Les coords ci-dessous sont les coords confirmées au satellite.
--
-- Résultat de la passe satellite :
--   • 22 spots [satellite ✓ poste] : pin verrouillé sur le rocher au bord de
--     l'eau / le môle / le poste exact (les coords sources tombaient souvent
--     sur le plateau, dans l'eau ou dans le bourg → décalées de 50 à 570 m).
--   • 6 spots [satellite ✓ zone] : grandes plages / grandes pointes — pin posé
--     sur un poste d'accès représentatif correct (pas un point unique).
--   • 0 spot non verrouillable.
--   • #19 Pointe du Grouin : coord re-calée sur la valeur Wikipédia (48.7123,
--     -1.8442) + confirmée au satellite (un agent avait dérivé sur un rocher voisin).
--
-- Reste à TA main : un dernier coup d'œil sur /carte après insertion, et
-- passage verified=true spot par spot (le champ reste false ici).
-- Le trigger blur_spot_geom remplit geom_public (flou 1 km) automatiquement.
-- visibility='public' explicite (défaut table = 'subscriber').
--
-- Insertion après validation : Supabase Studio → SQL Editor → coller → Run.
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ========================= FINISTÈRE (29) =========================

-- #1 Pointe Saint-Mathieu (Plougonvelin) — [satellite ✓ poste] rochers sous le phare. Flag : enceinte du sémaphore militaire (n'impacte pas l'estran public).
($$Pointe Saint-Mathieu$$, 'pointe-saint-mathieu', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.7712, 48.3293), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune'], 'pointe_rocheuse', 4,
 $$Pointe rocheuse plongeante sous le phare et l'abbaye, avec de la grande profondeur tout de suite au pied : c'est un poste à bar technique pour pêcheur aguerri. Tu attaques aux leurres (jerk/shad, topwater au petit jour) dans les remous et les veines de courant qui passent la pointe — meilleur en marée qui pousse, aube et crépuscule. Bar surtout, et lieu jaune dans la veine de courant et près des roches profondes, plutôt sur le marnage et les mois plus frais.$$,
 $$Tu te gares au parking du phare/abbaye à la Pointe Saint-Mathieu, puis tu rejoins l'estran par le GR34 qui longe la pointe. Descends prudemment sur les rochers en contrebas du phare (très glissants, semelles cloutées conseillées), repère ta sortie avant de t'installer et garde toujours un œil sur la houle.$$,
 array['ressac','rochers_glissants'], 'public', false),

-- #2 Phare du Petit Minou (Plouzané) — [satellite ✓ poste] rochers flanc SO sous le fort, à l'ouest du phare. Légalité OK (fort déclassé 2004).
($$Phare du Petit Minou$$, 'phare-du-petit-minou', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.6151, 48.3371), 4326)::geography,
 array['leurres','flottante'], array['bar','lieu_jaune','maquereau'], 'pointe_rocheuse', 3,
 $$Pointe rocheuse à l'entrée ouest du goulet de Brest, sous le phare : un classique des Brestois pour le bar aux leurres (surface et coulant) qui chasse dans le courant à la renverse, descendante de préférence. Le lieu jaune se prend le long des roches et tombants, et le maquereau passe en bancs l'été en pleine eau. Mise-toi sur les périodes de courant marqué autour des étales : c'est là que ça décroche le mieux.$$,
 $$Parking municipal d'une quarantaine de places à ~300 m en amont du phare, puis descente à pied par le GR34 vers la pointe et les roches sous le phare. Les meilleurs postes sont sur les rochers qui plongent dans le goulet, juste à l'ouest du phare : chaussures qui accrochent obligatoires, roches glissantes et houle, garde toujours un œil sur la mer.$$,
 array['courants_forts','rochers_glissants'], 'public', false),

-- #3 Pointe de Dinan (Crozon) — [satellite ✓ poste] estran rocheux flanc sud (la proposition d'origine était à ~5 km, quasi sur Pen-Hir).
($$Pointe de Dinan$$, 'pointe-de-dinan', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.5667, 48.2322), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune','vieille'], 'pointe_rocheuse', 4,
 $$Pointe rocheuse pleine ouest sur la mer d'Iroise, avec tombants de grès, failles, éboulis et laminaires qui retiennent le poisson — du costaud, difficulté justifiée. Le bar se tape au leurre de surface ou souple sur les courants qui lèchent les têtes de roche, surtout au coefficient et en début de descendante d'été à l'aube/au crépuscule ; le lieu jaune chasse plus bas le long des tombants, et la vieille casse dans la roche toute l'année. Spot d'effort : tu marches, tu cherches le bon poste balayé par le courant, et tu adaptes au ressac.$$,
 $$Depuis Crozon, direction Camaret puis route de Dinan : parking au bout (~5,5 km), puis environ 500 m à pied par le GR34 jusqu'à la pointe et l'arche du Château. Descends prudemment vers les postes rocheux en contrebas (sentes raides), repère ton créneau sur la marée et garde une marge avant que la mer remonte sur les écueils.$$,
 array['falaise','ressac','isolation'], 'public', false),

-- #4 Pointe du Millier (Beuzec-Cap-Sizun) — [satellite ✓ poste] platiers rocheux au pied de la pointe, sous le phare.
($$Pointe du Millier$$, 'pointe-du-millier', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.4667, 48.0993), 4326)::geography,
 array['leurres','flottante'], array['bar','lieu_jaune','maquereau'], 'pointe_rocheuse', 3,
 $$Pointe rocheuse au pied du phare du Millier, classique du Cap Sizun rive nord qui marque l'entrée de la baie de Douarnenez. Les courants latéraux longent fidèlement la côte, surtout en gros coef : tu lances tes leurres (5-30 g) en bordure de courant pour le bar, et tu tapes dans le maquereau l'été quand il chasse en surface. Le lieu jaune se prend sur les fonds rocheux à pleine eau ; descendante et début de montante en début/fin de journée sont les meilleurs créneaux.$$,
 $$Tu te gares au parking du phare du Millier (Beuzec-Cap-Sizun) puis tu descends par le sentier côtier GR34 jusqu'au pied de la pointe — le meilleur poste est sur les platiers rocheux côté ouest, accessibles surtout à marée basse. Descente raide et rochers glissants : chaussures crantées obligatoires, et garde un œil sur l'horaire de marée.$$,
 array['rochers_glissants','sentier_expose'], 'public', false),

-- #5 Plage de la Torche / Pors Carn (Plomeur) — [satellite ✓ zone] sable de la baie d'Audierne. Flags : zone surveillée baignade/surf l'été ; baïnes + noyades sur le platier (danger).
($$Plage de la Torche / Pors Carn$$, 'plage-de-la-torche', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.3517, 47.8364), 4326)::geography,
 array['surfcasting','leurres'], array['bar'], 'plage', 3,
 $$Référence surfcasting du pays Bigouden : la grande plage de sable de la baie d'Audierne file vers le nord depuis la pointe, plein ouest sur l'Atlantique, et concentre les bancs de sable et baïnes où chasse le bar. Tu tapes au lancer lourd dans les chenaux et les bordures de baïnes — meilleur sur les marées de vives-eaux à la montante, à la tombée du jour et de nuit, avec un peu de houle qui brasse. Bar surtout du printemps à l'automne ; en appoint, dorade et poissons plats sur le sable.$$,
 $$Accès facile en voiture : grand parking à la pointe de La Torche et un autre côté Pors Carn (commune de Penmarc'h), spot directement au pied. Pour le surfcasting, marche vers le nord sur la plage de baie d'Audierne pour t'écarter des baigneurs/surfeurs et trouver tes baïnes ; le GR34 longe la côte. Sur le platier rocheux de la pointe, prudence maximale et chaussures qui accrochent — des pêcheurs s'y noient, ne t'y aventure jamais seul, de nuit ou par houle.$$,
 array['vagues','courants_forts','submersion_maree'], 'public', false),

-- #6 Rochers de Saint-Guénolé (Penmarc'h) — [satellite ✓ poste] chaos rocheux au ras de l'eau (origine était dans le bourg). Lames de fond mortelles : danger max.
($$Rochers de Saint-Guénolé$$, 'rochers-de-saint-guenole', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.3819, 47.8206), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune'], 'pointe_rocheuse', 5,
 $$Chaos rocheux battu sur la pointe de Penmarc'h, un des spots à bar les plus réputés (et les plus durs) du pays bigouden. Tu lances le leurre dans les cuvettes et les passes entre les cailloux : bar surtout en eau brassée et houle formée, lieu jaune sur les fonds rocheux et les bordures d'algues. Ça pêche mieux quand la mer travaille, montante de coef moyen à fort, tôt le matin ou à la tombée du jour. C'est technique : fonds accrocheurs, mer rarement plate.$$,
 $$Accès à pied par le bourg de Saint-Guénolé puis le sentier GR34 qui longe les rochers ; parking au port ou côté Rocher du Préfet. Ne descends sur le platier qu'avec une mer calme et une marée qui descend, jamais dos à la houle — c'est ici que les lames de fond ont tué. Gilet/longe vivement conseillés, jamais seul.$$,
 array['vagues_scelerats','submersion_maree','rochers_glissants'], 'public', false),

-- #7 Pointe de Trévignon (Trégunc) — [satellite ✓ poste] avancée rocheuse (origine était dans le bourg).
($$Pointe de Trévignon$$, 'pointe-de-trevignon', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.8525, 47.7964), 4326)::geography,
 array['leurres','flottante'], array['bar','maquereau','sar'], 'pointe_rocheuse', 2,
 $$Pointe rocheuse classique du sud-Finistère, hyper réputée pour le bar : tu prospectes aux leurres le long des dalles et des cassures qui plongent autour de la pointe, surtout sur les coefs moyens à forts en marée descendante, à l'aube et au crépuscule. Le maquereau passe en bancs l'été en pleine eau, le sar se tient dans les trous de roche en pêche flottante. Depuis la digue du port voisin, la seiche tape bien à la tombée du jour.$$,
 $$Parking gratuit au bout de la route du port de Trévignon, puis tu accèdes à pied à la pointe et au sentier côtier GR34 qui longe les postes. Les meilleurs postes leurres sont sur l'avancée rocheuse ouest (corps de garde/château) ; rochers glissants et couverts d'algues à marée basse, chausse-toi en conséquence et repère ta sortie avant de descendre.$$,
 array['rochers_glissants'], 'public', false),

-- #8 Jetée du vieux port de Roscoff (Roscoff) — [satellite ✓ poste] môle en pierre incurvé du vieux port (origine était sur l'estran nord). Port actif.
($$Jetée du vieux port de Roscoff$$, 'jetee-du-vieux-port-de-roscoff', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.9812, 48.7248), 4326)::geography,
 array['flottante','leurres'], array['maquereau','orphie','vieille'], 'digue', 1,
 $$Le vieux môle et les quais du vieux port de Roscoff te donnent un poste facile et accessible, pile au cœur de la cité. En été, tu tapes le maquereau et l'orphie en surface à la flottante ou aux petits leurres/mitraillettes quand les bancs entrent avec la marée montante — le matin et le soir sortent du lot. Le long du pied de môle et des enrochements, fouille les blocs et les laminaires pour la vieille au ver ou au crabe.$$,
 $$Accès libre à pied : stationnement sur le quai Charles de Gaulle / aux abords du vieux port (centre historique, ça se remplit vite l'été), puis tu marches jusqu'au môle et aux quais. Prends le poste vers la sortie du port pour avoir du fond, attention au bord à pic sans rambarde et aux dalles glissantes à marée basse.$$,
 array['rochers_glissants'], 'public', false),

-- #9 Pointe de Primel (Plougasnou) — [satellite ✓ poste] tip de l'éperon rocheux (origine était en pleine eau). Natura 2000 = rester sur sentiers.
($$Pointe de Primel$$, 'pointe-de-primel', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.8272, 48.7157), 4326)::geography,
 array['leurres','flottante'], array['bar','lieu_jaune','vieille'], 'pointe_rocheuse', 3,
 $$Pointe granitique qui ferme la baie de Morlaix à l'est, presqu'île qui avance ~500 m dans la Manche avec des postes profonds dès le bord. Au leurre (shad, jerk, surface) le bar chasse sur les remous de la pointe à la montante et au coup du soir d'avril à novembre ; le lieu jaune tient le pied des roches en eau profonde, surtout aux marées de vives-eaux. À la flottante près des laminaires tu sors la vieille toute l'année. Les meilleurs coups : courant qui porte (descendante établie ou début de montante) plutôt qu'étale.$$,
 $$Parking au bout de la route à Primel-Trégastel (port du Diben / promenade de la Méloine), puis tu rejoins la pointe à pied par le GR34, 10-15 min. Les postes sont sur l'éperon rocheux côté large : descente raide et rochers très glissants au coup d'eau, prends des chaussures à bonne accroche et ne t'engage pas seul sur les plateformes basses par mer agitée.$$,
 array['rochers_glissants','ressac'], 'public', false),

-- #10 Aber Wrac'h — Sainte-Marguerite (Landéda) — [satellite ✓ zone] bord du chenal (origine était dans les terres). Vérifier signalétique concessions ostréicoles.
($$Aber Wrac'h — dunes de Sainte-Marguerite$$, 'aber-wrach-sainte-marguerite', '29', 'bretagne',
 ST_SetSRID(ST_MakePoint(-4.6068, 48.598), 4326)::geography,
 array['leurres','surfcasting'], array['bar','dorade_royale'], 'estuaire', 2,
 $$Embouchure de l'Aber Wrac'h, un vrai spot à bar en chasse : le brassage eau douce/eau de mer du jusant concentre les proies sur les pointes rocheuses et les fosses du chenal. Tu attaques aux leurres souples (shads, slugs) sur les premières heures de descendante et la basse étale, quand le bar tient le courant à l'embouchure ; dorade royale possible sur le sable au crabe/ver en été. La montante de printemps-automne reste la meilleure fenêtre sur les coefficients moyens à forts.$$,
 $$Parking côté dunes de Sainte-Marguerite (secteur camping Penn Enez / route de Sainte-Marguerite), puis tu rejoins le bord par le GR34 et les sentiers dunaires balisés — quelques minutes à pied. Les meilleurs postes sont les pointes rocheuses qui dominent le chenal côté embouchure ; chaussures qui accrochent obligatoires, et garde un œil sur l'heure de marée pour ne pas te faire piéger sur les bancs de sable.$$,
 array['courants_forts','submersion_maree'], 'public', false),

-- ========================= CÔTES-D'ARMOR (22) =========================

-- #11 Cap Fréhel — plateformes basses (Plévenon) — [satellite ✓ poste] plateforme rocheuse au ras de l'eau. ⚠️ RÉSERVE BAR : pêche du bar INTERDITE du 1er mars au 31 mai (arrêté DDAM 22 n°116/2005). Expert only.
($$Cap Fréhel — plateformes basses$$, 'cap-frehel', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.3197, 48.6852), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune','vieille'], 'pointe_rocheuse', 5,
 $$Le Cap Fréhel, c'est du gros poste rocheux : tu lances tes leurres (slug/shad) sur des fonds caillouteux et tombants où chassent le bar et le lieu jaune, la vieille tenant le coup juste au-dessus de la roche. Ça donne surtout de mai à octobre, sur les coefficients moyens à forts en début ou fin de montante quand le courant lèche les plateformes. Attention : la pêche du bar y est INTERDITE du 1er mars au 31 mai (réserve), reste sur lieu et vieille à cette période.$$,
 $$Parking payant juste avant le phare, puis tu rejoins le GR34. Les vrais postes sont les plateformes basses sous la falaise : descente raide, technique et dangereuse — repère ton accès à marée basse, vérifie ta sortie avant de t'engager et renonce dès que ça ressace. Réservé aux pêcheurs expérimentés, jamais seul ni à marée montante engagée.$$,
 array['falaise','ressac','isolation'], 'public', false),

-- #12 Sillon de Talbert (Pleubian) — [satellite ✓ zone] corps de la flèche de galets (origine était en pleine eau). RNR : pêche à la ligne OK (reclassement 2026 à surveiller).
($$Sillon de Talbert$$, 'sillon-de-talbert', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.0858, 48.8728), 4326)::geography,
 array['surfcasting','leurres'], array['bar','maquereau'], 'plage', 3,
 $$Flèche de galets de 3,2 km, la plus longue de France, qui s'avance plein nord-est entre les estuaires du Trieux et du Jaudy. Spot à bar exigeant : substrat mosaïque (sable, roche, vase) tout le long, ça pêche aux leurres souples (shad 5 pouces) et de surface dans 50-60 cm d'eau, et au surfcasting depuis les bordures. Les beaux poissons tombent souvent en longeant le sillon, et le bout vers le phare des Héaux est réputé pour les gros bars — mais il faut marcher pour y aller. Maquereau l'été en pleine eau sur les pointes.$$,
 $$Gare-toi à Pors Rand ou au Québo (~400 m de la base du sillon) et rejoins le départ par le GR34 / la rue du Sillon ; parking de secours à l'église de l'Armor. Les meilleurs postes sont sur le sillon lui-même et vers son extrémité (compte 3 km à pied sur galets) — cale ton horaire sur la marée car la brèche à 500 m et le bout ne passent qu'à mer basse/descendante.$$,
 array['submersion_maree','isolation'], 'public', false),

-- #13 Digue du port d'Erquy (Erquy) — [satellite ✓ poste] corps du môle Nord-Sud (origine était dans le bassin, sur les bateaux). Port de pêche actif.
($$Digue du port d'Erquy$$, 'digue-du-port-d-erquy', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.48141, 48.63603), 4326)::geography,
 array['flottante','leurres'], array['maquereau','orphie','sar'], 'digue', 1,
 $$Spot familial et facile : tu pêches au flotteur coulissant à tes pieds depuis le môle/la jetée du port d'Erquy, dans l'anse réputée comme l'une des plus poissonneuses de la baie de Saint-Brieuc pour les pélagiques. Le maquereau rentre en chasse d'avril à septembre (lamelle de maquereau ou train de plumes), l'orphie navigue en surface d'avril à octobre sur lamelle vive sous flotteur, et le sar se prend plutôt près des enrochements en appâts naturels. Vise les coefficients moyens à forts en montante/pleine mer quand le poisson se rapproche du bord.$$,
 $$Accès très simple à pied depuis le centre d'Erquy : parkings le long du boulevard de la Mer et près de la criée, puis tu rejoins le môle Nord-Sud (le grand brise-lames au pied du phare rouge et blanc) où se concentrent les postes. Reste sur la partie autorisée, ne gêne pas l'activité portuaire, et privilégie le bout du môle pour la profondeur quand la criée est calme.$$,
 array['rochers_glissants'], 'public', false),

-- #14 Môle du port d'Armor (Saint-Quay-Portrieux) — [satellite ✓ poste] môle extérieur après le coude (origine était sur les pontons).
($$Môle du port d'Armor$$, 'mole-du-port-d-armor', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.8163, 48.6492), 4326)::geography,
 array['flottante','leurres'], array['maquereau','orphie','bar'], 'digue', 1,
 $$Le môle du port d'Armor, c'est la grosse digue du seul port en eau profonde de la baie de Saint-Brieuc : profondeur sous le bout dès la basse mer, donc le poisson vient au pied. À la belle saison (juin-septembre) tu mitrailles le maquereau et l'orphie en surface à la plume ou au train de petits leurres, et tôt le matin / au coup du soir tu tentes le bar au leurre le long du parement. Vise la pleine mer et le début de descendante quand le courant balaie l'entrée du chenal.$$,
 $$Accès facile par la route du port d'Armor avec parking à proximité immédiate des môles (capitainerie / criée), pas de marche à faire. Poste-toi sur la digue extérieure (NE) côté large ; reste à l'écart des zones de manœuvre des bateaux et des quais de la criée, et prudence sur les sections sans garde-corps.$$,
 array['rochers_glissants'], 'public', false),

-- #15 Port de Gwin Zégal (Plouha) — [satellite ✓ poste] estran rocheux contre le port à pieux (origine était sur le plateau). Port à pieux repéré sans ambiguïté à l'imagerie.
($$Port de Gwin Zégal$$, 'port-de-gwin-zegal', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.89624, 48.70185), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune'], 'pointe_rocheuse', 4,
 $$Le port à pieux de Gwin Zégal, au pied des plus hautes falaises de Bretagne (~100 m), c'est de la pointe rocheuse pure : tu pêches les leurres aux abords du port et sur les cailloux qui plongent vite. Le bar tape bien au coup du soir et dans les deux heures qui encadrent la pleine mer, surtout par mer un peu formée et eau brassée ; le lieu jaune sort sur les zones profondes en fond de marée et hors saison estivale. Vise les têtes de roche et les remous au pied de falaise, et lance des leurres souples pour prospecter.$$,
 $$Pas d'accès direct en voiture jusqu'au poste : gare-toi côté Kersalic / Le Palus puis rejoins le port à pied par le GR34 (sentier des douaniers), descente raide et exposée vers la crique. Le meilleur poste, c'est les rochers de part et d'autre du port à pieux — laisse les bateaux amarrés tranquilles. Chaussures qui accrochent, pas seul si possible, et surveille la marée montante qui peut te couper la retraite au pied de la falaise.$$,
 array['sentier_expose','falaise','isolation'], 'public', false),

-- #16 Pointe du Roselier (Plérin) — [satellite ✓ poste] estran rocheux face NE (origine était sur le plateau au sommet). Côté nord OK ; sud = RNN baie de Saint-Brieuc (pêche à pied, pas la canne).
($$Pointe du Roselier$$, 'pointe-du-roselier', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.714, 48.5558), 4326)::geography,
 array['leurres','flottante'], array['bar','maquereau'], 'pointe_rocheuse', 3,
 $$Cap rocheux qui avance de plusieurs kilomètres dans la baie de Saint-Brieuc — du gros relief, des pointes et des cassures qui brassent bien le courant, terrain à bar classique. Tu tapes au leurre sur les postes rocheux en marée descendante et au montant de coef moyen-fort, surtout à l'aube et au crépuscule ; le maquereau passe en chasse l'été par eau claire et calme. Le côté ouest (côte du Goëlo) plonge en falaises escarpées, c'est là que se concentrent les bons postes.$$,
 $$Gare-toi gratuitement au parking de Martin-Plage puis rejoins le GR34 par la corniche : compte 30-45 min de marche pour les postes du cap, et descends prudemment les sentes vers l'estran (rocher très glissant). Reste sur le côté ouvert/nord de la pointe pour la canne — la zone au sud de la ligne Roselier→Grouin est en réserve naturelle (pêche à pied réglementée).$$,
 array['rochers_glissants','falaise'], 'public', false),

-- #17 Pointe de l'Arcouest (Ploubazlanec) — [satellite ✓ poste] estran rocheux à la cale (origine était dans le village). Port d'embarquement Bréhat actif.
($$Pointe de l'Arcouest$$, 'pointe-de-l-arcouest', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.0204, 48.8223), 4326)::geography,
 array['leurres','vif'], array['bar','lieu_jaune'], 'pointe_rocheuse', 3,
 $$Pointe de granit rose qui plonge dans le chenal du Trieux pile en face de Bréhat et de son champ de cailloux — l'eau y file fort, surtout au jusant, et c'est exactement ce qui attire le bar venu chasser dans le courant. Tape au leurre souple sur tête plombée lourde ou en surface au début du flot, quand les bars remontent l'estuaire et longent les pointes oxygénées ; lieu jaune accroché aux roches profondes et maquereau en pleine saison estivale. Les grandes marées et les premières heures du montant sont tes meilleurs créneaux.$$,
 $$Grand parking à l'embarcadère (Route de l'Embarcadère / Cornec) puis tu descends à pied vers la pointe et les rochers en bordure de la cale ; le GR34 longe le secteur si tu veux prospecter les avancées un peu à l'écart du port. Privilégie les rochers hors de la zone d'embarquement des Vedettes de Bréhat, prudence sur le granite humide à marée basse.$$,
 array['courants_forts'], 'public', false),

-- #18 Pointe du Château — Gouffre de Plougrescant — [satellite ✓ poste] plateau granitique à l'interface roche/eau (origine était en arrière). Castel Meur (maison) = privé, ne pas approcher.
($$Pointe du Château — Gouffre de Plougrescant$$, 'pointe-du-chateau-plougrescant', '22', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.2247, 48.8709), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune','vieille'], 'pointe_rocheuse', 4,
 $$Plateaux et îlots de granit qui plongent dans un courant de marée bien marqué — du vrai terrain à bar aux leurres. Les bars de passage chassent le long des têtes de roche, surtout au montant et à la tombée du jour ; le lieu jaune se prend en grattant les bordures rocheuses et les fosses en fin d'hiver/printemps, et la vieille répond au leurre souple posé près des roches toute la belle saison. Pêche les coefficients moyens à forts, eau brassée, c'est là que ça mord.$$,
 $$Tu te gares au parking du site du Gouffre puis tu suis le GR34 vers la pointe (10-15 min à pied). Les meilleurs postes sont sur les plateaux rocheux au nord/est de Castel Meur (la maison entre les rochers, propriété privée à ne pas approcher) — choisis une roche haute et sèche, le granit est traître quand il est mouillé, et ne reste jamais sur un îlot que le flot peut isoler.$$,
 array['ressac','rochers_glissants','vagues'], 'public', false),

-- ========================= ILLE-ET-VILAINE (35) =========================

-- #19 Pointe du Grouin (Cancale) — [satellite ✓ poste] cap rocheux (coord re-calée sur Wikipédia 48.7123/-1.8442 + confirmée — un agent avait dérivé). Réserve oiseaux île des Landes en face (ne pas débarquer).
($$Pointe du Grouin$$, 'pointe-du-grouin', '35', 'bretagne',
 ST_SetSRID(ST_MakePoint(-1.8442, 48.7123), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune','maquereau'], 'pointe_rocheuse', 3,
 $$Pointe rocheuse emblématique au nord de Cancale : des plateaux et tombants de roche balayés par un courant de marée puissant qui aspire le fourrage et concentre le bar et le lieu jaune. Tu chasses aux leurres sur les bordures rocheuses — stickbait/popper en surface à l'aube et au crépuscule, puis shads et jigs le long des tombants quand le poisson décroche. Le maquereau passe en bancs l'été en pleine eau ; le bar et le lieu se travaillent surtout en montante et début de descente, marées moyennes plutôt que les plus gros coef.$$,
 $$Tu te gares au grand parking de la pointe (sémaphore), pris d'assaut l'été, puis tu descends par les sentiers aménagés / le GR34 vers les postes rocheux du bord — compte un peu de marche et de la prudence sur la roche glissante. Repère ton poste et ton chemin de repli à marée basse avant de pêcher, les abords sont escarpés et exposés au vent.$$,
 array['courants_forts','falaise'], 'public', false),

-- #20 Môle des Noires (Saint-Malo) — [satellite ✓ poste] corps de la digue à mi-longueur (origine était en eau libre). NB : ne pêche QU'À marée haute (3-4 m d'eau).
($$Môle des Noires$$, 'mole-des-noires', '35', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.03166, 48.64409), 4326)::geography,
 array['flottante','leurres'], array['maquereau','orphie','bar'], 'digue', 2,
 $$Digue granitique de 500 m qui file vers le phare d'entrée de port, LE poste à maquereau classique de Saint-Malo intra-muros. Ça se pêche à marée haute (il faut 3-4 m d'eau) : d'avril à juin les bancs de maquereaux débarquent en masse, mitraillette ou petit jig/leurre type sandeel, et tu accroches souvent dans le premier quart d'heure. En prime des bars qui chassent dans les courants du chenal et de l'orphie en surface l'été. Préfère un ciel couvert au grand soleil.$$,
 $$Tu accèdes à pied par la base de la digue côté Plage du Môle / remparts intra-muros, stationnement dans les parkings de la vieille ville (payants, vite saturés l'été). Avance jusqu'au tiers extérieur près du phare pour les meilleurs postes, mais reste prudent sur le pavé glissant et garde un œil sur la mer côté large.$$,
 array['vagues'], 'public', false),

-- #21 Plage du Sillon (Saint-Malo) — [satellite ✓ zone] sable mi-estran (origine était dans le tissu urbain). Flag : plage surveillée, pêche interdite zone de bain 8h-20h l'été (pratique de nuit).
($$Plage du Sillon$$, 'plage-du-sillon', '35', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.0052, 48.6569), 4326)::geography,
 array['surfcasting'], array['bar','dorade_royale'], 'plage', 2,
 $$Grande plage urbaine de sable de 3 km, terrain de jeu classique du surfcasting malouin. Tu lances de nuit (interdit en zone de bain le jour l'été) sur le ressac, une canne sur le gros poisson au loin, une autre plus court sur la dorade. Le bar donne bien au montant et sur les coefs forts du printemps à l'automne ; la dorade royale se cale plutôt sur l'été, à la tombée du jour et sur l'eau qui pousse.$$,
 $$Accès direct depuis la digue/promenade du Sillon — stationnement le long du front de mer (chargé l'été, vise les heures creuses) puis descente par les cales sur le sable. Privilégie une section hors du cœur baigné (vers Rochebonne) et surveille ta montante : sur ce marnage extrême (parmi les plus forts d'Europe) la mer revient vite, garde une porte de sortie vers la cale.$$,
 array['submersion_maree','vagues'], 'public', false),

-- #22 Pointe de la Varde (Saint-Malo / Rothéneuf) — [satellite ✓ zone, confiance moyenne] estran rocheux versant SO (origine était sur le plateau ; pointe à postes multiples). Site Conservatoire (rester sur sentiers).
($$Pointe de la Varde$$, 'pointe-de-la-varde', '35', 'bretagne',
 ST_SetSRID(ST_MakePoint(-1.9899, 48.6816), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','orphie'], 'pointe_rocheuse', 2,
 $$Première grande pointe rocheuse à l'est de Saint-Malo, avec des plateaux et casiers de roche qui offrent des postes à l'abri du courant comme d'autres bien exposés. Le bar circule autour des plateaux aux changements de marée (top de juin à novembre) — leurre souple ou stickbait sur les zones agitées, et flottante/bouchon dans les anses plus calmes. En été tu y trouves aussi maquereau et orphie de passage, et le sar tape près des roches dans les remous.$$,
 $$Tu te gares côté Rothéneuf (plage du Val / parking de la Varde) puis tu rejoins la pointe par le GR34 qui en fait le tour — reste sur les sentiers balisés, le site est protégé (Conservatoire du littoral, bunkers interdits). Descends prudemment sur l'estran rocheux : roches très glissantes (algues), chaussures antidérapantes obligatoires, et ne t'engage pas sur les plateaux bas sans avoir calé l'heure de basse mer.$$,
 array['rochers_glissants'], 'public', false),

-- #23 Pointe du Moulinet (Dinard) — [satellite ✓ poste] bord rocheux pointe nord (origine était sur la plage de l'Écluse). Courants forts (aval barrage Rance) + ferry à proximité.
($$Pointe du Moulinet$$, 'pointe-du-moulinet', '35', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.05, 48.6385), 4326)::geography,
 array['leurres','flottante'], array['bar','sar','orphie'], 'pointe_rocheuse', 2,
 $$Pointe rocheuse à la sortie de l'estuaire de la Rance, face à Saint-Malo : c'est un ancien village de pêcheurs qui chassaient déjà le bar et le maquereau ici. Tu lances aux leurres sur les chasses de bar quand le courant déboule à marée descendante, et tu prends de l'orphie à la flottante en surface dès que l'eau se réchauffe l'été. Le sar se cale sur les roches et les failles près du bord à marée haute. Le courant fort de l'estuaire concentre le poisson — c'est un atout autant qu'un point de vigilance.$$,
 $$Accès urbain ultra-facile : tu te gares dans Dinard (boulevard Féart / plage de l'Écluse) puis tu rejoins la pointe à pied par la promenade du Clair de Lune, qui longe la Rance entre le Moulinet et la plage du Prieuré. Les meilleurs postes sont sur les avancées rocheuses du nord-est face à Saint-Malo ; descends prudemment, les roches sont glissantes et la marée remonte vite.$$,
 array['courants_forts','rochers_glissants'], 'public', false),

-- ========================= MORBIHAN (56) =========================

-- #24 Pointe du Percho (Saint-Pierre-Quiberon) — [satellite ✓ poste] estran rocheux du tip (origine légèrement en retrait). Côte Sauvage = vagues scélérates (accidents mortels).
($$Pointe du Percho$$, 'pointe-du-percho', '56', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.1601, 47.5242), 4326)::geography,
 array['leurres'], array['bar','lieu_jaune'], 'pointe_rocheuse', 3,
 $$Pointe granitique plein ouest qui marque l'extrémité nord de la Côte Sauvage de Quiberon, repérable de loin à sa ruine de maison des douaniers. C'est un classique du bar au leurre : tu prospectes les remous et l'écume au pied des rochers, à l'aube ou à la tombée du jour, idéalement par houle modérée (1-2 m) quand les bars chassent dans le bouillon. Leurres de surface (stickbaits) au lever du jour, puis shads/jerks plus profonds dans la journée ; le lieu jaune répond aussi sur les zones de roche, surtout en automne et début d'hiver.$$,
 $$Tu te gares au petit port de Portivy (ou au parking de Kergroix sur la route de Port-Blanc, l'été quand Portivy est saturé) puis tu rejoins la pointe à pied par le GR34, le sentier des douaniers, en quelques minutes. Descends prudemment vers les postes en bord de roche, terrain glissant et exposé. Vagues scélérates récurrentes sur la Côte Sauvage : ne tourne jamais le dos à la mer, évite par fort coef + houle d'ouest.$$,
 array['ressac','rochers_glissants','vagues_scelerats'], 'public', false),

-- #25 Grande plage de Gâvres (Gâvres) — [satellite ✓ zone] sable côté bourg (origine était sur la laisse de mer). Massif dunaire protégé (sentiers balisés). Baïnes = danger.
($$Grande plage de Gâvres$$, 'grande-plage-de-gavres', '56', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.35015, 47.69425), 4326)::geography,
 array['surfcasting'], array['bar','dorade_royale'], 'plage', 2,
 $$Le plus long cordon dunaire de Bretagne, tombolo de Gâvres orienté sud/sud-ouest plein Atlantique : du sable fin à moyen, des baïnes et des fosses qui concentrent le poisson sur les grands traits. Tu cherches le bar au surfcasting de nuit ou au coup du soir sur le montant, à la mer brassée après un coup de vent ; la dorade royale se prend l'été (juin-septembre) sur ver, crabe mou ou couteau dans les cuvettes. Repère tes fosses à basse mer, plante tes lignes dans les baïnes et laisse travailler la marée.$$,
 $$Accès facile par le bourg de Gâvres : parking au bout de la presqu'île puis tu attaques la grande plage le long du Boulevard de l'Océan, postes les plus accessibles côté bourg. Plus tu descends vers Plouhinec, plus c'est sauvage et tranquille — mais traverse les dunes uniquement par les sentiers balisés (site protégé), et méfie-toi des baïnes (courant de retour traître au montant).$$,
 array['courants_forts','submersion_maree'], 'public', false),

-- #26 Port-Navalo — passe du Golfe (Arzon) — [satellite ✓ poste] estran rocheux flanc SO face à la passe (origine était en eau libre). Un des courants les plus violents d'Europe. Zone 100 m portuaire interdite.
($$Port-Navalo — passe du Golfe$$, 'port-navalo', '56', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.9194, 47.5463), 4326)::geography,
 array['leurres','vif'], array['bar','dorade_royale','lieu_jaune'], 'passe', 4,
 $$La pointe ouest du phare, à l'entrée du golfe : tu pêches la passe la plus brassée de Bretagne sud. Les bordures rocheuses tapissées de moules et léchées par le courant tiennent du poisson toute l'année. Vise les renverses et l'étale de courant (qui tombe ~45 min après l'étale de marée) au leurre souple ou au shad couleur sable : bar et lieu jaune chassent les lançons piégés par le courant, surtout au jusant. La dorade royale se prend aux appâts naturels (crabe, ver) sur les contre-courants des pointes rocheuses du printemps à l'automne — le golfe est l'un des meilleurs coins de France pour elle. Coef idéal au leurre : 50-80, pas plus, sinon c'est impêchable.$$,
 $$Tu te gares au parking de Sanso (navette Arzibus gratuite l'été vers l'embarcadère) ou près de la plage de Port-Navalo, puis tu suis la promenade de la corniche / GR34 jusqu'au phare. Le meilleur poste est sur les rochers juste à l'ouest du phare, face à la passe (reste hors de la zone des 100 m portuaire) — descends prudemment, ça glisse, et garde tes appuis avec le courant qui monte vite.$$,
 array['courants_forts','rochers_glissants'], 'public', false),

-- #27 Pointe du Grand Mont (Saint-Gildas-de-Rhuys) — [satellite ✓ poste] tip rocheux côté sud (origine était sur un haut-fond immergé au large, ramenée à terre).
($$Pointe du Grand Mont$$, 'pointe-du-grand-mont', '56', 'bretagne',
 ST_SetSRID(ST_MakePoint(-2.8442, 47.4961), 4326)::geography,
 array['leurres','surfcasting'], array['bar','sar','dorade_royale'], 'pointe_rocheuse', 3,
 $$La pointe la plus marquée de la presqu'île de Rhuys, façade sud (Mor Braz), avec des petits fonds rocheux de 2 à 6 m et des trous à sargasses qui concentrent le poisson. Tu prospectes le bar aux leurres le long des cassures rocheuses, en marée montante et sur les coups du matin/soir ; les postes mixtes roche/sable au pied de la pointe te donnent aussi du sar et de la dorade royale en été. Spot exposé plein large, parfait quand il y a un peu de mouvement pour activer les bars.$$,
 $$Tu te gares au parking du Grand Mont (ou près de l'abbatiale en centre-bourg si plein) et tu descends sur la pointe par le GR34, compte 10-15 min à pied. Le meilleur poste est la roche en bout de pointe côté sud : avance prudemment, les dalles sont très glissantes et la houle peut balayer le bas de l'estran — ne te poste jamais dos à la mer.$$,
 array['rochers_glissants','vagues'], 'public', false),

-- #28 Barre d'Étel — rive Plouhinec (Plouhinec 56, le Magouër) — [satellite ✓ poste] affleurement rocheux au pied du sémaphore (origine était en pleine eau de la barre). NB homonyme : Plouhinec existe aussi en 29 ; ici c'est bien le 56.
($$Barre d'Étel — rive Plouhinec$$, 'barre-d-etel', '56', 'bretagne',
 ST_SetSRID(ST_MakePoint(-3.2144, 47.643), 4326)::geography,
 array['leurres','surfcasting'], array['bar','dorade_royale'], 'estuaire', 3,
 $$Tu pêches l'embouchure de la ria d'Étel, à la pointe du Magouër côté sémaphore — la fameuse barre. Le bar chasse dans le courant et sur les bordures de la fosse, surtout au début du jusant et à la tombée du jour : leurre souple ou jerk lancé en travers du flux, tu laisses dériver dans la veine. La dorade royale arrive sur les bancs de sable et coquillages de mai à septembre, au crabe/couteau en surfcasting près de l'étale. Saison forte au printemps et en automne sur le bar.$$,
 $$Tu vises le bourg du Magouër à Plouhinec : parking près du port/sémaphore, puis tu descends à pied sur la pointe (le GR34 longe la rive). Les meilleurs postes sont sur les rochers et le sable au pied du sémaphore, face à la barre — gaffe au sol glissant et au courant, ne te laisse pas piéger par la marée montante qui recouvre vite les bancs. Gilet/longe recommandés sur les postes bas.$$,
 array['courants_forts','submersion_maree','vagues'], 'public', false);

-- =====================================================================
-- Après insertion : vérifier sur /carte que les 28 pins tombent au bon
-- endroit (ils ont été calés au satellite mais un dernier coup d'œil ne fait
-- pas de mal), puis passer verified=true spot par spot.
-- Les 6 "zones" (plages/grandes pointes) #5 #10 #12 #21 #22 #25 ont un point
-- d'accès représentatif, pas un poste unique — normal pour ces structures.
-- =====================================================================
