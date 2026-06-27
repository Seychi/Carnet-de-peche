'use client'

import { Loader2, Share2 } from 'lucide-react'
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

// Avertissement opt-in AVANT toute création de carte (sprint 38, invariant n°3) :
// une carte est PUBLIQUE et ne révèle jamais les coordonnées. L'utilisateur confirme
// explicitement à chaque fois (jamais de partage automatique).

const COPY: Record<
  'catch' | 'conditions' | 'outing',
  { title: string; description: string }
> = {
  catch: {
    title: 'Partager ta prise ?',
    description:
      'On crée une belle carte publique de ta prise. Elle ne montre jamais tes coordonnées, juste la zone et le département. Tu pourras la supprimer quand tu veux.',
  },
  conditions: {
    title: 'Partager tes conditions gagnantes ?',
    description:
      'On résume tes tendances (les moments et conditions où tu sors le plus) sur une carte publique. Aucune coordonnée, juste ce que ton carnet a appris. Révocable à tout moment.',
  },
  outing: {
    title: 'Partager ta sortie ?',
    description:
      'On crée une carte publique de ta sortie (durée, prises, meilleure prise). Aucune coordonnée n’est partagée, seulement le département. Tu peux la supprimer quand tu veux.',
  },
}

export function ShareOptInDialog({
  kind,
  open,
  onOpenChange,
  onConfirm,
  working,
}: {
  kind: 'catch' | 'conditions' | 'outing'
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  working: boolean
}) {
  const copy = COPY[kind]
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            // AlertDialogAction = Button simple (ne ferme pas tout seul) → le dialog
            // reste ouvert pendant la génération ; le parent ferme après le partage.
            onClick={onConfirm}
            disabled={working}
            className="gap-2 bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-600"
          >
            {working ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Share2 size={14} />
            )}
            {working ? 'Création…' : 'Créer et partager'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
