import type * as React from 'react'
import { TagData } from '@/components/ui-v2/tag-data'
import { cn } from '@/lib/utils'

// La RÉPONSE d'une page SEO (sprint 87, Bloc 1).
//
// Ce bloc existait déjà sur `/peche`, mais enterré : il vivait en `not-prose`
// ENTRE les paragraphes de technique, donc à ~1 067 px sur un écran de 390 px,
// c'est-à-dire sous le premier écran. Or c'est LUI la réponse à la requête qui a
// amené le visiteur ; la prose est le « pour creuser ».
//
// Le style est repris à l'identique de l'existant : ce composant ne redessine
// rien, il déplace et il nomme.
//
// `data-fold="answer"` est le contrat lu par `scripts/measure-fold.mjs` et par le
// garde-fou `e2e/10-pli-mobile.spec.ts`.
//
// Server component : aucun cookie, aucune API dynamique (invariant sprint 84).

export function KeyFacts({
  label,
  items,
  footnote,
  className,
}: {
  /** Ex. « L'ESSENTIEL · AU SURFCASTING ». */
  label: string
  items: readonly string[]
  /** Ex. <><strong>Quand :</strong> de mai à octobre</>. */
  footnote?: React.ReactNode
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <div
      data-fold="answer"
      className={cn('rounded-[14px] border border-sand-200 bg-white p-5', className)}
    >
      <TagData className="mb-3 block">{label}</TagData>
      <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-ink-700">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-teal-500"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
      {footnote && (
        <p className="mt-4 border-t border-sand-200 pt-3 text-[13px] text-ink-600">{footnote}</p>
      )}
    </div>
  )
}
