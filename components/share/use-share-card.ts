'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { createShareCard, type ShareCardInput } from '@/app/actions/share'
import {
  absoluteUrl,
  shareCardPath,
  shareCardImagePath,
} from '@/lib/share/url'

// ─── Partage social opt-in (sprint 38 WS-C) ────────────────────────────────────
// Flux : (1) createShareCard → slug (carte PUBLIQUE, geom-free, créée à la demande
// explicite de l'utilisateur sur SA donnée) ; (2) Web Share niveau 2 AVEC le fichier
// image (story 9:16) si le device le supporte ; (3) sinon fallback desktop : copie du
// lien /c/{slug} + téléchargement de l'image.
//
// Contrainte iOS connue (cf docs-researcher WS-C) : navigator.share exige une
// « transient activation » et un await fetch long peut l'expirer. Ici le slug n'existe
// qu'APRÈS createShareCard (au clic), donc on ne peut pas précharger le blob avant.
// On tente le partage fichier ; si l'activation est perdue (NotAllowedError), on retombe
// proprement sur le fallback (copie + download) — jamais d'échec silencieux.

type Status = 'idle' | 'working'

async function fetchStoryFile(slug: string): Promise<File | null> {
  try {
    const res = await fetch(shareCardImagePath(slug, 'story'))
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], 'carnet-de-peche.png', {
      type: blob.type || 'image/png',
    })
  } catch {
    return null
  }
}

function triggerDownload(file: File): void {
  const objectUrl = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}

async function fallbackShare(pageUrl: string, file: File | null): Promise<void> {
  let copied = false
  try {
    await navigator.clipboard.writeText(pageUrl)
    copied = true
  } catch {
    copied = false
  }
  if (file) {
    triggerDownload(file)
    toast.success(
      copied ? 'Lien copié, image téléchargée.' : 'Image téléchargée.',
    )
  } else {
    toast.success(copied ? 'Lien copié !' : pageUrl)
  }
}

export function useShareCard() {
  const [status, setStatus] = useState<Status>('idle')

  const share = useCallback(
    async (input: ShareCardInput, title: string, text: string) => {
      if (status === 'working') return
      setStatus('working')
      try {
        const result = await createShareCard(input)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        const { slug } = result.data
        const pageUrl = absoluteUrl(shareCardPath(slug))

        const file = await fetchStoryFile(slug)

        const canShareFiles =
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function' &&
          !!file &&
          navigator.canShare?.({ files: [file] }) === true

        if (canShareFiles && file) {
          try {
            await navigator.share({ files: [file], title, text, url: pageUrl })
            return
          } catch (err) {
            // Annulation utilisateur : pas un échec, on ne montre rien.
            if (err instanceof DOMException && err.name === 'AbortError') return
            // Activation perdue / payload refusé → on retombe sur le fallback.
            await fallbackShare(pageUrl, file)
            return
          }
        }

        // Pas de Web Share fichier (desktop / Firefox) : tenter le partage de lien
        // natif si dispo, sinon copier + télécharger.
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function'
        ) {
          try {
            await navigator.share({ title, text, url: pageUrl })
            return
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            await fallbackShare(pageUrl, file)
            return
          }
        }

        await fallbackShare(pageUrl, file)
      } finally {
        setStatus('idle')
      }
    },
    [status],
  )

  return { share, sharing: status === 'working' }
}
