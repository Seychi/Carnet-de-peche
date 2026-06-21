-- =====================================================================
-- Carnet de Pêche — 036 : bucket Storage `avatars` (public) — sprint 12.5
-- =====================================================================
-- Photos de profil. Bucket PUBLIC (contrairement à `catches`, privé car la
-- position est sensible) : les avatars sont faits pour être vus partout (profils
-- publics, fil, home) → URL publique stable, sans signature. Mirror du pattern
-- 006 (catches) en remplaçant l'id du bucket.
--
-- SÉCURITÉ :
--  - Lecture : servie par l'endpoint public du bucket (RLS non requise pour la
--    lecture d'un bucket public) → pas de policy SELECT nécessaire.
--  - Écriture (insert/update/delete) : réservée à `auth.uid()` sur SON dossier
--    (`<uid>/…`). Un user ne peut pas écrire dans le dossier d'un autre.
--  - allowed_mime_types = image/webp uniquement (l'app n'uploade que du WebP
--    re-encodé côté client → EXIF/GPS strippé sur ce chemin). file_size_limit
--    ~2 Mo. NB : le mime-check valide le TYPE, pas l'absence de métadonnées —
--    un appel API direct pourrait stocker un webp avec EXIF (risque résiduel
--    assumé : c'est sa propre photo de tête, faible sensibilité ; cf RECAP).
--  - Le bucket `catches` reste PRIVÉ (on n'y touche pas).
--
-- ROLLBACK : drop des 3 policies + delete from storage.buckets where id='avatars'.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,            -- public : lecture via URL publique
  2097152,         -- 2 Mo max par fichier
  array['image/webp']
)
on conflict (id) do nothing;

-- INSERT : upload dans son propre dossier uniquement.
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- UPDATE : modifier ses propres fichiers (upsert éventuel).
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- DELETE : suppression de ses propres fichiers uniquement.
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
