'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useShareCard } from '@/components/share/use-share-card'
import { ShareOptInDialog } from '@/components/share/ShareOptInDialog'
import { ShareSuccessModal } from '@/components/share/ShareSuccessModal'
import { catchActionsTriggerClass } from './catch-actions-trigger'

/**
 * Menu « ⋯ » de la fiche prise, chargé en lazy par CatchActionsMenu
 * (sprint 11 Bloc F) : le menu Base UI (+ positionnement floating-ui) sort
 * du first load de /carnet/[id].
 *
 * Monté au premier clic sur le bouton : on démarre fermé puis on ouvre via
 * effet, pour déclencher la vraie transition d'ouverture Base UI (focus,
 * animation, aria-expanded) comme un clic natif sur le trigger. Le composant
 * reste ensuite monté : ouvertures/fermetures suivantes 100 % natives.
 *
 * Partage (sprint 38 WS-C) : « Partager » ne partage PLUS l'URL privée de la
 * prise. Il crée une carte PUBLIQUE geom-free (/c/{slug}) après un avertissement
 * opt-in, puis ouvre le partage natif AVEC l'image (story) ou retombe sur copie +
 * téléchargement. Jamais l'URL de la prise privée.
 */
export default function CatchActionsDropdown({
  catchId,
  hasPhoto = false,
  onDeleteRequest,
}: {
  catchId: string
  hasPhoto?: boolean
  onDeleteRequest: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { share, sharing, preview, previewOpen, setPreviewOpen, downloadPreview } =
    useShareCard()

  useEffect(() => {
    setOpen(true)
  }, [])

  // includePhoto : choix de l'utilisateur dans le dialog (toggle coché par défaut
  // quand la prise a une photo, mais décochable). La photo n'est publiée que sur
  // ce choix explicite ; le serveur la copie EXIF-strippée vers le bucket public.
  async function handleConfirmShare(opts: { includePhoto: boolean }) {
    await share(
      { kind: 'catch', catchId, includePhoto: opts.includePhoto },
      'Ma prise, Carnet de Pêche',
      'Ma prise sur Carnet de Pêche.',
    )
    setShareOpen(false)
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label="Plus d'options"
          className={catchActionsTriggerClass}
        >
          <MoreHorizontal size={18} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg">
          <DropdownMenuItem
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => router.push(`/carnet/${catchId}/modifier`)}
          >
            <Pencil size={14} className="text-ink-500" />
            Modifier
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={14} className="text-ink-500" />
            Partager
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={onDeleteRequest}
          >
            <Trash2 size={14} />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareOptInDialog
        kind="catch"
        hasPhoto={hasPhoto}
        open={shareOpen}
        onOpenChange={(v) => {
          if (!sharing) setShareOpen(v)
        }}
        onConfirm={handleConfirmShare}
        working={sharing}
      />

      <ShareSuccessModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        slug={preview?.slug ?? null}
        pageUrl={preview?.pageUrl ?? null}
        onDownload={downloadPreview}
      />
    </>
  )
}
