'use client'

import { Loader2 } from 'lucide-react'
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

/**
 * Confirmation de suppression d'un post du fil — mêmes pattern et wording que
 * CatchDeleteDialog (cohérence UX, BUG-15). `moderation` adapte le texte quand
 * un modérateur supprime le post d'un autre.
 */
export default function PostDeleteDialog({
  open,
  onOpenChange,
  deleting,
  onConfirm,
  moderation = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deleting: boolean
  onConfirm: () => void
  moderation?: boolean
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {moderation ? 'Supprimer ce post (modération) ?' : 'Supprimer ce post ?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le post et ses commentaires seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 gap-2"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? 'Suppression…' : 'Oui, supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
