'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { geocodeMunicipality, type MunicipalityHit } from '@/lib/geo/geocode'

type Props = {
  /** Valeur affichée (source de vérité = le form parent, ex. watch('location_label')). */
  value: string
  /** Frappe utilisateur → maintient location_label côté form. */
  onValueChange: (v: string) => void
  /** Sélection d'une suggestion → le parent renseigne latitude/longitude. */
  onSelect: (hit: MunicipalityHit) => void
  className?: string
  placeholder?: string
  onFocus?: () => void
  /** Nom accessible du champ (a11y) — le placeholder ne suffit pas. */
  ariaLabel?: string
}

/**
 * Champ « Ville » avec autocomplétion BAN (combobox ARIA 1.2). Choisir une suggestion
 * renseigne les coordonnées dans le form — l'utilisateur n'a plus besoin de saisir
 * lat/long à la main (bug sprint 35 : « Position requise » au clavier). Le fetch ne se
 * déclenche QUE sur frappe utilisateur (pas sur un remplissage externe, ex. reverse-
 * geocoding après GPS).
 */
export function CityAutocomplete({
  value,
  onValueChange,
  onSelect,
  className,
  placeholder = 'Ville (ex : Camaret-sur-Mer)',
  onFocus,
  ariaLabel,
}: Props) {
  const [suggestions, setSuggestions] = useState<MunicipalityHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const abortRef = useRef<AbortController | null>(null)
  const lastTypedRef = useRef<string | null>(null)
  const listboxId = useId()

  useEffect(() => {
    // Ne fetch QUE si la valeur courante = la dernière frappe utilisateur. Un setValue
    // externe (reverse-geocode après GPS) change `value` sans passer par onChange → on
    // ferme la liste au lieu d'ouvrir une suggestion fantôme (qui pourrait écraser les
    // coordonnées GPS précises si l'utilisateur la cliquait).
    if (value !== lastTypedRef.current) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const hits = await geocodeMunicipality(q, ctrl.signal)
      if (ctrl.signal.aborted) return
      setSuggestions(hits)
      setOpen(hits.length > 0)
      setActive(-1)
    }, 250)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => () => abortRef.current?.abort(), [])

  function choose(hit: MunicipalityHit) {
    lastTypedRef.current = null // pas de re-fetch après sélection
    onValueChange(hit.label)
    onSelect(hit)
    setOpen(false)
    setSuggestions([])
    setActive(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      choose(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          lastTypedRef.current = e.target.value
          onValueChange(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          id={listboxId}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[10px] border border-sand-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((hit, i) => (
            <li
              key={hit.citycode}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // empêche le blur avant le clic
              onClick={() => choose(hit)}
              className={[
                'cursor-pointer px-3 py-2 text-[14px]',
                i === active ? 'bg-teal-50 text-teal-800' : 'text-ink-700 hover:bg-sand-50',
              ].join(' ')}
            >
              <span className="font-medium">{hit.label}</span>
              {hit.context ? <span className="text-ink-400"> · {hit.context}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
