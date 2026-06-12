'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
 */
export default function CatchActionsDropdown({
  catchId,
  onDeleteRequest,
}: {
  catchId: string
  onDeleteRequest: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(true)
  }, [])

  async function handleShare() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Ma prise — Carnet de Pêche', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Lien copié !')
      }
    } catch {
      // Annulé par l'utilisateur
    }
  }

  return (
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
          onClick={handleShare}
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
  )
}
