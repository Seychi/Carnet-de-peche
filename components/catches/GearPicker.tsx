'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createGearItem, type GearItem, type GearKind } from '@/app/actions/gear'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Items de la boîte (fournis par la page serveur via listMyGear). */
  items: GearItem[]
  /** id sélectionné (gear_id du form) ou undefined. */
  value: string | undefined
  /** Sélection / désélection → écrit gear_id dans le form. */
  onChange: (gearId: string | undefined) => void
  /** Types de matériel acceptés selon la technique (leurre/montage vs appat). */
  allowedKinds: GearKind[]
  /** Nom accessible du champ. */
  ariaLabel: string
  className?: string
}

const KIND_LABELS: Record<GearKind, string> = {
  leurre: 'Leurre',
  montage: 'Montage',
  appat: 'Appât',
}

function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Libellé lisible d'un item (marque modèle couleur), sans tiret cadratin. */
function gearLabel(item: GearItem): string {
  const parts = [item.brand, item.model, item.color].map((p) => p?.trim()).filter(Boolean)
  const base = parts.join(' ')
  return base || KIND_LABELS[item.kind]
}

/** Clé de dédup insensible à la casse : kind + marque + modèle + couleur. */
function dedupKey(parts: {
  kind: GearKind
  brand?: string | null
  model?: string | null
  color?: string | null
}): string {
  const norm = (s: string | null | undefined) => normalizeText((s ?? '').trim())
  return [parts.kind, norm(parts.brand), norm(parts.model), norm(parts.color)].join('|')
}

const inputCls =
  'w-full border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 placeholder:text-slate-400 bg-white'

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Sélecteur « ma boîte » : autocomplétion sur les gear_items de l'utilisateur
 * (combobox ARIA), avec création inline. Écrit `gear_id` dans le form. Le champ
 * texte legacy (marque/modèle ou appât) reste géré à côté dans CatchForm pour la
 * rétro-compat et la saisie one-shot. Gratuit (moat), aucun paywall.
 */
