'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { bulkCreateCatches } from '@/lib/catches/actions'
import { DEPARTMENT_OPTIONS } from '@/lib/geo/departments'
import type { BulkCatchInput } from '@/lib/catches/schema'

const SPECIES_OPTIONS = [
  { value: 'bar', label: 'Bar' },
  { value: 'dorade_royale', label: 'Dorade royale' },
  { value: 'lieu_jaune', label: 'Lieu jaune' },
  { value: 'maquereau', label: 'Maquereau' },
  { value: 'sar', label: 'Sar' },
  { value: 'orphie', label: 'Orphie' },
] as const

type Row = { species: string; date: string; size: string; department: string }

const emptyRow = (): Row => ({ species: '', date: '', size: '', department: '' })

const MAX_ROWS = 50

export function BulkCatchImport() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()])
  const [pending, startTransition] = useTransition()

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }
  function addRow() {
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, emptyRow()]))
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  function onSubmit() {
    // On ne garde que les lignes au moins partiellement remplies (espèce OU date).
    const filled = rows.filter((r) => r.species || r.date || r.size || r.department)
    const incomplete = filled.filter((r) => !r.species || !r.date || !r.department)
    if (filled.length === 0) {
      toast.error('Ajoute au moins une prise (espèce, date et département).')
      return
    }
    if (incomplete.length > 0) {
      toast.error('Chaque prise a besoin au moins d’une espèce, d’une date et d’un département.')
      return
    }

    const payload: BulkCatchInput = filled.map((r) => ({
      species: r.species as BulkCatchInput[number]['species'],
      // Date seule → midi local (l'heure exacte d'une prise passée est rarement connue).
      caught_at: new Date(`${r.date}T12:00:00`).toISOString(),
      size_cm: r.size ? Number(r.size) : undefined,
      department: r.department,
    }))

    startTransition(async () => {
      const res = await bulkCreateCatches(payload)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success(
        `${res.inserted} prise${res.inserted > 1 ? 's' : ''} ajoutée${res.inserted > 1 ? 's' : ''} ! Tes tendances vont s’affiner.`,
      )
      router.push('/carnet')
      router.refresh()
    })
  }

  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-[12px] border border-sand-100 p-2.5 sm:grid-cols-[1.4fr_1fr_0.7fr_1.4fr_auto] sm:items-end"
          >
            <Field label="Espèce">
              <select
                value={row.species}
                onChange={(e) => update(i, { species: e.target.value })}
                className="w-full rounded-lg border border-sand-300 bg-white px-2.5 py-2 text-[14px] text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              >
                <option value="">—</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={row.date}
                onChange={(e) => update(i, { date: e.target.value })}
                className="w-full rounded-lg border border-sand-300 bg-white px-2.5 py-2 font-mono text-[13px] text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </Field>
            <Field label="Taille (cm)">
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={200}
                value={row.size}
                onChange={(e) => update(i, { size: e.target.value })}
                placeholder="—"
                className="w-full rounded-lg border border-sand-300 bg-white px-2.5 py-2 font-mono text-[13px] text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </Field>
            <Field label="Département">
              <select
                value={row.department}
                onChange={(e) => update(i, { department: e.target.value })}
                className="w-full rounded-lg border border-sand-300 bg-white px-2.5 py-2 text-[14px] text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              >
                <option value="">—</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label="Supprimer cette ligne"
              disabled={rows.length <= 1}
              className="mb-0.5 inline-flex h-11 w-11 items-center justify-center self-end rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-coral-500 disabled:opacity-30"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS}
          className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-3.5 py-1.5 text-[13px] font-semibold text-ink-700 transition-colors hover:border-teal-500/50 disabled:opacity-40"
        >
          <Plus size={15} /> Ajouter une ligne
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {pending ? 'Import en cours…' : 'Importer mes prises'}
        </button>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
        Localisation approximative au département (point de mer de référence) — utilisée seulement
        pour récupérer la météo/marée du jour. Les conditions ne sont récupérées que pour les prises
        récentes (≈ 3 derniers mois).
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-400">
        {label}
      </span>
      {children}
    </label>
  )
}
