'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Share2, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteCatch } from '@/lib/catches/actions'

export function CatchActionsMenu({ catchId }: { catchId: string }) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Plus d'options"
          className="flex items-center justify-center w-9 h-9 rounded-full text-ink-500 hover:bg-slate-100 transition-colors"
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
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={14} />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette prise ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La prise et sa photo seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 gap-2"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              {deleting ? 'Suppression…' : 'Oui, supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
