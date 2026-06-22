-- =====================================================================
-- Carnet de Pêche — LOT 4 de curation de spots (Manche, 26 spots)
-- =====================================================================
-- ✅ INSÉRÉ EN PROD le 2026-06-22 via MCP execute_sql (OK explicite de John).
--    La prod passe de 83 à 109 spots (50=8, 76=6, 14=4, 62=5, 59=3).
--    Vérifié : 26/26 geom_public généré (trigger), visibility=public, verified=false,
--    flou GPS 503-877 m. NE PAS REJOUER (doublons de slug). Fichier conservé comme trace.
--
-- Façade Manche → Hauts-de-France : ouvre la 2ᵉ façade (zéro spot dessus
-- jusqu'ici). Départements : 50 (×8) · 76 (×6) · 14 (×4) · 62 (×5) · 59 (×3).
-- La Somme (80) est volontairement EXCLUE (liste canonique des 24 dépts
-- côtiers, sprint 11.6). Résultat attendu : 83 → 109 spots, 3 façades.
--
-- Pipeline de qualité appliqué (2026-06-22) :
--   1. Proposition + coordonnées VÉRIFIÉES SUR OPENSTREETMAP (nœuds réels :
--      phares, caps, digues, jetées, plages) — docs/sprint-10/lot-4-manche.md.
--      Coords NON re-géocodées (consigne John : confiance OSM).
--   2. Confirmation schéma prod (supabase-guard, lecture seule) :
--      geom = geography(Point,4326) → cast ::geography ; structure ∈ CHECK
--      {digue,plage,pointe_rocheuse,estuaire,cale,passe,cassure} ; techniques
--      /species = text[] libres ; visibility CHECK {public,subscriber,private}
--      défaut 'subscriber' → on force 'public' ; verified défaut false.
--   3. Confirmation satellite (ortho Esri) de chaque coordonnée
--      → docs/sprint-10/lot-4-verification.md.
--      Résultat : 22 coords OK (dont 5 spots de port marqués '*' au brief =
--      pin sur le bassin, musoir dans le flou 1 km, anticipé). 4 coords étaient
--      DÉCALÉES hors structure → CORRIGÉES au satellite (signalées spot par spot
--      ci-dessous, originaux OSM notés pour revert) :
--        #9  Sainte-Adresse : falaise → estran (~70 m O).
--        #10 Étretat        : plein bourg → plage de galets (~160 m O).
--        #16 Port-en-Bessin : ~800 m DANS LES TERRES (nœud OSM faux) → môle du port.
--        #19 Cap Gris-Nez   : plateau agricole → rochers au ras de l'eau (~250 m O/NO).
--      ✅ John a validé GARDER ces 4 corrections satellite (2026-06-22).
--      Insertion sous validation (pas d'écriture MCP sans OK explicite, §20.4).
--
-- Conventions (identiques aux lots 1-3) :
--   • geom en GEOGRAPHY : ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography.
--     ⚠️ ST_MakePoint prend (lng, lat) dans cet ordre.
--   • geom_public (flou ~1 km) généré par le trigger spots_blur → NE PAS écrire.
--   • visibility = 'public' explicite (défaut table = 'subscriber').
--   • verified = false (passé à true par John après revue terrain/satellite).
--   • Danger marée/falaise/courant EXPLICITE pour les postes exposés
--     (#1 Hague, #2 Barfleur, #6 Granville, #7 Agon, #10 Étretat, #15 Orne,
--      #19 Gris-Nez, #20 Blanc-Nez, #25 Gravelines) — responsabilité produit.
--
-- Insertion après validation : Supabase Studio → SQL Editor → coller → Run
-- (ou via MCP execute_sql après OK de John).
-- =====================================================================

insert into public.spots
  (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values

-- ========================= MANCHE (50) — Cotentin =========================

-- #1 Cap de la Hague — Goury (Auderville) — EXPOSÉ : face au Raz Blanchard.
($$Cap de la Hague — Goury$$, 'cap-de-la-hague-goury', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.94442, 49.71570), 4326)::geography,
 array['leurres','vif'], array['bar','lieu_jaune','vieille'], 'pointe_rocheuse', 5,
 $$Platiers rocheux autour du petit port de Goury, à la pointe extrême du Cotentin, face au Raz Blanchard — l'un des courants de marée les plus violents d'Europe. C'est un poste d'expert : tu pêches le bar et le lieu jaune au leurre (shad lourd, jig) ou au vif dans les veines et les contre-courants qui lèchent les roches, et la vieille casse dans les blocs au ras du bord. Le seul créneau vraiment pêchable, c'est autour des étales et sur la renverse de courant — en plein flux, le Raz est impraticable. Vise les coefficients modérés, par mer maniable : ici la mer commande.$$,
 $$Tu te gares au petit port de Goury (Auderville), au bout de la D401, puis tu rejoins les platiers à pied. ⚠️ Poste extrême et isolé, face au Raz Blanchard : courants démentiels, rochers très glissants, secteur sans secours rapide. Ne descends jamais seul, cale-toi impérativement sur l'étale et la renverse, garde une marge avant que le courant reprenne, et renonce dès que ça forcit. Réservé aux pêcheurs expérimentés qui maîtrisent les horaires de marée du Raz.$$,
 array['courants_forts','rochers_glissants','isolation'], 'public', false),

-- #2 Pointe de Barfleur — phare de Gatteville — EXPOSÉ : platier + courants + submersion.
($$Pointe de Barfleur — phare de Gatteville$$, 'pointe-de-barfleur-gatteville', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.26584, 49.69645), 4326)::geography,
 array['leurres','flottante'], array['bar','lieu_jaune','maquereau','vieille'], 'pointe_rocheuse', 4,
 $$Vaste platier rocheux au pied du phare de Gatteville (le deuxième plus haut de France), à la pointe nord-est du Cotentin. Le bar chasse aux leurres — surface au petit jour, shad ou jerk en journée — sur les remous et les bordures de roche ; le lieu jaune tient les zones profondes et les tombants, le maquereau passe en bancs l'été et la vieille répond à la flottante près des laminaires. Les courants de la pointe sont marqués : pêche les abords des étales et le début de courant, sur coefficient moyen, c'est là que ça décroche.$$,
 $$Parking au pied du phare de Gatteville (Gatteville-le-Phare), puis tu accèdes directement au platier. ⚠️ Le platier est immense et plat : la mer remonte vite et loin (risque de submersion), les rochers sont couverts d'algues glissantes et les courants au large de la pointe sont forts. Repère ta sortie avant de t'avancer, surveille la pendule de marée et ne te poste jamais dos à la houle sur les roches du large.$$,
 array['courants_forts','rochers_glissants','submersion_maree'], 'public', false),

