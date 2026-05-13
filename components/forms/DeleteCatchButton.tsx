'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteCatch } from '@/lib/catches/actions'

export function DeleteCatchButton({ catchId }: { catchId: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading'>('idle')

  async function handleDelete() {
    setStep('loading')
    const result = await deleteCatch(catchId)
    if ('error' in result) {
      toast.error(result.error)
      setStep('idle')
      return
    }
    toast.success('Prise supprimée.')
    router.push('/carnet')
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="flex items-center gap-1.5 text-[13px] text-red-500 hover:text-red-700 transition-colors"
      >
        <Trash2 size={14} />
        Supprimer
      </button>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-ink-600">Supprimer cette prise ?</span>
        <button
          onClick={handleDelete}
          className="text-[13px] font-semibold text-red-600 hover:text-red-800"
        >
          Oui, supprimer
        </button>
        <button
          onClick={() => setStep('idle')}
          className="text-[13px] text-ink-400 hover:text-ink-700"
        >
          Annuler
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
      <Loader2 size={14} className="animate-spin" />
      Suppression…
    </div>
  )
}
