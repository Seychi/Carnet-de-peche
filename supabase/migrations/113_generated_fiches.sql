-- 113_generated_fiches.sql — Sprint 78, Bloc 2
-- Traçabilité des fiches générées, pour pouvoir dépublier un lot en UNE requête.
--
-- POURQUOI : le Bloc 2 publie des fiches dont le texte est ASSEMBLÉ à partir des
-- données existantes (position, type de poste, façade), et non rédigé à la main.
-- C'est assumé, mais ça impose deux choses :
--   1. savoir lesquelles sont générées, pour ne jamais les confondre avec les 416
--      fiches curées à la main qui rankent aujourd'hui à 7,4 % de CTR ;
--   2. pouvoir en retirer un lot entier immédiatement si le témoin se dégrade.
--
-- Garde-fou du brief, rappelé ici parce que c'est LA règle de sortie du bloc :
-- si le CTR des 416 fiches historiques passe sous 6 % après la publication d'un
-- lot, ON DÉPUBLIE LE LOT. D'où :
--
--   update public.spots
--      set moderation_status = 'pending'
--    where generation_batch = 'S78-MED-01';
--
-- ⚠️ Ces colonnes ne sont JAMAIS lues par l'application : ce sont des métadonnées
-- d'exploitation. Aucune fiche ne doit afficher « contenu généré » à l'écran, et
-- aucune décision produit ne doit en dépendre. Elles servent à John et à personne
-- d'autre.
--
-- ⚠️ Aucune policy RLS n'est ajoutée : les colonnes suivent celles de `spots`,
-- dont la policy de lecture impose déjà `moderation_status='approved'`. Les
-- écritures restent réservées au rôle de service et aux modérateurs, inchangé.

begin;

alter table public.spots
  add column if not exists generated_at timestamptz,
  add column if not exists generation_batch text;

comment on column public.spots.generated_at is
  'Sprint 78 : instant de génération du contenu de la fiche. NULL = fiche curée à la main.';
comment on column public.spots.generation_batch is
  'Sprint 78 : identifiant du lot de publication (ex. S78-MED-01), pour dépublier un lot en une requête.';

-- Index partiel : seules les fiches générées portent une valeur, et c'est sur
-- elles seules qu'on requête. Inutile d'indexer les milliers de NULL.
create index if not exists spots_generation_batch_idx
  on public.spots (generation_batch)
  where generation_batch is not null;

commit;
