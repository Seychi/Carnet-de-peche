'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Check, Loader2, Wind } from 'lucide-react'
import { createOuting } from '@/lib/outings/actions'
import { COASTAL_DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES } from '@/lib/seo/programmatic'
import { ShareButton } from '@/components/share/ShareButton'

const TECHNIQUES = [
  { value: 'leurres', label: 'Leurres' },
  { value: 'surfcasting', label: 'Surfcasting' },
  { value: 'flottante', label: 'Flottante' },
  { value: 'vif', label: 'Vif' },
] as const

// Espèces ciblées = clés DB loggables (référentiel unique).
const SPECIES_OPTIONS = Object.values(SPECIES)
  .filter((m) => m.inCarnet)
  .map((m) => ({ value: m.dbKey, label: m.label }))

const inputCls =
  'w-full border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 bg-white'

function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function OutingForm({ defaultDepartment }: { defaultDepartment?: string | null }) {
  const router = useRouter()
  const [department, setDepartment] = useState(defaultDepartment ?? '')
  const [startedAt, setStartedAt] = useState(nowLocal())
  const [technique, setTechnique] = useState<string | null>(null)
  const [species, setSpecies] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  function toggleSpecies(v: string) {
    setSpecies((prev) => (prev.includes(v) ? prev.filter((s) => s !== v) : prev.length < 6 ? [...prev, v] : prev))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!department) {
      toast.error('Choisis un département.')
      return
    }
    setSubmitting(true)
    const res = await createOuting({
      started_at: new Date(startedAt).toISOString(),
      department,
      technique: (technique as 'leurres' | 'surfcasting' | 'flottante' | 'vif' | undefined) ?? undefined,
      species_targeted: species.length ? species : undefined,
      notes: notes.trim() || undefined,
    })
    if ('error' in res) {
      toast.error(res.error)
      setSubmitting(false)
      return
    }
    toast.success('Sortie enregistrée, même bredouille, ça compte.')
    // Au lieu de rediriger sec, on propose de partager la sortie (opt-in, sprint 38).
    router.refresh()
    setSavedId(res.id)
    setSubmitting(false)
  }

  // ── État de succès : sortie loguée → proposer le partage (opt-in) ──
  if (savedId) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[14px] border border-teal-500/30 bg-teal-50/60 px-5 py-4">
          <Check size={20} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-semibold text-navy-900">Sortie enregistrée.</p>
            <p className="mt-0.5 text-[13.5px] text-ink-600">
              Tu veux la partager ? On crée une carte publique (sans aucune coordonnée), tu la
              supprimes quand tu veux.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <ShareButton
            input={{ kind: 'outing', outingId: savedId }}
            title="Ma sortie — Carnet de Pêche"
            text="Ma sortie de pêche, loguée sur Carnet de Pêche."
            label="Partager ma sortie"
            variant="solid"
          />
          <Link
            href="/carnet"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-[14px] font-semibold text-ink-700 transition-colors hover:border-teal-500/50"
          >
            Voir mon carnet <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-32">
      <div className="flex items-start gap-2.5 rounded-[14px] border border-sand-200 bg-teal-50/60 px-4 py-3">
        <Wind size={18} className="mt-0.5 shrink-0 text-teal-600" />
        <p className="text-[13px] text-ink-700">
          Pas de prise ? Logue quand même ta sortie. C&rsquo;est le dénominateur qui rendra tes
          statistiques honnêtes (et ton futur score plus juste).
        </p>
      </div>

      <Card>
        <Label required>Département</Label>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`mt-2 ${inputCls}`}>
          <option value="">Choisis un département…</option>
          {COASTAL_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d} — {DEPARTMENT_LABELS[d] ?? d}
            </option>
          ))}
        </select>
      </Card>

      <Card>
        <Label required>Quand</Label>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className={`mt-2 ${inputCls}`}
        />
      </Card>

      <Card>
        <Label>Technique (optionnel)</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TECHNIQUES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTechnique((cur) => (cur === t.value ? null : t.value))}
              className={`py-2.5 rounded-[10px] border text-[14px] font-medium transition-colors ${
                technique === t.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-sand-200 bg-slate-50 text-ink-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Espèces visées (optionnel)</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPECIES_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSpecies(s.value)}
              className={`px-3 py-1.5 rounded-full border text-[13px] transition-colors ${
                species.includes(s.value)
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-sand-200 bg-white text-ink-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Notes (optionnel)</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Conditions, ce que tu as testé, pourquoi ça n'a pas mordu…"
          className="mt-2 w-full border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 resize-none"
        />
      </Card>

      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-ink-900 border-t border-white/10 px-4 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-[14px] bg-teal-500 text-navy-950 font-bold text-[16px] transition-colors hover:bg-teal-300 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          Enregistrer la sortie
        </button>
      </div>
    </form>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[14px] border border-sand-200 p-5">{children}</div>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
      {children}
      {required && <span className="text-coral-500 ml-0.5">*</span>}
    </p>
  )
}
