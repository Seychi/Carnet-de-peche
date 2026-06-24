'use client'

import Link from 'next/link'
import { BellRing } from 'lucide-react'
import { analytics } from '@/lib/analytics'

// Soft-upsell de la NOTIF perso proactive (sprint 26, WS-B). Vend la PROACTIVITÉ
// (être alerté quand TES conditions reviennent), JAMAIS la tendance elle-même (qui
// reste gratuite — invariant D-A1). Îlot client pour porter l'event analytics +
// onClick, montable indifféremment depuis un parent serveur (profil/carnet) ou
// client (ScorePanel). Discret, après la liste des tendances.
//
// DESCRIPTIF, jamais prédictif : « quand TES conditions reviennent », pas « tu prendras ».
export function PersonalTendenciesUpsell({ surface = 'personal_tendencies' }: { surface?: string }) {
  return (
    <Link
      href="/tarifs"
      onClick={() => analytics.upsellClicked({ surface })}
      className="mt-3 flex items-center gap-2 rounded-[12px] border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-[12.5px] font-medium text-navy-900 transition-colors hover:bg-gold-500/15"
    >
      <BellRing size={14} className="shrink-0 text-gold-600" aria-hidden="true" />
      <span>
        Reçois une alerte quand TES conditions reviennent
        <span className="text-ink-500"> → passe à Local</span>
      </span>
    </Link>
  )
}
