-- 096_username_unique_ci.sql — Sprint 53, WS-C (unicité username insensible à la casse).
--
-- Constat : la contrainte profiles_username_key = UNIQUE (username) est SENSIBLE à la
-- casse → « Bob » et « bob » pourraient coexister. Pour un produit social, l'unicité
-- doit être insensible à la casse.
--
-- Vérifié avant application : 0 collision de casse en base (l'index ne peut pas
-- échouer). Les NULL restent autorisés en multiple (profils pré-onboarding) grâce au
-- prédicat partiel `where username is not null`.
--
-- La vérif de disponibilité applicative (onboarding + profil) est alignée en parallèle
-- (ilike littéral). Aucun changement de colonne/type → pas de regen lib/types.ts.

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;
