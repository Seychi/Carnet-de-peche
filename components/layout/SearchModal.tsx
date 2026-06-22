'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { searchUsers } from '@/app/actions/follow'
import type { UserSummary } from '@/app/actions/follow'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

/**
 * Bouton loupe + modale de recherche de pêcheurs.
 * Server Action `searchUsers` appelée via useTransition (debounced 300 ms).
 * Navigation → /u/[username] au clic d'un résultat.
 * Fermeture : Escape, clic en dehors, clic sur la croix, navigation.
 */
export function SearchModal() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus l'input à l'ouverture.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setError(null)
    }
  }, [open])

  // Fermeture au clic en dehors.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Fermeture à Escape.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchUsers(value)
        if (res.ok) {
          setResults(res.data)
          setError(null)
        } else {
          setResults([])
          setError(res.error)
        }
      })
    }, 300)
  }

  function handleSelect(username: string | null) {
    if (!username) return
    setOpen(false)
    router.push(`/u/${username}`)
  }

  const showEmpty = !isPending && query.trim().length >= 2 && results.length === 0 && !error

  return (
    <div ref={containerRef} className="relative">
      {/* Bouton loupe */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Rechercher un pêcheur"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-ink-100"
      >
        <Search size={20} strokeWidth={1.9} aria-hidden="true" />
      </button>

      {/* Modale */}
      {open && (
        <div
          role="dialog"
          aria-label="Rechercher un pêcheur"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-[14px] border border-sand-200 bg-white shadow-lg sm:w-96"
        >
          {/* Champ de recherche */}
          <div className="flex items-center gap-2 border-b border-sand-200 px-3 py-2.5">
            <Search size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Rechercher un pêcheur…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-navy-900 placeholder:text-ink-400 focus:outline-none"
            />
            {isPending && <Loader2 size={15} className="shrink-0 animate-spin text-ink-400" />}
            {!isPending && query.length > 0 && (
              <button
                onClick={() => handleQueryChange('')}
                aria-label="Effacer"
                className="flex shrink-0 items-center justify-center text-ink-400 hover:text-navy-900"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Résultats */}
          {results.length > 0 && (
            <ul role="listbox" className="max-h-72 overflow-y-auto py-1.5">
              {results.map((u) => {
                const name = u.display_name || `@${u.username ?? 'pêcheur'}`
                const dept = u.home_department
                  ? (DEPARTMENT_LABELS[u.home_department] ?? u.home_department)
                  : null
                return (
                  <li key={u.id} role="option" aria-selected={false}>
                    <button
                      onClick={() => handleSelect(u.username)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-sand-50 transition-colors"
                    >
                      <Avatar className="size-8 shrink-0">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} alt="" />}
                        <AvatarFallback className="text-[11px]">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-navy-900">{name}</p>
                        {dept && (
                          <p className="text-[11px] text-ink-400">{dept}</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* État vide */}
          {showEmpty && (
            <p className="px-4 py-4 text-center text-[13px] text-ink-400">
              Aucun pêcheur trouvé pour «&nbsp;{query}&nbsp;».
            </p>
          )}

          {/* Erreur */}
          {error && (
            <p className="px-4 py-4 text-center text-[13px] text-red-600" role="alert">
              {error}
            </p>
          )}

          {/* Invite initiale */}
          {!isPending && query.trim().length < 2 && (
            <p className="px-4 py-4 text-center text-[13px] text-ink-400">
              Tape au moins 2 caractères…
            </p>
          )}
        </div>
      )}
    </div>
  )
}
