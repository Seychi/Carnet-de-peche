'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, Fish, Layers, Loader2, Check } from 'lucide-react'
import { SPECIES_LABELS } from '@/lib/labels'
import { regroupCatchesIntoOuting } from '@/lib/outings/regroup'
import { OutingPostComposerDialog } from './OutingPostComposerDialog'
import type { ComposerUser } from '@/components/feed/PostComposer'

// ─── « Regrouper des prises en sortie » (Sprint 73, solo) ─────────────────────
// Chaque jour candidat = des prises d'une même journée civile non encore rattachées
// à une sortie. Sélection multiple (toutes cochées par défaut), puis regroupement
// rétroactif (SANS XP, cf lib/outings/regroup) et ouverture du composer de récit.

export type RegroupCatch = {
  id: string
  species: string | null
  size_cm: number | null
  time: string // heure locale déjà formatée côté serveur (ex. « 08:15 »)
}

export type RegroupDay = {
  key: string // clé jour civil (YYYY-MM-DD)
  label: string // libellé déjà formaté côté serveur (ex. « sam. 12 juil. 2026 »)
  catches: RegroupCatch[]
}

function speciesLabel(key: string | null): string {
  if (!key) return 'Prise'
  return SPECIES_LABELS[key] ?? key
}

export function RegroupCatchesCard({
  days,
  currentUser,
}: {
  days: RegroupDay[]
  currentUser: ComposerUser
}) {
  const router = useRouter()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [regrouping, setRegrouping] = useState(false)
  const [composerOutingId, setComposerOutingId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  if (days.length === 0) return null

  function toggleDay(day: RegroupDay) {
    if (activeKey === day.key) {
      setActiveKey(null)
      return
    }
    setActiveKey(day.key)
    // Tout sélectionné par défaut : le geste courant est « toute ma journée ».
    setSelected(new Set(day.catches.map((c) => c.id)))
  }

  function toggleCatch(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleRegroup(day: RegroupDay) {
    const catchIds = day.catches.map((c) => c.id).filter((id) => selected.has(id))
    if (catchIds.length === 0) {
      toast.error('Sélectionne au moins une prise.')
      return
    }
    setRegrouping(true)
    const res = await regroupCatchesIntoOuting({ catchIds })
    setRegrouping(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    // Sortie créée (rétroactive, sans XP) → on ouvre le composer pour la raconter.
    setActiveKey(null)
    setComposerOutingId(res.id)
    setComposerOpen(true)
  }

  // À la fermeture du composer (récit publié OU annulé), la sortie existe déjà :
  // on rafraîchit pour refléter les prises désormais regroupées et la nouvelle sortie.
  function handleComposerOpenChange(open: boolean) {
    setComposerOpen(open)
    if (!open) router.refresh()
  }

  return (
    <div className="mb-5 rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <Layers size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-navy-900">Regrouper des prises en sortie</p>
          <p className="mt-0.5 text-[13px] text-ink-600">
            Tu as des prises d&rsquo;une même journée qui ne sont rattachées à aucune sortie.
            Regroupe-les pour en faire un récit, sans montrer tes spots.
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {days.map((day) => {
          const isOpen = activeKey === day.key
          const selectedCount = day.catches.filter((c) => selected.has(c.id)).length
          return (
            <li key={day.key} className="rounded-[12px] border border-sand-200">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                aria-expanded={isOpen}
                className="flex min-h-12 w-full items-center gap-3 px-3 text-left"
              >
                <Fish size={16} className="shrink-0 text-teal-500" aria-hidden="true" />
                <span className="flex-1 text-[14px] font-medium capitalize text-navy-900">
                  {day.label}
                </span>
                <span className="font-mono text-[12.5px] tabular-nums text-ink-500">
                  {day.catches.length} {day.catches.length > 1 ? 'prises' : 'prise'}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`shrink-0 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-sand-200 px-3 py-3">
                  <ul className="flex flex-col gap-1.5">
                    {day.catches.map((c) => {
                      const isChecked = selected.has(c.id)
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isChecked}
                            onClick={() => toggleCatch(c.id)}
                            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-2 text-left hover:bg-ink-50"
                          >
                            <span
                              aria-hidden="true"
                              className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border ${
                                isChecked
                                  ? 'border-teal-500 bg-teal-500 text-white'
                                  : 'border-ink-300 bg-white text-transparent'
                              }`}
                            >
                              <Check size={13} strokeWidth={3} />
                            </span>
                            <span className="flex-1 text-[14px] text-navy-900">
                              {speciesLabel(c.species)}
                              {c.size_cm != null && (
                                <span className="ml-1.5 font-mono tabular-nums text-ink-600">
                                  {c.size_cm} cm
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-[12px] tabular-nums text-ink-400">
                              {c.time}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleRegroup(day)}
                    disabled={regrouping || selectedCount === 0}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-500 px-5 text-[14px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-40"
                  >
                    {regrouping && <Loader2 size={15} className="animate-spin" />}
                    Regrouper en sortie{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <OutingPostComposerDialog
        outingId={composerOpen ? composerOutingId : null}
        open={composerOpen}
        onOpenChange={handleComposerOpenChange}
        currentUser={currentUser}
      />
    </div>
  )
}
