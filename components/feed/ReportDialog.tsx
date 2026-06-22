'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { reportPost, type ReportReason } from '@/app/actions/feed'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'inapproprie', label: 'Contenu inapproprié' },
  { value: 'spot_burning', label: 'Spot brûlé (coords précises balancées)' },
  { value: 'autre', label: 'Autre' },
]

export function ReportDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    const res = await reportPost(postId, reason, details.trim() || undefined)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Merci, on regarde.')
    setDetails('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Signaler ce post</DialogTitle>
          <DialogDescription>
            Dis-nous ce qui ne va pas. On reste en modération libre, mais on regarde les signalements.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as ReportReason)}
          className="flex flex-col gap-2.5 py-2"
        >
          {REASONS.map((r) => (
            <Label
              key={r.value}
              className="flex items-center gap-2.5 text-[14px] text-ink-700 cursor-pointer min-h-11"
            >
              <RadioGroupItem value={r.value} />
              {r.label}
            </Label>
          ))}
        </RadioGroup>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Précise (optionnel)…"
          className="w-full rounded-[14px] border border-ink-200 p-3 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-teal-500 hover:bg-teal-600">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Signaler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