-- #3 Saint-Vaast-la-Hougue — digue / fort de la Hougue — abrité, familial.
($$Saint-Vaast-la-Hougue — digue de la Hougue$$, 'digue-de-saint-vaast', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.26406, 49.58805), 4326)::geography,
 array['flottante','leurres'], array['bar','maquereau','dorade_royale'], 'digue', 1,
 $$La digue du port de Saint-Vaast file vers le fort de la Hougue (Vauban) dans une baie bien abritée : un poste facile et familial, idéal pour débuter ou sortir avec les enfants. Tu pêches à la flottante à tes pieds — maquereau et petits poissons l'été quand les bancs entrent avec la marée — et au leurre léger pour tenter le bar le long des enrochements au coup du soir. La dorade royale se prend en été sur les fonds de sable et de zostères de la baie, au crabe ou au ver, sur la pleine mer.$$,
 $$Accès très simple à pied depuis le port de Saint-Vaast-la-Hougue : parking sur le quai, puis tu marches sur la digue vers le fort. Poste abrité et accessible ; attention quand même au bord et aux pierres glissantes à marée basse. Reste à l'écart des zones de manœuvre des bateaux et des parcs ostréicoles de la baie.$$,
 array[]::text[], 'public', false),

-- #4 Digue de Querqueville (Cherbourg) — grande rade, exposé gros temps.
($$Digue de Querqueville$$, 'digue-de-querqueville', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.66360, 49.67168), 4326)::geography,
 array['leurres','flottante','surfcasting'], array['bar','maquereau','lieu_jaune'], 'digue', 2,
 $$La grande digue de Querqueville ferme la rade de Cherbourg côté ouest : un long ouvrage en pierre où tu prospectes large. Le bar tape au leurre le long du parement et dans les courants de la rade, surtout à l'aube et au crépuscule en marée qui pousse ; le maquereau se mitraille en surface l'été et le lieu jaune sort sur les enrochements profonds. Pêche les coefficients moyens à forts et les changements de marée pour activer le poisson.$$,
 $$Tu te gares près du fort / de la plage de Querqueville (ouest de Cherbourg) puis tu rejoins la digue à pied. ⚠️ Ouvrage exposé : par gros temps la houle passe par-dessus, n'y va pas. Prudence sur les blocs glissants et les sections sans garde-corps, et garde un œil sur la mer côté large.$$,
 array['vagues'], 'public', false),

