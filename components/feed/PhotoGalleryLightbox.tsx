'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/**
 * Lightbox plein écran navigable pour la galerie d'un post (sprint 13 Bloc C).
 * Chargée en lazy (montée au 1er clic). Fermeture : overlay, ✕ ou Échap.
 * Navigation : flèches écran + ← → clavier. Sortie du first load du fil.
 */
export default function PhotoGalleryLightbox({
  urls,
  startIndex = 0,
  onClose,
}: {
  urls: string[]
  startIndex?: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const dialogRef = useRef<HTMLDivElement>(null)
  const count = urls.length

  // Place le focus dans la lightbox à l'ouverture (clavier / lecteur d'écran).
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  if (count === 0) return null
  const src = urls[index]

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 outline-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} sur ${count}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
        aria-label="Fermer"
      >
        <X size={28} />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Photo suivante"
          >
            <ChevronRight size={28} />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 font-mono text-[12px] text-white/80">
            {index + 1} / {count}
          </span>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Photo ${index + 1}`}
        className="max-h-[90dvh] max-w-full rounded-[8px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
