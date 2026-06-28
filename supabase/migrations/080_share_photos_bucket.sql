-- 080_share_photos_bucket.sql — Sprint 47, WS-A (photo du poisson).
--
-- Bucket PUBLIC dédié aux photos de prises PARTAGÉES. Les cartes de partage (OG edge)
-- ne peuvent pas signer d'URL privée → pour montrer le poisson, on COPIE la photo
-- (opt-in explicite) du bucket PRIVÉ `catches` vers ce bucket public, après un strip
-- EXIF serveur (sharp, défense en profondeur). Le bucket `catches` reste PRIVÉ (la
-- position est sensible) : on n'expose JAMAIS l'original, seulement une copie nettoyée.
-- Mirror du pattern 036 (avatars) en remplaçant l'id du bucket.
--
-- SÉCURITÉ : lecture publique (URL stable, pas de RLS SELECT requise sur bucket public) ;
-- écriture (insert/update/delete) réservée à auth.uid() sur SON dossier <uid>/… ;
-- image/webp uniquement. La copie est faite en service-role (l'util re-strippe l'EXIF).
--
-- ⚠️ Prochain libre = 080 (079 = sprint 46). Migration APPLIQUÉE en prod.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('share-photos', 'share-photos', true, 2097152, array['image/webp'])
on conflict (id) do nothing;

drop policy if exists "share_photos_insert_own" on storage.objects;
create policy "share_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'share-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "share_photos_update_own" on storage.objects;
create policy "share_photos_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'share-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'share-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "share_photos_delete_own" on storage.objects;
create policy "share_photos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'share-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
