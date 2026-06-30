'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Users, Check } from 'lucide-react'
import { proposeOuting } from '@/lib/cofishing/actions'
import { COASTAL_DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { CARNET_SPECIES_OPTIONS } from '@/lib/seo/programmatic'

const inputCls =
  'w-full min-h-11 border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40 bg-white'

function nowLocalPlus(hours: number): string {
  const d = new Date(Date.now() + hours * 3600 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function OutingComposer({ defaultDepartment }: { defaultDepartment?: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [department, setDepartment] = useState(defaultDepartment ?? '')
  const [areaLabel, setAreaLabel] = useState('')
  const [plannedAt, setPlannedAt] = useState(nowLocalPlus(24))
  const [capacity, setCapacity] = useState('')
  const [species, setSpecies] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleSpecies(key: string) {
    setSpecies((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!department) {
      toast.error('Choisis un département.')
      return
    }
    setSubmitting(true)
    const res = await proposeOuting({
      department,
      area_label: areaLabel.trim() || undefined,
      planned_at: new Date(plannedAt).toISOString(),
      capacity: capacity ? Number(capacity) : undefined,
      species: species.length > 0 ? species : undefined,
      notes: notes.trim() || undefined,
    })
    setSubmitting(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success('Sortie proposée. Les pêcheurs de ton coin peuvent te rejoindre.')
    setAreaLabel('')
    setNotes('')
    setCapacity('')
    setSpecies([])
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-teal-500 py-3.5 font-semibold text-navy-950 transition-colors hover:bg-teal-300"
      >
        <Users size={18} /> Proposer une sortie
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[14px] border border-sand-200 bg-white p-5 space-y-3">
      <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
        Proposer une sortie
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          aria-label="Département"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={inputCls}
        >
          <option value="">Département…</option>
          {COASTAL_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d} — {DEPARTMENT_LABELS[d] ?? d}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          aria-label="Date et heure de la sortie"
          value={plannedAt}
          min={nowLocalPlus(0)}
          onChange={(e) => setPlannedAt(e.target.value)}
          className={inputCls}
        />
      </div>

      <input
        type="text"
        aria-label="Coin de pêche (repère libre)"
        value={areaLabel}
        onChange={(e) => setAreaLabel(e.target.value)}
        maxLength={120}
        placeholder="Coin (libre) : « plage de la Govelle », « digue nord »…"
        className={inputCls}
      />
      <p className="text-[11px] text-ink-400">
        Pas de coordonnées GPS : juste un repère libre. Tu donnes le point de RDV précis aux
        participants acceptés.
      </p>

      <div>
        <p className="mb-1.5 text-[12px] font-medium text-ink-600">Espèces ciblées (optionnel)</p>
        <div className="flex flex-wrap gap-1.5">
          {CARNET_SPECIES_OPTIONS.map((s) => {
            const active = species.includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSpecies(s.value)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors ${
                  active
                    ? 'border-teal-500 bg-teal-500 text-navy-950 font-medium'
                    : 'border-sand-200 bg-white text-ink-600 hover:border-teal-300'
                }`}
              >
                {active && <Check size={12} aria-hidden />}
                {s.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-400">
          Les pêcheurs qui filtrent par ces espèces verront ta sortie.
        </p>
      </div>

      <input
        type="number"
        aria-label="Nombre de places (optionnel)"
        min={1}
        max={20}
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder="Places (optionnel)"
        className={inputCls}
      />

      <textarea
        aria-label="Détails de la sortie (optionnel)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Niveau, technique, ce que tu proposes…"
        className="w-full border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40 resize-none"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-teal-500 py-2.5 font-semibold text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Publier
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-[10px] border border-sand-200 px-4 py-2.5 text-[14px] text-ink-600"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
