'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { seedFeedDev } from './actions'

export function SeedFeedButton() {
  const [running, setRunning] = useState(false)

  async function handleClick() {
    setRunning(true)
    const res = await seedFeedDev()
    setRunning(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`${res.count} posts de seed insérés.`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={running}
      className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-teal-500 text-white text-[14px] font-semibold hover:bg-teal-600 disabled:opacity-50"
    >
      {running && <Loader2 size={15} className="animate-spin" />}
      Lancer le seed du fil
    </button>
  )
}
