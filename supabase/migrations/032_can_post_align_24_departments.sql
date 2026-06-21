-- ============================================================
-- Migration 032 — Sprint 11.6 Bloc D (BUG-05) : aligner
--   can_post_in_department sur les 24 départements canoniques.
--   Décision John 2026-06-21 : liste canonique = les 24 de
--   l'onboarding (métropole côtière + Corse), EXCLURE la Somme (80).
--   Source applicative de référence : lib/geo/departments.ts (sans 80).
-- ============================================================
-- Pré-requis : 001→031 appliquées.
--   ⚠️ Ordre : DOIT passer APRÈS 031 (Bloc J). Si 031 n'est pas créé,
--   renuméroter ce fichier en 031. La fonction est juste un
--   create or replace idempotent (aucune dépendance sur 025→031).
-- Aucun DML : 0 spot / 0 feed_post / 0 profile en '80' en prod
--   (vérifié 2026-06-21) → rien à migrer côté données.
-- ============================================================

-- Seul changement vs migration 022 : retrait de '80' (Somme).
-- Signature inchangée (char(3)) → tous les appels RPC restent valides.
create or replace function public.can_post_in_department(dept char(3))
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and trim(dept) = any (array[
       -- Manche / Atlantique (sans la Somme 80, hors périmètre v1)
       '14','17','22','29','33','35','40','44','50','56',
       '59','62','64','76','85',
       -- Méditerranée + Corse
       '06','11','13','30','34','66','83','2A','2B'
     ]);
$$;

comment on function public.can_post_in_department is
  'true si l''utilisateur est authentifié et que le département est l''un des 24 côtiers canoniques (métropole + Corse, hors Somme 80). Social 100% gratuit (cf 022). Whitelist = lib/geo/departments.ts. Aligné sprint 11.6 (BUG-05).';
