'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { UserTier } from '@/lib/auth/tier'

type PaidPlan = 'local' | 'itinerant'
type Interval = 'monthly' | 'annual'

const plans = {
  decouverte: {
    name: 'Découverte',
    description: "Pour démarrer ton carnet et voir si l'app te parle.",
    monthly: 0,
    annual: 0,
    annualTotal: 0,
    features: [
      { text: 'Carnet de pêche illimité avec photos', strong: true },
      { text: '3 spots populaires par département (coords floutées 1 km)' },
      { text: 'Marées + météo pour ta ville' },
      { text: 'Tous les guides éditoriaux' },
      { text: 'Fil régional complet : poste, commente, like, suis' },
      { text: 'App iOS / Android — bientôt' },
    ],
  },
  local: {
    name: 'Local',
    description: 'Pour le pêcheur qui pratique surtout dans son département.',
    monthly: 4.9,
    annual: 4.08,
    annualTotal: 49,
    badge: 'Le plus populaire',
    features: [
      { text: 'Carte complète de ton département', strong: true },
      { text: 'Coordonnées GPS précises de tous les spots' },
      { text: "Score d'activité 0-100 par spot" },
      { text: 'Filtres espèces, techniques, marées' },
      { text: 'Mode hors ligne (carte + marées 7 jours)' },
      { text: 'Notifications push créneaux optimaux' },
      { text: 'Stats avancées + photos HD illimitées' },
    ],
  },
  itinerant: {
    name: 'Itinérant',
    description: 'Pour le pêcheur qui voyage et veut couvrir toute la France.',
    monthly: 9.9,
    annual: 8.25,
    annualTotal: 99,
    features: [
      { text: 'Tous les départements côtiers FR', strong: true },
      { text: 'Tout ce qui est dans Local · partout' },
      { text: 'Bathymétrie SHOM premium' },
      { text: 'Itinéraires GPS multi-spots' },
      { text: 'Stats inter-départements' },
      { text: 'Accès anticipé nouvelles fonctionnalités' },
      { text: 'Support prioritaire' },
    ],
  },
}

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',')
}

// Chip rappelant les conditions de l'essai, sous chaque CTA payant.
function TrialBadge() {
  return (
    <p className="mt-3 inline-flex items-center justify-center w-full text-center text-[11px] font-medium text-teal-300">
      Essai 7j · CB requise · Annulation 1 clic
    </p>
  )
}

// CTA d'un plan payant. Rendu selon l'état serveur (tier + éligibilité géo).
function PlanCta({
  plan,
  interval,
  tier,
  eligible,
  buttonClass,
}: {
  plan: PaidPlan
  interval: Interval
  tier: UserTier
  eligible: boolean
  buttonClass: string
}) {
  // Déjà abonné (peu importe le plan) → gérer l'abonnement
  if (tier === 'local' || tier === 'itinerant') {
    return (
      <Link href="/compte/abonnement" className={buttonClass}>
        Gérer mon abonnement
      </Link>
    )
  }

  // Non connecté → inscription, on garde plan + interval pour reprendre après login
  if (tier === 'anonymous') {
    return (
      <>
        <Link
          href={`/auth/register?next=/tarifs&plan=${plan}&interval=${interval}`}
          className={buttonClass}
        >
          Essayer 7 jours
        </Link>
        <TrialBadge />
      </>
    )
  }

  // Connecté mais hors zone (DOM-TOM) → encart, pas d'accès Checkout
  if (!eligible) {
    return (
      <div className="bg-sand-100 text-ink-700 text-sm rounded-[12px] p-3 text-center">
        Outre-mer pas encore couvert.{' '}
        <Link href="/contact" className="underline font-medium">
          Préviens-nous
        </Link>
        .
      </div>
    )
  }

  // Connecté, éligible, pas encore abonné → POST classique vers Checkout (303 → Stripe)
  return (
    <>
      <form action="/api/stripe/checkout" method="POST">
        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="interval" value={interval} />
        <button type="submit" className={`${buttonClass} w-full`}>
          Essayer 7 jours
        </button>
      </form>
      <TrialBadge />
    </>
  )
}

