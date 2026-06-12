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
 * Confirmation de suppression d'une prise, chargée en lazy par
 * CatchActionsMenu (sprint 11 Bloc F) : l'AlertDialog Base UI sort du first
 * load de /carnet/[id] — montée seulement quand l'utilisateur ouvre le flux
 * de suppression. Texte, états et action serveur inchangés.
 */
export default function CatchDeleteDialog({
  open,
  onOpenChange,
  deleting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deleting: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
