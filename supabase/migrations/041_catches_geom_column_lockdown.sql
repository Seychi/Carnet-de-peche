-- =====================================================================
-- Carnet de Pêche — 041 : verrou colonne catches.geom (FUITE GPS prises)
-- 🔴 HOTFIX SÉCURITÉ — découplé de la feature Carte v2 (040/042).
-- ⚠️⚠️ À RELIRE PAR JOHN AVANT APPLICATION (change la sécurité d'une table
--      partagée + repasse une vue de invoker → definer). Cf RECAP-C1 §Sécurité.
-- =====================================================================
-- CONTEXTE (memo catches-geom-leak, audit GPS) : `anon` peut aujourd'hui lire
-- la colonne PRÉCISE public.catches.geom des prises publiques en direct table
--   (has_column_privilege('anon','public.catches','geom','SELECT') = true),
-- via la policy catches_select_public (USING privacy='public', sans restriction
-- de rôle) + le grant SELECT table par défaut de Supabase. Une requête
--   select geom from catches where privacy='public'
-- avec la clé publishable rend les coordonnées EXACTES. C'est exactement le
-- précédent fermé sur `spots` (028) mais JAMAIS transposé à `catches`.
--
-- Ce hotfix applique à `catches` le même patron que 028 sur `spots` :
--   1. revoke SELECT table (un revoke de colonne seul est inopérant : le grant
--      table par défaut prime),
--   2. re-grant SELECT colonne par colonne SAUF `geom`.
--
-- ⚠️ catches_for_viewer est SECURITY INVOKER (031/034). Son corps passe `c.*`
--    (donc geom) à catch_visible_geom(c.*). Une fois geom révoqué à l'invoker,
--    la vue invoker CASSERAIT pour anon/authenticated. On la repasse donc en
--    SECURITY DEFINER — exactement comme spots_for_viewer (cf 031, definer
--    VOLONTAIRE quand la colonne geom est verrouillée). C'est sûr : le WHERE de
--    la vue mirrore déjà les policies SELECT, et le floutage est porté par
--    catch_visible_geom (déjà SECURITY DEFINER). feed_posts_for_viewer (invoker)
--    qui lit catches_for_viewer reste correct : auth.uid() est lu depuis le JWT,
--    indépendamment du rôle exécutant la vue definer.
--
-- L'app ne lit JAMAIS catches.geom en direct (vérifié sprint C1) : tous les reads
-- listent des colonnes explicites (id, species, size_cm, …) ou passent par
-- catches_for_viewer (geom_visible) ; createCatch fait .insert().select('id').
-- INSERT/UPDATE ne sont pas touchés (on ne révoque que SELECT). Aucun breaking.
--
-- Vérifs post-application :
--   select has_column_privilege('anon','public.catches','geom','SELECT');           -- false
--   select has_column_privilege('authenticated','public.catches','geom','SELECT');  -- false
--   select has_column_privilege('anon','public.catches','geom_public','SELECT');     -- true
--   select count(*) from catches_for_viewer;   -- fonctionne encore (anon → public)
-- ROLLBACK :
--   grant select on public.catches to anon, authenticated;
--   alter view public.catches_for_viewer set (security_invoker = true);
-- =====================================================================

-- 1) Verrou colonne geom : revoke SELECT table, puis re-grant toutes colonnes SAUF geom.
revoke select on public.catches from anon, authenticated;

grant select (
  id, user_id, spot_id, geom_public, species, size_cm, weight_g, technique,
  bait, caught_at, conditions, photo_path, notes, privacy, precise_for_friends,
  reveal_precise_to_public, released, created_at, updated_at, lure_brand,
  lure_model, bait_type, water_temperature_c, location_method, location_label,
  wind_speed_kmh, wind_direction_deg, tide_state
) on public.catches to anon, authenticated;

-- 2) catches_for_viewer en SECURITY DEFINER (sinon l'invoker ne peut plus lire geom
--    via c.* → catch_visible_geom). Comportement de lecture identique (le WHERE et
--    le floutage sont autoportants). Modèle : spots_for_viewer (031).
alter view public.catches_for_viewer set (security_invoker = false);

comment on view public.catches_for_viewer is
  'Prises visibles par le viewer (floutage geom applique par catch_visible_geom). SECURITY DEFINER VOLONTAIRE depuis 041 : la colonne catches.geom est revoquee a anon/authenticated (verrou anti-fuite GPS) donc une vue invoker casserait ; le WHERE mirrore les policies et le floutage est autoporte → definer est le comportement voulu. lng/lat (034) = st_x/st_y de geom_visible. Toujours lire cette vue, jamais la table catches.';
