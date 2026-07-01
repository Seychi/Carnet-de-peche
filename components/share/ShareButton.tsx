'use client'

import { Share2 } from 'lucide-react'
import type { ShareCardInput } from '@/app/actions/share'
import { useShareCard } from './use-share-card'
import { ShareOptInDialog } from './ShareOptInDialog'
import { ShareSuccessModal } from './ShareSuccessModal'

// Bouton de partage réutilisable (sprint 38 WS-C, étendu sprint 47). Opt-in strict :
// clic → soit 1-tap si l'utilisateur a coché « ne plus me demander » (D4), soit dialog
// d'avertissement (carte publique, sans coordonnées) → création + Web Share. Sert pour
// les conditions / la sortie / le récap d'année / les records. La prise a son propre
// point d'entrée dans le menu « ⋯ » de la fiche (CatchActionsDropdown).

type Variant = 'solid' | 'ghost' | 'card'

const VARIANT_CLS: Record<Variant, string> = {
  solid:
    'bg-navy-900 text-white hover:bg-navy-800 px-4 text-[14px] font-semibold',
  ghost:
    'border border-sand-300 bg-white text-ink-700 hover:border-teal-500/50 px-4 text-[14px] font-semibold',
  card:
    'w-full border border-sand-200 bg-white text-navy-900 hover:border-teal-400 px-4 text-[14px] font-semibold justify-between',
}

export function ShareButton({
  input,
  title,
  text,
  label = 'Partager',
  variant = 'ghost',
  className,
  hasPhoto = false,
}: {
  input: ShareCardInput
  title: string
  text: string
  label?: string
  variant?: Variant
  className?: string
  // Vrai pour une prise avec photo : active la case d'inclusion photo du dialog.
  hasPhoto?: boolean
}) {
  const {
    requestShare,
    confirmShare,
    sharing,
    dialogOpen,
    setDialogOpen,
    pendingKind,
    pendingHasPhoto,
    preview,
    previewOpen,
    setPreviewOpen,
    downloadPreview,
  } = useShareCard()

  return (
    <>
      <button
        type="button"
        onClick={() => requestShare(input, title, text, hasPhoto)}
        disabled={sharing}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full transition-colors disabled:opacity-60 ${VARIANT_CLS[variant]} ${className ?? ''}`}
      >
        <Share2 size={15} aria-hidden="true" />
        {label}
      </button>

      <ShareOptInDialog
        kind={pendingKind ?? input.kind}
        hasPhoto={pendingHasPhoto}
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!sharing) setDialogOpen(v)
        }}
        onConfirm={confirmShare}
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