export function GearPicker({
  items,
  value,
  onChange,
  allowedKinds,
  ariaLabel,
  className,
}: Props) {
  // Liste locale : on y pousse les items créés inline pour qu'ils réapparaissent
  // immédiatement sans recharger la page.
  const [localItems, setLocalItems] = useState<GearItem[]>(items)
  useEffect(() => setLocalItems(items), [items])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState(false)
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const allowed = useMemo(
    () => localItems.filter((i) => allowedKinds.includes(i.kind)),
    [localItems, allowedKinds],
  )

  const selected = useMemo(
    () => localItems.find((i) => i.id === value) ?? null,
    [localItems, value],
  )

  const q = normalizeText(query.trim())
  const results = useMemo(
    () => (q ? allowed.filter((i) => normalizeText(gearLabel(i)).includes(q)) : allowed),
    [allowed, q],
  )

  // Ferme la liste au clic extérieur.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function pick(item: GearItem) {
    onChange(item.id)
    setOpen(false)
    setQuery('')
    setActive(-1)
  }

  function clearSelection() {
    onChange(undefined)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && active >= 0 && results[active]) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // ── État sélectionné : pastille avec libellé + bouton retirer ──
  if (selected) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-teal-200 bg-teal-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Check size={15} className="shrink-0 text-teal-600" aria-hidden />
            <span className="truncate text-[14px] font-medium text-teal-900">
              {gearLabel(selected)}
            </span>
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-teal-600">
              {KIND_LABELS[selected.kind]}
            </span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Retirer le matériel sélectionné"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-teal-700 transition-colors hover:bg-teal-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  // ── Mode création inline ──
  if (creating) {
    return (
      <GearCreateForm
        kind={allowedKinds[0]}
        kindOptions={allowedKinds}
        pending={pending}
        onCancel={() => setCreating(false)}
        onCreate={async (input) => {
          // Dédup côté UI : si un item équivalent (même kind + marque + modèle +
          // couleur, insensible à la casse) existe déjà dans la boîte, on le
          // sélectionne au lieu d'en créer un doublon. L'index unique 077 reste
          // le backstop DB en dernier recours.
          const key = dedupKey(input)
          const dup = localItems.find((i) => dedupKey(i) === key)
          if (dup) {
            onChange(dup.id)
            setCreating(false)
            toast.success('Matériel déjà dans ta boîte, sélectionné')
            return
          }
          setPending(true)
          const res = await createGearItem(input)
          setPending(false)
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          const newItem: GearItem = {
            id: res.data.id,
            kind: input.kind,
            brand: input.brand ?? null,
            model: input.model ?? null,
            color: input.color ?? null,
            size_mm: input.size_mm ?? null,
            notes: input.notes ?? null,
          }
          setLocalItems((prev) => [newItem, ...prev])
          onChange(newItem.id)
          setCreating(false)
          toast.success('Matériel ajouté à ta boîte')
        }}
        className={className}
      />
    )
  }

  // ── Combobox (recherche dans la boîte) ──
  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={
            allowed.length > 0 ? 'Cherche dans ta boîte…' : 'Ta boîte est vide pour l’instant'
          }
          className={`${inputCls} pr-10`}
        />
        <ChevronDown
          size={16}
          aria-hidden
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[10px] border border-sand-200 bg-white shadow-lg">
          <ul role="listbox" id={listboxId} className="max-h-56 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-[13px] text-ink-400">
                {allowed.length === 0
                  ? 'Aucun matériel enregistré.'
                  : 'Rien ne correspond dans ta boîte.'}
              </li>
            ) : (
              results.map((item, i) => (
                <li
                  key={item.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-[14px] ${
                    i === active ? 'bg-teal-50 text-teal-800' : 'text-ink-700 hover:bg-sand-50'
                  }`}
                >
                  <span className="truncate">{gearLabel(item)}</span>
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-400">
                    {KIND_LABELS[item.kind]}
                  </span>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen(false)
              setCreating(true)
            }}
            className="flex min-h-11 w-full items-center gap-2 border-t border-sand-200 px-3 py-2.5 text-left text-[14px] font-medium text-teal-700 transition-colors hover:bg-teal-50"
          >
            <Plus size={15} className="shrink-0" aria-hidden />
            <span>Ajouter un nouveau matériel{query.trim() ? ` « ${query.trim()} »` : ''}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Formulaire de création inline ────────────────────────────────────────────

function GearCreateForm({
  kind,
  kindOptions,
  pending,
  onCreate,
  onCancel,
  className,
}: {
  kind: GearKind
  kindOptions: GearKind[]
  pending: boolean
  onCreate: (input: {
    kind: GearKind
    brand?: string
    model?: string
    color?: string
    size_mm?: number
    notes?: string
  }) => void
  onCancel: () => void
  className?: string
}) {
  const [selKind, setSelKind] = useState<GearKind>(kind)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [sizeMm, setSizeMm] = useState('')
  const [notes, setNotes] = useState('')

  const canSubmit = brand.trim().length > 0 || model.trim().length > 0

  function submit() {
    if (!canSubmit || pending) return
    const parsedSize = sizeMm.trim() ? Number.parseInt(sizeMm, 10) : undefined
    onCreate({
      kind: selKind,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      color: color.trim() || undefined,
      size_mm: Number.isFinite(parsedSize) ? parsedSize : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className={`rounded-[10px] border border-sand-200 bg-slate-50 p-3 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
          Nouveau matériel
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annuler l’ajout"
          className="flex size-11 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-slate-200 hover:text-ink-600"
        >
          <X size={16} />
        </button>
      </div>

      {kindOptions.length > 1 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {kindOptions.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSelKind(k)}
              className={`min-h-11 rounded-[10px] border py-2.5 text-[14px] font-medium transition-colors ${
                selKind === k
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-sand-200 bg-white text-ink-700'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Marque (Fiiish, Black Minnow…)"
          aria-label="Marque du matériel"
          maxLength={60}
          className={inputCls}
        />
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Modèle / référence"
          aria-label="Modèle du matériel"
          maxLength={100}
          className={inputCls}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Couleur / coloris"
            aria-label="Couleur du matériel"
            maxLength={60}
            className={inputCls}
          />
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={sizeMm}
            onChange={(e) => setSizeMm(e.target.value)}
            placeholder="Taille (mm)"
            aria-label="Taille en millimètres"
            className={`${inputCls} font-mono`}
          />
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optionnel)"
          aria-label="Note sur le matériel"
          maxLength={500}
          className={inputCls}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-[10px] border border-sand-200 bg-white py-2.5 text-[14px] font-medium text-ink-600 transition-colors hover:bg-slate-100"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || pending}
          className="flex min-h-11 flex-[1.5] items-center justify-center gap-2 rounded-[10px] bg-teal-500 py-2.5 text-[14px] font-bold text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-60"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          Ajouter à ma boîte
        </button>
      </div>
      {!canSubmit && (
        <p className="mt-2 text-[12px] text-ink-400">
          Indique au moins une marque ou un modèle.
        </p>
      )}
    </div>
  )
}
