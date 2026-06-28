'use server'

// lib/cofishing/outing-photo.ts — Sprint 50, co-pêchage v2 (chat photo).
//
// Photo du chat d'une sortie. Bucket PRIVÉ `outing-photos` (migration 089),
// owner-scoped `<uid>/...`. À la DIFFÉRENCE du partage viral (sprint 47, bucket
// PUBLIC `share-photos`), une photo de chat n'est JAMAIS publique : la seule voie
// de lecture est une signed URL générée SERVEUR en service-role, et UNIQUEMENT
// après vérification que l'appelant est membre de la sortie (hôte ou participant
// accepté). Le bucket n'a aucune policy SELECT large.
//
// SÉCURITÉ :
//  - Upload : on re-encode via `sharp` pour SUPPRIMER tout l'EXIF/GPS (défense en
//    profondeur, même si PhotoInput a déjà re-encodé côté client). Modèle exact de
//    lib/storage/public-share-photo.ts (rotate applique l'orientation puis aucune
//    métadonnée n'est réécrite : pas de .withMetadata()).
//  - Écriture scopée au dossier `${user.id}/...` du bucket privé.
//  - Lecture : signed URL service-role gatée par l'appartenance à la sortie. Un
//    non-membre obtient null (jamais l'image, jamais le chemin).

import { createClient } from '@/lib/supabase/server'

const BUCKET = 'outing-photos'

/**
 * Reçoit le webp produit par PhotoInput (FormData, champ `file`), re-strippe l'EXIF
 * côté serveur via sharp, puis l'écrit dans le bucket PRIVÉ `outing-photos` sous
 * `${user.id}/${uuid}.webp`. Retourne { path } ou { error }.
 *
 * On ne vérifie PAS ici l'appartenance à une sortie : l'upload est scopé au dossier
 * de l'utilisateur (owner-only) et le chemin n'est exploitable que par sendOutingMessage
 * (qui passe la RLS membre) puis par getOutingPhotoSignedUrl (qui re-gate la lecture).
 */
export async function uploadOutingPhoto(
  formData: FormData,
): Promise<{ path: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Aucune photo reçue.' }
  }
  // Garde-fou taille (les photos sont déjà redimensionnées côté client en webp).
  if (file.size > 8 * 1024 * 1024) {
    return { error: 'Photo trop lourde (8 Mo max).' }
  }

  // Re-encode WebP SANS métadonnées (rotate applique l'orientation EXIF aux pixels
  // puis on laisse tomber tout l'EXIF/GPS : pas de .withMetadata()).
  let stripped: Buffer
  try {
    const sharp = (await import('sharp')).default
    const input = Buffer.from(await file.arrayBuffer())
    stripped = await sharp(input).rotate().webp({ quality: 82 }).toBuffer()
  } catch (e) {
    console.error('[uploadOutingPhoto] sharp', (e as Error).message)
    return { error: 'Photo illisible. Réessaie avec une autre image.' }
  }

  const path = `${user.id}/${crypto.randomUUID()}.webp`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, stripped, { contentType: 'image/webp', upsert: false })
  if (upErr) {
    console.error('[uploadOutingPhoto] upload', upErr.message)
    return { error: 'Impossible d’envoyer la photo. Réessaie.' }
  }

  return { path }
}

/**
 * Signed URL d'une photo de chat, gatée par l'APPARTENANCE à la sortie du message.
 * Vérifie que l'appelant est l'hôte OU un participant `accepted` de la sortie dont
 * relève le message, puis crée une URL signée (service-role) sur le bucket privé.
 * Retourne null si non authentifié, message introuvable/sans photo, ou non-membre.
 *
 * C'est la SEULE voie de lecture : le bucket est privé, sans policy SELECT large.
 */
export async function getOutingPhotoSignedUrl(messageId: string): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Le message + sa photo + la sortie. La RLS (068) ne renvoie le message qu'à un
  //    membre de la sortie → un non-membre obtient déjà null ici. On re-vérifie tout
  //    de même l'appartenance en service-role (défense en profondeur).
  const { data: msg } = await supabase
    .from('outing_messages')
    .select('photo_path, proposal_id')
    .eq('id', messageId)
    .maybeSingle()
  if (!msg?.photo_path || !msg.proposal_id) return null

  // 2. Vérif d'appartenance en service-role (l'utilisateur courant est-il hôte ou
  //    participant accepté de la sortie de ce message ?). Bypass RLS pour une lecture
  //    déterministe, mais on ne signe l'URL qu'après confirmation explicite.
  let isMember = false
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { data: prop } = await admin
      .from('outing_proposals')
      .select('host_id')
      .eq('id', msg.proposal_id)
      .maybeSingle()
    if (prop?.host_id === user.id) {
      isMember = true
    } else {
      const { data: part } = await admin
        .from('outing_participants')
        .select('status')
        .eq('proposal_id', msg.proposal_id)
        .eq('user_id', user.id)
        .maybeSingle()
      isMember = part?.status === 'accepted'
    }

    if (!isMember) return null

    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(msg.photo_path, 3600)
    if (error || !data?.signedUrl) {
      console.error('[getOutingPhotoSignedUrl] sign', error?.message)
      return null
    }
    return data.signedUrl
  } catch (e) {
    console.error('[getOutingPhotoSignedUrl] indisponible', (e as Error).message)
    return null
  }
}
