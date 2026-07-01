'use client'

import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { shareCardImagePath } from '@/lib/share/url'

// Modale de succès du partage (sprint 59, Bloc 3). Sur desktop / navigateur sans
// Web Share de fichier, la feuille native ne peut pas envoyer l'image → au lieu
// d'un toast fugace, on montre un APERÇU de la carte publique générée, avec
// « Copier le lien » et « Télécharger l'image ». La carte est geom-free (jamais
// une coordonnée). Utilise le Dialog du design system (fermeture croix / Échap).
export function ShareSuccessModal({
  open,
  onOpenChange,
  slug,
  pageUrl,
  onDownload,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string | null
  pageUrl: string | null
  onDownload: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    if (!pageUrl) return
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      toast.success('Lien copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(pageUrl)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ta carte est prête</DialogTitle>
          <DialogDescription>
            Une carte publique, sans aucune coordonnée. Copie le lien ou télécharge
            l’image pour la partager où tu veux.
          </DialogDescription>
        </DialogHeader>

        {slug && (
          <div className="overflow-hidden rounded-[12px] border border-sand-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shareCardImagePath(slug, 'og')}
              alt="Aperçu de ta carte de partage"
              width={1200}
              height={630}
              className="w-full"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-sand-300 bg-white px-4 text-[14px] font-semibold text-ink-700 transition-colors hover:border-teal-500/50"
          >
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? 'Lien copié' : 'Copier le lien'}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-navy-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-800"
          >
            <Download size={15} aria-hidden="true" />
            Télécharger l’image
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