-- #5 Cap de Carteret (Barneville-Carteret) — platiers de schiste, côte ouest.
($$Cap de Carteret$$, 'cap-de-carteret', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.80851, 49.37277), 4326)::geography,
 array['leurres','flottante'], array['bar','lieu_jaune','maquereau'], 'pointe_rocheuse', 3,
 $$Le cap de Carteret dresse ses platiers de schiste sous le phare, sur la côte ouest du Cotentin, face aux îles anglo-normandes. Le bar chasse aux leurres (souples et surface) le long des roches et dans les courants qui longent le cap ; le lieu jaune tient les fonds rocheux et le maquereau passe l'été. Les meilleurs coups : marée descendante établie et début de montante, sur coefficient moyen à fort, à l'aube ou à la tombée du jour.$$,
 $$Parking au phare de Carteret (Barneville-Carteret), puis tu descends sur les platiers par les sentiers côtiers. ⚠️ Rochers très glissants (schiste + algues) et courants forts au large du cap : chaussures qui accrochent obligatoires, repère ta sortie et ne t'engage pas sur les plateaux bas par mer formée ou marée montante engagée.$$,
 array['rochers_glissants','courants_forts'], 'public', false),

-- #6 Pointe du Roc (Granville) — EXPOSÉ : marnage énorme (baie du Mont-St-Michel).
($$Pointe du Roc — Granville$$, 'pointe-du-roc-granville', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.61418, 48.83410), 4326)::geography,
 array['leurres','flottante'], array['bar','maquereau','vieille'], 'pointe_rocheuse', 3,
 $$La pointe du Roc domine Granville de son sémaphore et de son phare, avec des postes rocheux tout autour qui plongent vers la baie du Mont-Saint-Michel — là où le marnage est l'un des plus forts d'Europe (jusqu'à ~14 m de différence entre haute et basse mer). Le bar et le maquereau chassent aux leurres et à la flottante sur les bordures de roche, la vieille casse dans les blocs. Tu pêches les abords des étales et les coups du matin/soir : avec un tel marnage, le niveau d'eau et le courant changent extrêmement vite.$$,
 $$Tu te gares en haut de la pointe du Roc (sémaphore / phare, à Granville) puis tu descends sur les postes rocheux. ⚠️ Marnage gigantesque et montée d'eau très rapide : la mer revient à toute vitesse et peut t'isoler sur un caillou en quelques minutes. Cale-toi impérativement sur l'horaire de marée, repère ta retraite avant de pêcher, et méfie-toi des courants forts et des roches glissantes.$$,
 array['courants_forts','submersion_maree','rochers_glissants'], 'public', false),

-- #7 Pointe d'Agon (Agon-Coutainville) — EXPOSÉ : montée de marée très rapide.
($$Pointe d'Agon$$, 'pointe-d-agon', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.57551, 49.00165), 4326)::geography,
 array['surfcasting','leurres'], array['bar','dorade_royale'], 'plage', 2,
 $$La pointe d'Agon est une longue flèche de sable à l'embouchure du havre de Régneville, un secteur réputé pour le bar au surfcasting et au leurre. Tu cherches le poisson dans les chenaux et les bordures du havre : à la descendante quand l'eau vide le havre et concentre les proies, et sur le montant qui ramène le bar à la côte. La dorade royale se prend l'été sur le sable, au crabe ou au ver. Le coup du soir et la nuit, sur eau brassée, sortent les meilleurs poissons.$$,
 $$Accès depuis Agon-Coutainville, parking côté pointe puis marche sur la flèche de sable. ⚠️ DANGER MARÉE MAJEUR : sur ce littoral à fort marnage, la mer remonte extrêmement vite et contourne la pointe — on s'y fait piéger et des gens s'y sont noyés. Ne t'avance jamais sans avoir calé l'horaire de marée, garde toujours une porte de sortie vers la dune, et méfie-toi des courants à l'embouchure du havre.$$,
 array['submersion_maree','courants_forts'], 'public', false),

-- #8 Diélette (Flamanville) — digue du port. ⚠️ proximité centrale.
($$Diélette — digue du port$$, 'digue-de-dielette', '50', 'normandie',
 ST_SetSRID(ST_MakePoint(-1.86613, 49.54888), 4326)::geography,
 array['leurres','flottante','surfcasting'], array['bar','lieu_jaune','maquereau'], 'digue', 2,
 $$La digue du port de plaisance de Diélette t'offre un poste accessible sur la côte ouest du Cotentin. Le bar tape au leurre le long de la digue et à l'entrée du port, surtout à l'aube et au crépuscule en marée montante ; le lieu jaune sort sur les enrochements et le maquereau passe en surface l'été. Pêche les coefficients moyens à forts et les changements de marée.$$,
 $$Parking au port de Diélette (commune de Flamanville), poste au pied. ⚠️ Le port jouxte la centrale nucléaire de Flamanville : confirme les zones de pêche autorisées sur place (signalétique, capitainerie) avant de t'installer. Ouvrage exposé à la houle par gros temps, prudence sur les blocs glissants.$$,
 array['vagues'], 'public', false),

