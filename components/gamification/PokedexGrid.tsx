import Link from 'next/link'
import { Check, Fish } from 'lucide-react'
import type { Pokedex } from '@/lib/gamification/pokedex'
import { TagData } from '@/components/ui-v2/tag-data'

// Pokédex des 26 espèces du bord — ta collection perso. Chaque espèce nouvelle débloque sa case.
// DALTONIEN-SAFE : capturé vs non capturé est distingué par LUMINOSITÉ (carte pleine
// vs grisée), ICÔNE (✓ vs —) et TEXTE, jamais par la teinte seule.

export function PokedexGrid({ pokedex, className }: { pokedex: Pokedex; className?: string }) {
  const { cards, capturedCount, totalCount } = pokedex
  const empty = capturedCount === 0

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-4 ${className ?? ''}`}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <TagData>POKÉDEX DES ESPÈCES</TagData>
          <p className="mt-1 font-mono text-[22px] font-bold leading-none text-navy-900 tabular-nums">
            {capturedCount}
            <span className="text-ink-400">/{totalCount}</span>
          </p>
        </div>
        <p className="max-w-[55%] text-right text-[11.5px] leading-snug text-ink-500">
          Une case par espèce du bord. Débloque-les toutes.
        </p>
      </header>

      {empty && (
        <p className="mb-3 rounded-[10px] bg-slate-50 px-3 py-2 text-[12.5px] text-ink-600">
          Aucune espèce loguée pour l’instant.{' '}
          <Link href="/carnet/nouvelle" className="font-medium text-teal-600 hover:text-teal-700">
            Logue ta première prise
          </Link>{' '}
          pour débloquer ta première case.
        </p>
      )}

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {cards.map((c) => (
          <li
            key={c.slug}
            className={
              c.captured
                ? 'relative rounded-[10px] border border-teal-200 bg-teal-50 px-2.5 py-2.5'
                : 'relative rounded-[10px] border border-dashed border-slate-200 bg-slate-50/60 px-2.5 py-2.5'
            }
          >
            <div className="flex items-center justify-between">
              <Fish
                size={15}
                className={c.captured ? 'text-teal-700' : 'text-slate-300'}
                aria-hidden
              />
              {/* Statut doublé : icône + libellé textuel (jamais la couleur seule). */}
              {c.captured ? (
                <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-teal-800">
                  <Check size={11} aria-hidden /> ✓
                </span>
              ) : (
                <span className="font-mono text-[11px] font-bold text-slate-400" aria-hidden>
                  —
                </span>
              )}
            </div>
            <p
              className={
                c.captured
                  ? 'mt-1.5 text-[12px] font-medium leading-tight text-navy-900'
                  : 'mt-1.5 text-[12px] font-medium leading-tight text-ink-400'
              }
            >
              {c.label}
            </p>
            {c.captured ? (
              <p className="mt-0.5 font-mono text-[10.5px] text-ink-500 tabular-nums">
                {c.count} prise{c.count > 1 ? 's' : ''}
                {c.biggest != null ? ` · ~${c.biggest} cm` : ''}
              </p>
            ) : (
              <p className="mt-0.5 text-[10.5px] text-ink-600">à débloquer</p>
            )}
            <span className="sr-only">
              {c.label} :{' '}
              {c.captured
                ? `capturé${c.gender === 'f' ? 'e' : ''}, ${c.count} prise(s)`
                : `pas encore capturé${c.gender === 'f' ? 'e' : ''}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
