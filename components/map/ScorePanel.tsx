'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { PersonalTendencies } from '@/components/scoring/PersonalTendencies'
import { getMapScoreInsights, type MapScoreResult } from '@/app/actions/map-insights'
import { analytics } from '@/lib/analytics'
import type { UserTier } from '@/lib/auth/tier'
import { getWallKind } from '@/lib/gating/wall'
import { SignupWall } from '@/components/map/SignupBanner'

const SURFACE = 'map_score'

/**
 * Couche « Ton score » (Carte v2 / C1). Affiche les TENDANCES perso descriptives
 * réelles (lib/scoring/personal) — distinct de la heatmap communautaire (inferno)
 * et du score spot générique (cividis). Honnête : pas de score fabriqué ; si
 * l'historique ne suffit pas → le composant invite à loguer (état dégradé/vide).
 * Le gating Local/Itinérant est porté côté SERVEUR par getMapScoreInsights.
 */
export default function ScorePanel({
  onClose,
  userTier = 'anonymous',
}: {
  onClose: () => void
  /** Sprint 75 Bloc 1 : décide du MUR affiché quand l'accès est refusé, pas de l'accès lui-même. */
  userTier?: UserTier
}) {
  const [state, setState] = useState<MapScoreResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getMapScoreInsights()
      .then((r) => { if (alive) setState(r) })
      .catch(() => { if (alive) setState(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const wall = getWallKind(userTier)

  // Paywall vu : quand l'état gaté est confirmé côté serveur, et UNIQUEMENT pour
  // un inscrit gratuit. Un anonyme émet signup_wall_viewed via SignupWall.
  useEffect(() => {
    if (state?.gated && wall === 'upsell') analytics.paywallViewed({ surface: SURFACE })
  }, [state?.gated, wall])

  // Position : bas-gauche en mobile (légende + readout masqués < md) ; bas-DROITE en
  // desktop pour ne pas recouvrir la légende couleurs ni les coords GPS (bas-gauche).
  return (
    <div className="absolute z-30 left-3 bottom-3 md:left-auto md:right-3 w-[min(92vw,300px)] rounded-2xl bg-white/97 backdrop-blur-sm shadow-lg border border-ink-200 overflow-hidden">
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

        {/* Accès refusé, visiteur SANS compte : on ne lui parle pas d'abonnement,
            on lui propose le carnet gratuit (sprint 75 Bloc 1). Le gating réel
            reste porté par getMapScoreInsights côté serveur, inchangé. */}
        {!loading && state?.gated && wall === 'signup' && (
          <SignupWall
            surface="score"
            compact
            intro="Ton score se calcule sur TES prises. Commence par créer ton carnet, c’est gratuit."
          />
        )}

        {/* Accès refusé, inscrit gratuit : le seul public à qui on parle de prix. */}
        {!loading && state?.gated && wall === 'upsell' && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[13px] text-ink-600">
              <Lock size={13} className="text-ink-400" /> Réservé aux abonnés Local / Itinérant.
            </p>
            <Link
              href="/tarifs"
              onClick={() => analytics.upsellClicked({ surface: SURFACE })}
              className="self-start px-3 py-1.5 rounded-full bg-gold-500 text-navy-950 text-[12px] font-semibold hover:bg-gold-400 transition-colors"
            >
              Débloquer ton score
            </Link>
          </div>
        )}

        {!loading && state && !state.gated && (
          <>
            <p className="mb-2.5 text-[12px] leading-snug text-ink-500">
              Tes tendances, calculées sur TES prises (pas une moyenne générique) :
            </p>
            {/* Cette couche n'est servie qu'aux abonnés (gating serveur) → tier="local"
                neutralise le soft-upsell : un abonné a déjà l'alerte proactive. */}
            <PersonalTendencies data={state.tendencies} tier="local" compact />
          </>
        )}
      </div>
    </div>
  )
}
