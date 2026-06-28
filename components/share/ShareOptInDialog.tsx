'use client'

import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { setShareSkipOptin } from '@/lib/share/skip-optin'
import type { ShareCardInput } from '@/app/actions/share'

// Avertissement opt-in AVANT toute création de carte (sprint 38, invariant n°3) :
// une carte est PUBLIQUE et ne révèle jamais les coordonnées. L'utilisateur confirme
// explicitement à chaque fois (jamais de partage automatique).
//
// Sprint 47 : étendu aux kinds 'recap' (mon année de pêche) et 'records' (mes
// records), + case « inclure ma photo » (prise avec photo, cochée par défaut, D1) +
// case « ne plus me demander » (1-tap, D4) qui écrit profiles.share_skip_optin.

type ShareKind = ShareCardInput['kind']

const COPY: Record<ShareKind, { title: string; description: string }> = {
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
  gearbox: {
    title: 'Partager ma boîte ?',
    description:
      'On crée une carte publique de tes leurres qui pêchent : leur libellé, le nombre de prises et l’espèce dominante. Aucune coordonnée, aucun spot, aucune photo. Tu peux la supprimer quand tu veux.',
  },
  recap: {
    title: 'Partager ton année de pêche ?',
    description:
      'On résume ton année (nombre de prises, espèces, ton plus beau poisson) sur une carte publique. Aucune coordonnée, aucun spot, juste ton bilan. Révocable à tout moment.',
  },
  records: {
    title: 'Partager tes records ?',
    description:
      'On crée une carte publique de tes plus beaux poissons par espèce (taille et poids). Aucune coordonnée, aucun spot, aucun classement avec les autres. Tu peux la supprimer quand tu veux.',
  },
}

export function ShareOptInDialog({
  kind,
  open,
  onOpenChange,
  onConfirm,
  working,
  hasPhoto = false,
}: {
  kind: ShareKind
  open: boolean
  onOpenChange: (open: boolean) => void
  // Reçoit les options collectées dans le dialog. Un appelant historique qui
  // ignore l'argument (fn sans paramètre) reste compatible.
  onConfirm: (opts: { includePhoto: boolean }) => void
  working: boolean
  // Vrai uniquement pour une prise AVEC photo : affiche la case d'inclusion photo
  // (cochée par défaut, D1). Absente sinon → aucune photo n'est partagée.
  hasPhoto?: boolean
}) {
  const copy = COPY[kind]

  // D1 : la case photo est cochée par défaut (ON) pour une prise avec photo.
  const [includePhoto, setIncludePhoto] = useState(true)
  // D4 : « ne plus me demander » → mémorise la préférence (1-tap les fois suivantes).
  const [skipNext, setSkipNext] = useState(false)

  // À chaque réouverture du dialog, on repart sur les valeurs par défaut.
  useEffect(() => {
    if (open) {
      setIncludePhoto(true)
      setSkipNext(false)
    }
  }, [open])

  async function handleConfirm() {
    // On persiste la préférence AVANT de partager (best-effort, ne bloque rien).
    if (skipNext) {
      await setShareSkipOptin(true)
    }
    onConfirm({ includePhoto: hasPhoto && includePhoto })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Options (geom-free) : inclusion photo + 1-tap. */}
        <div className="flex flex-col gap-3 py-1">
          {hasPhoto && (
            <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-ink-700">
              <Checkbox
                checked={includePhoto}
                onCheckedChange={(v) => setIncludePhoto(v === true)}
                disabled={working}
                className="mt-0.5"
              />
              <span>
                Inclure ma photo (elle sera publique). Les métadonnées (dont la
                position GPS) sont retirées avant le partage.
              </span>
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-500">
            <Checkbox
              checked={skipNext}
              onCheckedChange={(v) => setSkipNext(v === true)}
              disabled={working}
            />
            <span>Ne plus me demander</span>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            // AlertDialogAction = Button simple (ne ferme pas tout seul) → le dialog
            // reste ouvert pendant la génération ; le parent ferme après le partage.
            onClick={handleConfirm}
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
