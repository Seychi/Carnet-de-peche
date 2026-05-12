import type { Metadata } from 'next'
import { PricingCards } from './pricing-cards'
import { Shield, Lock, Clock, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tarifs — Carnet de Pêche',
  description: '3 formules claires pour tous les pêcheurs à la canne du bord. Découverte gratuit, Local à 4,90 €/mois, Itinérant à 9,90 €/mois. Essai 7 jours, satisfait ou remboursé.',
}

const trustItems = [
  {
    icon: <Shield size={28} strokeWidth={1.75} className="text-teal-600" />,
    title: '7 jours satisfait ou remboursé',
    subtitle: 'Sans poser de questions.',
  },
  {
    icon: <Lock size={28} strokeWidth={1.75} className="text-teal-600" />,
    title: 'Paiement 100% sécurisé',
    subtitle: 'Stripe · SSL 256 bits',
  },
  {
    icon: <Clock size={28} strokeWidth={1.75} className="text-teal-600" />,
    title: 'Annulation en 1 clic',
    subtitle: 'Aucun engagement.',
  },
  {
    icon: <MessageCircle size={28} strokeWidth={1.75} className="text-teal-600" />,
    title: 'Support 7j/7',
    subtitle: 'Réponse en moins de 24h.',
  },
]

const faqItems = [
  {
    q: 'Pourquoi seulement 3 formules ?',
    a: "Parce qu'on a passé du temps à comprendre les pêcheurs. La grande majorité pratique dans son département (Local), une partie voyage (Itinérant), et tout le monde veut tester avant (Découverte). Le reste, c'est du marketing inutile.",
  },
  {
    q: "Comment fonctionne l'essai 7 jours ?",
    a: "Tu rentres ta CB, tu utilises tout pendant 7 jours. Si tu n'es pas satisfait, on rembourse intégralement, sans questions. Le plan Découverte reste gratuit et sans CB.",
  },
  {
    q: 'Je peux changer de formule à tout moment ?',
    a: "Oui, et c'est instantané. Tu passes Local → Itinérant en 1 clic, on calcule le prorata. Tu downgrades de la même façon.",
  },
  {
    q: "L'app fonctionne-t-elle hors ligne ?",
    a: 'Oui, à partir du plan Local. Tu télécharges ton département : carte vectorielle, marées 7 jours, fiches espèces. Aucune donnée mobile nécessaire au pied de la falaise.',
  },
  {
    q: 'Vous couvrez toute la France ?',
    a: "27 départements côtiers couverts : Atlantique, Manche, Méditerranée. La Corse est prévue fin 2026. Vérifie ton département avant de t'abonner.",
  },
  {
    q: 'Mon carnet de pêche est-il privé ?',
    a: 'Oui, privé par défaut. Tu choisis ce que tu partages : chaque prise a ses propres paramètres de visibilité. Les coordonnées GPS sont floutées automatiquement avant tout partage public.',
  },
]

export default function TarifsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-sand-50 pt-20 pb-4">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <span className="inline-block text-sm font-semibold text-teal-700 bg-teal-500/10 px-4 py-1.5 rounded-full mb-6">
            3 formules. Pas plus.
          </span>
          <h1 className="font-display text-navy-900 max-w-2xl mx-auto">
            Une tarification simple, claire, sans piège.
          </h1>
          <p className="mt-5 text-lg text-ink-500 max-w-xl mx-auto">
            7 jours satisfait ou remboursé. Aucun engagement. Annulation en 1 clic.
          </p>
        </div>

        {/* Cards + toggle (client) */}
        <div className="max-w-[1280px] mx-auto px-6 pb-20">
          <PricingCards />
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white py-14 border-t border-ink-100">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustItems.map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3">
                <div>{item.icon}</div>
                <div>
                  <p className="font-semibold text-navy-900 text-sm">{item.title}</p>
                  <p className="text-ink-500 text-xs mt-0.5">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-sand-50 py-20">
        <div className="max-w-[760px] mx-auto px-6">
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">
            Questions fréquentes
          </p>
          <h2 className="font-display text-navy-900 mb-10">Tes questions, nos réponses</h2>
          <div className="flex flex-col gap-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group bg-white border border-ink-100 rounded-[14px] px-6 py-5 cursor-pointer"
              >
                <summary className="font-semibold text-navy-900 text-sm list-none flex items-center justify-between gap-4 select-none">
                  {item.q}
                  <span className="text-ink-300 group-open:rotate-180 transition-transform duration-200 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                </summary>
                <p className="mt-4 text-sm text-ink-700 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-navy-900 py-16">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <p className="text-white/60 text-sm mb-4">
            Pas convaincu ?
          </p>
          <p className="text-white font-display text-2xl font-bold mb-6">
            Loguer ta première prise est gratuit, sans CB.
          </p>
          <a
            href="/auth/login"
            className="inline-block px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-[12px] transition-colors duration-200"
          >
            Créer mon carnet gratuit
          </a>
        </div>
      </section>
    </main>
  )
}
