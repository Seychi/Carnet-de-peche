'use client'

import { useEffect, useId, useRef, useState, startTransition } from 'react'
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

  // ⟢ Sprint 64 / Bloc 2 — écho local pour découpler la frappe du re-render lourd du
  // parent. Le form parent (CatchForm) surveille `location_label` via `watch(...)` :
  // chaque frappe y déclenchait un re-render COMPLET du formulaire (façade/maille + 7
  // cartes + pickers), mesuré ~2,3 s d'INP (audit §3.6). On affiche désormais `echo`
  // (state URGENT, synchrone → paint clavier instantané) et on propage au parent en
  // `startTransition` (non-urgent, interruptible). `value` (le form) reste la source
  // de vérité : un changement EXTERNE (reverse-geocode GPS) est réconcilié ci-dessous.
  const [echo, setEcho] = useState(value)
  // Dernière valeur qu'on a propagée nous-mêmes (frappe/sélection) : sert à NE PAS
  // réécrire l'écho quand le parent nous renvoie notre propre valeur (souvent « en
  // retard », re-render lent) → pas de saut de curseur en frappe rapide. Seul un
  // `value` qui diverge de lastSentRef = source externe → on met l'écho à jour.
  const lastSentRef = useRef(value)

  // Réconciliation des changements EXTERNES de `value` (GPS reverse-geocode, reset).
  useEffect(() => {
    if (value !== lastSentRef.current) setEcho(value)
  }, [value])

  useEffect(() => {
    // Ne fetch QUE si l'écho courant = la dernière frappe utilisateur. Un setValue
    // externe (reverse-geocode après GPS) réécrit l'écho sans passer par onChange → on
    // ferme la liste au lieu d'ouvrir une suggestion fantôme (qui pourrait écraser les
    // coordonnées GPS précises si l'utilisateur la cliquait). On indexe sur `echo` (et
    // non `value`) : les suggestions suivent la frappe SANS attendre le re-render lent
    // du parent.
    if (echo !== lastTypedRef.current) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const q = echo.trim()
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
  }, [echo])

  useEffect(() => () => abortRef.current?.abort(), [])

  function choose(hit: MunicipalityHit) {
    lastTypedRef.current = null // pas de re-fetch après sélection
    lastSentRef.current = hit.label
    setEcho(hit.label) // affichage immédiat de la ville choisie
    setOpen(false)
    setSuggestions([])
    setActive(-1)
    // Sélection = action DISCRÈTE unique (pas un flux de frappe) : aucun gain INP à la
    // différer. On propage SYNCHRONEMENT le label ET les coords au form parent pour
    // qu'ils soient présents immédiatement (évite toute course avec un submit juste
    // après la sélection). Seule la frappe (onChange) passe en startTransition.
    onValueChange(hit.label)
    onSelect(hit)
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
        value={echo}
        onChange={(e) => {
          const next = e.target.value
          setEcho(next) // urgent : paint clavier instantané (INP bas)
          lastTypedRef.current = next
          lastSentRef.current = next
          // non-urgent : le re-render lourd du parent (watch location_label) est différé
          startTransition(() => onValueChange(next))
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
