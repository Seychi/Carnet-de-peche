'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fish, Loader2, Lock, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SPECIES_LABELS } from '@/lib/labels'
import { createPost } from '@/app/actions/feed'

export type RecentCatch = {
  id: string
  species: string | null
  size_cm: number | null
  caught_at: string | null
}

export function PostComposer({
  region,
  canPost,
  blockedReason,
  recentCatches = [],
}: {
  region: string
  canPost: boolean
  blockedReason?: 'discovery' | 'cross-dept'
  recentCatches?: RecentCatch[]
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [attached, setAttached] = useState<RecentCatch | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!canPost) {
    const msg =
      blockedReason === 'cross-dept'
        ? 'Tu es en Local sur un autre département. Passe Itinérant pour poster ici.'
        : 'Passe en Local pour participer au fil de ton département.'
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-sand-50 p-4">
        <Lock size={18} className="shrink-0 text-ink-400" />
        <p className="flex-1 text-[13px] text-ink-600">{msg}</p>
        <Link
          href="/tarifs"
          className="shrink-0 inline-flex items-center min-h-11 px-4 rounded-full bg-teal-500 text-white text-[13px] font-semibold hover:bg-teal-600 transition-colors"
        >
          Voir les offres
        </Link>
      </div>
    )
  }

  async function handleSubmit() {
    if (!text.trim() && !attached) return
    setSubmitting(true)
    const res = await createPost({
      text: text.trim() || undefined,
      catchId: attached?.id,
      region,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setText('')
    setAttached(null)
    toast.success('Posté !')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-slate-200 bg-white p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Quoi de neuf sur le bord ?"
        className="w-full resize-none text-[15px] focus:outline-none placeholder:text-ink-300"
      />

      {attached && (
        <div className="flex items-center gap-2 rounded-[10px] bg-teal-50 px-3 py-2 text-[13px] text-navy-900">
          <Fish size={15} className="text-teal-500" />
          <span className="flex-1 truncate">
            {SPECIES_LABELS[attached.species ?? ''] ?? attached.species ?? 'Prise'}
            {attached.size_cm ? ` · ${attached.size_cm} cm` : ''}
          </span>
          <button
            type="button"
            onClick={() => setAttached(null)}
            aria-label="Retirer la prise"
            className="text-ink-400 hover:text-ink-600 p-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
          <SheetTrigger
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 hover:text-teal-700 min-h-11 px-1"
          >
            <Fish size={15} />
            Partager une prise
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-white">
            <SheetHeader>
              <SheetTitle>Tes dernières prises</SheetTitle>
            </SheetHeader>
            <div className="max-h-[50vh] overflow-y-auto px-4 pb-6 flex flex-col gap-1">
              {recentCatches.length === 0 ? (
                <p className="text-[13px] text-ink-400 py-4">
                  Tu n’as pas encore de prise dans ton carnet.
                </p>
              ) : (
                recentCatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setAttached(c)
                      setPickerOpen(false)
                    }}
                    className="flex items-center gap-3 text-left min-h-12 px-2 rounded-[10px] hover:bg-slate-50"
                  >
                    <Fish size={16} className="text-teal-500 shrink-0" />
                    <span className="text-[14px] text-navy-900">
                      {SPECIES_LABELS[c.species ?? ''] ?? c.species ?? 'Prise'}
                      {c.size_cm ? ` · ${c.size_cm} cm` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!text.trim() && !attached)}
          className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-teal-500 text-white text-[14px] font-semibold disabled:opacity-40 hover:bg-teal-600 transition-colors"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Publier
        </button>
      </div>
    </div>
  )
}
