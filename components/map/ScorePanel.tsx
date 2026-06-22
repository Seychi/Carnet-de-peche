'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { PersonalInsights } from '@/components/catches/PersonalInsights'
import { getMapScoreInsights, type MapScoreResult } from '@/app/actions/map-insights'

/**
 * Couche « Ton score » (Carte v2 / C1, Bloc D). Affiche les TENDANCES perso
 * descriptives réelles (lib/catches/insights) — distinct de la heatmap
 * communautaire (couleur inferno) et du score spot générique (cividis). Honnête :
 * pas de score fabriqué ; si l'historique ne suffit pas → invite à loguer.
 * Le gating est porté côté SERVEUR par getMapScoreInsights (current_tier).
 */
export default function ScorePanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<MapScoreResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getMapScoreInsights()
      .then((r) => { if (alive) setState(r) })
      .catch(() => { if (alive) setState({ gated: false, insights: null }) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const enoughData = state && !state.gated && state.insights && state.insights.totalCount > 0

  return (
    <div className="absolute z-30 left-3 bottom-3 md:bottom-16 w-[min(92vw,300px)] rounded-2xl bg-white/97 backdrop-blur-sm shadow-lg border border-ink-200 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ink-100">
        <span className="flex items-center gap-1.5 font-semibold text-sm text-ink-900">
          <Sparkles size={15} className="text-gold-500" /> Ton score
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer ton score"
          className="p-1 -mr-1 rounded-full text-ink-400 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3.5 max-h-[46vh] overflow-y-auto">
        {loading && (
          <p className="flex items-center gap-2 text-[13px] text-ink-400">
            <Loader2 size={14} className="animate-spin" /> Calcul de tes tendances…
          </p>
        )}

        {!loading && state?.gated && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[13px] text-ink-600">
              <Lock size={13} className="text-ink-400" /> Réservé aux abonnés Local / Itinérant.
            </p>
            <Link
              href="/tarifs"
              className="self-start px-3 py-1.5 rounded-full bg-gold-500 text-navy-950 text-[12px] font-semibold hover:bg-gold-400 transition-colors"
            >
              Débloquer ton score
            </Link>
          </div>
        )}

        {!loading && state && !state.gated && enoughData && (
          <>
            <p className="mb-2.5 text-[12px] leading-snug text-ink-500">
              Tes tendances, calculées sur TES prises (pas une moyenne générique) :
            </p>
            <PersonalInsights data={state.insights!} />
          </>
        )}

        {!loading && state && !state.gated && !enoughData && (
          <p className="text-[13px] leading-relaxed text-ink-500">
            Continue à loguer tes prises (espèce, taille, heure) : dès que ton historique
            le permet, ton score perso s&apos;affichera ici — basé sur <strong>tes</strong> patterns,
            pas une moyenne générique.
          </p>
        )}
      </div>
    </div>
  )
}
