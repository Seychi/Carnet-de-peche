'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Lightbox plein écran de PhotoViewer, chargée en lazy (sprint 11 Bloc F) :
 * montée uniquement au clic sur la photo, elle sort du first load de
 * /carnet/[id]. Vrai dialog accessible (role/aria-modal, focus à l'ouverture,
 * retour du focus au déclencheur à la fermeture, sprint 56), aligné sur son
 * jumeau PhotoGalleryLightbox. Fermeture : overlay, bouton ✕ ou touche Échap.
 */
export default function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Place le focus dans la lightbox à l'ouverture, le rend au déclencheur à la
  // fermeture (clavier / lecteur d'écran).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Photo en plein écran'}
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 outline-none"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        aria-label="Fermer"
      >
        <X size={28} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90dvh] object-contain rounded-[8px]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