-- ====================== SEINE-MARITIME (76) — Pays de Caux ======================

-- #9 Le Havre — Sainte-Adresse / Cap de la Hève — perré + estran, exposé houle.
-- COORD CORRIGÉE satellite (origine OSM 49.51676,0.06721 tombait sur la falaise ;
-- recalée ~70 m OUEST sur l'estran de la plage — vérif fix_ok).
($$Sainte-Adresse — Cap de la Hève$$, 'sainte-adresse-cap-de-la-heve', '76', 'normandie',
 ST_SetSRID(ST_MakePoint(0.06600, 49.51650), 4326)::geography,
 array['surfcasting','leurres','flottante'], array['bar','maquereau','orphie'], 'plage', 2,
 $$Le perré et l'estran de galets de Sainte-Adresse remontent vers le pied du cap de la Hève, à la sortie nord du Havre : un grand spot de surfcasting et de pêche au leurre face à la baie de Seine. Le bar donne au lancer dans le ressac, une canne posée sur le large, sur le montant et de nuit ; le maquereau et l'orphie passent en surface l'été et se prennent à la flottante ou au petit leurre. Vise les coefficients moyens à forts, par eau un peu brassée après un coup de vent.$$,
 $$Accès facile depuis Sainte-Adresse (ouest du Havre) : stationnement le long du front de mer, puis tu descends sur le perré et les galets. ⚠️ Ouvrage et estran exposés à la houle de baie de Seine ; prudence sur les galets glissants et au pied du cap (reste à l'écart des falaises instables de la Hève).$$,
 array['vagues'], 'public', false),

-- #10 Étretat — plage de galets — EXPOSÉ : chutes de pierres + marée qui coupe le retour.
-- COORD CORRIGÉE satellite (origine OSM 49.70746,0.20319 tombait en plein bourg ;
-- recalée ~160 m OUEST sur la plage de galets / front de mer — vérif fix_ok).
($$Étretat — plage de galets$$, 'plage-d-etretat', '76', 'normandie',
 ST_SetSRID(ST_MakePoint(0.20080, 49.70780), 4326)::geography,
 array['surfcasting','leurres'], array['bar','maquereau'], 'plage', 3,
 $$La plage de galets d'Étretat, encadrée par les falaises les plus célèbres de Normandie, est un beau spot de bord — à condition de respecter le terrain. Tu pêches le bar au surfcasting et au leurre dans le ressac, au coup du soir et de nuit sur le montant, et le maquereau passe l'été. Le plus simple reste de pêcher depuis le cœur de la plage, devant le village ; les postes au pied des falaises (vers la Manneporte ou l'Aiguille) ne se tentent qu'avec une marée bien étudiée.$$,
 $$Parking dans Étretat puis accès direct à la plage de galets. ⚠️ DOUBLE DANGER : (1) chutes de pierres au pied des falaises, qui s'éboulent régulièrement — ne t'installe pas collé à la paroi ; (2) la marée montante coupe le retour si tu t'es éloigné sous les falaises, et on s'y retrouve piégé. Reste sur la plage centrale, ou si tu vas sous les falaises, cale-toi sur l'horaire de basse mer et reviens largement avant la montante.$$,
 array['falaise','submersion_maree','rochers_glissants'], 'public', false),

-- #11 Fécamp — jetée (phare).
($$Fécamp — jetée du phare$$, 'jetee-de-fecamp', '76', 'normandie',
 ST_SetSRID(ST_MakePoint(0.36329, 49.76563), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','maquereau','orphie'], 'digue', 1,
 $$La jetée de Fécamp file vers son phare à l'entrée du port, au pied des hautes falaises du pays de Caux : un poste simple et accessible avec du fond au bout. Tu pêches à la flottante et au leurre — bar le long du parement et à l'entrée du chenal au coup du soir, maquereau et orphie en surface l'été quand les bancs entrent avec la marée. Privilégie la pleine mer et le début de descendante.$$,
 $$Accès à pied depuis le front de mer de Fécamp, stationnement à proximité du port, puis tu rejoins la jetée et son musoir au phare. ⚠️ Ouvrage exposé : par gros temps et grosse houle, la jetée prend des paquets de mer, n'y va pas. Prudence sur le sol glissant et les sections sans garde-corps.$$,
 array['vagues'], 'public', false),

-- #12 Dieppe — jetées de l'avant-port.
($$Dieppe — jetées de l'avant-port$$, 'jetees-de-dieppe', '76', 'normandie',
 ST_SetSRID(ST_MakePoint(1.08881, 49.93257), 4326)::geography,
 array['flottante','leurres'], array['bar','maquereau','orphie'], 'digue', 1,
 $$Les jetées de l'avant-port de Dieppe (côté Ouest et côté Pollet) encadrent l'entrée du port : des postes faciles, classiques de la pêche dieppoise. Tu tapes le bar au leurre et à la flottante à l'entrée du chenal, surtout en marée montante et au coup du soir, et le maquereau comme l'orphie en surface l'été. Vise la pleine mer et les courants d'entrée de port.$$,
 $$Accès à pied depuis le front de mer ou le quartier du Pollet à Dieppe, stationnement à proximité. ⚠️ Ouvrage exposé à la houle de Manche, fermé par gros temps : ne t'y aventure pas quand ça déferle. Prudence sur les pierres glissantes et respecte l'activité du port (ferry, pêche).$$,
 array['vagues'], 'public', false),

-- #13 Saint-Valery-en-Caux — jetées.
($$Saint-Valery-en-Caux — jetées$$, 'jetees-de-saint-valery-en-caux', '76', 'normandie',
 ST_SetSRID(ST_MakePoint(0.71085, 49.86599), 4326)::geography,
 array['flottante','leurres'], array['bar','maquereau'], 'digue', 1,
 $$Les jetées du port de Saint-Valery-en-Caux s'ouvrent entre deux falaises du pays de Caux : un poste facile et plutôt abrité dans une jolie entaille de la côte. Tu pêches à la flottante et au leurre — bar à l'entrée du chenal au coup du soir et en montante, maquereau en surface l'été. Pleine mer et début de descendante sont les meilleurs créneaux.$$,
 $$Accès à pied depuis le port de Saint-Valery-en-Caux, stationnement à proximité, puis tu rejoins les jetées. ⚠️ Ouvrage exposé à la houle par gros temps ; prudence sur le sol glissant et les bords sans protection, et respecte l'activité du port.$$,
 array['vagues'], 'public', false),

-- #14 Le Tréport — jetée Ouest.
($$Le Tréport — jetée Ouest$$, 'jetee-du-treport', '76', 'normandie',
 ST_SetSRID(ST_MakePoint(1.37140, 50.06120), 4326)::geography,
 array['flottante','surfcasting','leurres'], array['bar','maquereau'], 'digue', 1,
 $$La jetée Ouest du Tréport et la digue de galets qui la prolonge ferment l'estuaire de la Bresle, au pied des falaises : un poste classique de la Côte d'Albâtre. Tu pêches le bar au leurre et à la flottante à l'entrée du port et le long de la digue, et tu tapes au surfcasting depuis les galets pour chercher le poisson au large. Maquereau en surface l'été ; vise le montant et la pleine mer.$$,
 $$Accès à pied depuis le front de mer du Tréport, stationnement à proximité, puis jetée Ouest et digue de galets. ⚠️ Ouvrage exposé à la houle, paquets de mer par gros temps — n'y va pas quand ça déferle. Prudence sur les galets et le sol glissant.$$,
 array['vagues'], 'public', false),

-- ==================== CALVADOS (14) — Côte de Nacre / Fleurie ====================

-- #15 Ouistreham — embouchure de l'Orne — EXPOSÉ : courants d'estuaire.
($$Ouistreham — embouchure de l'Orne$$, 'embouchure-de-l-orne-ouistreham', '14', 'normandie',
 ST_SetSRID(ST_MakePoint(-0.24789, 49.27990), 4326)::geography,
 array['leurres','surfcasting'], array['bar','dorade_royale'], 'estuaire', 2,
 $$À Ouistreham, l'embouchure de l'Orne et du canal de Caen, bordée par la digue de Riva-Bella et les jetées, est un secteur à bar reconnu. Tu pêches au leurre souple et au surfcasting dans les veines de courant et sur les bordures de la fosse, surtout au début du jusant quand l'estuaire se vide et concentre les proies. La dorade royale se prend l'été sur les fonds de sable. Saison forte au printemps et en automne sur le bar.$$,
 $$Accès depuis Ouistreham / Riva-Bella, stationnement le long du front de mer, puis digue et jetées de l'embouchure (≈1 km au nord du phare). ⚠️ Courants forts à l'embouchure de l'Orne et du canal : ne te laisse pas piéger par la marée montante sur les bancs, garde tes appuis et reste prudent sur les enrochements glissants. Respecte le chenal de navigation (ferry de Ouistreham).$$,
 array['courants_forts'], 'public', false),

-- #16 Port-en-Bessin — jetées.
-- COORD CORRIGÉE satellite (origine OSM 49.34961,-0.77306 tombait ~800 m DANS LES
-- TERRES, en plein champ — nœud OSM erroné ; recalée EST sur le môle du port — vérif fix_ok).
($$Port-en-Bessin — jetées$$, 'jetees-de-port-en-bessin', '14', 'normandie',
 ST_SetSRID(ST_MakePoint(-0.75620, 49.35020), 4326)::geography,
 array['flottante','leurres'], array['bar','maquereau'], 'digue', 1,
 $$Les jetées Est et Ouest de Port-en-Bessin, surmontées de leurs tours-vigies, encadrent l'entrée de ce port de pêche actif du Bessin : un poste simple et accessible. Tu pêches à la flottante et au leurre — bar à l'entrée du chenal au coup du soir et en montante, maquereau en surface l'été. Pleine mer et courants d'entrée de port sont les bons créneaux.$$,
 $$Accès à pied depuis le port de Port-en-Bessin, stationnement à proximité, puis tu rejoins les jetées. ⚠️ Ouvrage exposé à la houle par gros temps ; prudence sur le sol glissant et les sections sans garde-corps. Reste à l'écart de l'activité du port de pêche.$$,
 array['vagues'], 'public', false),

-- #17 Trouville-sur-Mer — jetée de la Touques — courants d'embouchure.
($$Trouville — jetée de la Touques$$, 'jetees-de-trouville', '14', 'normandie',
 ST_SetSRID(ST_MakePoint(0.07558, 49.36644), 4326)::geography,
 array['flottante','leurres'], array['bar','dorade_royale'], 'estuaire', 1,
 $$La jetée de la Touques sépare Trouville de Deauville à l'embouchure de la rivière : un poste urbain facile et réputé pour le bar. Tu pêches au leurre et à la flottante dans le courant de l'estuaire, surtout à la descendante quand la Touques se vide et que le bar tient la veine ; la dorade royale se prend l'été sur les fonds de sable au large des planches. Vise les changements de marée.$$,
 $$Accès à pied depuis le front de mer de Trouville (ou Deauville côté ouest), stationnement à proximité, puis jetée de la Touques. ⚠️ Courants forts à l'embouchure : prudence avec la marée montante et le sol glissant. Respecte le chenal de navigation et l'activité du port.$$,
 array['courants_forts'], 'public', false),

-- #18 Courseulles-sur-Mer — jetées du chenal.
($$Courseulles-sur-Mer — jetées du chenal$$, 'jetees-de-courseulles', '14', 'normandie',
 ST_SetSRID(ST_MakePoint(-0.46215, 49.33407), 4326)::geography,
 array['flottante','leurres','surfcasting'], array['bar','maquereau','dorade_royale'], 'digue', 1,
 $$Les jetées du chenal du port de Courseulles-sur-Mer, au cœur de la Côte de Nacre, donnent un poste facile et familial. Tu pêches à la flottante et au leurre — bar à l'entrée du chenal en montante et au coup du soir, maquereau en surface l'été — et tu tentes le surfcasting sur les plages voisines. La dorade royale arrive l'été sur les fonds de sable ; vise la pleine mer.$$,
 $$Accès à pied depuis le port de Courseulles-sur-Mer, stationnement à proximité, puis tu rejoins les jetées du chenal. Poste accessible mais prudence sur le sol glissant et près du chenal ; respecte l'activité du port (pêche, plaisance).$$,
 array[]::text[], 'public', false),

-- ===================== PAS-DE-CALAIS (62) — Côte d'Opale =====================

-- #19 Cap Gris-Nez (Audinghen) — EXPOSÉ : platiers + courants du détroit + falaise.
-- COORD CORRIGÉE satellite (origine OSM 50.86970,1.58485 tombait sur le plateau
-- agricole ; recalée ~250 m O/NO sur les rochers au ras de l'eau du tip ouest — vérif OK).
($$Cap Gris-Nez$$, 'cap-gris-nez', '62', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(1.58140, 50.87100), 4326)::geography,
 array['leurres','flottante'], array['bar','maquereau'], 'pointe_rocheuse', 4,
 $$Le cap Gris-Nez, point de France le plus proche de l'Angleterre, dresse ses platiers rocheux sous le sémaphore au cœur du détroit du Pas-de-Calais. Le bar chasse aux leurres (surface et souples) sur les bordures de roche et dans les remous, le maquereau passe en bancs l'été. Les courants du détroit sont puissants : pêche les abords des étales et le début de courant, sur coefficient moyen, par mer maniable.$$,
 $$Parking au cap Gris-Nez (Audinghen) puis descente sur les platiers par les sentiers. ⚠️ Poste exposé et technique : rochers très glissants, falaises instables au-dessus, courants forts du détroit et ressac fréquent. Chaussures qui accrochent obligatoires, repère ta sortie, ne reste jamais dos à la mer et renonce dès que ça forcit.$$,
 array['rochers_glissants','falaise','courants_forts','ressac'], 'public', false),

-- #20 Cap Blanc-Nez (Escalles) — EXPOSÉ : montée de marée rapide + falaise de craie.
($$Cap Blanc-Nez$$, 'cap-blanc-nez', '62', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(1.70695, 50.92543), 4326)::geography,
 array['surfcasting','leurres'], array['bar','maquereau'], 'plage', 3,
 $$Sous la grande falaise de craie du cap Blanc-Nez, l'estran de galets et de roche s'ouvre face au détroit : un spot de surfcasting et de leurre pour le bar, avec le maquereau en surface l'été. Tu cherches le poisson dans le ressac et sur les bordures rocheuses, au coup du soir et de nuit sur le montant, par eau brassée. La vue est spectaculaire, mais le terrain commande la prudence.$$,
 $$Parking au pied du cap Blanc-Nez (Escalles) puis accès à l'estran. ⚠️ DOUBLE DANGER : (1) la marée monte vite sur cet estran plat et peut te couper le retour au pied de la falaise ; (2) chutes de pierres de la falaise de craie, qui s'éboule — ne t'installe pas collé à la paroi. Cale-toi sur l'horaire de marée, garde une sortie, et reste à distance du pied de falaise.$$,
 array['submersion_maree','falaise'], 'public', false),

-- #21 Boulogne-sur-Mer — digue Carnot — spot bar mythique. ⚠️ accès port en activité.
($$Boulogne-sur-Mer — digue Carnot$$, 'digue-carnot-boulogne', '62', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(1.56589, 50.73240), 4326)::geography,
 array['surfcasting','leurres','flottante'], array['bar','maquereau'], 'digue', 2,
 $$La digue Carnot, le grand brise-lames qui protège le port de Boulogne-sur-Mer, est un spot à bar mythique de la Côte d'Opale : près de 3 km d'ouvrage, du fond et du courant. Tu pêches le bar au leurre, à la flottante au vif et au surfcasting le long du parement et au musoir, surtout en marée montante et au coup du soir. Maquereau en surface l'été ; les coefficients forts et l'eau brassée réveillent les gros poissons.$$,
 $$Accès depuis le port de Boulogne-sur-Mer. ⚠️ La digue Carnot appartient à un port en activité : l'accès peut être réglementé et l'ouvrage est fermé par gros temps — confirme les conditions et horaires d'accès sur place avant de t'engager. Ouvrage très exposé à la houle, prudence absolue sur les blocs glissants et au musoir.$$,
 array['vagues'], 'public', false),

-- #22 Wimereux — digue de promenade.
($$Wimereux — digue de promenade$$, 'digue-de-wimereux', '62', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(1.60587, 50.76503), 4326)::geography,
 array['surfcasting','leurres'], array['bar','maquereau'], 'digue', 2,
 $$La digue de promenade de Wimereux longe le front de mer de cette station de la Côte d'Opale : un poste accessible où le bar tape bien. Tu pêches au surfcasting et au leurre dans le ressac et le long de la digue, au coup du soir et de nuit sur le montant, par eau brassée après un coup de vent. Maquereau en surface l'été ; vise les coefficients moyens à forts.$$,
 $$Accès direct depuis le front de mer de Wimereux, stationnement le long de la digue. ⚠️ Ouvrage exposé : par grosse houle et grande marée, la mer passe par-dessus la digue (submersion) — n'y va pas quand ça déferle. Prudence sur le sol glissant.$$,
 array['vagues','submersion_maree'], 'public', false),

-- #23 Calais — jetée Ouest.
($$Calais — jetée Ouest$$, 'jetee-ouest-de-calais', '62', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(1.84110, 50.96941), 4326)::geography,
 array['flottante','surfcasting','leurres'], array['bar','maquereau'], 'digue', 1,
 $$La jetée Ouest du port de Calais, l'un des ports les plus fréquentés d'Europe, t'offre un poste simple à l'entrée du chenal. Tu pêches à la flottante, au leurre et au surfcasting — bar à l'entrée du port en montante et au coup du soir, maquereau en surface l'été. Pleine mer et courants d'entrée sont les bons créneaux.$$,
 $$Accès à pied depuis le front de mer de Calais, stationnement à proximité, puis jetée Ouest. ⚠️ Ouvrage exposé à la houle du détroit ; prudence sur le sol glissant et les bords sans protection. Respecte le chenal (trafic ferries intense) et l'activité du port.$$,
 array['vagues'], 'public', false),