export function PricingCards({
  tier = 'anonymous',
  eligible = true,
}: {
  tier?: UserTier
  eligible?: boolean
}) {
  const [annual, setAnnual] = useState(false)
  const interval: Interval = annual ? 'annual' : 'monthly'

  return (
    <>
      {/* Toggle mensuel / annuel */}
      <div className="flex justify-center mt-8 mb-10">
        <div className="inline-flex items-center bg-ink-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              !annual
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              annual
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Annuel
            <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-semibold">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

        {/* Découverte */}
        <div className="bg-sand-100 border border-ink-200 rounded-[22px] p-8 flex flex-col">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-500 mb-3">
              {plans.decouverte.name}
            </p>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-display font-bold text-navy-900">0 €</span>
              <span className="text-ink-500 text-sm">/ pour toujours</span>
            </div>
            <p className="text-sm text-ink-500 leading-relaxed mb-6">
              {plans.decouverte.description}
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {plans.decouverte.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm text-ink-700">
                  <Check size={16} className="text-teal-600 mt-0.5 shrink-0" />
                  <span className={f.strong ? 'font-semibold text-navy-900' : ''}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto">
            <Link
              href="/auth/login"
              className="block w-full text-center px-6 py-3 rounded-[12px] border-2 border-navy-900 text-navy-900 font-semibold text-sm hover:bg-navy-900 hover:text-white transition-colors duration-200"
            >
              Démarrer gratuitement
            </Link>
          </div>
        </div>

        {/* Local — highlighted */}
        <div className="bg-navy-900 rounded-[22px] p-8 flex flex-col relative shadow-xl">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
            {plans.local.badge}
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-3">
              {plans.local.name}
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-display font-bold text-white">
                {annual ? formatPrice(plans.local.annual) : formatPrice(plans.local.monthly)} €
              </span>
              <span className="text-white/60 text-sm">/ mois</span>
            </div>
            {annual && (
              <p className="text-teal-400 text-xs mb-2">
                Soit {plans.local.annualTotal} €/an · tu économises {formatPrice(plans.local.monthly * 12 - plans.local.annualTotal)} €
              </p>
            )}
            <p className="text-sm text-white/60 leading-relaxed mb-6 mt-2">
              {plans.local.description}
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {plans.local.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm text-white/80">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span className={f.strong ? 'font-semibold text-white' : ''}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto">
            <PlanCta
              plan="local"
              interval={interval}
              tier={tier}
              eligible={eligible}
              buttonClass="block w-full text-center px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-colors duration-200"
            />
          </div>
        </div>

        {/* Itinérant */}
        <div
          className="rounded-[22px] p-8 flex flex-col"
          style={{ background: 'linear-gradient(145deg, #103E50 0%, #0F766E 100%)' }}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-300 mb-3">
              {plans.itinerant.name}
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-display font-bold text-white">
                {annual ? formatPrice(plans.itinerant.annual) : formatPrice(plans.itinerant.monthly)} €
              </span>
              <span className="text-white/60 text-sm">/ mois</span>
            </div>
            {annual && (
              <p className="text-teal-300 text-xs mb-2">
                Soit {plans.itinerant.annualTotal} €/an · tu économises {formatPrice(plans.itinerant.monthly * 12 - plans.itinerant.annualTotal)} €
              </p>
            )}
            <p className="text-sm text-white/60 leading-relaxed mb-6 mt-2">
              {plans.itinerant.description}
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {plans.itinerant.features.map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm text-white/80">
                  <Check size={16} className="text-teal-300 mt-0.5 shrink-0" />
                  <span className={f.strong ? 'font-semibold text-white' : ''}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto">
            <PlanCta
              plan="itinerant"
              interval={interval}
              tier={tier}
              eligible={eligible}
              buttonClass="block w-full text-center px-6 py-3 rounded-[12px] bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold text-sm transition-colors duration-200"
            />
          </div>
        </div>
      </div>
    </>
  )
}
