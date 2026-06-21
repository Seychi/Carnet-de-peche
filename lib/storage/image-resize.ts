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

/**
 * Recadre une image en CARRÉ centré et la convertit en WebP (avatars).
 *
 * - `createImageBitmap(..., { imageOrientation: 'from-image' })` applique
 *   l'orientation EXIF puis décode hors thread ; le dessin sur canvas + `toBlob`
 *   produit une image SANS métadonnées → EXIF/GPS strippé (comme le canvas de
 *   browser-image-compression). Fallback HTMLImageElement si indisponible.
 * - Crop centré sur le plus petit côté → sortie `size`×`size` (def. 512).
 */
export async function resizeImageToSquareWebp(
  file: File,
  size = 512,
  quality = 0.85,
): Promise<File> {
  let source: ImageBitmap | HTMLImageElement
  let width: number
  let height: number

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    source = bitmap
    width = bitmap.width
    height = bitmap.height
  } catch {
    const img = await loadHtmlImage(file)
    source = img
    width = img.naturalWidth
    height = img.naturalHeight
  }

  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponible.')
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size)
  if ('close' in source) source.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  )
  if (!blob) throw new Error('Conversion WebP échouée.')

  const baseName = file.name.replace(/\.[^/.]+$/, '')
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible.'))
    }
    img.src = url
  })
}