-- ======================= NORD (59) — Côte flamande =======================

-- #24 Dunkerque — digue de Malo-les-Bains.
($$Dunkerque — digue de Malo-les-Bains$$, 'jetee-de-malo-les-bains', '59', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(2.38463, 51.04897), 4326)::geography,
 array['flottante','surfcasting','leurres'], array['bar','maquereau'], 'digue', 1,
 $$La digue de Malo-les-Bains et les jetées du port Est de Dunkerque donnent un grand front pêchable sur la côte flamande. Tu pêches le bar à la flottante, au leurre et au surfcasting le long de la digue et à l'entrée du port, surtout en montante et au coup du soir ; le maquereau passe en surface l'été. Vise les coefficients moyens à forts et les changements de marée.$$,
 $$Accès direct depuis le front de mer de Malo-les-Bains (Dunkerque), stationnement le long de la digue, puis jetées du port Est. ⚠️ Ouvrage exposé à la houle ; prudence sur le sol glissant et près du chenal. Respecte l'activité du port (l'un des plus gros de France).$$,
 array['vagues'], 'public', false),

-- #25 Gravelines — phare de Petit-Fort-Philippe — EXPOSÉ : courants + ⚠️ proximité centrale.
($$Gravelines — Petit-Fort-Philippe$$, 'chenal-de-l-aa-gravelines', '59', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(2.10916, 51.00384), 4326)::geography,
 array['leurres','surfcasting'], array['bar','maquereau'], 'estuaire', 2,
 $$À Petit-Fort-Philippe, les jetées du chenal de l'Aa s'étirent au pied du phare de Gravelines : un secteur à bar et maquereau sur la côte flamande. Tu pêches au leurre et au surfcasting dans le courant du chenal et sur les bordures, surtout au jusant quand l'Aa se vide et concentre les proies, et sur le montant qui ramène le bar. Vise les changements de marée.$$,
 $$Accès à pied depuis Petit-Fort-Philippe (Gravelines), stationnement près du chenal, puis jetées au pied du phare. ⚠️ DEUX VIGILANCES : (1) le secteur jouxte la centrale nucléaire de Gravelines — confirme les zones de pêche autorisées sur place avant de t'installer ; (2) courants forts dans le chenal de l'Aa, ne te laisse pas piéger par la marée montante. Prudence sur les enrochements glissants.$$,
 array['courants_forts'], 'public', false),

