'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { seedHeatmapDev } from './actions'

export function SeedHeatmapButton() {
  const [running, setRunning] = useState(false)

  async function handleClick() {
    setRunning(true)
    const res = await seedHeatmapDev()
    setRunning(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`${res.count} prises de seed insérées sur ${res.zones} zones chaudes.`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={running}
      className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-teal-500 text-white text-[14px] font-semibold hover:bg-teal-600 disabled:opacity-50"
    >
      {running && <Loader2 size={15} className="animate-spin" />}
      Lancer le seed de la heatmap
    </button>
  )
}
