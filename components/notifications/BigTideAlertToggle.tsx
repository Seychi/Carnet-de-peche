'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Star, Waves, X } from 'lucide-react'
import { toast } from 'sonner'
import { setBigTideAlertOptin } from '@/app/(app)/notifications/actions'

// ─── Alerte grande marée sur spot favori (sprint 77, Bloc 10.2) ───────────────
//
// ⚠️ CE QUE L'UTILISATEUR LIT, ET POURQUOI. Le brief demandait « préviens-moi
// quand le coefficient dépasse 90 ». Ce projet ne calcule AUCUN coefficient de
// marée : Open-Meteo ne l'expose pas, `tide_coefficient` est toujours null
// (re-vérifié au sprint 72). Afficher « coefficient > 90 » aurait été un chiffre
// inventé, ce qui est interdit ici.
//
// On nomme donc la chose telle qu'elle est : le MARNAGE, l'écart mesuré entre la
// pleine et la basse mer, comparé au seuil de grande marée de la façade (Manche
// 9 m, Atlantique 5 m, décision sprint 49). La Méditerranée et la Corse sont
// exclues, leur marnage est trop faible pour un seuil honnête, et le texte le dit
// plutôt que de laisser un Marseillais attendre une alerte qui ne viendra jamais.
//
// Ouvert à TOUS les tiers, contrairement au panneau d'alertes personnalisées plus
// bas sur la page : le déclencheur est une mesure publique, pas le moteur perso.
//
// Daltonisme (John) : l'état est doublé d'un libellé texte + icône, jamais la
// couleur seule. Pattern repris de WeeklyEmailToggle.

export function BigTideAlertToggle({
  initial,
  favoritesCount,
}: {
  initial: boolean
  /** Nombre de spots favoris du viewer : sans favori, aucune alerte ne peut partir. */
  favoritesCount: number
}) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next) // optimiste
    startTransition(async () => {
      const res = await setBigTideAlertOptin(next)
      if (!res.ok) {
        setEnabled(!next) // rollback
        toast.error(res.error)
      }
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
            <Waves size={14} className="text-ink-400" aria-hidden="true" />
            Alerte grande marée sur tes spots favoris
          </p>
          <p className="mt-1 text-xs text-ink-500 leading-relaxed">
            La veille au soir, un message quand le marnage du lendemain dépasse le
            seuil de grande marée de ta façade : plus de 9 m en Manche, plus de 5 m
            en Atlantique. Une seule alerte par épisode, jamais la nuit.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Alerte grande marée sur tes spots favoris"
          disabled={pending}
          onClick={toggle}
          className={`shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-full border text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
            enabled
              ? 'bg-teal-500 border-teal-500 text-navy-950'
              : 'bg-white border-ink-200 text-ink-600'
          }`}
        >
          {enabled ? (
            <>
              <Check size={14} strokeWidth={2.4} aria-hidden="true" />
              Activé
            </>
          ) : (
            <>
              <X size={14} strokeWidth={2.4} aria-hidden="true" />
              Désactivé
            </>
          )}
        </button>
      </div>

      {enabled ? (
        <>
          <p className="mt-3 rounded-[10px] border border-sand-200 bg-sand-50 px-3 py-2.5 text-xs text-ink-500 leading-relaxed">
            Le marnage est l&rsquo;écart mesuré entre la pleine mer et la basse mer du
            jour. On ne te donne pas de coefficient de marée : on ne le calcule pas, et
            on préfère un chiffre mesuré à un chiffre approché. Pas d&rsquo;alerte en
            Méditerranée ni en Corse, le marnage y est trop faible pour un seuil honnête.
          </p>
          {favoritesCount === 0 ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-500 leading-relaxed">
              <Star size={13} className="mt-0.5 shrink-0 text-gold-500" aria-hidden="true" />
              <span>
                Aucun spot favori pour l&rsquo;instant : sans favori, aucune alerte ne
                peut partir. Ajoute l&rsquo;étoile depuis une{' '}
                <Link href="/carte" className="font-medium text-teal-700 hover:underline">
                  fiche spot ou la carte
                </Link>
                .
              </span>
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