-- #26 Bray-Dunes — plage la plus au nord de France — EXPOSÉ : estran plat, marée rapide.
($$Bray-Dunes — grande plage$$, 'plage-de-bray-dunes', '59', 'hauts-de-france',
 ST_SetSRID(ST_MakePoint(2.51997, 51.08169), 4326)::geography,
 array['surfcasting'], array['bar','maquereau'], 'plage', 2,
 $$La plage de Bray-Dunes, la plus septentrionale de France à la frontière belge, déroule un vaste estran de sable face à la mer du Nord : un terrain de surfcasting pur. Tu cherches le bar au lancer lourd dans les fosses et les bordures de bancs, au coup du soir et de nuit sur le montant, par eau brassée après un coup de vent ; le maquereau passe l'été. Repère tes fosses à basse mer et laisse travailler la marée.$$,
 $$Accès depuis Bray-Dunes, stationnement près du front de mer, puis tu attaques le grand estran. ⚠️ Estran très plat : la marée remonte vite et loin, ne t'éloigne pas sans surveiller l'heure et garde une porte de sortie vers la digue / les dunes. Traverse les dunes par les accès balisés (massif protégé).$$,
 array['submersion_maree'], 'public', false);

-- =====================================================================
-- Après insertion : vérifier sur /carte que les 26 pins tombent au bon
-- endroit (digue / cap / jetée / plage), puis passer verified=true spot
-- par spot. geom_public (flou ~1 km) est rempli par le trigger spots_blur.
-- Bilan attendu : 50→8, 76→6, 14→4, 62→5, 59→3 = 26 spots → prod 83→109.
-- =====================================================================
