import type { Metadata } from 'next'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'
import { TechniquesWaitlist } from '@/components/marketing/TechniquesWaitlist'

// Page « Bientôt disponible » + capture email (F8 sprint 31). La meta « inscris-toi
// pour être notifié » est désormais VRAIE (le formulaire ci-dessous alimente la
// liste d'attente guide_waitlist). robots index:false CONSERVÉ : la page reste
// mince tant que les guides ne sont pas publiés (anti thin-content). À retirer à la
// sortie des guides.
export const metadata: Metadata = {
  title: 'Techniques — Bientôt disponible · Carnet de Pêche',
  description:
    'Leurres, surfcasting, pêche à la flottante, vif : les guides techniques pour la pêche à la canne du bord arrivent bientôt. Inscris-toi pour être notifié.',
  alternates: { canonical: 'https://www.carnet-de-peche.com/techniques' },
  robots: { index: false },
}

export default function TechniquesPage() {
  return (
    <div>
      <div className="bg-sand-50 py-20">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[.08em] uppercase text-teal-700 rounded-full px-3.5 py-1.5 border border-teal-500/25 bg-teal-500/10 mb-6">
            Bientôt disponible
          </span>
          <h1 className="font-display text-4xl text-navy-900 mb-4">Toutes les techniques</h1>
          <p className="text-lg text-ink-700 leading-relaxed">
            Bientôt : des guides dédiés aux leurres, au surfcasting, à la pêche à la
            flottante et au vif — matériel, montages et conditions idéales pour chaque
            approche depuis le bord.
          </p>

          <div className="mt-8">
            <p className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-500">
              Préviens-moi à la sortie
            </p>
            <TechniquesWaitlist />
          </div>
        </div>
      </div>

      <MarketingCTA
        title="En attendant, ouvre ton carnet"
        subtitle="Logue tes sessions dès maintenant : à la sortie des guides techniques, tu auras déjà tout ton historique. Gratuit, illimité."
      />
    </div>
  )
}
