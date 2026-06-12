import imageCompression from 'browser-image-compression'

/**
 * Redimensionne une image côté client et la convertit en WebP.
 *
 * Délègue à browser-image-compression qui gère :
 * - Préservation du ratio (largeur max maxWidth)
 * - Correction de l'orientation EXIF (gérée nativement par browser-image-compression)
 * - Images très grandes (> 20 MP) sans crash
 * - Mobile Safari : fallback HTMLCanvasElement si OffscreenCanvas absent
 */
export async function resizeImageToWebp(
  file: File,
  maxWidth = 1920,
  quality = 0.82,
): Promise<File> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: maxWidth,
    fileType: 'image/webp',
    initialQuality: quality,
    useWebWorker: true,
    // Pas de contrainte de taille en sortie — on pilote via qualité + dimensions
    maxSizeMB: Infinity,
  })

  const baseName = file.name.replace(/\.[^/.]+$/, '')
  return new File([compressed], `${baseName}.webp`, { type: 'image/webp' })
}
