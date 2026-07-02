import type { Metadata } from 'next'
import { PricingCards } from './pricing-cards'
import { getUserTier } from '@/lib/auth/tier'
import { getIsEligibleForPaidTier } from '@/lib/auth/eligibility'
import { Bathy } from '@/components/ui-v2/bathy'
import { SPOTS_CURATED_LABEL } from '@/lib/marketing/stats'
import { Shield, Lock, Clock, MessageCircle } from 'lucide-react'

// CTAs dépendants de l'état utilisateur (tier + éligibilité géo) → rendu dynamique.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tarifs — Carnet de Pêche',
  description: '3 formules claires pour tous les pêcheurs à la canne du bord. Découverte gratuit, Local à 4,90 €/mois, Itinérant à 9,90 €/mois. Essai 7 jours, satisfait ou remboursé sous 30 jours.',
  alternates: { canonical: 'https://www.carnet-de-peche.com/tarifs' },
}

// priceValidUntil glissant (~1 an) : évite que la date passe et fasse réapparaître
// le warning Rich Results. Réévalué à chaque démarrage serveur (page force-dynamic).
const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)

// JSON-LD : les 2 formules PAYANTES en AggregateOffer (sprint 57 WS-C). Le tier
// Découverte (0 €) n'est pas un SKU achetable → retiré du Product (sinon warning
// « offre à 0 »). lowPrice/highPrice = Local/Itinérant.
const TARIFS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Carnet de Pêche',
  description:
    'Carnet de pêche numérique et carte des spots pour la pêche à la canne du bord en France.',
  brand: { '@type': 'Organization', name: 'Carnet de Pêche' },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'EUR',
    lowPrice: '4.90',
    highPrice: '9.90',
    offerCount: 2,
    priceValidUntil,
    availability: 'https://schema.org/InStock',
    url: 'https://www.carnet-de-peche.com/tarifs',
  },
}

const trustItems = [
  {
    icon: <Shield size={26} strokeWidth={1.7} className="text-teal-600" />,
    title: 'Satisfait ou remboursé',
    subtitle: '30 jours pour changer d’avis.',
  },
  {
    icon: <Lock size={26} strokeWidth={1.7} className="text-teal-600" />,
    title: 'Paiement 100% sécurisé',
    subtitle: 'Stripe · SSL 256 bits',
  },
  {
    icon: <Clock size={26} strokeWidth={1.7} className="text-teal-600" />,
    title: 'Annulation en ligne',
    subtitle: 'Depuis ton compte, sans justification.',
  },
  {
    icon: <MessageCircle size={26} strokeWidth={1.7} className="text-teal-600" />,
    title: 'Support 7j/7',
    subtitle: 'Réponse en moins de 24h.',
  },
]

const faqItems = [
  {
    q: 'Pourquoi pas 100% gratuit ?',
    a: 'Les apps « gratuites pour toujours » finissent par vendre tes données ou mourir. Nos abonnés financent des données marines précises et un produit qui dure. Pas de pub, jamais.',
  },
  {
    q: "Comment fonctionne l’essai 7 jours ?",
    a: "Tu rentres ta CB, tu utilises tout pendant 7 jours. Tu n'es pas convaincu ? On te rembourse intégralement ton premier paiement, dans les 30 jours suivant la facturation. Le plan Découverte, lui, reste gratuit et sans CB.",
  },
  {
    q: 'Je peux annuler quand ?',
    a: "Quand tu veux, en ligne, depuis ton compte, sans contact ni justification. Tu gardes l'accès jusqu'à la fin de la période payée. Et dans les 30 jours qui suivent ta première facture, tu peux demander un remboursement intégral.",
  },
  {
    q: "L’app fonctionne-t-elle sans connexion ?",
    a: "Le mode hors ligne est en cours de développement. Pour l'instant, l'app se souvient des pages et fiches spots récemment visitées, pratique dans les zones à faible réseau.",
  },
  {
    q: 'Tu couvres toute la France ?',
    a: `On couvre 24 départements côtiers : la Manche, toute la façade Atlantique, la Méditerranée et la Corse, avec ${SPOTS_CURATED_LABEL} et de nouveaux ajoutés régulièrement. Vérifie la carte de ton département avant de t'abonner. Un abonnement payant n'a d'intérêt que là où on a déjà des spots curés.`,
  },
  {
    q: 'Et mes données ?',
    a: "Tes prises t'appartiennent. Hébergement en France (UE), spots privés par défaut, floutage GPS systématique avant tout partage public. Tu choisis ce que tu partages, prise par prise.",
  },
]

export default async function TarifsPage() {
  const [tier, eligible] = await Promise.all([getUserTier(), getIsEligibleForPaidTier()])

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TARIFS_JSONLD) }}
      />
      {/* Hero */}
      <section className="bg-sand-50 pt-16 sm:pt-24 pb-4">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-6 text-center">
          <span className="inline-flex items-center gap-3 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
            <span aria-hidden="true" className="inline-block h-px w-7 bg-teal-500" />
            Tarifs
          </span>
          <h1 className="mt-5 max-w-3xl mx-auto text-balance">
            Le carnet et la communauté sont gratuits. La précision se paie.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-ink-600 leading-relaxed max-w-xl mx-auto">
            Logue sans limite, poste sans limite. Tu paies uniquement pour ce qui se voit
            au mètre près : la carte complète et le score.
          </p>
        </div>

        {/* Cards + toggle (client) */}
        <div className="max-w-[1280px] mx-auto px-5 sm:px-6 pb-20 sm:pb-24">
          <PricingCards tier={tier} eligible={eligible} />
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white py-12 sm:py-14 border-y border-sand-200">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustItems.map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3">
                <div aria-hidden="true">{item.icon}</div>
                <div>
                  <p className="font-semibold text-navy-900 text-sm">{item.title}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-500">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-sand-100 py-24 sm:py-28">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6">
          <span className="inline-flex items-center gap-3 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
            <span aria-hidden="true" className="inline-block h-px w-7 bg-teal-500" />
            Questions fréquentes
          </span>
          <h2 className="mt-4 mb-12 max-w-xl">Tes questions, nos réponses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
            {faqItems.map((item) => (
              <div key={item.q}>
                <h3 className="font-display text-lg text-navy-900">{item.q}</h3>
                <p className="mt-2.5 text-sm text-ink-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-navy-950 py-20 sm:py-24">
        <Bathy opacity={0.25} withLabels />
        <div className="relative max-w-[760px] mx-auto px-5 sm:px-6 text-center">
          <p className="text-white/50 text-sm">
            Pas convaincu ?
          </p>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-white text-balance">
            Loguer ta première prise est gratuit, sans CB.
          </p>
          <a
            href="/auth/login"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center px-8 rounded-full bg-teal-500 text-navy-950 font-semibold text-[15px] transition-colors duration-150 hover:bg-teal-300"
          >
            Créer mon carnet gratuit
          </a>
          <p className="mt-7 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">
            Prix TTC · Stripe · Paiement sécurisé
          </p>
        </div>
      </section>
    </div>
  )
}
