'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createShareCard, type ShareCardInput } from '@/app/actions/share'
import { getShareSkipOptin } from '@/lib/share/skip-optin'
import {
  absoluteUrl,
  shareCardPath,
  shareCardImagePath,
} from '@/lib/share/url'

// ─── Partage social opt-in (sprint 38 WS-C, étendu sprint 47 WS-D) ─────────────
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
//
// Sprint 47 WS-D (1-tap) : requestShare consulte profiles.share_skip_optin. Si true,
// on partage DIRECTEMENT (pas de dialog). Sinon on ouvre le dialog (le rappel
// geom-free reste montré au moins une fois, avant que l'utilisateur active le 1-tap).

type Status = 'idle' | 'working'

// Paramètres mémorisés entre l'ouverture du dialog et sa confirmation.
type PendingShare = {
  input: ShareCardInput
  title: string
  text: string
  hasPhoto: boolean
}

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

export function useShareCard() {
  const [status, setStatus] = useState<Status>('idle')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, setPending] = useState<PendingShare | null>(null)
  // Garde-fou anti double-clic pendant la résolution de la préférence skip.
  const deciding = useRef(false)
  // Aperçu de succès (desktop / navigateur sans Web Share fichier) — sprint 59 Bloc 3.
  const [preview, setPreview] = useState<{ slug: string; pageUrl: string; file: File | null } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

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
            // Activation perdue / payload refusé → on bascule sur l'aperçu (comme desktop).
          }
        }

        // Pas de Web Share fichier (desktop / Firefox) OU échec non-annulation : au lieu
        // d'un toast fugace, on ouvre une modale d'APERÇU de la carte (miniature +
        // copier le lien + télécharger l'image). Sprint 59 Bloc 3. Le partage de lien
        // natif (URL seule) est remplacé par « Copier le lien » dans la modale.
        setPreview({ slug, pageUrl, file })
        setPreviewOpen(true)
      } finally {
        setStatus('idle')
      }
    },
    [status],
  )

  // Point d'entrée des boutons (sprint 47) : décide entre 1-tap et dialog.
  // Si l'utilisateur a déjà activé « ne plus me demander », on partage direct ;
  // sinon on ouvre le dialog (rappel geom-free + options photo/skip).
  const requestShare = useCallback(
    async (
      input: ShareCardInput,
      title: string,
      text: string,
      hasPhoto = false,
    ) => {
      if (status === 'working' || deciding.current) return
      deciding.current = true
      try {
        const skip = await getShareSkipOptin().catch(() => false)
        if (skip) {
          // 1-tap : pas de dialog. Pour une prise avec photo, on inclut la photo
          // par défaut (cohérent avec la case cochée par défaut, D1).
          const directInput =
            input.kind === 'catch' && hasPhoto
              ? { ...input, includePhoto: true }
              : input
          await share(directInput, title, text)
          return
        }
        setPending({ input, title, text, hasPhoto })
        setDialogOpen(true)
      } finally {
        deciding.current = false
      }
    },
    [status, share],
  )

  // Confirmation depuis le dialog : injecte le choix photo dans l'input puis partage.
  const confirmShare = useCallback(
    async (opts: { includePhoto: boolean }) => {
      if (!pending) return
      const input: ShareCardInput =
        pending.input.kind === 'catch'
          ? { ...pending.input, includePhoto: opts.includePhoto }
          : pending.input
      await share(input, pending.title, pending.text)
      setDialogOpen(false)
      setPending(null)
    },
    [pending, share],
  )

  // Télécharge l'image de la carte affichée dans l'aperçu (sprint 59 Bloc 3).
  const downloadPreview = useCallback(async () => {
    if (!preview) return
    const file = preview.file ?? (await fetchStoryFile(preview.slug))
    if (file) triggerDownload(file)
    else toast.error('Téléchargement indisponible pour le moment.')
  }, [preview])

  return {
    // API historique (CatchActionsDropdown, etc.) : ouverture de dialog gérée
    // par l'appelant.
    share,
    sharing: status === 'working',
    // API sprint 47 : flux 1-tap / dialog auto-géré par le hook.
    requestShare,
    confirmShare,
    dialogOpen,
    setDialogOpen,
    pendingKind: pending?.input.kind ?? null,
    pendingHasPhoto: pending?.hasPhoto ?? false,
    // API sprint 59 (Bloc 3) : aperçu de succès (desktop / pas de Web Share fichier).
    preview,
    previewOpen,
    setPreviewOpen,
    downloadPreview,
  }
}
