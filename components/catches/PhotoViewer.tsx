'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'

/**
 * Sprint 11 Bloc F — la lightbox plein écran ne sert qu'au clic sur la photo :
 * elle est chargée en lazy (et préchargée au survol/focus du thumbnail pour
 * une ouverture instantanée). La photo inline reste rendue telle quelle.
 */
const PhotoLightbox = dynamic(() => import('./PhotoLightbox'), { ssr: false })

function preloadLightbox() {
  void import('./PhotoLightbox')
}

export function PhotoViewer({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={preloadLightbox}
        onFocus={preloadLightbox}
        className={`block w-full cursor-zoom-in ${className ?? ''}`}
        aria-label="Agrandir la photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full rounded-[14px] object-cover max-h-80"
        />
      </button>

      {open && <PhotoLightbox src={src} alt={alt} onClose={close} />}
    </>
  )
}
