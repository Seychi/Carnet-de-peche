-- =====================================================================
-- Carnet de Pêche — Seed data (dev only)
-- 10 spots Bretagne pour démarrer les développements.
-- À jouer après les 4 migrations.
-- =====================================================================

-- ---------- Spots Bretagne ----------
insert into public.spots (name, slug, department, region, geom, techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified)
values
  ('Pointe du Raz', 'pointe-du-raz', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.7361, 48.0381), 4326)::geography,
   array['leurres','stickbait','surfcasting'],
   array['bar','lieu_jaune','maquereau'],
   'pointe_rocheuse', 4,
   'Extrême ouest de la Bretagne. Spot iconique pour le bar à la marée descendante. Les structures rocheuses créent des cassures où le poisson se positionne.',
   'Sentier côtier depuis le parking principal (15 min de marche). Poste sud-ouest le plus productif au coucher du soleil.',
   array['ressac','vagues_scelerats','rochers_glissants'],
   'subscriber', true),

  ('Cap Sizun', 'cap-sizun', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.66, 48.06), 4326)::geography,
   array['leurres','flottante'],
   array['bar','lieu_jaune'],
   'pointe_rocheuse', 3,
   'Côte sauvage entre la Pointe du Raz et Audierne. Plusieurs postes accessibles depuis le sentier des douaniers.',
   'Plusieurs accès, le plus simple via le parking de Pors Loubous.',
   array['vagues','sentier_exposé'],
   'subscriber', true),

  ('Anse de Térénez', 'anse-de-terenez', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.50, 48.09), 4326)::geography,
   array['leurres','surfcasting'],
   array['bar','maquereau','sar'],
   'estuaire', 2,
   'Anse abritée idéale pour les débutants. Bar et maquereau en saison estivale, sar en automne.',
   'Parking en bord d''anse, accès direct.',
   '{}'::text[],
   'subscriber', true),

  ('Île de Sein - Cale Nord', 'ile-de-sein-cale-nord', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.85, 48.04), 4326)::geography,
   array['leurres','stickbait','vif'],
   array['bar','maquereau','lieu_jaune'],
   'cale', 4,
   'Spot magique mais engagé. Les courants forts attirent les gros bars. Accessible uniquement en bateau (navette depuis Audierne).',
   'Navette depuis Audierne, ~1h de traversée. Vérifier la météo avant.',
   array['courants_forts','isolation'],
   'subscriber', true),

  ('Plage de Penhors', 'plage-de-penhors', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.31, 47.96), 4326)::geography,
   array['surfcasting','leurres'],
   array['bar','dorade_royale'],
   'plage', 2,
   'Longue plage de sable, idéale pour le surfcasting. Dorade royale en été, bar à l''automne.',
   'Parking en haut de plage, accès direct.',
   '{}'::text[],
   'public', true),

  ('Île d''Ouessant - Lampaul', 'ile-d-ouessant-lampaul', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-5.10, 48.45), 4326)::geography,
   array['leurres','stickbait'],
   array['bar','vieille','lieu_jaune'],
   'pointe_rocheuse', 5,
   'Spot d''exception sur la côte nord de l''île. Vieilles trophées en juin-juillet, bars toute l''année.',
   'Bateau depuis Brest ou Le Conquet. Compter une journée complète.',
   array['vagues','courants','isolation','ressac'],
   'subscriber', true),

  ('Le Diben (Brest)', 'le-diben-brest', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.43, 48.21), 4326)::geography,
   array['leurres','vif','flottante'],
   array['lieu_jaune','bar'],
   'digue', 2,
   'Digue accessible toute l''année. Lieu jaune en automne-hiver, bar en saison.',
   'Parking sur la digue. Aucune difficulté d''accès.',
   '{}'::text[],
   'public', false),

  ('Pointe de Pen-Hir', 'pointe-de-pen-hir', '29', 'bretagne',
   ST_SetSRID(ST_MakePoint(-4.62, 48.26), 4326)::geography,
   array['leurres','stickbait'],
   array['bar','maquereau'],
   'pointe_rocheuse', 4,
   'Face aux Tas de Pois. Postes engagés mais bars régulièrement de plus de 60 cm en saison.',
   'Parking au sémaphore. Descente à pied ~10 min, prudence par houle.',
   array['ressac','rochers_glissants'],
   'subscriber', true),

  ('Quiberon - Côte Sauvage', 'quiberon-cote-sauvage', '56', 'bretagne',
   ST_SetSRID(ST_MakePoint(-3.13, 47.50), 4326)::geography,
   array['surfcasting','leurres'],
   array['bar','dorade_royale','maquereau'],
   'plage', 3,
   'Côte sauvage exposée à l''océan. Plusieurs postes le long du sentier. Surfcasting et leurres en alternance.',
   'Plusieurs parkings le long de la D102A.',
   array['vagues','baignade_dangereuse'],
   'public', true),

  ('Belle-Île - Pointe des Poulains', 'belle-ile-pointe-des-poulains', '56', 'bretagne',
   ST_SetSRID(ST_MakePoint(-3.25, 47.39), 4326)::geography,
   array['leurres','stickbait','vif'],
   array['bar','lieu_jaune'],
   'pointe_rocheuse', 4,
   'Pointe nord de Belle-Île. Spot mythique pour le bar au leurre de surface en été.',
   'Bateau depuis Quiberon, navette puis location voiture/vélo sur l''île.',
   array['vagues','courants'],
   'subscriber', true);

-- Note : le trigger blur_spot_geom remplit geom_public automatiquement.
-- Note : ajustez les coordonnées si nécessaire avec une vraie cartographie.
