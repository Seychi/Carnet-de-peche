'use client'

import Link from 'next/link'
import { Bathy } from '@/components/ui-v2/bathy'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'

// Le CTA des pages SEO (sprint 87, Bloc 1).
//
// Avant ce sprint : `/peche` avait UN seul CTA, en toute fin de page, et zéro
// `capture()`. `/guides` avait le sien tout en bas, libellé « Créer mon carnet
// gratuit » mais pointant `/auth/login`. Seul `/especes` avait la recette
// (sprint 75, Bloc 2), et elle n'avait jamais été portée ailleurs.
//
// ⚠️ Composant CLIENT (il lui faut le `onClick`), mais cela ne rend PAS la page
// dynamique : seule une API dynamique dans l'arbre SERVEUR le ferait
// (`cookies()`, `headers()`, `searchParams`). Un composant client est rendu dans
// le HTML servi comme un autre, il s'hydrate ensuite. C'est l'hypothèse porteuse
// de ce composant, et l'invariant du sprint 84 tient.
//
// `data-fold="cta"` + `data-position` sont le contrat lu par
// `scripts/measure-fold.mjs` et par `e2e/10-pli-mobile.spec.ts`.
//
// ⚠️ `slug` est un identifiant PUBLIC de page. Jamais une coordonnée, jamais une
// donnée utilisateur : cet identifiant part dans un événement d'analytics.
//
// ── Précision au contrat du brief ────────────────────────────────────────────
// Le brief déclarait `label` + `note`, mais ses Blocs 2 et 3 appellent « libellé »
// LE TEXTE DU BOUTON (« Loguer une prise à Pointe du Raz », « Créer mon carnet
// gratuit »), alors que le Bloc 1 décrivait `note` comme venant « sous le
// libellé », donc sous une phrase d'accroche. Les deux lectures ne peuvent pas
// tenir ensemble. Tranché ici, une fois, pour les trois gabarits :
//   `label`    = le texte DU BOUTON (ce que le visiteur clique) ;
//   `headline` = la phrase d'accroche à côté ou au-dessus (facultative) ;
//   `note`     = la rassurance courte.

export function SeoInlineCta({
  template,
  slug,
  href,
  label,
  headline,
  note,
  position,
  variant = 'compact',
}: {
  template: 'peche' | 'guide' | 'espece'
  /** Identifiant public de la page. Jamais une coordonnée. */
  slug: string
  href: string
  /** Texte du bouton. */
  label: string
  /** Phrase d'accroche. Portée par le bloc, pas par le bouton. */
  headline?: string
  /** Rassurance courte. */
  note?: string
  position: 'inline' | 'footer'
  /** `compact` = bandeau clair en cours de lecture ; `card` = bloc navy de fin. */
  variant?: 'compact' | 'card'
}) {
  const track = () => analytics.seoCtaClicked({ template, slug, position })

  // Bloc navy de fin de page : repris à l'identique du CTA existant de `/peche`.
  if (variant === 'card') {
    return (
      <section
        data-fold="cta"
        data-position={position}
        className="relative mt-12 overflow-hidden rounded-[18px] bg-navy-950 p-7 text-center"
      >
        <Bathy density={2} opacity={0.3} />
        <div className="relative">
          {headline && <p className="font-display text-xl text-white">{headline}</p>}
          {note && <p className="mx-auto mt-2 max-w-md text-[14px] text-white/60">{note}</p>}
          <Link
            href={href}
            onClick={track}
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-teal-500 px-6 text-[14.5px] font-semibold text-navy-950 transition-colors hover:bg-teal-300"
          >
            {label}
          </Link>
        </div>
      </section>
    )
  }

  // Bandeau clair, en cours de lecture. La cible tactile fait au moins 44 px de
  // haut, et le bloc passe en colonne sous `sm` pour ne pas serrer à 390 px.
  return (
    <section
      data-fold="cta"
      data-position={position}
      className={cn(
        'mt-4 flex flex-col gap-3 rounded-[14px] border border-teal-500/30 bg-white p-4',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-5',
      )}
    >
      {(headline || note) && (
        <p className="text-[14px] leading-snug text-ink-700">
          {headline && <strong className="text-navy-900">{headline}</strong>}
          {headline && note && ' '}
          {note}
        </p>
      )}
      <Link
        href={href}
        onClick={track}
        className="flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-teal-500 px-5 text-center text-[14px] font-semibold text-navy-950 transition-colors hover:bg-teal-300"
      >
        {label}
      </Link>
    </section>
  )
}
