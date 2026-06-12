'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Lightbox plein écran de PhotoViewer, chargée en lazy (sprint 11 Bloc F) :
 * montée uniquement au clic sur la photo, elle sort du first load de
 * /carnet/[id]. Fermeture : clic sur l'overlay, bouton ✕ ou touche Échap.
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
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
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
