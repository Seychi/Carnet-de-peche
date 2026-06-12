'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { deleteCatch } from '@/lib/catches/actions'
import { catchActionsTriggerClass } from './catch-actions-trigger'

/**
 * Sprint 11 Bloc F — UI d'interaction lazy sur /carnet/[id] : le menu Base UI
 * et l'AlertDialog de suppression ne servent qu'au clic, ils sortent donc du
 * first load. Avant le premier clic sur « ⋯ », seul un bouton placeholder
 * (identique au pixel) est rendu ; le vrai menu se monte au clic et s'ouvre
 * immédiatement après chargement de son chunk. Le dialog de suppression n'est
 * monté qu'à la première demande de suppression (state showDelete).
 */

const CatchActionsDropdown = dynamic(() => import('./CatchActionsDropdown'), {
  ssr: false,
  // Pendant le chargement du chunk : même bouton, aucun flash visuel.
  loading: () => (
    <button
      type="button"
      aria-label="Plus d'options"
      aria-haspopup="menu"
      aria-expanded="false"
      className={catchActionsTriggerClass}
    >
      <MoreHorizontal size={18} />
    </button>
  ),
})

const CatchDeleteDialog = dynamic(() => import('./CatchDeleteDialog'), {
  ssr: false,
})

// Préchargements : webpack met en cache la promesse de module, donc le
// dynamic() correspondant monte sans latence réseau au moment du clic.
function preloadDropdown() {
  void import('./CatchActionsDropdown')
}

function preloadDeleteDialog() {
  void import('./CatchDeleteDialog')
}

export function CatchActionsMenu({ catchId }: { catchId: string }) {
  const router = useRouter()
  // Menu monté au premier clic, puis laissé monté (fermeture/réouverture et
  // retour focus 100 % natifs Base UI ensuite).
  const [menuMounted, setMenuMounted] = useState(false)
  // Dialog monté à la première demande de suppression, puis laissé monté
  // (préserve l'animation de fermeture et le comportement de focus).
  const [deleteMounted, setDeleteMounted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteCatch(catchId)
    if ('error' in result) {
      if (result.error === 'Non authentifié') {
        router.push('/auth/login?next=/carnet')
        return
      }
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success('Prise supprimée.')
    router.push('/carnet')
  }

  function openDeleteFlow() {
    setDeleteMounted(true)
    setShowDelete(true)
  }

  return (
    <>
      {menuMounted ? (
        <CatchActionsDropdown
          catchId={catchId}
          onDeleteRequest={openDeleteFlow}
        />
      ) : (
        <button
          type="button"
          aria-label="Plus d'options"
          aria-haspopup="menu"
          aria-expanded="false"
          className={catchActionsTriggerClass}
          onPointerEnter={preloadDropdown}
          onFocus={preloadDropdown}
          onClick={() => {
            // Étape suivante probable du flux : on précharge aussi le dialog.
            preloadDeleteDialog()
            setMenuMounted(true)
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      )}

      {deleteMounted && (
        <CatchDeleteDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          deleting={deleting}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
