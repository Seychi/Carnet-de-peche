'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, ExternalLink, Loader2, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteShareCard,
  listMyShareCards,
  type ShareCardSummary,
} from '@/app/actions/share'

// Écran « mes cartes partagées » (sprint 38 WS-C) : liste + révocation.
// Supprimer une carte → /c/{slug} renvoie 404 (DELETE RLS owner). Replié par
// défaut (chargé à l'ouverture) pour ne pas alourdir le carnet.

const KIND_LABEL: Record<ShareCardSummary['kind'], string> = {
  catch: 'Prise',
  conditions: 'Conditions',
  outing: 'Sortie',
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

export function ManageShareCards({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<ShareCardSummary[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || loaded) return
    setLoading(true)
    listMyShareCards()
      .then((res) => {
        if (res.ok) setCards(res.data)
        else toast.error(res.error)
      })
      .finally(() => {
        setLoading(false)
        setLoaded(true)
      })
  }, [open, loaded])

  function handleDelete(slug: string) {
    startTransition(async () => {
      const res = await deleteShareCard(slug)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCards((prev) => prev.filter((c) => c.slug !== slug))
      toast.success('Carte supprimée. Le lien ne fonctionne plus.')
    })
  }

  return (
    <div
      className={`rounded-[14px] border border-sand-200 bg-white ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-500">
            <Share2 size={16} aria-hidden="true" />
          </span>
          <span className="text-[14px] font-semibold text-navy-900">
            Mes cartes partagées
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-sand-100 px-4 py-3">
          {loading ? (
            <p className="flex items-center gap-2 py-2 text-[13px] text-ink-400">
              <Loader2 size={14} className="animate-spin" /> Chargement…
            </p>
          ) : cards.length === 0 ? (
            <p className="py-2 text-[13px] text-ink-500">
              Tu n&rsquo;as pas encore de carte partagée. Partage une prise ou tes
              conditions pour en créer une (toujours sans tes coordonnées).
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cards.map((c) => (
                <li
                  key={c.slug}
                  className="flex items-center justify-between gap-3 rounded-[10px] bg-sand-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-navy-900">
                      {c.title}
                    </p>
                    <p className="text-[11.5px] text-ink-400">
                      {KIND_LABEL[c.kind]} · {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={`/c/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Voir la carte"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-sand-100"
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.slug)}
                      disabled={pending}
                      aria-label="Supprimer la carte"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-coral-500 transition-colors hover:bg-coral-500/10 disabled:opacity-60"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
