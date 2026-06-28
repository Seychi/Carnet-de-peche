// lib/storage/public-share-photo.ts — Sprint 47, WS-A (photo du poisson).
//
// Publie une photo PRIVÉE (bucket `catches`, owner-only) vers le bucket PUBLIC
// `share-photos`, en re-encodant via `sharp` pour SUPPRIMER toutes les métadonnées
// (EXIF / GPS) : défense en profondeur, même si la photo a déjà été redimensionnée
// client. Sert aux cartes de partage (l'OG edge ne peut pas signer d'URL privée) et
// sera RÉUTILISÉ par le chat (sprint 50).
//
// SÉCURITÉ :
//  - Le bucket `catches` reste PRIVÉ : on COPIE une version nettoyée, on n'expose
//    jamais l'original.
//  - L'appelant DOIT avoir validé que sourcePath appartient bien à userId AVANT
//    d'appeler (createCatchCard le fait via catches_for_viewer scopé + check user_id).
//    On scope l'écriture au dossier `${userId}/…` du bucket public.
//  - `sharp(buf).rotate().webp()` applique l'orientation EXIF aux pixels PUIS
//    n'écrit AUCUNE métadonnée (sharp ne recopie les métadonnées que sur appel
//    explicite à .withMetadata()) → EXIF/GPS strippés.

import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'

const SOURCE_BUCKET = 'catches'
const PUBLIC_BUCKET = 'share-photos'

/**
 * Copie + nettoie une photo privée vers le bucket public de partage.
 * @returns { url, path } public, ou null si la source est introuvable / échec.
 */
export async function publishSharePhoto(params: {
  userId: string
  sourcePath: string
  sourceBucket?: string
}): Promise<{ url: string; path: string } | null> {
  const { userId, sourcePath, sourceBucket = SOURCE_BUCKET } = params
  if (!sourcePath) return null

  const admin = createAdminClient()

  // 1. Télécharger l'original (privé) en service-role.
  const { data: blob, error: dlErr } = await admin.storage
    .from(sourceBucket)
    .download(sourcePath)
  if (dlErr || !blob) {
    console.error('[publishSharePhoto] download', dlErr?.message)
    return null
  }

  // 2. Re-encoder en WebP SANS métadonnées (rotate applique l'orientation puis on
  //    laisse tomber tout l'EXIF/GPS — pas de .withMetadata()).
  let stripped: Buffer
  try {
    const input = Buffer.from(await blob.arrayBuffer())
    stripped = await sharp(input).rotate().webp({ quality: 82 }).toBuffer()
  } catch (e) {
    console.error('[publishSharePhoto] sharp', (e as Error).message)
    return null
  }

  // 3. Uploader dans le bucket PUBLIC, dossier scopé à l'utilisateur.
  const path = `${userId}/${crypto.randomUUID()}.webp`
  const { error: upErr } = await admin.storage
    .from(PUBLIC_BUCKET)
    .upload(path, stripped, { contentType: 'image/webp', upsert: false })
  if (upErr) {
    console.error('[publishSharePhoto] upload', upErr.message)
    return null
  }

  const { data: pub } = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path)
  return { url: pub.publicUrl, path }
}

/**
 * Supprime une photo publique de partage (révocation d'une carte). Best-effort.
 * @param path chemin dans le bucket `share-photos` (ex. `${userId}/${uuid}.webp`).
 */
export async function deleteSharePhoto(path: string): Promise<void> {
  if (!path) return
  const admin = createAdminClient()
  const { error } = await admin.storage.from(PUBLIC_BUCKET).remove([path])
  if (error) console.error('[deleteSharePhoto]', error.message)
}

/**
 * Extrait le chemin storage d'une URL publique `share-photos` (pour la révocation).
 * Retourne null si l'URL ne pointe pas vers ce bucket.
 */
export function sharePhotoPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/${PUBLIC_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length)
}
